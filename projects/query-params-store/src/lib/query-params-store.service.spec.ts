import { TestBed } from '@angular/core/testing';

import { QueryParamsStore } from './query-params-store.service';
import { RouterTestingModule } from '@angular/router/testing';
import {
  Router,
  NavigationEnd,
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  ActivatedRoute,
  CanDeactivate,
  ActivationEnd
} from '@angular/router';
import { IQueryParamsStoreRoutes } from './interfaces-and-types';
import { NgZone } from '@angular/core';
import { zip, Subject } from 'rxjs';
import { filter, tap, first, switchMap, map } from 'rxjs/operators';
import { QueryParamsStoreModule } from './query-params-store.module';

describe('QueryParamsStore', () => {
  describe('default', () => {
    beforeEach(() => TestBed.configureTestingModule({ imports: [RouterTestingModule, QueryParamsStoreModule] }));

    it('should be created', () => {
      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      expect(service).toBeTruthy();
    });
  });

  describe('Store tests', () => {
    let router: Router;
    beforeEach(() => TestBed.configureTestingModule({ imports: [RouterTestingModule, QueryParamsStoreModule] }));
    describe('simple navigation', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            queryParamsConfig: {
              defaultValues: {
                pageSize: 30, // number default config
                filter: '', // string default config
                stringOrNull: {
                  value: null,
                  typeConvertor: String,
                  multi: false
                }, // string advanced config
                numberOrNull: {
                  value: null,
                  typeConvertor: Number,
                  multi: false
                }, // number advanced config
                page: {
                  value: '1;2;3',
                  typeConvertor: Number,
                  multi: true,
                  separator: ';'
                }, // multi number array with separator ';'
                pageNumbersOrEmptyArrayWithString: {
                  value: '',
                  typeConvertor: Number,
                  multi: true,
                  separator: ';'
                }, // multi number array or empty array from string
                pageNumbersOrNull: {
                  value: null,
                  typeConvertor: Number,
                  multi: true,
                  separator: ';'
                }, // multi number array or empty array from null
                pageNumbersOrEmptyArrayWithUndefined: {
                  value: undefined,
                  typeConvertor: Number,
                  multi: true,
                  separator: ';'
                }, // multi number array or empty array from undefined
                pageStringsOrEmptyArrayWithString: {
                  value: '',
                  typeConvertor: String,
                  multi: true,
                  separator: ';'
                }, // multi string array or empty array from string
                pageStringsOrNull: {
                  value: null,
                  typeConvertor: String,
                  multi: true,
                  separator: ';'
                }, // multi string array or empty array from null
                pageStringsOrEmptyArrayWithUndefined: {
                  value: undefined,
                  typeConvertor: String,
                  multi: true,
                  separator: ';'
                }, // multi string array or empty array from undefined
                allowed: {
                  value: null,
                  multi: false,
                  typeConvertor: String,
                  allowedValues: ['Test', 'Best']
                },
                openToggles: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 0,
                  length: 6,
                  removeInvalid: true
                }
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should return default values for query params', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });

        service.store.subscribe(state => {
          expect(state.pageSize).toEqual(30);
          expect(state.filter).toEqual('');
          expect(state.stringOrNull).toEqual(null);
          expect(state.numberOrNull).toEqual(null);
          expect(state.page).toEqual([1, 2, 3]);
          expect(state.pageNumbersOrEmptyArrayWithString).toEqual([]);
          expect(state.pageNumbersOrNull).toEqual(null);
          expect(state.pageNumbersOrEmptyArrayWithUndefined).toEqual([]);
          expect(state.pageStringsOrEmptyArrayWithString).toEqual([]);
          expect(state.pageStringsOrNull).toEqual(null);
          expect(state.pageStringsOrEmptyArrayWithUndefined).toEqual([]);
          expect(state.allowed).toEqual(null);
          expect(state.openToggles).toEqual([false, false, false, false, false, false]);
          done();
        }, console.error);
      });

      it('should parse and return the provided in URL query params', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        // tslint:disable-next-line:max-line-length
        ngZone.run(() => { router.navigateByUrl('/?pageSize=10&filter=some%20random%20string&stringOrNull=!!!&numberOrNull=20&page=3;4;5&pageNumbersOrEmptyArrayWithString=6;7;8&pageNumbersOrNull=3;2;1&pageNumbersOrEmptyArrayWithUndefined=10;20;30&pageStringsOrEmptyArrayWithString=a;b;c&pageStringsOrNull=c;1;e&pageStringsOrEmptyArrayWithUndefined=1;2;3&allowed=Test&openToggles=60'); });

        service.store.subscribe(state => {
          expect(state.pageSize).toEqual(10);
          expect(state.filter).toEqual('some random string');
          expect(state.stringOrNull).toEqual('!!!');
          expect(state.numberOrNull).toEqual(20);
          expect(state.page).toEqual([3, 4, 5]);
          expect(state.pageNumbersOrEmptyArrayWithString).toEqual([6, 7, 8]);
          expect(state.pageNumbersOrNull).toEqual([3, 2, 1]);
          expect(state.pageNumbersOrEmptyArrayWithUndefined).toEqual([10, 20, 30]);
          expect(state.pageStringsOrEmptyArrayWithString).toEqual(['a', 'b', 'c']);
          expect(state.pageStringsOrNull).toEqual(['c', '1', 'e']);
          expect(state.pageStringsOrEmptyArrayWithUndefined).toEqual(['1', '2', '3']);
          expect(state.allowed).toEqual('Test');
          expect(state.openToggles).toEqual([false, false, true, true, true, true]);
          done();
        }, console.error);
      });

      it('should remove invalid query params', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/?pageSize=invalid&filter=test&allowed=hello&openToggles=100'); });
        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/?filter=test');
          expect(state.pageSize).toEqual(30);
          expect(state.filter).toEqual('test');
          expect(state.allowed).toEqual(null);
          expect(state.openToggles).toEqual([false, false, false, false, false, false]);
          done();
        }, console.error);
      });

      it('should remove invalid query params and maintain binary boolean number', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/?pageSize=invalid&filter=test&allowed=hello&openToggles=3'); });

        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/?filter=test&openToggles=3');
          expect(state.pageSize).toEqual(30);
          expect(state.filter).toEqual('test');
          expect(state.allowed).toEqual(null);
          expect(state.openToggles).toEqual([true, true, false, false, false, false]);
          done();
        }, console.error);
      });

      it('should keep unknown query params', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/?pageSize=10&best=test'); });

        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/?pageSize=10&best=test');
          expect(state.pageSize).toEqual(10);
          expect(state.best).toEqual('test');
          done();
        }, console.error);

      });

    });

    describe('simple navigation with remove unknown param option', () => {
      beforeEach(() => {
        class TestComponent { }
        router = TestBed.get(Router);
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            queryParamsConfig: {
              defaultValues: {
                pageSize: 30, // number default config
              },
              removeUnknown: true
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should remove unknown query params', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/?pageSize=10&best=test'); });

        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/?pageSize=10');
          expect(state.pageSize).toEqual(10);
          expect(state.best).toEqual(undefined);
          done();
        }, console.error);

      });
    });

    describe('nested routes', () => {
      const setConfig = (data: { childRemoveUnknown?: boolean, childInherit?: boolean } = {}) => {
        class TestComponent { }
        router = TestBed.get(Router);
        const configs: IQueryParamsStoreRoutes = [{
          path: 'parent',
          component: TestComponent,
          data: {
            queryParamsConfig: {
              defaultValues: {
                pageSize: 30, // number default config
              },
              removeUnknown: true
            }
          },
          children: [{
            path: 'child',
            component: TestComponent,
            data: {
              queryParamsConfig: {
                inherit: data.childInherit,
                removeUnknown: data.childRemoveUnknown || false,
                defaultValues: {
                  filter: 'test'
                }
              }
            },
          }]
        }];

        router.resetConfig(configs);
      };

      it('should inherit parent params', (done) => {
        setConfig({ childInherit: true });

        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/parent/child?pageSize=10&best=test'); });

        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/parent/child?pageSize=10&best=test');
          expect(state.pageSize).toEqual(10);
          expect(state.best).toEqual('test');
          done();
        }, console.error);

      });

      it('should inherit parent params and remove unknown', (done) => {
        setConfig({ childRemoveUnknown: true, childInherit: true });

        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/parent/child?pageSize=10&best=test'); });

        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/parent/child?pageSize=10');
          expect(state.pageSize).toEqual(10);
          expect(state.best).toEqual(undefined);
          expect(state.filter).toEqual('test');
          done();
        }, console.error);
      });

      it('should not inherit parent params and remove unknown', (done) => {
        setConfig({ childRemoveUnknown: true, childInherit: false });

        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/parent/child?pageSize=10&best=test&filter=some%20value'); });

        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/parent/child?filter=some%20value');
          expect(state.pageSize).toEqual(undefined);
          expect(state.best).toEqual(undefined);
          expect(state.filter).toEqual('some value');
          done();
        }, console.error);

      });

    });
  });

  describe('CanActivate tests', () => {
    let router: Router;
    let service: QueryParamsStore;
    let ngZone: NgZone;
    let output: Subject<boolean>;

    beforeEach(() => {
      output = new Subject();

      class TestComponent { }
      class TestCanActivate implements CanActivate {
        canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
          return service.canActivate({ role: { match: [null, 'ADMIN'] } }).pipe(tap(output));
        }
      }

      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        canActivate: [TestCanActivate],
        data: {
          queryParamsConfig: {
            defaultValues: {
              role: {
                value: null,
                typeConvertor: String,
                multi: false
              }
            },
            removeUnknown: true
          }
        }
      }];

      TestBed.configureTestingModule({
        imports: [RouterTestingModule.withRoutes(configs), QueryParamsStoreModule],
        providers: [TestCanActivate]
      });

      router = TestBed.get(Router);
      service = TestBed.get(QueryParamsStore);
      ngZone = TestBed.get(NgZone);
    });

    it('should successfuly activate without query parameters', (done) => {
      ngZone.run(() => { router.initialNavigation(); });

      output.pipe(first()).subscribe(result => {
        expect(result).toEqual(true);
        done();
      }, console.error);
    });

    it('should successfuly activate with query parameters', (done) => {
      ngZone.run(() => {
        router.setUpLocationChangeListener();
        router.navigateByUrl('/?role=ADMIN');
      });

      output.pipe(first()).subscribe(result => {
        expect(result).toEqual(true);
        done();
      }, console.error);
    });

    it('should not be able to activate with invalid query parameters', (done) => {
      router.setUpLocationChangeListener();
      ngZone.run(() => { router.navigateByUrl('/?role=TEST'); });

      output.pipe(first()).subscribe(result => {
        const route: ActivatedRoute = TestBed.get(ActivatedRoute);
        expect(result).toEqual(false);
        expect(route.snapshot.url).toEqual([]);
        done();
      }, console.error);
    });

  });

  describe('CanDeactivate tests', () => {
    let router: Router;
    let service: QueryParamsStore;
    let ngZone: NgZone;
    let output: Subject<boolean>;

    beforeEach(() => {
      output = new Subject();

      class TestComponent { }
      class TestCanDectivate implements CanDeactivate<boolean> {
        // tslint:disable-next-line:max-line-length
        canDeactivate(component: any, currentRoute: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState?: RouterStateSnapshot) {
          return service.canDeactivate({ completed: { match: true } }, currentState).pipe(tap(output));
        }
      }

      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        canDeactivate: [TestCanDectivate],
        data: {
          queryParamsConfig: {
            defaultValues: {
              completed: false
            }
          }
        },

      }, {
        path: 'test',
        component: TestComponent
      }];

      TestBed.configureTestingModule({
        imports: [RouterTestingModule.withRoutes(configs), QueryParamsStoreModule],
        providers: [TestCanDectivate]
      });

      router = TestBed.get(Router);
      service = TestBed.get(QueryParamsStore);
      ngZone = TestBed.get(NgZone);
    });

    it('should successfuly deactivate', (done) => {
      router.setUpLocationChangeListener();
      ngZone.run(() => { router.navigateByUrl('/?completed=true'); });

      const firstEnd$ = router.events.pipe(first<ActivationEnd>(e => e instanceof ActivationEnd));

      firstEnd$.subscribe(() => {
        ngZone.run(() => { router.navigateByUrl('/test'); });
      }, console.error);

      output.pipe(switchMap(result => firstEnd$.pipe(map(e => ([e, result])))), first()).subscribe(([event, result]) => {
        expect(result).toEqual(true);

        expect((event as ActivationEnd).snapshot.url[0].path).toEqual('test');
        done();
      }, console.error);
    });

    it('should not allow to deactivate', (done) => {
      router.setUpLocationChangeListener();
      ngZone.run(() => { router.navigateByUrl('/?completed=false'); });

      const firstEnd$ = router.events.pipe(first<ActivationEnd>(e => e instanceof ActivationEnd));

      firstEnd$.subscribe(() => {
        ngZone.run(() => { router.navigateByUrl('/test'); });
      }, console.error);

      output.pipe(switchMap(result => firstEnd$.pipe(map(e => ([e, result])))), first()).subscribe(([event, result]) => {
        expect((event as ActivationEnd).snapshot.url).toEqual([]);
        expect(result).toEqual(false);
        done();
      }, console.error);
    });

  });
});
