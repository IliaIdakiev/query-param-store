import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';
import { tap, first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ListResolver implements Resolve<Observable<boolean>> {

  constructor(
    private queryParamsStore: QueryParamsStore
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.queryParamsStore.store.pipe(tap((data) => {
      console.log('list resolver', data);
    }), first());
  }
}
