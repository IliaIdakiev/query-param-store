import { Injectable, OnDestroy, Inject } from '@angular/core';
import {
  Router,
  NavigationStart,
  ActivationEnd,
  ActivatedRouteSnapshot,
  RoutesRecognized,
  RouterStateSnapshot,
  NavigationCancel,
  NavigationEnd,
  ResolveStart
} from '@angular/router';
import { ReplaySubject, Subscription, Observable, of as observableOf, of } from 'rxjs';
import {
  map,
  filter,
  tap,
  distinctUntilChanged,
  withLatestFrom,
  first,
  pairwise,
  shareReplay,
  switchMap,
  mapTo
} from 'rxjs/operators';
import {
  IAllowedValuesConfig,
  IQueryParamsStoreConfig,
  IStateConfig,
  QueryParamsStoreDefaultValue,
  IQueryParamsStoreModuleConfig
} from './interfaces-and-types';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { QPS_CONFIG } from './tokens';
import { compressQueryParams } from './utils';

type SelectorFn<T> = (a: any) => T;
const NOT_PRESENT = Symbol('NOT_PRESENT');

function booleanTypeConverter(val) {
  if (['true', 1, '1', true].includes(val)) { return true; }
  if (['false', 0, '0', false].includes(val)) { return false; }
  return Boolean(val);
}

@Injectable()
export class QueryParamsStore<T = any> implements OnDestroy {

  private snapshot: ReplaySubject<ActivatedRouteSnapshot> = new ReplaySubject<ActivatedRouteSnapshot>(2);
  private subscription: Subscription;
  private url: string;
  private fullUrl: string;
  private prevFullUrl: string;
  private redirectUrl: string;

  private isInDebugMode = false;
  private useCompression = false;
  private compressionKey = null;

  store: Observable<T>;

  private getConvertBinaryBooleanResult(value: any, stateConfigLength: number) {
    value = +value;
    if (isNaN(value)) { return { isConvertedCorrectly: false }; }

    const binaryBooleanStringArray = value.toString(2).split('');
    const isOverflowing = binaryBooleanStringArray.length > stateConfigLength;
    let binaryBooleanResult = binaryBooleanStringArray.slice(0, stateConfigLength).map(val => `${val === '1'}`).reverse();

    if (binaryBooleanResult.length < stateConfigLength) {
      binaryBooleanResult = binaryBooleanResult.concat(new Array(stateConfigLength - binaryBooleanResult.length).fill('false'));
    }

    binaryBooleanResult = binaryBooleanResult.map(v => this.getConvertValueResult(v, Boolean));

    return { binaryBooleanResult, isConvertedCorrectly: true, isOverflowing };
  }

  private getConvertValueResult(value, typeConvertor) {
    const isTypeConverterBoolean = typeConvertor === Boolean || typeConvertor === booleanTypeConverter;
    const isBoolean = ['true', 'false'].includes(value) && isTypeConverterBoolean;
    const convertedValue = typeConvertor === String && typeof value === 'string' ? value :
      typeConvertor(value === 'true' ? 1 : value === 'false' ? 0 : value);
    const isValidNumber = typeConvertor === Number && !Number.isNaN(convertedValue);
    const isValidString = typeConvertor === String && typeof convertedValue === 'string';
    const isValidBoolean = isTypeConverterBoolean && typeof convertedValue === 'boolean';

    const hasValidConversion = isValidNumber || isValidString || isValidBoolean;
    return {
      hasValidConversion,
      convertedValue,
      invalidRawConversion: (isTypeConverterBoolean && !isBoolean || typeConvertor === Number && isNaN(typeConvertor(value)))
    };
  }

  private getTypeConverter(stateConfig: any) {
    if (stateConfig.typeConvertor) {
      return stateConfig.typeConvertor === Boolean ? booleanTypeConverter : stateConfig.typeConvertor;
    }
    const stateConfigValueType = typeof (stateConfig.value ? stateConfig.value : stateConfig);
    if (stateConfigValueType === 'number') { return Number; }
    if (stateConfigValueType === 'boolean') { return booleanTypeConverter; }
    return String;
  }

