import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivate } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryParamsStoreService } from 'query-params-store';
import { tap, first, mapTo } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class HomeActivate implements CanActivate {

  constructor(
    private queryParamsStoreService: QueryParamsStoreService<any>
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.queryParamsStoreService.store.pipe(tap((data) => {
      console.log('home can activate', data);
    }), first(), mapTo(true));
  }
}
