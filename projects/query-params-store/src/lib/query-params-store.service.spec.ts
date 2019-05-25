import { TestBed } from '@angular/core/testing';

import { QueryParamsStore } from './query-params-store.service';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IQueryParamStoreRoutes } from './interfaces-and-types';

describe('QueryParamsStore', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [RouterTestingModule] }));

  it('should be created', () => {
    const service: QueryParamsStore = TestBed.get(QueryParamsStore);
    expect(service).toBeTruthy();
  });

  describe('initial navigation', () => {
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
      router.initialNavigation();

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

    it('should parse and return the provided in URL query params', () => {

    });
  });

});
