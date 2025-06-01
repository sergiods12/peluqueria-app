// src/app/empleado/crear-peluqueria/crear-peluqueria.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { Peluqueria } from '../../shared/models/peluqueria.model';

@Component({
  selector: 'app-crear-peluqueria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-peluqueria.component.html',
  // styleUrls: ['./crear-peluqueria.component.css']
})
export class CrearPeluqueriaComponent {
  peluqueriaForm: FormGroup;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private peluqueriaService: PeluqueriaService
  ) {
    this.peluqueriaForm = this.fb.group({
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern("^[0-9]*$")]]
    });
  }

  onSubmit(): void {
    this.markAllAsTouched();
    if (this.peluqueriaForm.invalid) {
      return;
    }
    this.mensajeError = null;
    this.mensajeExito = null;

    const nuevaPeluqueria: Peluqueria = this.peluqueriaForm.value;
    this.peluqueriaService.createPeluqueria(nuevaPeluqueria).subscribe({
      next: (peluqueriaCreada) => {
        this.mensajeExito = `Peluquería "${peluqueriaCreada.nombre}" creada con éxito. ID: ${peluqueriaCreada.id}`;
        this.peluqueriaForm.reset();
      },
      error: (err) => {
        this.mensajeError = 'Error al crear la peluquería: ' + (err.error?.message || err.error || err.message);
        console.error(err);
      }
    });
  }

  markAllAsTouched() {
    Object.values(this.peluqueriaForm.controls).forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
  }
}