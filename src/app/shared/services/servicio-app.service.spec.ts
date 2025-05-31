import { TestBed } from '@angular/core/testing';

import { ServicioAppService } from './servicio-app.service';

describe('ServicioAppService', () => {
  let service: ServicioAppService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicioAppService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
