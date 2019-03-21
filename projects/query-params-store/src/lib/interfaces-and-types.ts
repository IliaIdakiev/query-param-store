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

export type QueryParamsStoreDefaultValue = QueryParamsStoreDefaultGenericValue | QueryParamsStoreDefaultMultiValue;

export type QueryParamsStoreDefaultGenericValue = string | number | boolean | {
  value: null | undefined | string | number | boolean,
  typeConvertor: StringConstructor | NumberConstructor | BooleanConstructor
  multi: false;
};

export type QueryParamsStoreDefaultMultiValue = string | number | boolean | {
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

export interface IAllowedValuesConfig {
  [paramName: string]: {
    match: string | number | boolean | (string | number | boolean)[],
    default?: string | number | boolean
  };
}
