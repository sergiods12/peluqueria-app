// c:\Users\Sergi\peluqueria-app\src\app\shared\navbar\navbar.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service'; // Asegúrate de que la ruta al AuthService sea correcta
import { AuthUser } from '../services/auth.service'; // Importa AuthUser si lo necesitas para mostrar info

@Component({
  selector: 'app-navbar',
  standalone: true, // Asegúrate de que sea standalone si tu app es así
  imports: [
    CommonModule,
    RouterModule // Necesario para routerLink
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'] // Ajusta o elimina si no tienes estilos específicos
})
export class NavbarComponent {
  // Inyecta AuthService y hazlo público para poder usarlo en el template
  constructor(public authService: AuthService) {
    console.log('NavbarComponent: Constructor - currentUser$ inicializado.');
  }

  logout(): void {
    console.log('NavbarComponent: Iniciando logout...');
    this.authService.logout().subscribe({
      next: () => console.log('NavbarComponent: Logout exitoso.'),
      error: (err) => console.error('NavbarComponent: Error durante logout:', err)
    });
  }

  // Método opcional para obtener el usuario actual si necesitas acceder a sus propiedades en el template
  getCurrentUser(): AuthUser | null {
    return this.authService.getCurrentUser();
  }
}
