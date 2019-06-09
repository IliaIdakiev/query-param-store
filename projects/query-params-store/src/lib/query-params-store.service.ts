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
import { map, filter, tap, distinctUntilChanged, withLatestFrom, first, pairwise, startWith } from 'rxjs/operators';
import { IQueryParamsStoreData, IAllowedValuesConfig } from './interfaces-and-types';

type SelectorFn<T> = (any) => T;

@Injectable({
  providedIn: 'root'
})
export class QueryParamsStore<T = any> implements OnDestroy {

  private _snapshot: ReplaySubject<ActivatedRouteSnapshot> = new ReplaySubject<ActivatedRouteSnapshot>(2);
  private _skip: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _subscription: Subscription;
  private _url: string;
  private _fullUrl: string;
  private _prevFullUrl: string;
  private _redirectUrl: string;

  get store() {
    return this.getStore();
  }

  get prevStore() {
    return this.getStore(true);
  }

  private getStore(previous = false): Observable<T> {
    const stream$ = this._snapshot.pipe(
      startWith(null),
      pairwise(),
      map(([prev, curr]) => !previous ? curr : prev),
      filter(val => !!val),
      map(snapshot => {
        const data: IQueryParamsStoreData = snapshot.data ||
          { queryParamsConfig: { defaultValues: {}, noQueryParams: false, removeUnknown: false } };

        if (data.queryParamsConfig && data.queryParamsConfig.noQueryParams) {
          this.router.navigateByUrl(this._url);
          return null;
        }

        const { defaultValues = {}, noQueryParams = false, removeUnknown = false, inherit = true } = data.queryParamsConfig || {};

        const allDefaultValues = inherit ? snapshot.pathFromRoot.reduce(function (acc, curr) {
          const currData = curr.data;
          if (!currData || !currData.queryParamsConfig) { return acc; }
          return { ...acc, ...(currData.queryParamsConfig.defaultValues || {}) };
        }, defaultValues) : defaultValues;

        let supportedKeys = Object.keys(allDefaultValues);

        const keyTypeConverter = supportedKeys.reduce((acc, key) => {
          const defaultValue = allDefaultValues[key];
          if (defaultValue === null || defaultValue === undefined) {
            console.warn(`Query Params Store > Invalid value '${defaultValue}' for key '${key}'`);
            return acc;
          }
          acc[key] = defaultValue.typeConvertor ||
            (typeof defaultValue === 'number' ? Number : typeof defaultValue === 'boolean' ? Boolean : String);
          return acc;
        }, {});

        supportedKeys = Object.keys(keyTypeConverter);

        const flatDefaultValues = supportedKeys.reduce((acc, key) => {
          const currentValue = allDefaultValues[key];
          acc[key] = typeof currentValue === 'object' ?
            currentValue.multi && currentValue.value !== null ?
              (currentValue.value === '' || currentValue.value === undefined) ? [] : `${currentValue.value}`
                .split(currentValue.separator || ';').map(val => (currentValue.typeConvertor || String)(val)) :
              currentValue.value : currentValue;
          return acc;
        }, {});

        const result = { errors: {}, queryParams: null };

        const queryParams = Object.entries(snapshot.queryParams).reduce((acc, match: [string, string]) => {
          const [key, value] = match;
          if (supportedKeys.includes(key) || (!noQueryParams && !removeUnknown)) {
            const decodedValue = decodeURIComponent(value);
            const keyConfig = allDefaultValues[key];
            (keyConfig && keyConfig.multi ?
              decodedValue.split(keyConfig.separator || ';') : [decodedValue]).forEach(currentDecodedValue => {
                const converter = keyTypeConverter[key] || String;
                const isBoolean = ['true', 'false'].includes(currentDecodedValue) && converter === Boolean;
                const convertedValue = converter(isBoolean ? currentDecodedValue === 'true' ? 1 : 0 : currentDecodedValue);
                const isValidNumber = converter === Number && !Number.isNaN(convertedValue);
                const isValidString = converter === String && typeof convertedValue === 'string';
                const isValidBoolean = converter === Boolean && typeof convertedValue === 'boolean';
                if ((isValidNumber || isValidString || isValidBoolean) &&
                  (!keyConfig || !keyConfig.allowedValues || keyConfig.allowedValues.includes(convertedValue))) {
                  if (keyConfig && keyConfig.multi) {
                    acc[key] = (acc[key] || []).concat(convertedValue);
                  } else {
                    acc[key] = convertedValue;
                  }
                } else {
                  acc[key] = flatDefaultValues[key];
                  result.errors = {
                    ...result.errors,
                    [key]: `Invalid value`
                  };
                }
              });
          } else if (data.queryParamsConfig.removeUnknown) {
            result.errors = {
              ...result.errors,
              [key]: 'Unknown param'
            };
          }
          return acc;
        }, {});

        result.queryParams = queryParams;

        const errorKeys = Object.keys(result.errors);
        const queryParamsCleanup = errorKeys.reduce((acc, key) => {
          acc[key] = undefined;
          return acc;
        }, {});

        if (errorKeys.length !== 0) {
          // router.navigateByUrl(url, extras) skips the { queryParams } that are provided inside the extras
          // https://github.com/angular/angular/issues/22668
          if (!this._redirectUrl) {
            // TODO: extract this to a tap
            const queryParamsArray = Object.entries({ ...result.queryParams, ...queryParamsCleanup })
              .reduce((arr, [currKey, currValue]) => currValue ? arr.concat(`${currKey}=${currValue}`) : arr, []);
            const redirectUrl = `${this._url}${queryParamsArray.length > 0 ? '?' + queryParamsArray.join('&') : ''}`;
            this.router.navigateByUrl(redirectUrl);
            this._redirectUrl = redirectUrl;
          }
          return;
        }
        return Object.assign({}, flatDefaultValues, result.queryParams);
      }),
    ).pipe(filter(val => val !== undefined));
    if (previous) {
      return stream$.pipe(startWith(null));
    }
    return stream$;
  }

