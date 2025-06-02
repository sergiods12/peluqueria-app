// src/app/auth/register-cliente/register-cliente.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; // For *ngIf
import { AuthService } from '../../shared/services/auth.service';
import { Cliente } from '../../shared/models/cliente.model';

@Component({
  selector: 'app-register-cliente',
  standalone: true,
  imports: [
    CommonModule,          // For *ngIf, ngClass
    ReactiveFormsModule,   // For formGroup, formControlName
    RouterModule           // For routerLink if used in template
  ],
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
      username: ['', Validators.required],
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
    Object.values(this.registerForm.controls).forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
     if (this.registerForm.errors?.['mismatch'] && this.registerForm.get('confirmPassword')) {
        this.registerForm.get('confirmPassword')?.setErrors({'mismatch': true});
    }

    if (this.registerForm.invalid) {
      return;
    }
    this.errorMessage = null;
    this.successMessage = null;
    const { confirmPassword, ...clienteData } = this.registerForm.value as Cliente & { confirmPassword?: string };

    this.authService.registerCliente(clienteData).subscribe({
      next: () => {
        this.successMessage = '¡Cliente registrado con éxito! Ahora puedes iniciar sesión.';
        this.registerForm.reset();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || err.error?.error || 'Error en el registro.';
      }
    });
  }
}