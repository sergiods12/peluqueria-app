// src/app/empleado/empleado-dashboard/empleado-dashboard.component.ts
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; // For <router-outlet> and navigation
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service'; // Import AuthService

@Component({
  selector: 'app-empleado-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule], // RouterModule para routerLink, routerLinkActive, router-outlet
  templateUrl: './empleado-dashboard.component.html',
  // styleUrls: ['./empleado-dashboard.component.css']
})
export class EmpleadoDashboardComponent {
    constructor(
      public authService: AuthService, // Hacerlo público para usarlo en la plantilla
      private router: Router
    ) {}

    get userName(): string | null {
      const currentUser = this.authService.getCurrentUser();
      return currentUser ? currentUser.nombre : null;
    }

    logout(): void {
      this.authService.logout().subscribe({
        next: () => {
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          console.error('Error durante el logout:', err);
          this.router.navigate(['/auth/login']); // Igualmente redirige en caso de error
        }
      });
    }
}
