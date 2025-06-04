// src/app/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // ReactiveFormsModule para formGroup
import { Router, RouterModule } from '@angular/router'; // RouterModule para routerLink
import { CommonModule } from '@angular/common'; // CommonModule para *ngIf, *ngFor, etc.
import { AuthService, AuthUser } from '../../shared/services/auth.service'; // Importar AuthUser
import { HttpErrorResponse } from '@angular/common/http'; // <-- HttpErrorResponse añadido aquí

@Component({
  selector: 'app-login',
  standalone: true, // Marcado como componente standalone
  imports: [
    CommonModule,        // Para directivas como *ngIf, ngClass
    ReactiveFormsModule, // Para [formGroup], formControlName
    RouterModule         // <<<--- IMPORTANTE para que routerLink funcione en el HTML
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'] // Ajusta a .css si es necesario, o elimina si no tienes estilos específicos
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
    // Por seguridad, no loguear la contraseña completa en producción
    console.log("INTENTANDO LOGIN CON -> Email:", email, "Password:", password ? password.substring(0,1) + '***' : 'N/A');

    this.authService.login(email, password).subscribe({
      next: () => {
        // AuthService se encarga de fetchUserDetailsAndNavigate,
        // así que el next aquí puede quedar vacío o solo loguear el éxito de la petición HTTP.
        console.log('LoginComponent: Petición de login enviada, AuthService gestionará el siguiente paso.');
        // La redirección la maneja AuthService después de fetchUserDetailsAndNavigate
      },
      error: (err) => {
        console.error('LoginComponent: Fallo el login:', err);
        // El error ya debería ser un objeto Error con un mensaje del AuthService
        this.errorMessage = (err instanceof Error) ? err.message : 'Error desconocido durante el inicio de sesión.';
      }
    });
  }

  private redirectToDashboard(user: AuthUser | null): void {
    if (user) {
      // Usar la URL de redirección si existe, o el dashboard por defecto
      const urlToNavigate = this.authService.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
      this.authService.redirectUrl = null; // Limpiar después de usar
      this.router.navigate([urlToNavigate]);
    }
  }
}
