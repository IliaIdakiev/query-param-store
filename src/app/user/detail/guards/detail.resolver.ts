import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';
import { tap, first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DetailResolver implements Resolve<Observable<any>> {

  constructor(
    private queryParamsStore: QueryParamsStore
  ) { }

  resolve() {
    return this.queryParamsStore.store.pipe(tap((data) => {
      console.log('detail resolver', data);
    }), first());
  }
}
