import { NgModule, ModuleWithProviders, Provider } from '@angular/core';
import { QueryParamsStore } from './query-params-store.service';
import { Router } from '@angular/router';
import { IQueryParamsStoreModuleConfig } from './interfaces-and-types';
import { QPS_CONFIG } from './tokens';



export function qpsFactory(router: Router, config: IQueryParamsStoreModuleConfig) {
  const instance = new QueryParamsStore(router, config);
  return instance;
}

export const serviceProvider: Provider = {
  provide: QueryParamsStore,
  useFactory: qpsFactory,
  deps: [Router, QPS_CONFIG],
};

@NgModule({
  declarations: [],
  providers: [
    { provide: QPS_CONFIG, useValue: null },
    serviceProvider
  ],
  imports: [],
  exports: []
})
export class QueryParamsStoreModule {
  static withConfig(config: IQueryParamsStoreModuleConfig): ModuleWithProviders {
    return {
      ngModule: QueryParamsStoreModule,
      providers: [
        { provide: QPS_CONFIG, useValue: config },
        serviceProvider
      ]
    };
  }

  constructor(qps: QueryParamsStore) {
    qps._constructHandler();
  }
}
