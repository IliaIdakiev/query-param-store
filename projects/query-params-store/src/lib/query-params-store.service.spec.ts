import { TestBed } from '@angular/core/testing';

import { QueryParamsStore } from './query-params-store.service';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, NavigationEnd } from '@angular/router';
import { IQueryParamStoreRoutes } from './interfaces-and-types';
import { NgZone } from '@angular/core';
import { zip } from 'rxjs';
import { filter } from 'rxjs/operators';

describe('QueryParamsStore', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [RouterTestingModule] }));

  it('should be created', () => {
    const service: QueryParamsStore = TestBed.get(QueryParamsStore);
    expect(service).toBeTruthy();
  });

  describe('simple navigation', () => {
    let router: Router;

    beforeEach(() => {
      class TestComponent { }
      router = TestBed.get(Router);
      const configs: IQueryParamStoreRoutes = [{
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
              } // multi string array or empty array from undefined
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
        done();
      });
    });

    it('should parse and return the provided in URL query params', (done) => {
      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      router.setUpLocationChangeListener();
      // tslint:disable-next-line:max-line-length
      ngZone.run(() => { router.navigateByUrl('/?pageSize=10&filter=some%20random%20string&stringOrNull=!!!&numberOrNull=20&page=3;4;5&pageNumbersOrEmptyArrayWithString=6;7;8&pageNumbersOrNull=3;2;1&pageNumbersOrEmptyArrayWithUndefined=10;20;30&pageStringsOrEmptyArrayWithString=a;b;c&pageStringsOrNull=c;1;e&pageStringsOrEmptyArrayWithUndefined=1;2;3'); });

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
        done();
      });
    });

    it('should remove invalid query params', (done) => {
      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      router.setUpLocationChangeListener();
      ngZone.run(() => { router.navigateByUrl('/?pageSize=invalid&filter=test'); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/?filter=test');
        expect(state.pageSize).toEqual(30);
        expect(state.filter).toEqual('test');
        done();
      });
    });

    it('should keep unknown query params', (done) => {
      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      router.setUpLocationChangeListener();
      ngZone.run(() => { router.navigateByUrl('/?pageSize=10&best=test'); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/?pageSize=10&best=test');
        expect(state.pageSize).toEqual(10);
        expect(state.best).toEqual('test');
        done();
      });

    });
  });

  describe('simple navigation with remove unknown param option', () => {
    let router: Router;

    beforeEach(() => {
      class TestComponent { }
      router = TestBed.get(Router);
      const configs: IQueryParamStoreRoutes = [{
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
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/?pageSize=10');
        expect(state.pageSize).toEqual(10);
        expect(state.best).toEqual(undefined);
        done();
      });

    });
  });

  describe('nested routes', () => {
    let router: Router;

    const setConfig = (childRemoveUnknown = false) => {
      class TestComponent { }
      router = TestBed.get(Router);
      const configs: IQueryParamStoreRoutes = [{
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
              inherit: true,
              removeUnknown: childRemoveUnknown
            }
          },
        }]
      }];

      router.resetConfig(configs);
    };

    it('should inherit parent params', (done) => {
      setConfig();

      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      router.setUpLocationChangeListener();
      ngZone.run(() => { router.navigateByUrl('/parent/child?pageSize=10&best=test'); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/parent/child?pageSize=10&best=test');
        expect(state.pageSize).toEqual(10);
        expect(state.best).toEqual('test');
        done();
      });

    });

    it('should inherit parent params and remove unknown', (done) => {
      setConfig(true);

      const service: QueryParamsStore = TestBed.get(QueryParamsStore);
      const ngZone: NgZone = TestBed.get(NgZone);
      router.setUpLocationChangeListener();
      ngZone.run(() => { router.navigateByUrl('/parent/child?pageSize=10&best=test'); });

      zip(
        service.store,
        router.events.pipe(filter<NavigationEnd>(e => e instanceof NavigationEnd))
      ).subscribe(([state, e]) => {
        expect(e.url).toEqual('/parent/child?pageSize=10');
        expect(state.pageSize).toEqual(10);
        expect(state.best).toEqual(undefined);
        done();
      });

    });
  });

});
