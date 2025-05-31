import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionCalendarioComponent } from './gestion-calendario.component';

describe('GestionCalendarioComponent', () => {
  let component: GestionCalendarioComponent;
  let fixture: ComponentFixture<GestionCalendarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionCalendarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionCalendarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
