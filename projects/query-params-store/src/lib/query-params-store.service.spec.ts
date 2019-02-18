import { TestBed } from '@angular/core/testing';

import { QueryParamsStoreService } from './query-params-store.service';

describe('QueryParamsStoreService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: QueryParamsStoreService = TestBed.get(QueryParamsStoreService);
    expect(service).toBeTruthy();
  });
});
