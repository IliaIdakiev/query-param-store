import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStoreService } from 'query-params-store';
import { tap, first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DetailResolver implements Resolve<Observable<boolean>> {

  constructor(
    private queryParamsStoreService: QueryParamsStoreService<any>
  ) { }

  resolve(route: ActivatedRouteSnapshot) {
    // return this.queryParamsStoreService.queryParamsForRouteSnapshot(route).pipe(tap((data) => {
    //   console.log(data);
    // }), first());
    return this.queryParamsStoreService.store.pipe(tap((data) => {
      console.log('detail resolver', data);
    }), first());
  }
}
