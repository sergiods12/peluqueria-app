// src/app/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, AuthUser } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  // styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      this.redirectToDashboard(user);
    }
  }

  onSubmit(): void {
    this.markAllAsTouched();
    if (this.loginForm.invalid) {
      return;
    }
    this.errorMessage = null;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      // Navigation is handled by AuthService after fetching user details
      error: (err) => {
        console.error('Login failed in component', err);
        if (err.status === 401 || err.status === 0) {
            this.errorMessage = 'Email o contraseña incorrectos, o error de conexión.';
        } else if (err.error && typeof err.error === 'string' && err.error.includes('Bad credentials')) {
             this.errorMessage = 'Email o contraseña incorrectos.';
        } else if (err.error && err.error.message) {
            this.errorMessage = err.error.message;
        } else if (err.message) {
            this.errorMessage = err.message;
        }
         else {
            this.errorMessage = `Error al intentar iniciar sesión (${err.statusText || 'desconocido'}). Inténtalo más tarde.`;
        }
      }
    });
  }

  markAllAsTouched() {
    Object.values(this.loginForm.controls).forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
  }

  private redirectToDashboard(user: AuthUser | null): void {
    if (user) {
      const urlToNavigate = this.authService.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
      this.authService.redirectUrl = null;
      this.router.navigate([urlToNavigate]);
    }
  }
}