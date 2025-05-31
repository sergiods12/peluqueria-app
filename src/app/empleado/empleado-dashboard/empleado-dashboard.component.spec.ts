import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpleadoDashboardComponent } from './empleado-dashboard.component';

describe('EmpleadoDashboardComponent', () => {
  let component: EmpleadoDashboardComponent;
  let fixture: ComponentFixture<EmpleadoDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpleadoDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpleadoDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
