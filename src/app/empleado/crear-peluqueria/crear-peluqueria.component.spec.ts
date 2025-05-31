import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearPeluqueriaComponent } from './crear-peluqueria.component';

describe('CrearPeluqueriaComponent', () => {
  let component: CrearPeluqueriaComponent;
  let fixture: ComponentFixture<CrearPeluqueriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearPeluqueriaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearPeluqueriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
