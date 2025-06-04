// src/app/auth/register-empleado/register-empleado.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Si usas routerLink en la plantilla
import { AuthService } from '../../shared/services/auth.service';
import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { Empleado } from '../../shared/models/empleado.model';
import { Peluqueria } from '../../shared/models/peluqueria.model';

@Component({
  selector: 'app-register-empleado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './register-empleado.component.html',
  styleUrls: ['./register-empleado.component.scss'] // o .css, o elimina si no tienes
})
export class RegisterEmpleadoComponent implements OnInit {
  registerEmpleadoForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  peluquerias: Peluqueria[] = [];
  rolesEmpleadoDescriptivos = ['Peluquero General', 'Especialista Cortes Mujer', 'Especialista Cortes Hombre', 'Especialista Color', 'Barbero', 'Recepcionista', 'Estilista Unisex'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private peluqueriaService: PeluqueriaService
  ) {
    this.registerEmpleadoForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dni: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      rol: ['', Validators.required], // Este es el rol descriptivo
      isAdmin: [false], // Determina si es administrador del sistema
      peluqueriaId: [null, Validators.required],
      telefono: [''],
      direccion: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.peluqueriaService.getAllPeluquerias().subscribe(data => {
      this.peluquerias = data;
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    Object.values(this.registerEmpleadoForm.controls).forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
    if (this.registerEmpleadoForm.errors?.['mismatch'] && this.registerEmpleadoForm.get('confirmPassword')) {
        this.registerEmpleadoForm.get('confirmPassword')?.setErrors({'mismatch': true});
    }

    if (this.registerEmpleadoForm.invalid) {
      this.errorMessage = "Por favor, completa el formulario correctamente.";
      console.log('Formulario inválido. Errores:', this.registerEmpleadoForm.errors);
      console.log('Valores del formulario:', this.registerEmpleadoForm.value);
      Object.keys(this.registerEmpleadoForm.controls).forEach(key => {
        const controlErrors = this.registerEmpleadoForm.get(key)?.errors;
        if (controlErrors != null) {
          console.log('Control inválido:', key, 'Errores:', controlErrors);
        }
      });
      return;
    }
    this.errorMessage = null;
    this.successMessage = null;

    const formValue = this.registerEmpleadoForm.value;
    const empleadoParaEnviar: Empleado = {
      nombre: formValue.nombre,
      email: formValue.email,
      dni: formValue.dni,
      password: formValue.password,
      rol: formValue.rol, // Rol descriptivo (ej: "Peluquero General")
      isAdmin: formValue.isAdmin, // Booleano para determinar si es ADMIN del sistema
      peluqueria: { id: formValue.peluqueriaId } as Peluqueria,
      telefono: formValue.telefono,
      direccion: formValue.direccion,
      horarioDisponible: '', // Puedes añadir un valor por defecto o manejarlo de otra forma
    };

    console.log("RegisterEmpleadoComponent: Enviando datos para registrar empleado:", empleadoParaEnviar);

    this.authService.registerEmpleado(empleadoParaEnviar).subscribe({
      next: (empleadoCreado) => {
        this.successMessage = `¡Empleado "${empleadoCreado.nombre}" registrado con éxito!`;
        this.registerEmpleadoForm.reset({ isAdmin: false, peluqueriaId: null, rol: '' });
      },
      error: (err) => {
        console.error('RegisterEmpleadoComponent: Error en el registro HTTP:', err);
        if (err.status === 401) {
            this.errorMessage = "No autorizado. Necesitas ser administrador para realizar esta acción.";
        } else if (err.status === 403) {
            this.errorMessage = "Acceso denegado. No tienes los permisos necesarios.";
        } else {
            // Intenta mostrar el mensaje de error del backend si está disponible
            this.errorMessage = err.error?.message || err.message || 'Error en el registro del empleado. Revisa la consola para más detalles.';
        }
      }
    });
  }
}
