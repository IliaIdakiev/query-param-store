import { TestBed } from '@angular/core/testing';

import { QueryParamStoreService } from './query-param-store.service';

describe('QueryParamStoreService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: QueryParamStoreService = TestBed.get(QueryParamStoreService);
    expect(service).toBeTruthy();
  });
});