  private parseStateConfig<A = any>(config: IStateConfig<A>) {
    return Object.entries(config).reduce((acc, [key, configForKey]: [string, QueryParamsStoreDefaultValue]) => {

      if (configForKey === null || Array.isArray(configForKey)) {
        // remove invalid configuration
        if (this.isInDebugMode) {
          console.warn(`Query Params Store: Invalid configuration for parameter key: ${key}! (nulls or arrays are not supported)`);
        }
        return acc;
      }

      const typeConvertor = this.getTypeConverter(configForKey);
      const isObjectConfig = typeof configForKey === 'object';

      if (!isObjectConfig) {
        // the case when the property is just a value (page: 1 or filter: 'something')
        acc[key] = { value: configForKey, originalValue: configForKey, typeConvertor, multi: false };
        return acc;
      }

      if (!configForKey.hasOwnProperty('value')) {
        // missing the value property => remove invalid configuration
        if (this.isInDebugMode) { console.warn(`Query Params Store: Invalid configuration for parameter key ${key}! (value is missing)`); }
        return acc;
      }

      let value = (configForKey as any).value;
      const originalValue = value;

      if (!['number', 'string', 'boolean'].includes(typeof value) && value !== null) {
        // value is not in the supported type => remove invalid configuration
        if (this.isInDebugMode) {
          // tslint:disable-next-line:max-line-length
          console.warn(`Query Params Store: Invalid value configuration for parameter key ${key}! (value can be number, string, boolean or null)`);
        }
        return acc;
      }

      const isMultiValueConfig = (configForKey as any).multi || false;
      const multiCount = isMultiValueConfig ? (configForKey as any).count : null;
      const isBinaryBoolean = this.isBinaryBoolean({ value, typeConvertor, multi: isMultiValueConfig });

      if (isBinaryBoolean) {
        const configForKeyLength = !configForKey.hasOwnProperty('length') ? undefined : +(configForKey as any).length;
        value = value.toString(2).split('').slice(0, configForKeyLength).map(val => `${val === '1'}`).reverse();

        if (value.length < configForKeyLength) {
          value = value.concat(new Array(configForKeyLength - value.length).fill('false'));
        }
      } else if (isMultiValueConfig && value !== null) {
        if (typeof value !== 'string' && !isBinaryBoolean) {
          // value should be a string and if we need multiple values we should use the given separator
          // tslint:disable-next-line:max-line-length
          if (this.isInDebugMode) { console.warn(`Query Params Store: Invalid configuration for parameter key ${key}! (value should be a string)`); }
          return acc;
        }

        value = isBinaryBoolean ?
          value : value === '' ?
            [] : (value as string).split((configForKey as any).separator || ';');

        const difference = (!multiCount || isBinaryBoolean) ? 0 : +multiCount - value.length;
        if (difference > 0) {
          for (let i = 0; i < difference; i++) {
            value.push(typeConvertor === String ? '' : typeConvertor === Number ? 0 : false);
          }
        }
      }

      if (Array.isArray(value)) { value = value.map(typeConvertor); }

      acc[key] = {
        ...(configForKey as any),
        typeConvertor,
        originalValue,
        value,
        multi: isMultiValueConfig,
        multiCount,
        separator: (configForKey as any).separator || ';'
      };

      return acc;
    }, {});
  }

  private isBinaryBoolean(cfg: any) {
    return cfg.multi && typeof cfg.value === 'number' &&
      (cfg.typeConvertor === Boolean || cfg.typeConvertor === booleanTypeConverter);
  }

