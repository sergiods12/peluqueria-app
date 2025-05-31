import { TestBed } from '@angular/core/testing';

import { PeluqueriaService } from './peluqueria.service';

describe('PeluqueriaService', () => {
  let service: PeluqueriaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PeluqueriaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
