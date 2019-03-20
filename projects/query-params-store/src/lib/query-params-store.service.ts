import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationStart, ActivationEnd, ActivatedRouteSnapshot, RoutesRecognized, DefaultUrlSerializer } from '@angular/router';
import { ReplaySubject, Subscription, Observable, of as observableOf, Subject } from 'rxjs';
import { map, filter, tap, distinctUntilChanged, withLatestFrom, skip, first, switchMap, pairwise } from 'rxjs/operators';
import { IQueryParamsStoreData, IAllowedValuesConfig } from './interfaces-and-types';

type SelectorFn<T> = (any) => T;

@Injectable({
  providedIn: 'root'
})
export class QueryParamsStore<T = any> implements OnDestroy {

  private _snapshot: ReplaySubject<ActivatedRouteSnapshot> = new ReplaySubject<ActivatedRouteSnapshot>(2);
  url: string;
  prevUrl: string;
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
          acc[key] = defaultValue.typeConvertor || (typeof defaultValue === 'number' ? Number : String);
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
            (keyConfig && keyConfig.multi ?
              decodedValue.split(keyConfig.separator || ';') : [decodedValue]).forEach(currentDecodedValue => {
                const converter = keyTypeConverter[key] || String;
                const newValue = converter(currentDecodedValue);
                const isValidNumber = converter === Number && !Number.isNaN(newValue);
                const isValidString = converter === String && typeof newValue === 'string';
                if (isValidNumber || isValidString) {
                  if (keyConfig && keyConfig.multi) {
                    acc[key] = (acc[key] || []).concat(newValue);
                  } else {
                    acc[key] = newValue;
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
      tap((event) => {
        if (event instanceof NavigationStart) {
          this.prevUrl = this.url || '';
          this.url = decodeURIComponent(/[^?]+/.exec(event.url)[0]);
        } else if (event instanceof RoutesRecognized) {
          this.url = decodeURIComponent(/[^?]+/.exec(event.urlAfterRedirects)[0]);
        }
      }),
      filter((event) => {
        const snapshot = (event as any).snapshot;
        return !!snapshot;
      }),
      switchMap(event => this._snapshot.pipe(first(), map(prevSnapshot => ([event, prevSnapshot])))),
      map(([event, prevSnapshot]) => {
        console.log(prevSnapshot, 'prev snapshot');
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

  match(allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>): Observable<boolean> {
    if (!(allowedValues instanceof Observable)) { allowedValues = observableOf(allowedValues); }
    return this.store.pipe(
      withLatestFrom(allowedValues, this._snapshot.pipe(pairwise())),
      map(([queryParams, allowedValuesObj, [prevSnapshot, _currentSnapshot]]) => {
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
        if (!successfulMatch) {
          if (prevSnapshot) {
            setTimeout(() => {
              this._snapshot.next(prevSnapshot);
            }, 0);
          } else {
            const parsedURL = this.parseUrl(this.prevUrl);
            this.router.navigateByUrl(parsedURL);
          }
        }
        return successfulMatch;
      }),
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
