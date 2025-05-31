import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelarReservaClienteComponent } from './cancelar-reserva-cliente.component';

describe('CancelarReservaClienteComponent', () => {
  let component: CancelarReservaClienteComponent;
  let fixture: ComponentFixture<CancelarReservaClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CancelarReservaClienteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CancelarReservaClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
