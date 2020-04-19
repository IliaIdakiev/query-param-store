import { decompressFromEncodedURIComponent } from 'lz-string';
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
import { IQueryParamsStoreRoutes, IQueryParamsStoreModuleConfig } from './interfaces-and-types';
import { NgZone } from '@angular/core';
import { zip, Subject } from 'rxjs';
import { filter, tap, first, switchMap, map, pairwise } from 'rxjs/operators';
import { QueryParamsStoreModule, serviceProvider } from './query-params-store.module';
import { QPS_CONFIG } from './tokens';
import { binaryToNumber, compressQueryParams } from './utils';

describe('QueryParamsStore', () => {

  describe('util tests', () => {
    it('should convert a given number to a number', () => {
      const result = binaryToNumber(1);
      expect(result).toEqual(1);
    });

    it('should convert a given empty string value to a number', () => {
      const result = binaryToNumber('');
      expect(result).toEqual(0);
    });

    it('should convert a given empty string value to a number', () => {
      const result = binaryToNumber('hello');
      expect(result).toEqual(1);
    });

    it('should convert a given empty string value to a number', () => {
      const result = binaryToNumber([true, false, false, true]);
      expect(result).toEqual(9);
    });

    it('should convert a given empty string value to a number', () => {
      const result = binaryToNumber([false, true, false, false]);
      expect(result).toEqual(2);
    });
  });

  describe('setup and initialization', () => {

    it('should be created and handler to be constructed', () => {
      TestBed.configureTestingModule({
        imports: [RouterTestingModule],
        providers: [serviceProvider, { provide: QPS_CONFIG, useValue: null }]
      });
      const service = TestBed.get(QueryParamsStore);
      const constructHandlerSpy = spyOn(service, '_constructHandler');
      const module = new QueryParamsStoreModule(service);
      expect(service).toBeTruthy();
      expect(constructHandlerSpy).toHaveBeenCalledTimes(1);
    });

    it('should be created and handler to be constructed in debug mode', () => {
      TestBed.configureTestingModule({
        imports: [RouterTestingModule],
        providers: [serviceProvider, { provide: QPS_CONFIG, useValue: { debug: true } }]
      });
      const service = TestBed.get(QueryParamsStore);
      const constructHandlerSpy = spyOn(service, '_constructHandler');
      const module = new QueryParamsStoreModule(service);
      expect(service).toBeTruthy();
      expect(service.isInDebugMode).toBeTruthy(true);
      expect(constructHandlerSpy).toHaveBeenCalledTimes(1);
    });

    it('should be created and handler to be constructed with compression', () => {
      TestBed.configureTestingModule({
        imports: [RouterTestingModule],
        providers: [serviceProvider, { provide: QPS_CONFIG, useValue: { debug: true, useCompression: true, compressionKey: 'i' } }]
      });
      const service = TestBed.get(QueryParamsStore);
      const constructHandlerSpy = spyOn(service, '_constructHandler');
      const module = new QueryParamsStoreModule(service);
      expect(service).toBeTruthy();
      expect(service.isInDebugMode).toBeTruthy(false);
      expect(service.useCompression).toBeTruthy(true);
      expect(service.compressionKey).toBeTruthy('i');
      expect(constructHandlerSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Store tests', () => {
    let router: Router;
    beforeEach(() => TestBed.configureTestingModule({ imports: [RouterTestingModule, QueryParamsStoreModule] }));
    afterEach(() => router.dispose());

    it('no query params default values', (done) => {
      router = TestBed.get(Router);

      class TestComponent { }
      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        data: {
          storeConfig: { noQueryParams: true }
        }
      }];

      router.resetConfig(configs);

      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      router.setUpLocationChangeListener();
      // tslint:disable-next-line:max-line-length
      ngZone.run(() => { router.navigateByUrl('/?pageSize=10&filter=some%20random%20string&stringOrNull=!!!&numberOrNull=20&page=3;4&pageNumbersOrEmptyArray1=6;7&pageNumbersOrNull=3;2;1&pageNumbersOrEmptyArray2=10;20;30&pageStringsOrEmptyArray1=a;b;c&pageStringsOrNull=c;1;e&pageStringsOrEmptyArray2=1;2;3&allowed=Test&openToggles=60&pageSizeWithAllowedValues=1'); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/');
        expect(state).toEqual({});
        done();
      }, console.error);
    });

    it('should successfully return binary boolean default value (no length provided)', (done) => {
      router = TestBed.get(Router);

      class TestComponent { }
      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        data: {
          storeConfig: {
            stateConfig: {
              test: {
                typeConvertor: Boolean,
                multi: true,
                value: 4
              }
            }
          }
        }
      }];

      router.resetConfig(configs);

      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      ngZone.run(() => { router.initialNavigation(); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/');
        expect(state).toEqual({ test: [false, false, true] });
        done();
      }, console.error);
    });

    it('should successfully return binary boolean query param value (no length provided)', (done) => {
      router = TestBed.get(Router);

      class TestComponent { }
      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        data: {
          storeConfig: {
            stateConfig: {
              test: {
                typeConvertor: Boolean,
                multi: true,
                value: 4
              }
            }
          }
        }
      }];

      router.resetConfig(configs);

      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      router.setUpLocationChangeListener();

      const ngZone: NgZone = TestBed.get(NgZone);
      ngZone.run(() => { router.navigateByUrl(`?test=5`); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/?test=5');
        expect(state).toEqual({ test: [true, false, true] });
        done();
      }, console.error);
    });

    it('should successfully return binary boolean default value (with length provided)', (done) => {
      router = TestBed.get(Router);

      class TestComponent { }
      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        data: {
          storeConfig: {
            stateConfig: {
              test: {
                typeConvertor: Boolean,
                multi: true,
                value: 4,
                length: 10
              }
            }
          }
        }
      }];

      router.resetConfig(configs);

      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      ngZone.run(() => { router.initialNavigation(); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/');
        expect(state).toEqual({ test: [false, false, true, false, false, false, false, false, false, false] });
        done();
      }, console.error);
    });

    it('should successfully return binary boolean query param value (with length provided)', (done) => {
      router = TestBed.get(Router);

      class TestComponent { }
      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        data: {
          storeConfig: {
            stateConfig: {
              test: {
                typeConvertor: Boolean,
                multi: true,
                value: 4,
                length: 10
              }
            }
          }
        }
      }];

      router.resetConfig(configs);

      const service: QueryParamsStore = TestBed.get(QueryParamsStore);

      const ngZone: NgZone = TestBed.get(NgZone);
      ngZone.run(() => { router.navigateByUrl(`?test=5`); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/?test=5');
        expect(state).toEqual({ test: [true, false, true, false, false, false, false, false, false, false] });
        done();
      }, console.error);
    });

    it('should successfully remove invalid binary boolean value', (done) => {
      router = TestBed.get(Router);

      class TestComponent { }
      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        data: {
          storeConfig: {
            stateConfig: {
              test: {
                typeConvertor: Boolean,
                multi: true,
                value: 4,
                length: 10
              }
            }
          }
        }
      }];

      router.resetConfig(configs);

      const service: QueryParamsStore = TestBed.get(QueryParamsStore);

      const ngZone: NgZone = TestBed.get(NgZone);
      ngZone.run(() => { router.navigateByUrl(`?test=aaa`); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/');
        expect(state).toEqual({ test: [false, false, true, false, false, false, false, false, false, false] });
        done();
      }, console.error);
    });

    describe('simple navigation', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
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
                  value: '1;2',
                  typeConvertor: Number,
                  count: 3,
                  multi: true,
                  separator: ';'
                }, // multi number array with separator ';'
                pageNumbersOrNull: {
                  value: null,
                  typeConvertor: Number,
                  multi: true,
                  count: 2,
                  separator: ';'
                }, // multi number array or empty array from null
                pageNumbersOrEmptyArray1: {
                  value: '',
                  typeConvertor: Number,
                  multi: true,
                  count: 2,
                  separator: ';'
                }, // multi number array or empty array from string
                pageNumbersOrEmptyArray2: {
                  value: null,
                  typeConvertor: Number,
                  multi: true,
                  count: 3,
                  separator: ';'
                }, // multi number array or empty array from undefined
                pageStringsOrEmptyArray1: {
                  value: '',
                  typeConvertor: String,
                  count: 3,
                  multi: true,
                  separator: ';'
                }, // multi string array or empty array from string
                pageStringsOrEmptyArray3: {
                  value: '',
                  typeConvertor: String,
                  multi: true,
                  separator: ';'
                }, // multi string array or empty array from string
                pageStringsOrEmptyArray2: {
                  value: null,
                  typeConvertor: String,
                  multi: true,
                  count: 3,
                  separator: ';'
                }, // multi string array or empty array from undefined
                pageStringsOrNull: {
                  value: null,
                  typeConvertor: String,
                  multi: true,
                  count: 3,
                  separator: ';'
                }, // multi string array or empty array from null
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
                },
                pageWithLength: {
                  value: '1;2;3',
                  count: 3,
                  typeConvertor: Number,
                  multi: true,
                  separator: ';'
                }, // multi number array with separator ';'
                pageSizeWithAllowedValues: {
                  value: 1000,
                  allowedValues: [1, 1000]
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
          expect(state.page).toEqual([1, 2, 0]);
          expect(state.pageNumbersOrNull).toEqual(null);
          expect(state.pageNumbersOrEmptyArray1).toEqual([0, 0]);
          expect(state.pageNumbersOrEmptyArray2).toEqual(null);
          expect(state.pageStringsOrEmptyArray1).toEqual(['', '', '']);
          expect(state.pageStringsOrEmptyArray2).toEqual(null);
          expect(state.pageStringsOrEmptyArray3).toEqual([]);
          expect(state.pageStringsOrNull).toEqual(null);
          expect(state.allowed).toEqual(null);
          expect(state.openToggles).toEqual([false, false, false, false, false, false]);
          expect(state.pageSizeWithAllowedValues).toEqual(1000),
            done();
        }, console.error);
      });

      it('should parse and return the provided in URL query params', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        // tslint:disable-next-line:max-line-length
        ngZone.run(() => { router.navigateByUrl('/?pageSize=10&filter=some%20random%20string&stringOrNull=!!!&numberOrNull=20&page=3;4&pageNumbersOrEmptyArray1=6;7&pageNumbersOrNull=3;2;1&pageNumbersOrEmptyArray2=10;20;30&pageStringsOrEmptyArray1=a;b;c&pageStringsOrNull=c;1;e&pageStringsOrEmptyArray2=1;2;3&allowed=Test&openToggles=60&pageSizeWithAllowedValues=1'); });

        service.store.subscribe(state => {
          expect(state.pageSize).toEqual(10);
          expect(state.filter).toEqual('some random string');
          expect(state.stringOrNull).toEqual('!!!');
          expect(state.numberOrNull).toEqual(20);
          expect(state.page).toEqual([3, 4, 0]);
          expect(state.pageNumbersOrEmptyArray1).toEqual([6, 7]);
          expect(state.pageNumbersOrNull).toEqual([3, 2]);
          expect(state.pageNumbersOrEmptyArray2).toEqual([10, 20, 30]);
          expect(state.pageStringsOrEmptyArray1).toEqual(['a', 'b', 'c']);
          expect(state.pageStringsOrNull).toEqual(['c', '1', 'e']);
          expect(state.pageStringsOrEmptyArray2).toEqual(['1', '2', '3']);
          expect(state.allowed).toEqual('Test');
          expect(state.openToggles).toEqual([false, false, true, true, true, true]);
          expect(state.pageSizeWithAllowedValues).toEqual(1),
            done();
        }, console.error);
      });

      it('should remove invalid query params', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        // tslint:disable-next-line:max-line-length
        ngZone.run(() => { router.navigateByUrl('/?pageSize=invalid&filter=test&allowed=hello&openToggles=100&pageSizeWithAllowedValues=300'); });
        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/?filter=test');
          expect(state.pageSize).toEqual(30);
          expect(state.filter).toEqual('test');
          expect(state.allowed).toEqual(null);
          expect(state.openToggles).toEqual([false, false, false, false, false, false]);
          expect(state.pageSizeWithAllowedValues).toEqual(1000),
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
            storeConfig: {
              stateConfig: {
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

    describe('simple navigation with case sensitive param option', () => {
      beforeEach(() => {
        class TestComponent { }
        router = TestBed.get(Router);
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: 30 // number default config
              },
              caseSensitive: false
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should match case insensitive query params', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/?PAGESIZE=10'); });

        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/?PAGESIZE=10');
          expect(state.pageSize).toEqual(10);
          done();
        }, console.error);

      });

      it('should match case insensitive query params and duplicates (last one wins)', (done) => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/?pagesize=10&PAGESIZE=20'); });

        zip(
          service.store,
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
        ).pipe(first()).subscribe(([state, e]) => {
          expect(e.url).toEqual('/?pagesize=10&PAGESIZE=20');
          expect(state.pageSize).toEqual(20);
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
            storeConfig: {
              stateConfig: {
                pageSize: 30, // number default config
              },
              removeUnknown: true
            }
          },
          children: [{
            path: 'child',
            component: TestComponent,
            data: {
              storeConfig: {
                inherit: data.childInherit,
                removeUnknown: data.childRemoveUnknown || false,
                stateConfig: {
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

    describe('single(Number) -> single(Number)', () => {
      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: 30,
                page: 1
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: 30,
                page: 1
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single(Number) to single(Number) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('?pageSize=100'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=100'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=100');
          expect(currentEvent.url).toEqual('/test?pageSize=100');
          expect(initialState.pageSize).toEqual(100);
          expect(currentState.pageSize).toEqual(100);
          expect(initialState.page).toEqual(1);
          expect(currentState.page).toEqual(1);

          done();
        }, console.error);
      });
    });

    describe('single(String) -> single(String)', () => {
      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: '30',
                page: 1
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: '30',
                page: 1
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single(Number) to single(Number) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('?pageSize=100'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=100'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=100');
          expect(currentEvent.url).toEqual('/test?pageSize=100');
          expect(initialState.pageSize).toEqual('100');
          expect(currentState.pageSize).toEqual('100');
          expect(initialState.page).toEqual(1);
          expect(currentState.page).toEqual(1);

          done();
        }, console.error);
      });
    });

    describe('single(Boolean) -> single(Boolean)', () => {
      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: 30,
                page: 1,
                test: true
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: 30,
                page: 1,
                test: false
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single(Number) to single(Number) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('?test=false'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?test=false'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?test=false');
          expect(currentEvent.url).toEqual('/test?test=false');
          expect(initialState.test).toEqual(false);
          expect(currentState.test).toEqual(false);
          expect(initialState.pageSize).toEqual(30);
          expect(currentState.pageSize).toEqual(30);
          expect(initialState.page).toEqual(1);
          expect(currentState.page).toEqual(1);

          done();
        }, console.error);
      });
    });

    describe('multi(BinaryBoolean/6) -> multi(BinaryBoolean/10) / multi(BinaryBoolean/10) -> multi(BinaryBoolean/6)', () => {
      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                openToggles: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 0,
                  length: 6,
                  removeInvalid: true
                },
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                openToggles: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 2,
                  length: 10,
                  removeInvalid: true
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single(BinaryBoolean) to single(BinaryBoolean) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('?openToggles=4'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?openToggles=4'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?openToggles=4');
          expect(currentEvent.url).toEqual('/test?openToggles=4');
          expect(initialState.openToggles).toEqual([false, false, true, false, false, false]);
          expect(currentState.openToggles).toEqual([false, false, true, false, false, false, false, false, false, false]);

          done();
        }, console.error);
      });

      it('should redirect a single(BinaryBoolean) to single(BinaryBoolean) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('/test?openToggles=4'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/?openToggles=4'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?openToggles=4');
          expect(currentEvent.url).toEqual('/?openToggles=4');
          expect(initialState.openToggles).toEqual([false, false, true, false, false, false, false, false, false, false]);
          expect(currentState.openToggles).toEqual([false, false, true, false, false, false]);

          done();
        }, console.error);
      });
    });

    describe('multi(BinaryBoolean/6) -> single(String) / single(String) -> multi(BinaryBoolean/6)', () => {
      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                openToggles: '1',
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                openToggles: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 2,
                  length: 6,
                  removeInvalid: true
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('multi(BinaryBoolean/6) -> single(String)', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('/test?openToggles=4'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?openToggles=4'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?openToggles=4');
          expect(currentEvent.url).toEqual('/?openToggles=4');
          expect(initialState.openToggles).toEqual([false, false, true, false, false, false]);
          expect(currentState.openToggles).toEqual('4');

          done();
        }, console.error);
      });

      it('single(String) -> multi(BinaryBoolean/6)', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('/?openToggles=4'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?openToggles=4'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?openToggles=4');
          expect(currentEvent.url).toEqual('/test?openToggles=4');
          expect(initialState.openToggles).toEqual('4');
          expect(currentState.openToggles).toEqual([false, false, true, false, false, false]);

          done();
        }, console.error);
      });
    });

    describe('multi(BinaryBoolean/6) -> single(Boolean) / single(Boolean) -> multi(BinaryBoolean/6)', () => {
      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                openToggles: true,
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                openToggles: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 2,
                  length: 6,
                  removeInvalid: true
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('multi(BinaryBoolean/6) -> single(Boolean)', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('/test?openToggles=4'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?openToggles=4'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?openToggles=4');
          expect(currentEvent.url).toEqual('/?openToggles=true');
          expect(initialState.openToggles).toEqual([false, false, true, false, false, false]);
          expect(currentState.openToggles).toEqual(true);

          done();
        }, console.error);
      });

      it('single(Boolean) -> multi(BinaryBoolean/6) (1)', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('/?openToggles=false'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?openToggles=false'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?openToggles=false');
          expect(currentEvent.url).toEqual('/test?openToggles=0');
          expect(initialState.openToggles).toEqual(false);
          expect(currentState.openToggles).toEqual([false, false, false, false, false, false]);

          done();
        }, console.error);
      });

      it('single(Boolean) -> multi(BinaryBoolean/6) (2)', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('/?openToggles=true'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?openToggles=true'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?openToggles=true');
          expect(currentEvent.url).toEqual('/test?openToggles=1');
          expect(initialState.openToggles).toEqual(true);
          expect(currentState.openToggles).toEqual([true, false, false, false, false, false]);

          done();
        }, console.error);
      });
    });

    describe('multi(BinaryBoolean/6) -> single(Number) / single(Number) -> multi(BinaryBoolean/6)', () => {
      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                openToggles: 1,
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                openToggles: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 2,
                  length: 6,
                  removeInvalid: true
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('multi(BinaryBoolean/6) -> single(Number)', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('/test?openToggles=4'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?openToggles=4'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?openToggles=4');
          expect(currentEvent.url).toEqual('/?openToggles=4');
          expect(initialState.openToggles).toEqual([false, false, true, false, false, false]);
          expect(currentState.openToggles).toEqual(4);

          done();
        }, console.error);
      });

      it('single(Number) -> multi(BinaryBoolean/6) (1)', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('/?openToggles=6'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?openToggles=6'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?openToggles=6');
          expect(currentEvent.url).toEqual('/test?openToggles=6');
          expect(initialState.openToggles).toEqual(6);
          expect(currentState.openToggles).toEqual([false, true, true, false, false, false]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Number) -> single(Number) / single(Number) -> multi(2/Number) transitions', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: 30,
                page: 1
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Number,
                  multi: true,
                  value: '30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;1',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('multi(BinaryBoolean/6) -> multi(BinaryBoolean/10)', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/');
          expect(currentEvent.url).toEqual('/test');
          expect(initialState.pageSize).toEqual(30);
          expect(currentState.pageSize).toEqual([30, 30]);
          expect(initialState.page).toEqual(1);
          expect(currentState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });

      it('/ multi(BinaryBoolean/10) -> multi(BinaryBoolean/6)', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(currentEvent.url).toEqual('/');
          expect(initialEvent.url).toEqual('/test');
          expect(currentState.pageSize).toEqual(30);
          expect(initialState.pageSize).toEqual([30, 30]);
          expect(currentState.page).toEqual(1);
          expect(initialState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });

      it('should redirect a single to multi param configuration and maintain initial param values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('?pageSize=10'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=10'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=10');
          expect(currentEvent.url).toEqual('/test?pageSize=10;30');
          expect(initialState.pageSize).toEqual(10);
          expect(currentState.pageSize).toEqual([10, 30]);
          expect(initialState.page).toEqual(1);
          expect(currentState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single and maintain initial values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);

        ngZone.run(() => { router.initialNavigation(); router.navigateByUrl('/test?pageSize=10;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?pageSize=10;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=10;30');
          expect(currentEvent.url).toEqual('/?pageSize=10');
          expect(currentState.pageSize).toEqual(10);
          expect(initialState.pageSize).toEqual([10, 30]);
          expect(currentState.page).toEqual(1);
          expect(initialState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/String) -> single(String) / single(String) -> multi(2/String) transitions', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: '30',
                page: 1
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: String,
                  multi: true,
                  value: '30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;1',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single to multi param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/');
          expect(currentEvent.url).toEqual('/test');
          expect(initialState.pageSize).toEqual('30');
          expect(currentState.pageSize).toEqual(['30', '30']);
          expect(initialState.page).toEqual(1);
          expect(currentState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(currentEvent.url).toEqual('/');
          expect(initialEvent.url).toEqual('/test');
          expect(currentState.pageSize).toEqual('30');
          expect(initialState.pageSize).toEqual(['30', '30']);
          expect(currentState.page).toEqual(1);
          expect(initialState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });

      it('should redirect a single to multi param configuration and maintain initial param values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('?pageSize=10'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=10'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=10');
          expect(currentEvent.url).toEqual('/test?pageSize=10;30');
          expect(initialState.pageSize).toEqual('10');
          expect(currentState.pageSize).toEqual(['10', '30']);
          expect(initialState.page).toEqual(1);
          expect(currentState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single and maintain initial values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test?pageSize=10;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?pageSize=10;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=10;30');
          expect(currentEvent.url).toEqual('/?pageSize=10');
          expect(currentState.pageSize).toEqual('10');
          expect(initialState.pageSize).toEqual(['10', '30']);
          expect(currentState.page).toEqual(1);
          expect(initialState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Boolean) -> single(Boolean) / single(Boolean) -> multi(2/Boolean) transitions', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: true,
                test2: false
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: null,
                  separator: ';'
                },
                test2: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'false;true',
                  separator: ';'
                }
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single to multi param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/');
          expect(currentEvent.url).toEqual('/test');
          expect(initialState.test1).toEqual(true);
          expect(currentState.test1).toEqual(null);
          expect(initialState.test2).toEqual(false);
          expect(currentState.test2).toEqual([false, true]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(currentEvent.url).toEqual('/');
          expect(initialEvent.url).toEqual('/test');
          expect(currentState.test1).toEqual(true);
          expect(initialState.test1).toEqual(null);
          expect(currentState.test2).toEqual(false);
          expect(initialState.test2).toEqual([false, true]);

          done();
        }, console.error);
      });

      it('should redirect a single to multi param configuration and maintain initial param values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('?test1=false&test2=true'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?test1=false&test2=true'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?test1=false&test2=true');
          expect(currentEvent.url).toEqual('/test?test1=false&test2=true;true');
          expect(initialState.test1).toEqual(false);
          expect(currentState.test1).toEqual([false]);
          expect(initialState.test2).toEqual(true);
          expect(currentState.test2).toEqual([true, true]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single and maintain initial values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test?test1=true;false&test2=false;true'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?test1=true;false&test2=false;true'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?test1=true;false&test2=false;true');
          expect(currentEvent.url).toEqual('/?test1=true&test2=false');
          expect(currentState.test1).toEqual(true);
          expect(initialState.test1).toEqual([true, false]);
          expect(currentState.test2).toEqual(false);
          expect(initialState.test2).toEqual([false, true]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Number) -> single(String) / single(String) -> multi(2/Number) transitions', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: '30',
                page: '1'
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Number,
                  multi: true,
                  value: '30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;1',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single to multi param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/');
          expect(currentEvent.url).toEqual('/test');
          expect(initialState.pageSize).toEqual('30');
          expect(currentState.pageSize).toEqual([30, 30]);
          expect(initialState.page).toEqual('1');
          expect(currentState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(currentEvent.url).toEqual('/');
          expect(initialEvent.url).toEqual('/test');
          expect(currentState.pageSize).toEqual('30');
          expect(initialState.pageSize).toEqual([30, 30]);
          expect(currentState.page).toEqual('1');
          expect(initialState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });

      it('should redirect a single to multi param configuration and maintain initial param values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('?pageSize=10'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=10'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=10');
          expect(currentEvent.url).toEqual('/test?pageSize=10;30');
          expect(initialState.pageSize).toEqual('10');
          expect(currentState.pageSize).toEqual([10, 30]);
          expect(initialState.page).toEqual('1');
          expect(currentState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single and maintain initial values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test?pageSize=10;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?pageSize=10;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=10;30');
          expect(currentEvent.url).toEqual('/?pageSize=10');
          expect(currentState.pageSize).toEqual('10');
          expect(initialState.pageSize).toEqual([10, 30]);
          expect(currentState.page).toEqual('1');
          expect(initialState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Boolean) -> single(String) / single(String) -> multi(2/Boolean) transitions', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: 'Hello'
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: {
                  multi: true,
                  separator: ';',
                  value: 'true;false',
                  typeConvertor: Boolean
                }
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single to multi param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); }); router.initialNavigation();

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/');
          expect(currentEvent.url).toEqual('/test');
          expect(initialState.test1).toEqual('Hello');
          expect(currentState.test1).toEqual([true, false]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(currentEvent.url).toEqual('/');
          expect(initialEvent.url).toEqual('/test');
          expect(currentState.test1).toEqual('Hello');
          expect(initialState.test1).toEqual([true, false]);

          done();
        }, console.error);
      });

      it('should redirect a single to multi param configuration and maintain initial param values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('?test1=TEST'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?test1=TEST'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?test1=TEST');
          expect(currentEvent.url).toEqual('/test?test1=true;false');
          expect(initialState.test1).toEqual('TEST');
          expect(currentState.test1).toEqual([true, false]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single and maintain initial values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test?test1=false;true'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?test1=false;true'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?test1=false;true');
          expect(currentEvent.url).toEqual('/?test1=false');
          expect(initialState.test1).toEqual([false, true]);
          expect(currentState.test1).toEqual('false');

          done();
        }, console.error);
      });
    });

    describe('multi(2/String) -> single(Boolean) / single(Boolean) -> multi(2/String) transitions', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: 'true',
                test2: 'test'
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: null,
                  separator: ';'
                },
                test2: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'false;true',
                  separator: ';'
                }
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single to multi param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/');
          expect(currentEvent.url).toEqual('/test');
          expect(initialState.test1).toEqual('true');
          expect(currentState.test1).toEqual(null);
          expect(initialState.test2).toEqual('test');
          expect(currentState.test2).toEqual([false, true]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(currentEvent.url).toEqual('/');
          expect(initialEvent.url).toEqual('/test');
          expect(currentState.test1).toEqual('true');
          expect(initialState.test1).toEqual(null);
          expect(currentState.test2).toEqual('test');
          expect(initialState.test2).toEqual([false, true]);

          done();
        }, console.error);
      });

      it('should redirect a single to multi param configuration and maintain initial param values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('?test1=false&test2=true'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?test1=false&test2=true'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?test1=false&test2=true');
          expect(currentEvent.url).toEqual('/test?test1=false&test2=true;true');
          expect(initialState.test1).toEqual('false');
          expect(currentState.test1).toEqual([false]);
          expect(initialState.test2).toEqual('true');
          expect(currentState.test2).toEqual([true, true]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single and maintain initial values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test?test1=true;false&test2=false;true'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?test1=true;false&test2=false;true'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?test1=true;false&test2=false;true');
          expect(currentEvent.url).toEqual('/?test1=true&test2=false');
          expect(currentState.test1).toEqual('true');
          expect(initialState.test1).toEqual([true, false]);
          expect(currentState.test2).toEqual('false');
          expect(initialState.test2).toEqual([false, true]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Number) -> single(Boolean) / single(Boolean) -> multi(2/Number) transitions', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: true,
                test2: false
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: {
                  typeConvertor: Number,
                  multi: true,
                  value: null,
                  separator: ';'
                },
                test2: {
                  typeConvertor: Number,
                  multi: true,
                  value: '3;4',
                  separator: ';'
                }
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single to multi param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/');
          expect(currentEvent.url).toEqual('/test');
          expect(initialState.test1).toEqual(true);
          expect(currentState.test1).toEqual(null);
          expect(initialState.test2).toEqual(false);
          expect(currentState.test2).toEqual([3, 4]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(currentEvent.url).toEqual('/');
          expect(initialEvent.url).toEqual('/test');
          expect(currentState.test1).toEqual(true);
          expect(initialState.test1).toEqual(null);
          expect(currentState.test2).toEqual(false);
          expect(initialState.test2).toEqual([3, 4]);

          done();
        }, console.error);
      });

      it('should redirect a single to multi param configuration and maintain initial param values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('?test1=false&test2=true'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?test1=false&test2=true'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?test1=false&test2=true');
          expect(currentEvent.url).toEqual('/test?test1=0&test2=1;4');
          expect(initialState.test1).toEqual(false);
          expect(currentState.test1).toEqual([0]);
          expect(initialState.test2).toEqual(true);
          expect(currentState.test2).toEqual([1, 4]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single and maintain initial values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test?test1=1;2&test2=0;4'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?test1=1;2&test2=0;4'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?test1=1;2&test2=0;4');
          expect(currentEvent.url).toEqual('/?test1=true&test2=false');
          expect(currentState.test1).toEqual(true);
          expect(initialState.test1).toEqual([1, 2]);
          expect(currentState.test2).toEqual(false);
          expect(initialState.test2).toEqual([0, 4]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/String) -> single(Number) / single(Number) -> multi(2/String) transitions', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: 'true',
                test2: 'test'
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: {
                  typeConvertor: Number,
                  multi: true,
                  value: null,
                  separator: ';'
                },
                test2: {
                  typeConvertor: Number,
                  multi: true,
                  value: '2;2',
                  separator: ';'
                }
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single to multi param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/');
          expect(currentEvent.url).toEqual('/test');
          expect(initialState.test1).toEqual('true');
          expect(currentState.test1).toEqual(null);
          expect(initialState.test2).toEqual('test');
          expect(currentState.test2).toEqual([2, 2]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(currentEvent.url).toEqual('/');
          expect(initialEvent.url).toEqual('/test');
          expect(currentState.test1).toEqual('true');
          expect(initialState.test1).toEqual(null);
          expect(currentState.test2).toEqual('test');
          expect(initialState.test2).toEqual([2, 2]);

          done();
        }, console.error);
      });

      it('should redirect a single to multi param configuration and maintain initial param values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('?test1=1&test2=true'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?test1=1&test2=true'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?test1=1&test2=true');
          expect(currentEvent.url).toEqual('/test?test1=1&test2=1;2');
          expect(initialState.test1).toEqual('1');
          expect(currentState.test1).toEqual([1]);
          expect(initialState.test2).toEqual('true');
          expect(currentState.test2).toEqual([1, 2]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single and maintain initial values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test?test1=1;2&test2=2;1'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?test1=1;2&test2=2;1'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?test1=1;2&test2=2;1');
          expect(currentEvent.url).toEqual('/?test1=1&test2=2');
          expect(currentState.test1).toEqual('1');
          expect(initialState.test1).toEqual([1, 2]);
          expect(currentState.test2).toEqual('2');
          expect(initialState.test2).toEqual([2, 1]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Boolean) -> single(Number) / single(Number) -> multi(2/Boolean) transitions', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: true,
                test2: false
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                test1: {
                  typeConvertor: Number,
                  multi: true,
                  value: null,
                  separator: ';'
                },
                test2: {
                  typeConvertor: Number,
                  multi: true,
                  value: '2;2',
                  separator: ';'
                }
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a single to multi param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/');
          expect(currentEvent.url).toEqual('/test');
          expect(initialState.test1).toEqual(true);
          expect(currentState.test1).toEqual(null);
          expect(initialState.test2).toEqual(false);
          expect(currentState.test2).toEqual([2, 2]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(currentEvent.url).toEqual('/');
          expect(initialEvent.url).toEqual('/test');
          expect(currentState.test1).toEqual(true);
          expect(initialState.test1).toEqual(null);
          expect(currentState.test2).toEqual(false);
          expect(initialState.test2).toEqual([2, 2]);

          done();
        }, console.error);
      });

      it('should redirect a single to multi param configuration and maintain initial param values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('?test1=false&test2=true'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?test1=false&test2=true'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?test1=false&test2=true');
          expect(currentEvent.url).toEqual('/test?test1=0&test2=1;2');
          expect(initialState.test1).toEqual(false);
          expect(currentState.test1).toEqual([0]);
          expect(initialState.test2).toEqual(true);
          expect(currentState.test2).toEqual([1, 2]);

          done();
        }, console.error);
      });

      it('should redirect multi param configuration to single and maintain initial values', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        ngZone.run(() => { router.initialNavigation(); });
        ngZone.run(() => { router.navigateByUrl('/test?test1=1;2&test2=2;1'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?test1=1;2&test2=2;1'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?test1=1;2&test2=2;1');
          expect(currentEvent.url).toEqual('/?test1=true&test2=true');
          expect(currentState.test1).toEqual(true);
          expect(initialState.test1).toEqual([1, 2]);
          expect(currentState.test2).toEqual(true);
          expect(initialState.test2).toEqual([2, 1]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Number) -> multi(3/Number) / multi(3/Number) -> multi(2/Number)', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Number,
                  multi: true,
                  value: '30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;1',
                  separator: ';'
                },
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Number,
                  multi: true,
                  value: '30;30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;1;1',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a multi(2) to multi(3) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('?pageSize=10;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=10;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=10;30');
          expect(currentEvent.url).toEqual('/test?pageSize=10;30;30');
          expect(initialState.pageSize).toEqual([10, 30]);
          expect(currentState.pageSize).toEqual([10, 30, 30]);
          expect(initialState.page).toEqual([1, 1]);
          expect(currentState.page).toEqual([1, 1, 1]);

          done();
        }, console.error);
      });

      it('should redirect a multi(3) to multi(2) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/test?pageSize=10;30;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?pageSize=10;30;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=10;30;30');
          expect(currentEvent.url).toEqual('/?pageSize=10;30');
          expect(initialState.pageSize).toEqual([10, 30, 30]);
          expect(currentState.pageSize).toEqual([10, 30]);
          expect(initialState.page).toEqual([1, 1, 1]);
          expect(currentState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Number) -> multi(3/String) / multi(3/String) -> multi(2/Number)', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Number,
                  multi: true,
                  value: '30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;1',
                  separator: ';'
                },
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: String,
                  multi: true,
                  value: '30;30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: String,
                  multi: true,
                  value: '1;1;1',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a multi(2) to multi(3) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('?pageSize=10;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=10;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=10;30');
          expect(currentEvent.url).toEqual('/test?pageSize=10;30;30');
          expect(initialState.pageSize).toEqual([10, 30]);
          expect(currentState.pageSize).toEqual(['10', '30', '30']);
          expect(initialState.page).toEqual([1, 1]);
          expect(currentState.page).toEqual(['1', '1', '1']);

          done();
        }, console.error);
      });

      it('should redirect a multi(3) to multi(2) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('/test?pageSize=10;30;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('?pageSize=10;30;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=10;30;30');
          expect(currentEvent.url).toEqual('/?pageSize=10;30');
          expect(initialState.pageSize).toEqual(['10', '30', '30']);
          expect(currentState.pageSize).toEqual([10, 30]);
          expect(initialState.page).toEqual(['1', '1', '1']);
          expect(currentState.page).toEqual([1, 1]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Number) -> multi(3/Boolean) / multi(3/Boolean) -> multi(2/Number)', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Number,
                  multi: true,
                  value: '30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;0',
                  separator: ';'
                },
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'true;true;true',
                  separator: ';'
                },
                page: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'true;true;true',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a multi(2/Number) to multi(3/Boolean) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('?pageSize=0;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=0;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=0;30');
          expect(currentEvent.url).toEqual('/test?pageSize=false;true;true');
          expect(initialState.pageSize).toEqual([0, 30]);
          expect(currentState.pageSize).toEqual([false, true, true]);
          expect(initialState.page).toEqual([1, 0]);
          expect(currentState.page).toEqual([true, true, true]);

          done();
        }, console.error);
      });

      it('should redirect a multi(3/Boolean) to multi(2/Number) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=true;false;true'); }); });

        setTimeout(() => ngZone.run(() => { router.navigateByUrl('?pageSize=true;false;true;'); }), 0);

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=true;false;true');
          expect(currentEvent.url).toEqual('/?pageSize=1;0');
          expect(initialState.pageSize).toEqual([true, false, true]);
          expect(currentState.pageSize).toEqual([1, 0]);
          expect(initialState.page).toEqual([true, true, true]);
          expect(currentState.page).toEqual([1, 0]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/String) -> multi(3/Boolean) / multi(3/Boolean) -> multi(2/String)', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: String,
                  multi: true,
                  value: '30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: String,
                  multi: true,
                  value: '1;0',
                  separator: ';'
                },
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'true;true;true',
                  separator: ';'
                },
                page: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'true;true;true',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a multi(2/String) to multi(3/Boolean) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('?pageSize=0;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=0;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=0;30');
          expect(currentEvent.url).toEqual('/test?pageSize=false;true;true');
          expect(initialState.pageSize).toEqual(['0', '30']);
          expect(currentState.pageSize).toEqual([false, true, true]);
          expect(initialState.page).toEqual(['1', '0']);
          expect(currentState.page).toEqual([true, true, true]);

          done();
        }, console.error);
      });

      it('should redirect a multi(3/Boolean) to multi(2/String) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=true;false;true'); }); });

        setTimeout(() => ngZone.run(() => { router.navigateByUrl('?pageSize=true;false;true;'); }), 0);

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=true;false;true');
          expect(currentEvent.url).toEqual('/?pageSize=true;false');
          expect(initialState.pageSize).toEqual([true, false, true]);
          expect(currentState.pageSize).toEqual(['true', 'false']);
          expect(initialState.page).toEqual([true, true, true]);
          expect(currentState.page).toEqual(['1', '0']);

          done();
        }, console.error);
      });
    });

    describe('multi(2/String) -> multi(3/String) / multi(3/String) -> multi(2/String)', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: String,
                  multi: true,
                  value: '30;30',
                  separator: ';'
                },
                page: {
                  typeConvertor: String,
                  multi: true,
                  value: '1;0',
                  separator: ';'
                },
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: String,
                  multi: true,
                  value: '10;20;10',
                  separator: ';'
                },
                page: {
                  typeConvertor: String,
                  multi: true,
                  value: '1;2;3',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a multi(2/String) to multi(3/String) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('?pageSize=0;30'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=0;30'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=0;30');
          expect(currentEvent.url).toEqual('/test?pageSize=0;30;10');
          expect(initialState.pageSize).toEqual(['0', '30']);
          expect(currentState.pageSize).toEqual(['0', '30', '10']);
          expect(initialState.page).toEqual(['1', '0']);
          expect(currentState.page).toEqual(['1', '2', '3']);

          done();
        }, console.error);
      });

      it('should redirect a multi(3/String) to multi(2/String) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=0;30'); }); });

        setTimeout(() => ngZone.run(() => { router.navigateByUrl('?pageSize=0;30'); }), 0);

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=0;30;10');
          expect(currentEvent.url).toEqual('/?pageSize=0;30');
          expect(initialState.pageSize).toEqual(['0', '30', '10']);
          expect(currentState.pageSize).toEqual(['0', '30']);
          expect(initialState.page).toEqual(['1', '2', '3']);
          expect(currentState.page).toEqual(['1', '0']);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Boolean) -> multi(3/Boolean) / multi(3/Boolean) -> multi(2/Boolean)', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'true;false',
                  separator: ';'
                },
                page: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'false;true',
                  separator: ';'
                },
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'false;true;true',
                  separator: ';'
                },
                page: {
                  typeConvertor: Boolean,
                  multi: true,
                  value: 'false;false',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a multi(2/Boolean) to multi(3/Boolean) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('?pageSize=true;false'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=true;false'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=true;false');
          expect(currentEvent.url).toEqual('/test?pageSize=true;false;true');
          expect(initialState.pageSize).toEqual([true, false]);
          expect(currentState.pageSize).toEqual([true, false, true]);
          expect(initialState.page).toEqual([false, true]);
          expect(currentState.page).toEqual([false, false]);

          done();
        }, console.error);
      });

      it('should redirect a multi(3/Boolean) to multi(2/Boolean) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=true;false;true'); }); });

        setTimeout(() => ngZone.run(() => { router.navigateByUrl('?pageSize=true;false;true'); }), 0);

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=true;false;true');
          expect(currentEvent.url).toEqual('/?pageSize=true;false');
          expect(initialState.pageSize).toEqual([true, false, true]);
          expect(currentState.pageSize).toEqual([true, false]);
          expect(initialState.page).toEqual([false, false]);
          expect(currentState.page).toEqual([false, true]);

          done();
        }, console.error);
      });
    });

    describe('multi(2/Number) -> multi(3/Number) / multi(3/Number) -> multi(2/Number)', () => {

      beforeEach(() => {
        router = TestBed.get(Router);

        class TestComponent { }
        const configs: IQueryParamsStoreRoutes = [{
          path: '',
          pathMatch: 'full',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;1',
                  separator: ';'
                },
                page: {
                  typeConvertor: Number,
                  multi: true,
                  value: '2;2',
                  separator: ';'
                },
              }
            }
          }
        }, {
          path: 'test',
          component: TestComponent,
          data: {
            storeConfig: {
              stateConfig: {
                pageSize: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;2;3',
                  separator: ';'
                },
                page: {
                  typeConvertor: Number,
                  multi: true,
                  value: '1;2',
                  separator: ';'
                },
              }
            }
          }
        }];

        router.resetConfig(configs);
      });

      it('should redirect a multi(2/Number) to multi(3/Number) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();
        ngZone.run(() => { router.navigateByUrl('?pageSize=1;2'); });

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=1;2'); }); });

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/?pageSize=1;2');
          expect(currentEvent.url).toEqual('/test?pageSize=1;2;3');
          expect(initialState.pageSize).toEqual([1, 2]);
          expect(currentState.pageSize).toEqual([1, 2, 3]);
          expect(initialState.page).toEqual([2, 2]);
          expect(currentState.page).toEqual([1, 2]);

          done();
        }, console.error);
      });

      it('should redirect a multi(3/Number) to multi(2/Number) param configuration', done => {
        const service: QueryParamsStore = TestBed.get(QueryParamsStore);
        const ngZone: NgZone = TestBed.get(NgZone);
        router.setUpLocationChangeListener();

        Promise.resolve().then(() => { ngZone.run(() => { router.navigateByUrl('/test?pageSize=1;2;22'); }); });

        setTimeout(() => ngZone.run(() => { router.navigateByUrl('?pageSize=1;2;22'); }), 0);

        zip(
          service.store.pipe(pairwise()),
          router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd), pairwise())
        ).pipe(first()).subscribe(([[initialState, currentState], [initialEvent, currentEvent]]) => {

          expect(initialEvent.url).toEqual('/test?pageSize=1;2;22');
          expect(currentEvent.url).toEqual('/?pageSize=1;2');
          expect(initialState.pageSize).toEqual([1, 2, 22]);
          expect(currentState.pageSize).toEqual([1, 2]);
          expect(initialState.page).toEqual([1, 2]);
          expect(currentState.page).toEqual([2, 2]);

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
          return service.canActivate({ role: { match: [null, 'ADMIN'] } }, route).pipe(tap(output));
        }
      }

      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        canActivate: [TestCanActivate],
        data: {
          storeConfig: {
            stateConfig: {
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
          return service.canDeactivate({ completed: { match: true } }, currentRoute, currentState).pipe(tap(output));
        }
      }

      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        canDeactivate: [TestCanDectivate],
        data: {
          storeConfig: {
            stateConfig: {
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

  describe('compression', () => {
    let router: Router;
    const setup = (config?: IQueryParamsStoreModuleConfig) => {
      TestBed.configureTestingModule({
        imports: [RouterTestingModule, QueryParamsStoreModule.withConfig({ useCompression: true, ...config })]
      });
      router = TestBed.get(Router);

      class TestComponent { }
      const configs: IQueryParamsStoreRoutes = [{
        path: '',
        pathMatch: 'full',
        component: TestComponent,
        data: {
          storeConfig: {
            stateConfig: {
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
                value: '1;2',
                typeConvertor: Number,
                count: 3,
                multi: true,
                separator: ';'
              }, // multi number array with separator ';'
              pageNumbersOrNull: {
                value: null,
                typeConvertor: Number,
                multi: true,
                count: 2,
                separator: ';'
              }, // multi number array or empty array from null
              pageNumbersOrEmptyArray1: {
                value: '',
                typeConvertor: Number,
                multi: true,
                count: 2,
                separator: ';'
              }, // multi number array or empty array from string
              pageNumbersOrEmptyArray2: {
                value: null,
                typeConvertor: Number,
                multi: true,
                count: 3,
                separator: ';'
              }, // multi number array or empty array from undefined
              pageStringsOrEmptyArray1: {
                value: '',
                typeConvertor: String,
                count: 3,
                multi: true,
                separator: ';'
              }, // multi string array or empty array from string
              pageStringsOrEmptyArray3: {
                value: '',
                typeConvertor: String,
                multi: true,
                separator: ';'
              }, // multi string array or empty array from string
              pageStringsOrEmptyArray2: {
                value: null,
                typeConvertor: String,
                multi: true,
                count: 3,
                separator: ';'
              }, // multi string array or empty array from undefined
              pageStringsOrNull: {
                value: null,
                typeConvertor: String,
                multi: true,
                count: 3,
                separator: ';'
              }, // multi string array or empty array from null
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
              },
              pageWithLength: {
                value: '1;2;3',
                count: 3,
                typeConvertor: Number,
                multi: true,
                separator: ';'
              }, // multi number array with separator ';'
              pageSizeWithAllowedValues: {
                value: 1000,
                allowedValues: [1, 1000]
              }
            }
          }
        }
      }];

      router.resetConfig(configs);
    };

    it('should decompress, parse and return the provided in URL query params and fix url (default compression key \'q\')', (done) => {
      setup();
      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      router.setUpLocationChangeListener();

      const queryParams = {
        pageSize: 10,
        filter: 'some%20random%20string',
        stringOrNull: '!!!',
        numberOrNull: 20,
        page: '3;4',
        pageNumbersOrEmptyArray1: '6;7',
        pageNumbersOrNull: '3;2;1',
        pageNumbersOrEmptyArray2: '10;20;30',
        pageStringsOrEmptyArray1: 'a;b;c',
        pageStringsOrNull: 'c;1;e',
        pageStringsOrEmptyArray2: '1;2;3',
        allowed: 'Test',
        openToggles: 60,
        pageSizeWithAllowedValues: 1
      };
      const fixedQueryParams = {
        pageSize: '10',
        filter: 'some random string',
        stringOrNull: '!!!',
        numberOrNull: '20',
        page: '3;4;0',
        pageNumbersOrEmptyArray1: '6;7',
        pageNumbersOrNull: '3;2',
        pageNumbersOrEmptyArray2: '10;20;30',
        pageStringsOrEmptyArray1: 'a;b;c',
        pageStringsOrNull: 'c;1;e',
        pageStringsOrEmptyArray2: '1;2;3',
        allowed: 'Test',
        openToggles: '60',
        pageSizeWithAllowedValues: '1'
      };
      const compressed = compressQueryParams(queryParams);
      const fixedCompressed = compressQueryParams(fixedQueryParams);
      // tslint:disable-next-line:max-line-length
      ngZone.run(() => { router.navigateByUrl(`/?q=${compressed}`); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        const query = e.url.split('?q=')[1].replace(/%20/g, '+');
        const decompressedQuery = JSON.parse(decompressFromEncodedURIComponent(query));

        expect(query).toEqual(fixedCompressed);
        expect(fixedQueryParams).toEqual(decompressedQuery);
        expect(state.pageSize).toEqual(10);
        expect(state.filter).toEqual('some random string');
        expect(state.stringOrNull).toEqual('!!!');
        expect(state.numberOrNull).toEqual(20);
        expect(state.page).toEqual([3, 4, 0]);
        expect(state.pageNumbersOrEmptyArray1).toEqual([6, 7]);
        expect(state.pageNumbersOrNull).toEqual([3, 2]);
        expect(state.pageNumbersOrEmptyArray2).toEqual([10, 20, 30]);
        expect(state.pageStringsOrEmptyArray1).toEqual(['a', 'b', 'c']);
        expect(state.pageStringsOrNull).toEqual(['c', '1', 'e']);
        expect(state.pageStringsOrEmptyArray2).toEqual(['1', '2', '3']);
        expect(state.allowed).toEqual('Test');
        expect(state.openToggles).toEqual([false, false, true, true, true, true]);
        expect(state.pageSizeWithAllowedValues).toEqual(1),
          done();
      }, console.error);
    });


    it('should decompress, parse and return the provided in URL query params and fix url (default compression key \'q\')', (done) => {
      setup({ compressionKey: 'i' });
      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      router.setUpLocationChangeListener();

      const queryParams = {
        pageSize: 10,
        filter: 'some%20random%20string',
        stringOrNull: '!!!',
        numberOrNull: 20,
        page: '3;4',
        pageNumbersOrEmptyArray1: '6;7',
        pageNumbersOrNull: '3;2;1',
        pageNumbersOrEmptyArray2: '10;20;30',
        pageStringsOrEmptyArray1: 'a;b;c',
        pageStringsOrNull: 'c;1;e',
        pageStringsOrEmptyArray2: '1;2;3',
        allowed: 'Test',
        openToggles: 60,
        pageSizeWithAllowedValues: 1
      };
      const fixedQueryParams = {
        pageSize: '10',
        filter: 'some random string',
        stringOrNull: '!!!',
        numberOrNull: '20',
        page: '3;4;0',
        pageNumbersOrEmptyArray1: '6;7',
        pageNumbersOrNull: '3;2',
        pageNumbersOrEmptyArray2: '10;20;30',
        pageStringsOrEmptyArray1: 'a;b;c',
        pageStringsOrNull: 'c;1;e',
        pageStringsOrEmptyArray2: '1;2;3',
        allowed: 'Test',
        openToggles: '60',
        pageSizeWithAllowedValues: '1'
      };
      const compressed = compressQueryParams(queryParams);
      const fixedCompressed = compressQueryParams(fixedQueryParams);
      // tslint:disable-next-line:max-line-length
      ngZone.run(() => { router.navigateByUrl(`/?i=${compressed}`); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        const query = e.url.split('?i=')[1].replace(/%20/g, '+');
        const decompressedQuery = JSON.parse(decompressFromEncodedURIComponent(query));

        expect(query).toEqual(fixedCompressed);
        expect(fixedQueryParams).toEqual(decompressedQuery);
        expect(state.pageSize).toEqual(10);
        expect(state.filter).toEqual('some random string');
        expect(state.stringOrNull).toEqual('!!!');
        expect(state.numberOrNull).toEqual(20);
        expect(state.page).toEqual([3, 4, 0]);
        expect(state.pageNumbersOrEmptyArray1).toEqual([6, 7]);
        expect(state.pageNumbersOrNull).toEqual([3, 2]);
        expect(state.pageNumbersOrEmptyArray2).toEqual([10, 20, 30]);
        expect(state.pageStringsOrEmptyArray1).toEqual(['a', 'b', 'c']);
        expect(state.pageStringsOrNull).toEqual(['c', '1', 'e']);
        expect(state.pageStringsOrEmptyArray2).toEqual(['1', '2', '3']);
        expect(state.allowed).toEqual('Test');
        expect(state.openToggles).toEqual([false, false, true, true, true, true]);
        expect(state.pageSizeWithAllowedValues).toEqual(1),
          done();
      }, console.error);
    });
  });

});
