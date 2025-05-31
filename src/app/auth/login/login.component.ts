// src/app/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../shared/services/auth.service'; // Importar AuthUser

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  // styleUrls: ['./login.component.css'] // Descomenta si tienes estilos específicos
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
    // Si ya está logueado, redirigir
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      this.redirectToDashboard(user);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.errorMessage = null;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      // El AuthService ahora se encarga de fetchUserDetailsAndNavigate
      // por lo que el next aquí puede quedar vacío o solo loguear el éxito de la petición HTTP
      next: () => {
        console.log('Login HTTP request successful. User details fetch and navigation handled by AuthService.');
        // La navegación se hará desde AuthService después de obtener los detalles del usuario
      },
      error: (err) => {
        console.error('Login failed in component', err);
        if (err.status === 401 || err.status === 0) { // 0 a veces para errores de red/CORS
            this.errorMessage = 'Email o contraseña incorrectos, o error de conexión.';
        } else {
            this.errorMessage = `Error al intentar iniciar sesión (${err.status}). Inténtalo más tarde.`;
        }
      }
    });
  }

  private redirectToDashboard(user: AuthUser | null): void {
    if (user) {
      if (user.rol === 'CLIENTE') {
        this.router.navigate(['/cliente']);
      } else if (user.rol === 'EMPLEADO' || user.rol === 'ADMIN') {
        this.router.navigate(['/empleado']);
      }
    }
  }
}