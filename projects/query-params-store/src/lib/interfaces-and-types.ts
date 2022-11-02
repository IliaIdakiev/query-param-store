import { Route } from '@angular/router';

export interface IQueryParamsStoreModuleConfig {
  debug?: boolean;
  useCompression?: boolean;
  compressionKey?: string;
}

export type IStateConfig<T> = { [k in keyof T]: QueryParamsStoreDefaultValue };
export interface IQueryParamsStoreConfig<T = any> {
  noQueryParams?: boolean;
  removeUnknown?: boolean;
  caseSensitive?: boolean;
  inherit?: boolean;
  stateConfig?: IStateConfig<T>;
}

export interface IQueryParamsStoreData<T = any> {
  storeConfig?: IQueryParamsStoreConfig<T>;
  [key: string]: any;
}

export type QueryParamsStoreDefaultValue = QueryParamsStoreDefaultGenericValue | QueryParamsStoreDefaultMultiValue;

export type QueryParamsStoreDefaultGenericValue = string | number | boolean | {
  value: null | undefined | string | number | boolean,
  typeConvertor?: StringConstructor | NumberConstructor | BooleanConstructor
  multi?: false;
  allowedValues?: (null | undefined | string | number | boolean)[]
};

export type QueryParamsStoreDefaultMultiValue = string | number | boolean | {
  value: string,
  multi: true,
  count?: number,
  typeConvertor: StringConstructor | NumberConstructor | BooleanConstructor;
  separator: string,
  allowedValues?: (null | undefined | string | number | boolean)[]
} | QueryParamsStoreDefaultMultiBooleanBinaryValue;

export interface QueryParamsStoreDefaultMultiBooleanBinaryValue {
  value: number;
  multi: true;
  typeConvertor: BooleanConstructor;
  length?: number;
  removeInvalid?: boolean;
}

export interface IQueryParamsStoreRoute<T = any> extends Route {
  data?: IQueryParamsStoreData<T>;
  children?: IQueryParamsStoreRoutes;
  [key: string]: any;
}

export type IQueryParamsStoreRoutes<T = any> = IQueryParamsStoreRoute<T>[];

export interface IAllowedValuesConfig {
  [paramName: string]: {
    match: string | number | boolean | null | (string | number | boolean | null)[],
    default?: string | number | boolean
  };
}
