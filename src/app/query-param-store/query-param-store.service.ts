import { Injectable, OnDestroy, Inject, Optional } from '@angular/core';
import { Router, RouterEvent } from '@angular/router';
import { Subject, ReplaySubject, Subscription } from 'rxjs';
import { map, distinctUntilChanged, filter } from 'rxjs/operators';

@Injectable()
export class QueryParamStoreService<T> implements OnDestroy {

  isAlive: Subject<any> = new Subject<any>();
  store: ReplaySubject<T> = new ReplaySubject<T>();
  state: T;
  defaultValues: any = {};
  subscription: Subscription;

  constructor(public router: Router, public handleInvalidValues: boolean) {
    this.constructHandler();
  }

  private constructHandler() {
    if (this.subscription) { return; }
    this.subscription = this.router.events.pipe(
      map((route) => [this.router.url, route]),
      distinctUntilChanged(([cUrl], [pUrl]) => cUrl === pUrl),
      map(([url, route]: [string, RouterEvent]) => [url.match(/\?(.*)$/), route]),
      map(([match, route]) => [!match ? '' : match[1], route]),
      map(([qp, { snapshot }]) => {
        if (
          !snapshot || !snapshot.data ||
          (!snapshot.data.queryParamsConfig && !snapshot.data.noQueryParams)
        ) {
          return null;
        } else if (snapshot.data.noQueryParams) {
          this.router.navigate([], { queryParams: {} });
          return null;
        }
        const defaultValues = snapshot.data.queryParamsConfig;
        const supportedKeys = Object.keys(defaultValues);
        const keyTypeConverter = supportedKeys.reduce((acc, key) => {
          const defaultValue = defaultValues[key];
          acc[key] = defaultValue.typeConvertor || typeof defaultValue === 'number' ? Number : String;
          return acc;
        }, {});

        const flatDefaultValues = supportedKeys.reduce((acc, key) => {
          const currentValue = defaultValues[key];
          acc[key] = currentValue.value !== undefined ? currentValue.value : currentValue;
          return acc;
        }, {});

        const matches = qp.match(/([^&]*)=([^&]*)/g) || [];
        const result = { errors: {}, queryParams: null, flatDefaultValues };
        const queryParams = matches.reduce((acc, match) => {
          const [key, value] = match.split('=');
          if (supportedKeys.includes(key)) {
            const converter = keyTypeConverter[key];
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
          } else if (snapshot.data.protected) {
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
      if (this.handleInvalidValues) {
        const errorKeys = Object.keys(errors);
        const queryParamsCleanup = errorKeys.reduce((acc, key) => {
          acc[key] = undefined;
          return acc;
        }, {});
        if (errorKeys.length !== 0) {
          this.router.navigate([], { queryParams: queryParamsCleanup, queryParamsHandling: 'merge' });
        }
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
