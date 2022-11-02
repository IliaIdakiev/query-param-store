import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, CanActivate } from '@angular/router';
import { QueryParamsStore } from 'query-params-store';
import { tap } from 'rxjs/operators';

@Injectable()
export class EntityActivate implements CanActivate {

  constructor(private queryParamsStore: QueryParamsStore) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.queryParamsStore.canActivate({ disableDialog: { match: [false, false] } }, route).pipe(tap(console.log));
  }
}
