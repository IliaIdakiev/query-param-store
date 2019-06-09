import { NgModule } from '@angular/core';
import { QueryParamsStore } from './query-params-store.service';

@NgModule({
  declarations: [],
  providers: [QueryParamsStore],
  imports: [],
  exports: []
})
export class QueryParamsStoreModule {
  constructor(queryParamsStore: QueryParamsStore) {
    (queryParamsStore as any)._constructHandler();
  }
}
