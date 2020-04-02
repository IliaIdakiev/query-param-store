import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationStart, NavigationCancel, NavigationEnd, ActivationEnd, ChildActivationEnd } from '@angular/router';
import { filter, mapTo, switchMap, map, tap, scan, take, startWith } from 'rxjs/operators';
import { race, Subscription, ReplaySubject, zip } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RouterHelperService implements OnDestroy {
  subscription: Subscription;

  // tslint:disable-next-line:variable-name
  private _routeData$: ReplaySubject<any> = new ReplaySubject<any>(1);

  get routeData$() {
    return this._routeData$.asObservable().pipe(filter(d => d !== null));
  }

  constructor(router: Router) {

    const navigationStart$ = router.events.pipe(
      filter<NavigationStart>(e => e instanceof NavigationStart),
      startWith(null)
    );

    const navigationCancel$ = router.events.pipe(
      filter<NavigationCancel>(e => e instanceof NavigationCancel),
      mapTo(false)
    );
    const navigationEnd$ = router.events.pipe(
      filter<NavigationCancel>(e => e instanceof NavigationEnd),
      mapTo(true)
    );


    this.subscription = navigationStart$.pipe(
      tap(() => this._routeData$.next(null)),
      switchMap(() => zip(router.events.pipe(
        filter<ActivationEnd | ChildActivationEnd>(e => e instanceof ActivationEnd || e instanceof ChildActivationEnd),
        scan<ActivationEnd | ChildActivationEnd, any>(({ data, params }, { snapshot }) =>
          ({ data: { ...data, ...snapshot.data }, params: { ...params, ...snapshot.params } }), { data: {}, params: {} })
      ), race(navigationEnd$, navigationCancel$).pipe(take(1))))
    ).subscribe(([data, success]) => {
      if (success) { this._routeData$.next(data); }
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
