import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStoreService } from 'query-params-store';
import { tap, first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ListResolver implements Resolve<Observable<boolean>> {

  constructor(
    private queryParamsStoreService: QueryParamsStoreService<any>
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    // return this.queryParamsStoreService.queryParamsForRouteSnapshot(route, state).pipe(tap((data) => {
    //   console.log('list resolver', data);
    // }), first());
    return this.queryParamsStoreService.store.pipe(tap((data) => {
      console.log('detail resolver', data);
    }), first());
  }
}
