import { Route } from '@angular/router';
import { Observable } from 'rxjs';

export interface IQueryParamsStoreData<T = any> {
  queryParamsConfig?: {
    noQueryParams?: boolean;
    removeUnknown?: boolean;
    inherit?: boolean;
    defaultValues: {
      [k in keyof T]: QueryParamsStoreDefaultValue;
    };
  };
  [key: string]: any;
}

export interface IQueryParamStoreRestrictor {
  check(queryParamName: string, queryParamValue: QueryParamsStoreDefaultValue): Observable<boolean> | Promise<boolean> | boolean;
}

export type QueryParamsStoreDefaultValue = QueryParamsStoreDefaultGenericValue | QueryParamsStoreDefaultMultiValue;

export type QueryParamsStoreDefaultGenericValue = string | number | {
  value: null | undefined | string | number,
  typeConvertor: StringConstructor | NumberConstructor;
  multi: false;
};

export type QueryParamsStoreDefaultMultiValue = string | number | {
  value: string,
  multi: true,
  typeConvertor: StringConstructor | NumberConstructor;
  separator: string,
};

export interface IQueryParamsStoreRoute<T = any> extends Route {
  data?: IQueryParamsStoreData<T>;
  [key: string]: any;
}

export type IQueryParamStoreRoutes<T = any> = IQueryParamsStoreRoute<T>[];
