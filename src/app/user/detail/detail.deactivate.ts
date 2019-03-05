import { Injectable } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStoreService } from 'query-params-store';
import { tap, first, mapTo } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DetailDeactivate implements CanDeactivate<Observable<boolean>> {

  constructor(
    private queryParamsStoreService: QueryParamsStoreService<any>
  ) { }

  canDeactivate(component: any, currentRoute: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState?: RouterStateSnapshot) {
    return this.queryParamsStoreService.store.pipe(tap((data) => {
      console.log('detail deactivate', data);
    }), first(), mapTo(true));
  }
}
