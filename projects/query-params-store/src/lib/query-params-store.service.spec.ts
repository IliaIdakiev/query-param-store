import { TestBed } from '@angular/core/testing';

import { QueryParamsStore } from './query-params-store.service';

describe('QueryParamsStore', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: QueryParamsStore = TestBed.get(QueryParamsStore);
    expect(service).toBeTruthy();
  });
});
