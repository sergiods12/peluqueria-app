import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterClienteComponent } from './register-cliente.component';

describe('RegisterClienteComponent', () => {
  let component: RegisterClienteComponent;
  let fixture: ComponentFixture<RegisterClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterClienteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
