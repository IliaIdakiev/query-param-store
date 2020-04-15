import { NgModule } from '@angular/core';
import { QueryParamsStore } from './query-params-store.service';
import { Router } from '@angular/router';

export function qpsFactory(router: Router) {
  const instance = new QueryParamsStore(router);
  instance._constructHandler();
  return instance;
}

@NgModule({
  declarations: [],
  providers: [
    {
      provide: QueryParamsStore,
      useFactory: qpsFactory,
      deps: [Router]
    }
  ],
  imports: [],
  exports: []
})
export class QueryParamsStoreModule { }
