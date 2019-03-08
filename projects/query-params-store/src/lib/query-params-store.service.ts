import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationStart, ActivationEnd, ActivatedRouteSnapshot, RoutesRecognized } from '@angular/router';
import { ReplaySubject, Subscription, Observable, } from 'rxjs';
import { map, filter, tap, distinctUntilChanged } from 'rxjs/operators';
import { IQueryParamsStoreData } from './query-params-store-route';

@Injectable({
  providedIn: 'root'
})
export class QueryParamsStore<T> implements OnDestroy {

  private _snapshot: ReplaySubject<any> = new ReplaySubject<any>(1);
  url: string;
  subscription: Subscription;

  get store(): Observable<T> {
    return this._snapshot.pipe(
      filter(val => !!val),
      map((snapshot: any) => {
        const data: IQueryParamsStoreData<any> = snapshot.data ||
          { queryParamsConfig: { defaultValues: {}, noQueryParams: false, removeUnknown: false } };

        if (data.queryParamsConfig && data.queryParamsConfig.noQueryParams) {
          this.router.navigate([this.url], { queryParams: {} });
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
          acc[key] = currentValue.value !== undefined ? currentValue.value : currentValue;
          return acc;
        }, {});

        const result = { errors: {}, queryParams: null, flatDefaultValues };

        const queryParams = Object.entries(snapshot.queryParams).reduce((acc, match: [string, string]) => {
          const [key, value] = match;
          if (supportedKeys.includes(key) || (!noQueryParams && !removeUnknown)) {
            const decodedValue = decodeURIComponent(value);
            const keyConfig = allDefaultValues[key];
            (keyConfig.multi ? decodedValue.split(keyConfig.separator || ';') : [decodedValue]).forEach(currentDecodedValue => {
              const converter = keyTypeConverter[key] || String;
              const newValue = converter(currentDecodedValue);
              const isValidNumber = converter === Number && !Number.isNaN(newValue);
              const isValidString = converter === String && typeof newValue === 'string';
              if (isValidNumber || isValidString) {
                if (keyConfig.multi) {
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
          this.router.navigate(
            [this.url], { queryParams: { ...result.queryParams, ...queryParamsCleanup }, queryParamsHandling: 'merge' }
          );
          return;
        }

        return Object.assign({}, result.flatDefaultValues, result.queryParams);
      }));
  }

  constructor(public router: Router) {
    this.constructHandler();
  }

  private constructHandler() {
    if (this.subscription) { return; }
    this.subscription = this.router.events.pipe(
      filter(event => !(event instanceof ActivationEnd)),
      tap(event => {
        if (event instanceof NavigationStart) {
          [this.url] = /[^?]+/.exec(event.url);
        } else if (event instanceof RoutesRecognized) {
          [this.url] = /[^?]+/.exec(event.urlAfterRedirects);
        }
      }),
      filter((event) => {
        const snapshot = (event as any).snapshot;
        return !!snapshot;
      }),
      map(({ snapshot }: { snapshot: ActivatedRouteSnapshot }) => {
        let currSnapshot = snapshot;
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

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
