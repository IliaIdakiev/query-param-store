import { Injectable } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { PostEntityComponent } from '../post-entity/post-entity.component';
import { Observable } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';

@Injectable()
export class EntityDeactivate implements CanDeactivate<PostEntityComponent> {

  constructor(private queryParamsStore: QueryParamsStore) { }

  canDeactivate(
    component: PostEntityComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ) {
    return this.queryParamsStore.canDeactivate({ completed: { match: [null, true] } }, currentRoute, currentState);
  }
}
