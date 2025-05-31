// src/app/auth/register-cliente/register-cliente.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { Cliente } from '../../shared/models/cliente.model';

@Component({
  selector: 'app-register-cliente',
  templateUrl: './register-cliente.component.html',
  // styleUrls: ['./register-cliente.component.css']
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
      username: ['', Validators.required], // DNI
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      telefono: [''],
      direccion: ['']
    }, { validators: this.passwordMatchValidator });
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

    const { confirmPassword, ...clienteData } = this.registerForm.value as Cliente & { confirmPassword?: string };

    this.authService.registerCliente(clienteData).subscribe({
      next: () => {
        this.successMessage = '¡Cliente registrado con éxito! Ahora puedes iniciar sesión.';
        this.registerForm.reset();
        // Opcional: this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        console.error('Registration failed', err);
        this.errorMessage = err.error?.message || err.error?.error || 'Error en el registro. Verifica los datos o inténtalo más tarde.';
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