import { Injectable, OnDestroy } from '@angular/core';
import {
  Router,
  NavigationStart,
  ActivationEnd,
  ActivatedRouteSnapshot,
  RoutesRecognized,
  DefaultUrlSerializer,
  NavigationEnd,
  RouterStateSnapshot,
  NavigationCancel
} from '@angular/router';
import { ReplaySubject, Subscription, Observable, of as observableOf, Subject, BehaviorSubject } from 'rxjs';
import { map, filter, tap, distinctUntilChanged, withLatestFrom, skip, first, switchMap, pairwise } from 'rxjs/operators';
import { IQueryParamsStoreData, IAllowedValuesConfig } from './interfaces-and-types';

type SelectorFn<T> = (any) => T;

@Injectable({
  providedIn: 'root'
})
export class QueryParamsStore<T = any> implements OnDestroy {

  private _snapshot: ReplaySubject<ActivatedRouteSnapshot> = new ReplaySubject<ActivatedRouteSnapshot>(2);
  private _skip: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  url: string;
  fullUrl: string;
  prevFullUrl: string;
  subscription: Subscription;
  currentGuards: [] = [];

  parseUrl(url: string) {
    return new DefaultUrlSerializer().parse(url);
  }

  get store(): Observable<T> {
    return this._snapshot.pipe(
      skip(1),
      filter(val => !!val),
      map(snapshot => {
        const data: IQueryParamsStoreData = snapshot.data ||
          { queryParamsConfig: { defaultValues: {}, noQueryParams: false, removeUnknown: false } };

        if (data.queryParamsConfig && data.queryParamsConfig.noQueryParams) {
          const parsedURL = this.parseUrl(this.url);
          this.router.navigateByUrl(parsedURL, {
            queryParams: {}
          });
          return null;
        }

        const { defaultValues = {}, noQueryParams = false, removeUnknown = false, inherit = true } = data.queryParamsConfig || {};

        const allDefaultValues = inherit ? snapshot.pathFromRoot.reduce(function (acc, curr) {
          const currData = curr.data;
          if (!currData || !currData.queryParamsConfig) { return acc; }
          return { ...acc, ...(currData.queryParamsConfig.defaultValues || {}) };
        }, defaultValues) : defaultValues;

        const supportedKeys = Object.keys(allDefaultValues);

        const keyTypeConverter = supportedKeys.reduce((acc, key) => {
          const defaultValue = allDefaultValues[key];
          acc[key] = defaultValue.typeConvertor ||
            (typeof defaultValue === 'number' ? Number : typeof defaultValue === 'boolean' ? Boolean : String);
          return acc;
        }, {});

        const flatDefaultValues = supportedKeys.reduce((acc, key) => {
          const currentValue = allDefaultValues[key];
          acc[key] = currentValue.value !== undefined ?
            currentValue.multi && currentValue.value !== null ? `${currentValue.value}`
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
            const keyAllowedValues = keyConfig.allowedValues;
            (keyConfig && keyConfig.multi ?
              decodedValue.split(keyConfig.separator || ';') : [decodedValue]).forEach(currentDecodedValue => {
                const converter = keyTypeConverter[key] || String;
                const isBoolean = ['true', 'false'].includes(currentDecodedValue) && converter === Boolean;
                const convertedValue = converter(isBoolean ? currentDecodedValue === 'true' ? 1 : 0 : currentDecodedValue);
                const isValidNumber = converter === Number && !Number.isNaN(convertedValue);
                const isValidString = converter === String && typeof convertedValue === 'string';
                const isValidBoolean = converter === Boolean && typeof convertedValue === 'boolean';
                if ((isValidNumber || isValidString || isValidBoolean) &&
                  (!keyAllowedValues || keyAllowedValues.includes(convertedValue))) {
                  if (keyConfig && keyConfig.multi) {
                    acc[key] = (acc[key] || []).concat(convertedValue);
                  } else {
                    acc[key] = convertedValue;
                  }
                } else {
                  acc[key] = flatDefaultValues[key];
                  result.errors = {
                    ...result.errors,
                    [key]: `Invalid ${!isValidNumber ? 'number' : 'string'}`
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
          const parsedURL = this.parseUrl(this.url);
          this.router.navigateByUrl(parsedURL, {
            queryParams: { ...result.queryParams, ...queryParamsCleanup },
            queryParamsHandling: 'merge'
          });
          return;
        }

        return Object.assign({}, flatDefaultValues, result.queryParams);
      }),
      filter(val => !!val)
    );
  }

  constructor(public router: Router) {
    this.constructHandler();
    this._snapshot.next(null);
  }

  private constructHandler() {
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
            return this.url === '/' && childSnapshot.url.length === 0
              || !!childSnapshot.url.find(segment => this.url.includes(segment.path));
          });
        }
        return currSnapshot;
      }),
      filter(val => !!val),
      distinctUntilChanged()
    ).subscribe((snapshot) => {
      this._snapshot.next(snapshot);
    });
  }

  select<R = any>(selector: string | SelectorFn<R>): Observable<R> {
    const fn = typeof selector === 'string' ? state => state[selector] : selector;
    return this.store.pipe(map(fn));
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
          if (navigateTo === this.prevFullUrl && prevSnapshot) {
            if (!isDeactivate) {
              this._skip.next(true);
              this._snapshot.next(prevSnapshot);
            }
          } else {
            const parsedURL = this.parseUrl(navigateTo);
            this.router.navigateByUrl(parsedURL);
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
