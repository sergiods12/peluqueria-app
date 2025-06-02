// src/app/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // Importar ReactiveFormsModule
import { Router, RouterModule } from '@angular/router'; // Importar RouterModule si usas routerLink en la plantilla
import { CommonModule } from '@angular/common'; // Importar CommonModule para *ngIf, etc.
import { AuthService, AuthUser } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true, // Marcado como componente standalone
  imports: [
    CommonModule,          // Para directivas como *ngIf (ej. para errorMessage)
    ReactiveFormsModule,   // Para [formGroup], formControlName
    RouterModule           // Para routerLink (si lo usas en el HTML del login)
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'] // Asumiendo que podrías tener estilos, si no, ajusta o elimina.
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
    // Si ya está logueado, redirigir al dashboard correspondiente
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      this.redirectToDashboard(user);
    }
  }

  onSubmit(): void {
    // Marcar todos los campos como "touched" para que se muestren los errores de validación
    Object.values(this.loginForm.controls).forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });

    if (this.loginForm.invalid) {
      this.errorMessage = "Por favor, introduce un email y contraseña válidos.";
      return;
    }
    this.errorMessage = null; // Limpiar mensajes de error previos

    const { email, password } = this.loginForm.value;

    // >>> LÍNEA DE CONSOLE.LOG INTEGRADA PARA DEPURACIÓN <<<
    console.log("INTENTANDO LOGIN CON -> Email:", email, "Password:", password.substring(0,1) + '***'); // Mostramos solo una parte de la contraseña por seguridad en logs

    this.authService.login(email, password).subscribe({
      // El AuthService ahora se encarga de fetchUserDetailsAndNavigate,
      // así que la parte 'next' aquí puede estar vacía o solo registrar el éxito de la petición.
      next: () => {
        console.log('Petición HTTP de login exitosa. AuthService gestionará los detalles del usuario y la navegación.');
        // La navegación principal ocurre en AuthService después de obtener los detalles del usuario.
        // Si hay una URL de redirección guardada, AuthService la usará.
        // Si no, redirigirá al dashboard por defecto basado en el rol.
      },
      error: (err) => {
        console.error('Fallo el login en el componente:', err);
        if (err.status === 401) { // Unauthorized
            this.errorMessage = 'Email o contraseña incorrectos.';
        } else if (err.status === 0 || err.name === 'HttpErrorResponse' && !err.status) { // Error de red o CORS
            this.errorMessage = 'Error de conexión. No se pudo contactar al servidor.';
        } else if (err.error && typeof err.error === 'string' && err.error.includes('Bad credentials')) {
            this.errorMessage = 'Email o contraseña incorrectos.';
        } else if (err.error && err.error.message) {
            this.errorMessage = err.error.message;
        } else if (err.message) {
            this.errorMessage = err.message;
        }
         else {
            this.errorMessage = `Error al intentar iniciar sesión (Estado: ${err.status || 'desconocido'}). Inténtalo más tarde.`;
        }
      }
    });
  }

  private redirectToDashboard(user: AuthUser | null): void {
    if (user) {
      // Usar la URL de redirección si existe, o el dashboard por defecto
      const urlToNavigate = this.authService.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
      this.authService.redirectUrl = null; // Limpiar la URL de redirección después de usarla
      this.router.navigate([urlToNavigate]);
    }
  }
}