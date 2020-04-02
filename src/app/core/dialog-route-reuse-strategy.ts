import { RouteReuseStrategy, DetachedRouteHandle, ActivatedRouteSnapshot } from '@angular/router';

export class DialogRouteReuseStrategy extends RouteReuseStrategy {
  public shouldDetach(): boolean { return false; }
  public store(): void { }
  public shouldAttach(): boolean { return false; }
  public retrieve(): DetachedRouteHandle { return null; }
  public shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    return (future.routeConfig === current.routeConfig)
      || future.data.dialogComponentReuse;
  }
}
