import { Injectable } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { EntityComponent } from '../entity/entity.component';
import { Observable } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';

@Injectable()
export class EntityDeactivate implements CanDeactivate<EntityComponent> {

  constructor(private queryParamsStore: QueryParamsStore) { }

  canDeactivate(
    component: EntityComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ) {
    return this.queryParamsStore.canDeactivate({ completed: { match: [null, true] } }, currentState);
  }
}
