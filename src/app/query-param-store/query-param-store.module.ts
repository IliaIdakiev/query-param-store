import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueryParamStoreService } from './query-param-store.service';
import { Router } from '@angular/router';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ]
})
export class QueryParamStoreModule {
  static forRoot({ handleInvalidValues }: { handleInvalidValues?: boolean }): ModuleWithProviders {
    return {
      ngModule: QueryParamStoreModule,
      providers: [
        {
          provide: QueryParamStoreService,
          useFactory: (router) => new QueryParamStoreService(router, handleInvalidValues || false),
          deps: [Router]
        }
      ]
    };
  }
}
