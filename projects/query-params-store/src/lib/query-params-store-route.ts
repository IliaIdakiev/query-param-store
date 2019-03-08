import { Route } from '@angular/router';

export interface IQueryParamsStoreData<T> {
  queryParamsConfig?: {
    noQueryParams?: boolean;
    removeUnknown?: boolean;
    inherit?: boolean;
    defaultValues: T;
  };
  [key: string]: any;
}

export interface IQueryParamsStoreRoute<T> extends Route {
  data?: IQueryParamsStoreData<T>;
  [key: string]: any;
}

export type IQueryParamStoreRoutes<T> = IQueryParamsStoreRoute<T>[];
