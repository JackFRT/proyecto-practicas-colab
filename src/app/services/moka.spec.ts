import { TestBed } from '@angular/core/testing';

import { Moka } from './moka';

describe('Moka', () => {
  let service: Moka;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Moka);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
