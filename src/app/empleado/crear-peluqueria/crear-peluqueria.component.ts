// src/app/empleado/crear-peluqueria/crear-peluqueria.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { Peluqueria } from '../../shared/models/peluqueria.model';
// import { Router } from '@angular/router'; // Si quieres redirigir

@Component({
  selector: 'app-crear-peluqueria',
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
    // private router: Router
  ) {
    this.peluqueriaForm = this.fb.group({
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern("^[0-9]*$")]] // Simple pattern para números
    });
  }

  onSubmit(): void {
    this.mensajeError = null;
    this.mensajeExito = null;
    if (this.peluqueriaForm.invalid) {
      this.peluqueriaForm.markAllAsTouched();
      return;
    }

    const nuevaPeluqueria: Peluqueria = this.peluqueriaForm.value;
    this.peluqueriaService.createPeluqueria(nuevaPeluqueria).subscribe({
      next: (peluqueriaCreada) => {
        this.mensajeExito = `Peluquería "${peluqueriaCreada.nombre}" creada con éxito.`;
        this.peluqueriaForm.reset();
      },
      error: (err) => {
        this.mensajeError = 'Error al crear la peluquería: ' + (err.error?.message || err.error || err.message);
        console.error(err);
      }
    });
  }
}