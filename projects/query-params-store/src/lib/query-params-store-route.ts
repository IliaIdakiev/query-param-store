import { Route } from '@angular/router';

export interface IQueryParamStoreData<T> {
  queryParamsConfig?: {
    noQueryParams?: boolean;
    removeUnknown?: boolean;
    defaultValues: T,
  };
  [key: string]: any;
}

export interface IQueryParamStoreRoute<T> extends Route {
  data?: IQueryParamStoreData<T>;
  [key: string]: any;
}

export type IQueryParamStoreRoutes<T> = IQueryParamStoreRoute<T>[];
