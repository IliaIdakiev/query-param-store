import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';
import { tap, first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DetailResolver implements Resolve<Observable<boolean>> {

  constructor(
    private queryParamsStore: QueryParamsStore<any>
  ) { }

  resolve(route: ActivatedRouteSnapshot) {
    // return this.queryParamsStore.queryParamsForRouteSnapshot(route).pipe(tap((data) => {
    //   console.log(data);
    // }), first());
    return this.queryParamsStore.store.pipe(tap((data) => {
      console.log('detail resolver', data);
    }), first());
  }
}
