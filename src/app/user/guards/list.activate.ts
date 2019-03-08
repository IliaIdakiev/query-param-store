import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivate } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';
import { tap, first, mapTo } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ListActivate implements CanActivate {

  constructor(
    private queryParamsStore: QueryParamsStore<any>
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.queryParamsStore.store.pipe(tap((data) => {
      console.log('list can activate', data);
    }), first(), mapTo(true));
  }
}
