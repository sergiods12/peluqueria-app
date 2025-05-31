// src/app/auth/register-empleado/register-empleado.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { PeluqueriaService } from '../../shared/services/peluqueria.service'; // Para cargar peluquerías
import { Empleado } from '../../shared/models/empleado.model';
import { Peluqueria } from '../../shared/models/peluqueria.model';

@Component({
  selector: 'app-register-empleado',
  templateUrl: './register-empleado.component.html',
  // styleUrls: ['./register-empleado.component.css']
})
export class RegisterEmpleadoComponent implements OnInit {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  peluquerias: Peluqueria[] = [];

  rolesEmpleado = ['Peluquero', 'Estilista', 'Barbero', 'Recepcionista']; // Roles específicos para el select de 'rol' (no isAdmin)
  // El campo 'rol' en Empleado.java era "Mujer, Hombre, Ambos", ajustar si es diferente.
  // Aquí lo interpreto como el tipo de trabajo.
  // El campo `isAdmin` es un booleano aparte.

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private peluqueriaService: PeluqueriaService
  ) {
    this.registerForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dni: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      rol: ['', Validators.required], // Tipo de trabajo
      isAdmin: [false, Validators.required], // Booleano para admin
      peluqueriaId: [null, Validators.required], // ID de la peluquería a la que pertenece
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
    if (this.registerForm.invalid) {
      this.markAllAsTouched();
      return;
    }
    this.errorMessage = null;
    this.successMessage = null;

    const { confirmPassword, peluqueriaId, ...empleadoDataPartial } = this.registerForm.value;

    const empleadoParaEnviar: Empleado = {
      ...empleadoDataPartial,
      peluqueria: { id: peluqueriaId } as Peluqueria // Enviar solo el ID de la peluquería dentro de un objeto Peluqueria
    };


    this.authService.registerEmpleado(empleadoParaEnviar).subscribe({
      next: () => {
        this.successMessage = '¡Empleado registrado con éxito!';
        this.registerForm.reset({ isAdmin: false }); // Resetear isAdmin a false por defecto
      },
      error: (err) => {
        console.error('Registration failed', err);
        this.errorMessage = err.error?.message || err.error?.error || 'Error en el registro del empleado. Verifica los datos o inténtalo más tarde.';
      }
    });
  }

   markAllAsTouched() {
    Object.values(this.registerForm.controls).forEach(control => {
      control.markAsTouched();
    });
    if (this.registerForm.errors?.['mismatch']) {
        this.registerForm.get('confirmPassword')?.setErrors({'mismatch': true});
    }
  }
}