  private getSnapshotData(snapshot: ActivatedRouteSnapshot) {
    const defaultStoreConfig = { stateConfig: {}, noQueryParams: false, removeUnknown: false };
    let storeConfig: IQueryParamsStoreConfig = snapshot.data && snapshot.data.storeConfig || defaultStoreConfig;
    const inherit = storeConfig.inherit || false;

    if (inherit) {
      // iterate over all route data configs and merge the store configs (priority is from the bottom up)
      storeConfig = snapshot.pathFromRoot.slice(0, -1).reduceRight((acc, curr) => {
        const currentData = curr.data;
        if (!currentData || !currentData.storeConfig) { return acc; }
        const { stateConfig: accumulatedStateConfig, ...accumulatedStoreConfigOptions } = acc;
        const { stateConfig: currentStateConfig, ...currentStoreConfigOptions } = currentData.storeConfig;

        if (this.isInDebugMode) {
          const accumulatedStateKeys = Object.keys(accumulatedStateConfig || {});
          const currentStateKeys = Object.keys(currentStateConfig || {});

          const accumulatedStoreKeys = Object.keys(accumulatedStoreConfigOptions);
          const currentStoreKeys = Object.keys(currentStoreConfigOptions);

          const storeKeysIntersection = accumulatedStoreKeys.filter(x => currentStoreKeys.includes(x));
          const stateKeysIntersection = accumulatedStateKeys.filter(x => currentStateKeys.includes(x));

          // tslint:disable-next-line:max-line-length
          if (storeKeysIntersection.length > 0) { console.warn(`Query Params Store: parameter keys ${storeKeysIntersection} were overridden`); }
          // tslint:disable-next-line:max-line-length
          if (stateKeysIntersection.length > 0) { console.warn(`Query Params Store: parameter keys ${stateKeysIntersection} were overridden`); }
        }

        return {
          ...currentStoreConfigOptions,
          ...accumulatedStoreConfigOptions,
          stateConfig: { ...currentStateConfig, ...accumulatedStateConfig }
        };
      }, storeConfig);
    }

    const noQueryParams = storeConfig.noQueryParams || false;
    let snapshotQueryParams = snapshot.queryParams;
    if (this.useCompression) {
      const key = this.compressionKey || 'q';
      const compressedString = snapshotQueryParams[key];
      if (compressedString) {
        const decompressedString = decompressFromEncodedURIComponent(compressedString);
        try {
          snapshotQueryParams = JSON.parse(decompressedString);
        } catch {
          if (this.isInDebugMode) { console.warn(`Query Params Store: Can't decompress provided value!`); }
          snapshotQueryParams = {};
        }
      }
    }

    const stateConfig = this.parseStateConfig(storeConfig.stateConfig || {});
    const removeUnknown = storeConfig.removeUnknown || false;
    const caseSensitive = storeConfig.hasOwnProperty('caseSensitive') ? storeConfig.caseSensitive : true;

    const allQueryParamsNames = Array.from(new Set(Object.keys(snapshotQueryParams).concat(Object.keys(stateConfig))));
    const allQueryParams = allQueryParamsNames.reduce((acc, queryParamName) => {
      acc[queryParamName] = snapshotQueryParams[queryParamName] || NOT_PRESENT;
      return acc;
    }, {});


    return { noQueryParams, storeConfig, removeUnknown, caseSensitive, allQueryParams, stateConfig };
  }