  constructor(public router: Router) {
    this._constructHandler();
    this._snapshot.next(null);
  }

  private _constructHandler() {
    if (this._subscription) { return; }
    this._subscription = this.router.events.pipe(
      filter(event => !(event instanceof ActivationEnd)),
      tap(event => {
        if (event instanceof NavigationStart) {
          this._prevFullUrl = this._fullUrl || '';
          this._fullUrl = event.url;
          this._url = decodeURIComponent(/[^?]+/.exec(event.url)[0]);
        } else if (event instanceof RoutesRecognized) {
          this._url = decodeURIComponent(/[^?]+/.exec(event.urlAfterRedirects)[0]);
        } else if (event instanceof NavigationCancel) {
          this._fullUrl = this._prevFullUrl;
        } else if (event instanceof NavigationEnd) {
          this._redirectUrl = null;
        }
      }),
      filter(event => {
        const snapshot = (event as any).snapshot;
        return !!snapshot;
      }),
      map(event => {
        let currSnapshot = (event as any).snapshot;
        while (currSnapshot && currSnapshot.children.length !== 0) {
          currSnapshot = currSnapshot.children.find(childSnapshot => {
            return this._url === '/' && childSnapshot.url.length === 0
              || !!childSnapshot.url.find(segment => this._url.includes(segment.path));
          });
        }
        return currSnapshot;
      }),
      filter(val => !!val),
      distinctUntilChanged()
    ).subscribe(this._snapshot);
  }

  select<R = any>(selector: string | SelectorFn<R>): Observable<R> {
    const fn = typeof selector === 'function' ? selector : state => state[selector];
    return this.getStore().pipe(map(fn));
  }

  private _match(
    allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>,
    navigateTo?: string,
    isDeactivate = false
  ): Observable<boolean> {
    if (!(allowedValues instanceof Observable)) { allowedValues = observableOf(allowedValues); }
    if (navigateTo === this._fullUrl) {
      throw new Error('Navigating to the same route will result into infinite loop!');
    }
    return this.getStore().pipe(
      withLatestFrom(this._skip, allowedValues, this._snapshot.pipe(pairwise())),
      tap(([, shouldSkip]) => { if (shouldSkip) { this._skip.next(false); } }),
      filter(([, shouldSkip]) => !shouldSkip),
      map(([queryParams, _shouldSkip, allowedValuesObj, [prevSnapshot, _currentSnapshot]]) => {
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
          if (navigateTo === this._prevFullUrl && prevSnapshot) {
            if (!isDeactivate) {
              this._skip.next(true);
              this._snapshot.next(prevSnapshot);
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
    return this._match(allowedValues, this._prevFullUrl).pipe(first());
  }

  canDeactivate(allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>, currentSnapshot: RouterStateSnapshot) {
    return this._match(allowedValues, currentSnapshot.url, true).pipe(first());
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }
}
