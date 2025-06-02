// src/app/shared/navbar/navbar.component.ts
import { Component } from '@angular/core';
import { AuthService, AuthUser } from '../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs'; // Se eliminó la importación de Subscription ya que no se usa
import { CommonModule } from '@angular/common'; // Para async pipe, *ngIf

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'] // o .css, o eliminar si no se usa
})
export class NavbarComponent {
  // currentUser$ se usará en la plantilla con el pipe async
  currentUser$: Observable<AuthUser | null>;

  constructor(
    public authService: AuthService, // Hecho público para acceso potencial desde la plantilla si fuera necesario
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    console.log('NavbarComponent: Constructor - currentUser$ inicializado.');
  }

  logout(): void {
    console.log('NavbarComponent: Botón Logout presionado.');
    this.authService.logout().subscribe({
      next: () => {
        console.log('NavbarComponent: Logout procesado por AuthService. Redirección debería haber ocurrido.');
        // La navegación y la actualización del estado son manejadas principalmente por AuthService.
      },
      error: (err) => {
        console.error('NavbarComponent: Error en la respuesta del logout del servicio:', err);
        // Fallback de navegación. Aunque AuthService también intenta navegar,
        // esto puede ser útil si authService.logout() falla antes de su propio catchError
        // o si el error se vuelve a lanzar.
        this.router.navigate(['/auth/login']);
      }
    });
  }
}