  private constructStore(snpsht?: ActivatedRouteSnapshot): Observable<T> {
    const stream$ = (snpsht ? of(null, snpsht) : this.snapshot).pipe(
      pairwise(),
      filter(val => !this.redirectUrl || !!val[1]),
      switchMap(s => snpsht ? [s] : this.router.events.pipe(
        // emit the store if we are in the resolve phase (the guard checks passed) or catch the case
        // if we are just chaning a query paramter in an already resolved route (watch for the NavigationEnd)
        first(e => e instanceof ResolveStart || e instanceof NavigationEnd), mapTo(s)),

      ),
      map(([prevSnapshot, snapshot]) => {
        if (!snapshot.data) { return {}; }
        const {
          stateConfig,
          noQueryParams,
          caseSensitive,
          removeUnknown,
          allQueryParams
        } = this.getSnapshotData(snapshot);

        if (noQueryParams && Object.keys(snapshot.queryParams).length !== 0) { this.router.navigateByUrl(this.url); return null; }

        const queryParamsResult = Object.entries(allQueryParams).reduce((queryParams, [paramKey, paramValue]: [string, any]) => {
          // if we have caseSensitive: false we have to skip the NOT_PRESENT set when allQueryParams is generated
          if (paramValue === NOT_PRESENT && queryParams[paramKey]) { return queryParams; }

          let stateConfigForParam = stateConfig[paramKey] as any;
          paramValue = paramValue === NOT_PRESENT ? NOT_PRESENT : decodeURIComponent(paramValue);

          if (!stateConfigForParam && caseSensitive === false) {
            const stateConfigKeys = Object.keys(stateConfig);
            paramKey = stateConfigKeys.find(objKey => paramKey.toLowerCase() === objKey.toLowerCase());
            stateConfigForParam = stateConfig[paramKey];
          }

          if (removeUnknown && !stateConfigForParam) {
            if (this.isInDebugMode) { console.warn(`Query Params Store: removing parameter key: ${paramKey} because it's unknown!`); }
            return { ...queryParams, [paramKey]: { storeValue: null, urlValue: null } };
          } else if (!stateConfigForParam) { return { ...queryParams, [paramKey]: { urlValue: paramValue, storeValue: paramValue } }; }

          const hasAllowedValuesProperty = stateConfigForParam.hasOwnProperty('allowedValues');
          const isAllowedValuesAnArray = Array.isArray(stateConfigForParam.allowedValues);

          const allowedValues = hasAllowedValuesProperty && isAllowedValuesAnArray ?
            stateConfigForParam.allowedValues : null;

          if (hasAllowedValuesProperty && !isAllowedValuesAnArray && this.isInDebugMode) {
            console.warn(`Query Params Store: ignoring allowed values for parameter key: ${paramKey} since it's not an array!`);
          }

          const typeConvertor = stateConfigForParam.typeConvertor;
          // const value = paramValue !== NOT_PRESENT ? +paramValue : NaN;
          const isBinaryBoolean = this.isBinaryBoolean({
            value: stateConfigForParam.originalValue,
            multi: stateConfigForParam.multi,
            typeConvertor
          });
          const stateConfigLength = stateConfigForParam.length;
          const paramConfigValue = stateConfigForParam.hasOwnProperty('value') ? stateConfigForParam.value : stateConfigForParam;

          if (paramValue === NOT_PRESENT) {
            return { ...queryParams, [paramKey]: { urlValue: NOT_PRESENT, storeValue: paramConfigValue } };
          }

          // Binary Boolean Configuration Case
          if (isBinaryBoolean) {
            if (this.isInDebugMode && allowedValues) {
              console.warn(`Query Params Store: Allowed values can't be used with binary boolean values!`);
            }
            const removeInvalid = stateConfigForParam.removeInvalid;
            const isFalseAsString = paramValue === 'false';
            const isTrueAsString = paramValue === 'true';
            const isBooleanAsString = isFalseAsString || isTrueAsString;
            paramValue = isFalseAsString ? 0 : isTrueAsString ? 1 : paramValue;
            const binaryBooleanConversionResult = this.getConvertBinaryBooleanResult(paramValue, stateConfigLength);
            const { binaryBooleanResult, isConvertedCorrectly, isOverflowing } = binaryBooleanConversionResult;

            if (!isConvertedCorrectly || (isOverflowing && removeInvalid)) {
              if (this.isInDebugMode) {
                if (isOverflowing) {
                  // tslint:disable-next-line:max-line-length
                  console.warn(`Query Params Store: removing parameter key: ${paramKey} since ${paramValue} converted to boolean ${binaryBooleanResult.map(r => r.convertedValue).join(',')} is longer than the configured length of ${stateConfigLength} and the property removeInvalid is set to true!`);
                } else {
                  // tslint:disable-next-line:max-line-length
                  console.warn(`Query Params Store: Config value ${paramValue} for parameter key ${paramKey} can't be converted correctly so its replaced with the one from the configuration!`);
                }
              }
              const defaultValue = { storeValue: paramConfigValue, urlValue: null };
              return { ...queryParams, [paramKey]: defaultValue };
            }


            return {
              ...queryParams,
              [paramKey]: {
                storeValue: binaryBooleanResult.map(r => r.convertedValue),
                urlValue: paramValue,
                isNewUrlValue: isBooleanAsString
              }
            };
          }

          // const isMultiToMultiParamTransition = !!(stateConfigForParam.multi && prevSnapshot && prevSnapshot.data
          //   && prevSnapshot.data.storeConfig && prevSnapshot.data.storeConfig.stateConfig &&
          //   prevSnapshot.data.storeConfig.stateConfig[paramKey] && prevSnapshot.data.storeConfig.stateConfig[paramKey].multi);

          // Multi Value Configuration Case
          if (stateConfigForParam.multi) {

            // const isSingleToMultiParamTransition = !!(prevSnapshot && prevSnapshot.data
            //   && prevSnapshot.data.storeConfig && prevSnapshot.data.storeConfig.stateConfig &&
            //   prevSnapshot.data.storeConfig.stateConfig[paramKey] && !prevSnapshot.data.storeConfig.stateConfig[paramKey].multi);

            let conversionResults = paramValue.split(stateConfigForParam.separator)
              .map(v => this.getConvertValueResult(v, typeConvertor));

            const multiCount = typeof stateConfigForParam.multiCount === 'number' ?
              stateConfigForParam.multiCount : paramConfigValue && typeof paramConfigValue.length === 'number' ?
                paramConfigValue.length : conversionResults.length || 0;

            const difference = isBinaryBoolean ? 0 : +multiCount - conversionResults.length;
            if (difference > 0) {
              for (let i = 0; i < difference; i++) {
                // if we have difference in the lengths of the value of the parameter then we either use the default value
                // provided in the config for the selected index or just use a default one
                const conversionResultsIndex = conversionResults.length + i;
                const hasDefaultValueArrayIndex = paramConfigValue.length > conversionResultsIndex;

                conversionResults.push({
                  hasValidConversion: true, convertedValue: hasDefaultValueArrayIndex ? paramConfigValue[conversionResultsIndex] :
                    typeConvertor === String ? '' : typeConvertor === Number ? 0 : false
                });
              }
            } else if (difference < 0) { conversionResults = conversionResults.slice(0, difference); }

            const checkResult = conversionResults.map(v => {
              if (!v.hasValidConversion) { return 'invalid'; }
              if (allowedValues && !allowedValues.includes(v)) { return 'not-allowed'; }
              return null;
            });
            const hasInvalidValue = checkResult.includes('invalid');
            const hasNotAllowedValue = checkResult.includes('not-allowed');

            if (hasInvalidValue || hasNotAllowedValue) {
              if (this.isInDebugMode) {
                if (hasInvalidValue) {
                  // tslint:disable-next-line:max-line-length
                  console.warn(`Query Params Store: parameter key ${paramKey} with value: ${paramValue} can't be converted correctly!`);
                } else {
                  // tslint:disable-next-line:max-line-length
                  console.warn(`Query Params Store: parameter key ${paramKey} with value: ${paramValue} is not found in the allowed values ${allowedValues}!`);
                }
              }
              const defaultValue = { storeValue: paramConfigValue, urlValue: null };
              return { ...queryParams, [paramKey]: defaultValue };
            }

            const invalidURLValue = !!conversionResults.find(r => r.invalidRawConversion);
            const storeValue = conversionResults.map(r => r.convertedValue);
            // here we also provide the difference so if it's > 0 we can correctly redirect bellow
            return { ...queryParams, [paramKey]: { urlValue: paramValue, storeValue, difference, invalidURLValue } };
          }

          // Default (string, number, boolean) Value Configuration Case
          {
            // when using strings hasValidConversion can be true because '10;10' is a valid string so we need to know if we are having
            // a multi to single transition in order to be able to redirect the the correct url
            const isMultiToSingleParamTransition = !!(!stateConfigForParam.multi && prevSnapshot && prevSnapshot.data
              && prevSnapshot.data.storeConfig && prevSnapshot.data.storeConfig.stateConfig &&
              prevSnapshot.data.storeConfig.stateConfig[paramKey] && prevSnapshot.data.storeConfig.stateConfig[paramKey].multi);

            let isValidMultiToSingle = false;
            let invalidURLValue = false;
            let conversionResult = this.getConvertValueResult(paramValue, typeConvertor);
            if ((!conversionResult.hasValidConversion && prevSnapshot && prevSnapshot.data) || isMultiToSingleParamTransition) {
              const { stateConfig: prevStateConfig, allQueryParams: allPrevQueryParams } = this.getSnapshotData(prevSnapshot);
              const prevStateConfigForKey = prevStateConfig[paramKey];
              if (prevStateConfigForKey && prevStateConfigForKey.multi) {
                paramValue = allPrevQueryParams[paramKey] ?
                  allPrevQueryParams[paramKey].split(prevStateConfig[paramKey].separator)[0] :
                  prevStateConfig[paramKey].value[0];

                conversionResult = this.getConvertValueResult(paramValue, typeConvertor);
                isValidMultiToSingle = conversionResult.hasValidConversion;
                invalidURLValue = conversionResult.invalidRawConversion;
              }
            }

            const isAllowed = allowedValues ? allowedValues.includes(conversionResult.convertedValue) : true;
            if (!conversionResult.hasValidConversion || !isAllowed) {
              if (this.isInDebugMode) {
                if (!isAllowed) {
                  // tslint:disable-next-line:max-line-length
                  console.warn(`Query Params Store: parameter key: ${paramKey} with value: ${paramValue} is not found in the allowed values ${allowedValues}!`);
                } else {
                  console.warn(`Query Params Store: parameter key: ${paramKey} with value: ${paramValue} can't be converted correctly!`);
                }
              }
              const defaultValue = { storeValue: paramConfigValue, urlValue: null };
              return { ...queryParams, [paramKey]: defaultValue };
            }
            const storeValue = conversionResult.convertedValue;
            // if isValidMultiToSingle is true then we need to set isNewUrlValue to true so we can change the URL bellow
            return {
              ...queryParams, [paramKey]: {
                urlValue: paramValue,
                storeValue,
                isNewUrlValue: isValidMultiToSingle,
                invalidURLValue
              }
            };
          }

        }, {});

        // Redirect if needed and send the new store
        {
          const mustChangeUrl = !!Object.values(queryParamsResult).find(
            (v: any) => v.urlValue === null || v.isNewUrlValue || v.difference || v.invalidURLValue
          );

          if (mustChangeUrl) {
            const queryParamsTupleArray = Object.entries(queryParamsResult).reduce(
              (acc, [key, { urlValue, difference, storeValue, isNewUrlValue, invalidURLValue }]: [string, any]) => {
                if (isNewUrlValue || invalidURLValue || ![null, NOT_PRESENT].includes(urlValue)) {
                  const currentConfig = stateConfig[key];
                  if (!currentConfig) { return acc; }
                  const separator = currentConfig.separator;
                  if (invalidURLValue) {
                    urlValue = currentConfig.multi ? storeValue.join(separator) : storeValue;
                    difference = 0;
                  }
                  if (typeof difference === 'number' && difference !== 0) {
                    const currentUrlValueArray = urlValue.split(separator);
                    if (difference > 0) {
                      for (let i = 0; i < difference; i++) {
                        urlValue = `${urlValue}${separator}${storeValue[currentUrlValueArray.length + i]}`;
                      }
                    } else {
                      urlValue = `${currentUrlValueArray.slice(0, difference).join(separator)}`;
                    }
                  }
                  return acc.concat([[key, urlValue]]);
                }
                return acc;
              }, []
            );

            let redirectUrl = null;

            if (this.useCompression) {
              const queryParamsObject = queryParamsTupleArray.reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
              }, {});
              const compressedQueryParams = compressQueryParams(queryParamsObject);
              redirectUrl =
                `${this.url}${queryParamsTupleArray.length > 0 ? `?${this.compressionKey || 'q'}=${compressedQueryParams}` : ''}`;
            } else {
              const queryParamsArray = queryParamsTupleArray.reduce((acc, [key, value]) => acc.concat(`${key}=${value}`), []);
              redirectUrl = `${this.url}${queryParamsTupleArray.length > 0 ? '?' + queryParamsArray.join('&') : ''}`;
            }
            this.router.navigateByUrl(redirectUrl);
            this.redirectUrl = redirectUrl;
            return undefined;
          }

          const store = Object.entries(queryParamsResult).reduce((acc, [key, data]: [string, any]) => {
            acc[key] = data.storeValue;
            return acc;
          }, {});
          return store;
        }

      }),
    ).pipe(filter(val => !!val));

    return stream$ as any;
  }

  constructor(public router: Router, @Inject(QPS_CONFIG) config: IQueryParamsStoreModuleConfig) {
    this.snapshot.next(null);
    this.isInDebugMode = !!config && config.debug;
    this.useCompression = !!config && config.useCompression;
    this.compressionKey = !!config && config.compressionKey;
  }

  public _constructHandler() {
    if (this.subscription) { return; }
    this.subscription = this.router.events.pipe(
      filter(event => !(event instanceof ActivationEnd)),
      tap(event => {
        if (event instanceof NavigationStart) {
          this.prevFullUrl = this.fullUrl || '';
          this.fullUrl = event.url;
          this.url = decodeURIComponent(/[^?]+/.exec(event.url)[0]);
        } else if (event instanceof RoutesRecognized) {
          this.url = decodeURIComponent(/[^?]+/.exec(event.urlAfterRedirects)[0]);
        } else if (event instanceof NavigationCancel) {
          this.fullUrl = this.prevFullUrl;
        } else if (event instanceof NavigationEnd) {
          this.redirectUrl = null;
        }
      }),
      filter(event => !!(event as any).snapshot),
      map(event => {
        let currSnapshot = (event as any).snapshot;
        while (currSnapshot && currSnapshot.children.length !== 0) {
          currSnapshot = currSnapshot.children.find(childSnapshot => {
            return this.url === '/' && childSnapshot.url.length === 0
              || !!childSnapshot.url.find(segment => this.url.includes(segment.path));
          });
        }
        return currSnapshot;
      }),
      filter(val => !!val),
      distinctUntilChanged()
    ).subscribe(this.snapshot);

    this.store = this.constructStore().pipe(shareReplay(1));
  }

  select<R = any>(
    selector: string | SelectorFn<R>,
    disableDistinctUntilChanged: boolean = false,
    compare?: (x: any, y: any) => boolean,
  ): Observable<R> {
    const fn = typeof selector === 'function' ? selector : state => state[selector];
    let select = this.store.pipe(map(fn));
    if (!disableDistinctUntilChanged) {
      select = select.pipe(distinctUntilChanged(compare));
    }
    return select;
  }

  private _match(
    snapshot: ActivatedRouteSnapshot,
    allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>,
    navigateTo?: string,
    isDeactivate = false
  ): Observable<boolean> {
    if (!(allowedValues instanceof Observable)) { allowedValues = observableOf(allowedValues); }
    if (navigateTo === this.fullUrl) {
      throw new Error('Navigating to the same route will result into infinite loop!');
    }
    return this.constructStore(snapshot).pipe(
      withLatestFrom(allowedValues),
      map(([queryParams, allowedValuesObj]) => {
        let successfulMatch = true;
        let redirectQueryParams = {};
        for (const [name, value] of Object.entries(queryParams)) {
          const config = allowedValuesObj[name];
          if (!config) { continue; }
          const { match, default: defaultValue } = config;
          const isCurrentMatch = (Array.isArray(match) ? match.includes(value) : value === match);
          if (!isCurrentMatch && defaultValue) {
            redirectQueryParams = { ...redirectQueryParams, [name]: defaultValue };
          }
          successfulMatch = successfulMatch && isCurrentMatch;
        }
        if (!successfulMatch && typeof navigateTo === 'string') {
          if (navigateTo !== this.prevFullUrl) { this.router.navigateByUrl(navigateTo); }
        }
        return successfulMatch;
      }),
    );
  }

  canActivate(allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>, currentSnapshot: ActivatedRouteSnapshot) {
    return this._match(currentSnapshot, allowedValues, this.prevFullUrl).pipe(first());
  }

  canDeactivate(
    allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>,
    currentSnapshot: ActivatedRouteSnapshot,
    routerSnapshot: RouterStateSnapshot,
  ) {
    return this._match(currentSnapshot, allowedValues, routerSnapshot.url, true).pipe(first());
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
