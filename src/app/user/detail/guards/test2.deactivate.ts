import { Injectable } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';
import { tap, first, mapTo } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class Test2Deactivate implements CanDeactivate<Observable<boolean>> {

  constructor(
    private queryParamsStore: QueryParamsStore
  ) { }

  canDeactivate(component: any, currentRoute: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState?: RouterStateSnapshot) {
    return this.queryParamsStore.canDeactivate({ completed: { match: [null, true] } }, currentState).pipe(
      tap(result => console.log('match', result))
    );
  }
}
