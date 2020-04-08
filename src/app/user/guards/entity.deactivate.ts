import { Injectable } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UserEntityComponent } from '../user-entity/user-entity.component';
import { Observable } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';

@Injectable()
export class EntityDeactivate implements CanDeactivate<UserEntityComponent> {

  constructor(private queryParamsStore: QueryParamsStore) { }

  canDeactivate(
    component: UserEntityComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ) {
    return this.queryParamsStore.canDeactivate({ completed: { match: [null, true] } }, currentState);
  }
}
