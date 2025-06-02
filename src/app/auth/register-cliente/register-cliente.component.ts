// src/app/auth/register-cliente/register-cliente.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; // RouterModule para routerLink
import { CommonModule } from '@angular/common'; // Para *ngIf y ngClass
import { AuthService } from '../../shared/services/auth.service';
import { Cliente } from '../../shared/models/cliente.model';

@Component({
  selector: 'app-register-cliente',
  standalone: true, // Marcado como componente standalone
  imports: [
    CommonModule,          // Necesario para directivas como *ngIf, ngClass
    ReactiveFormsModule,   // Necesario para [formGroup], formControlName
    RouterModule           // Necesario para routerLink (si se usa en la plantilla)
  ],
  templateUrl: './register-cliente.component.html',
  styleUrls: ['./register-cliente.component.scss'] // Asumiendo que podrías tener estilos, ajusta si es .css o no tienes
})
export class RegisterClienteComponent {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required], // Corresponde a DNI en la entidad Cliente de Java
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      telefono: [''], // Opcional
      direccion: ['']  // Opcional
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    this.markAllAsTouched(); // Marcar todos los campos para mostrar errores de validación

    // Si el formulario sigue siendo inválido después de marcar, no continuar.
    if (this.registerForm.invalid) {
      // El mensaje de error específico por campo se mostrará en el HTML.
      // Podrías poner un mensaje general si lo deseas, pero a menudo no es necesario aquí.
      // this.errorMessage = "Por favor, corrige los errores en el formulario.";
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;

    // Excluir confirmPassword del objeto a enviar al backend
    const { confirmPassword, ...clienteData } = this.registerForm.value;

    // >>> CONSOLE.LOG INTRODUCIDO PARA DEPURACIÓN <<<
    console.log("DATOS ENVIADOS DESDE ANGULAR PARA REGISTRO (RegisterClienteComponent):", clienteData);
    console.log("Nombre específico que se envía (RegisterClienteComponent):", clienteData.nombre);

    this.authService.registerCliente(clienteData as Cliente).subscribe({
      next: (response) => {
        this.successMessage = '¡Cliente registrado con éxito! Ahora puedes iniciar sesión.';
        this.registerForm.reset(); // Limpiar el formulario tras el éxito
        // Opcional: Redirigir al usuario a la página de login después de unos segundos
        // setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      },
      error: (err) => {
        console.error('Fallo el registro del cliente:', err);
        if (err.error && typeof err.error === 'object' && err.error.message) {
            this.errorMessage = err.error.message; // Mensaje de error específico del backend
        } else if (err.error && typeof err.error === 'string') {
            this.errorMessage = err.error; // Si el backend devuelve un string de error simple
        } else if (err.status === 409) { // HTTP 409 Conflict (ej. email/DNI ya existe)
            this.errorMessage = "El email o DNI ya se encuentran registrados.";
        } else {
            this.errorMessage = 'Error en el registro. Por favor, inténtalo de nuevo más tarde.';
        }
      }
    });
  }

  markAllAsTouched() {
    Object.values(this.registerForm.controls).forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity(); // Importante para que se muestren los errores inmediatamente
    });
    // Específicamente para el error de mismatch de contraseñas a nivel de formulario
    // Si existe el error 'mismatch' en el formulario y el control 'confirmPassword' existe, se le asigna el error.
    if (this.registerForm.errors?.['mismatch'] && this.registerForm.get('confirmPassword')) {
        this.registerForm.get('confirmPassword')?.setErrors({'mismatch': true});
    }
  }
}