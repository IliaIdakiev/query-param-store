import { Injectable, OnDestroy } from '@angular/core';
import {
  Router,
  NavigationStart,
  ActivationEnd,
  ActivatedRouteSnapshot,
  RoutesRecognized,
  RouterStateSnapshot,
  NavigationCancel,
  NavigationEnd
} from '@angular/router';
import { ReplaySubject, Subscription, Observable, of as observableOf, BehaviorSubject } from 'rxjs';
import { map, filter, tap, distinctUntilChanged, withLatestFrom, first, pairwise, startWith, shareReplay, switchMap, mapTo } from 'rxjs/operators';
import {
  IAllowedValuesConfig,
  IQueryParamsStoreConfig,
  IStateConfig,
  QueryParamsStoreDefaultValue
} from './interfaces-and-types';

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
  private skip: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private subscription: Subscription;
  private url: string;
  private fullUrl: string;
  private prevFullUrl: string;
  private redirectUrl: string;

  private isInDebugMode = true;

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
    const convertedValue = typeConvertor(isBoolean ? value === 'true' ? 1 : 0 : value);
    const isValidNumber = typeConvertor === Number && !Number.isNaN(convertedValue);
    const isValidString = typeConvertor === String && typeof convertedValue === 'string';
    const isValidBoolean = isTypeConverterBoolean && typeof convertedValue === 'boolean';

    const hasValidConversion = isValidNumber || isValidString || isValidBoolean;
    return { hasValidConversion, convertedValue };
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
        acc[key] = { value: configForKey, typeConvertor, multi: false };
        return acc;
      }

      if (!configForKey.hasOwnProperty('value')) {
        // missing the value property => remove invalid configuration
        if (this.isInDebugMode) { console.warn(`Query Params Store: Invalid configuration for parameter key ${key}! (value is missing)`); }
        return acc;
      }

      let value = (configForKey as any).value;

      if (!['number', 'string', 'boolean'].includes(typeof value) && value !== null) {
        // value is not in the supported type => remove invalid configuration
        if (this.isInDebugMode) {
          // tslint:disable-next-line:max-line-length
          console.warn(`Query Params Store: Invalid value configuration forparameter key ${key}! (value can be number, string, boolean or null)`);
        }
        return acc;
      }

      const isMultiValueConfig = (configForKey as any).multi || false;
      const isBinaryBoolean = this.isBinaryBoolean({ value, typeConvertor, multi: isMultiValueConfig });

      if (isBinaryBoolean) {
        if (!configForKey.hasOwnProperty('length')) {
          // missing the length property => remove invalid configuration
          // tslint:disable-next-line:max-line-length
          if (this.isInDebugMode) { console.warn(`Query Params Store: Invalid configuration for parameter key ${key}! (length is missing)`); }
          return acc;
        }

        const configForKeyLength = +(configForKey as any).length;
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
      }

      if (Array.isArray(value)) { value = value.map(typeConvertor); }

      acc[key] = {
        ...(configForKey as any),
        typeConvertor,
        value,
        multi: isMultiValueConfig,
        separator: (configForKey as any).separator || ';'
      };

      return acc;
    }, {});
  }

  private isBinaryBoolean(cfg: any) {
    return (typeof cfg.value === 'number' ||
      (Array.isArray(cfg.value) && cfg.value.reduce((acc, curr) => acc && typeof curr === 'boolean', true))) &&
      (cfg.typeConvertor === Boolean || cfg.typeConvertor === booleanTypeConverter) &&
      cfg.multi;
  }

  private constructStore(previous = false): Observable<T> {
    const stream$ = this.snapshot.pipe(
      pairwise(),
      map(([prev, curr]) => !previous ? curr : prev),
      filter(val => !this.redirectUrl || !!val),
      switchMap(s => this.router.events.pipe(first(e => e instanceof NavigationEnd), mapTo(s))),
      map(snapshot => {
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
        if (noQueryParams) { this.router.navigateByUrl(this.url); return null; }


        const stateConfig = this.parseStateConfig(storeConfig.stateConfig || {});
        const removeUnknown = storeConfig.removeUnknown || false;
        const caseSensitive = storeConfig.hasOwnProperty('caseSensitive') ? storeConfig.caseSensitive : true;

        const snapshotQueryParams = snapshot.queryParams;
        const allQueryParamsNames = Array.from(new Set(Object.keys(snapshotQueryParams).concat(Object.keys(stateConfig))));
        const allQueryParams = allQueryParamsNames.reduce((acc, queryParamName) => {
          acc[queryParamName] = snapshotQueryParams[queryParamName] || NOT_PRESENT;
          return acc;
        }, {});

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
          const isBinaryBoolean = this.isBinaryBoolean(stateConfigForParam);
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


            return { ...queryParams, [paramKey]: { storeValue: binaryBooleanResult.map(r => r.convertedValue), urlValue: paramValue } };
          }

          // Multi Value Configuration Case
          if (stateConfigForParam.multi) {
            const conversionResults = paramValue.split(stateConfigForParam.separator)
              .map(v => this.getConvertValueResult(v, typeConvertor));

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

            const storeValue = conversionResults.map(r => r.convertedValue);
            return { ...queryParams, [paramKey]: { urlValue: paramValue, storeValue } };
          }

          // Default (string, number, boolean) Value Configuration Case
          {
            const conversionResult = this.getConvertValueResult(paramValue, typeConvertor);
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
            return { ...queryParams, [paramKey]: { urlValue: paramValue, storeValue } };
          }

        }, {});

        {
          const mustCleanUrl = !!Object.values(queryParamsResult).find((v: any) => v.urlValue === null);

          if (mustCleanUrl) {
            const queryParamsStringsArray = Object.entries(queryParamsResult).reduce((acc, [key, { urlValue }]: [string, any]) => {
              if (![null, NOT_PRESENT].includes(urlValue)) { return acc.concat(`${key}=${urlValue}`); }
              return acc;
            }, []);
            const redirectUrl = `${this.url}${queryParamsStringsArray.length > 0 ? '?' + queryParamsStringsArray.join('&') : ''}`;
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

    if (previous) { return stream$.pipe(startWith(null as string)) as any; }
    return stream$ as any;
  }

  constructor(public router: Router) {
    this.snapshot.next(null);
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
    allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>,
    navigateTo?: string,
    isDeactivate = false
  ): Observable<boolean> {
    if (!(allowedValues instanceof Observable)) { allowedValues = observableOf(allowedValues); }
    if (navigateTo === this.fullUrl) {
      throw new Error('Navigating to the same route will result into infinite loop!');
    }
    return this.store.pipe(
      withLatestFrom(this.skip, allowedValues, this.snapshot.pipe(pairwise())),
      tap(([, shouldSkip]) => { if (shouldSkip) { this.skip.next(false); } }),
      filter(([, shouldSkip]) => !shouldSkip),
      map(([queryParams, , allowedValuesObj, [prevSnapshot]]) => {
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
          if (navigateTo === this.prevFullUrl && prevSnapshot) {
            if (!isDeactivate) {
              this.skip.next(true);
              this.snapshot.next(prevSnapshot);
            }
          } else {
            this.router.navigateByUrl(navigateTo);
          }
        }
        return successfulMatch;
      }),
    );
  }

  match(allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>) {
    return this._match(allowedValues);
  }

  canActivate(allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>) {
    return this._match(allowedValues, this.prevFullUrl).pipe(first());
  }

  canDeactivate(allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>, currentSnapshot: RouterStateSnapshot) {
    return this._match(allowedValues, currentSnapshot.url, true).pipe(first());
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
