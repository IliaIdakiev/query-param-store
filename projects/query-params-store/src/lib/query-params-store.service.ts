import { Injectable, OnDestroy } from '@angular/core';
import { Router, RoutesRecognized, NavigationStart, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Subject, ReplaySubject, Subscription, of } from 'rxjs';
import { map, distinctUntilChanged, filter, tap } from 'rxjs/operators';
import { IQueryParamsStoreData } from './query-params-store-route';

@Injectable({
  providedIn: 'root'
})
export class QueryParamsStoreService<T> implements OnDestroy {

  isAlive: Subject<any> = new Subject<any>();
  store: ReplaySubject<T> = new ReplaySubject<T>();
  state: T;
  stateUrl: string;
  defaultValues: any = {};
  subscription: Subscription;

  constructor(public router: Router) {
    this.constructHandler();
  }

  private constructHandler() {
    if (this.subscription) { return; }
    this.subscription = this.router.events.pipe(
      tap(event => {
        if (event instanceof NavigationStart) {
          this.state = {} as T;
          [this.stateUrl] = /[^?]+/.exec(event.url);
        }
      }),
      filter((event) => !!(event as any).snapshot && (event as any).snapshot.firstChild === null),
      distinctUntilChanged((cUrl, pUrl) => cUrl === pUrl),
      map(({ snapshot }: any) => {
        const data: IQueryParamsStoreData<any> = snapshot ?
          snapshot.data : { queryParamsConfig: { defaultValues: {}, removeUnknown: false } };
        if (data.queryParamsConfig && data.queryParamsConfig.noQueryParams) {
          this.router.navigate([this.stateUrl], { queryParams: {} });
          return null;
        }
        const { defaultValues = {}, noQueryParams = false, removeUnknown = false } =
          (data.queryParamsConfig || { defaultValues: {}, noQueryParams: false, removeUnknown: false });
        const allDefaultValues = snapshot.pathFromRoot.reduce(function (acc, curr) {
          const currData = curr.data;
          if (!currData || !currData.queryParamsConfig) { return acc; }
          return { ...acc, ...(currData.queryParamsConfig.defaultValues || {}) };
        }, defaultValues);

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
            const converter = keyTypeConverter[key] || String;
            const newValue = converter(decodeURIComponent(value));
            const isValidNumber = converter === Number && !Number.isNaN(newValue);
            const isValidString = converter === String && typeof newValue === 'string';
            if (isValidNumber || isValidString) {
              acc[key] = newValue;
            } else {
              acc[key] = flatDefaultValues[key];
              result.errors = {
                ...result.errors,
                [key]: `Invalid ${!isValidNumber ? 'number' : 'string'}`
              };
            }
          } else if (data.queryParamsConfig.removeUnknown) {
            result.errors = {
              ...result.errors,
              [key]: 'Unknown param'
            };
          }
          return acc;
        }, {});
        result.queryParams = queryParams;
        return result;
      }),
      filter(val => !!val)
    ).subscribe(({ queryParams, errors, flatDefaultValues }) => {

      const errorKeys = Object.keys(errors);
      const queryParamsCleanup = errorKeys.reduce((acc, key) => {
        acc[key] = undefined;
        return acc;
      }, {});

      if (errorKeys.length !== 0) {
        this.router.navigate([this.stateUrl], { queryParams: { ...queryParams, ...queryParamsCleanup }, queryParamsHandling: 'merge' });
        return;
      }

      this.state = Object.assign({}, this.state, flatDefaultValues, queryParams);
      this.store.next(this.state);
    });
  }

  ngOnDestroy() {
    this.isAlive.next();
    this.isAlive.complete();
  }
}
