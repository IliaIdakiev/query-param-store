import { Injectable } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';
import { tap, first, mapTo } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DetailDeactivate implements CanDeactivate<Observable<boolean>> {

  constructor(
    private queryParamsStore: QueryParamsStore
  ) { }

  canDeactivate(component: any, currentRoute: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState?: RouterStateSnapshot) {
    return this.queryParamsStore.store.pipe(tap((data) => {
      console.log('detail deactivate', data);
    }), first(), mapTo(true));
  }
}
