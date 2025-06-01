// src/app/shared/navbar/navbar.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService, AuthUser } from '../services/auth.service'; // Corrected path
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  // styleUrls: ['./navbar.component.css'] // Ensure this path is correct if used
})
export class NavbarComponent implements OnInit {
  currentUser$: Observable<AuthUser | null>;

  constructor(public authService: AuthService, private router: Router) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {}

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        // Navigation is handled within authService.logout()
      },
      error: (err) => {
        console.error('Logout error from navbar', err);
        this.router.navigate(['/auth/login']); // Fallback navigation
      }
    });
  }
}