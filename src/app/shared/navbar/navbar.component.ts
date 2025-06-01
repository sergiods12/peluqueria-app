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
  // styleUrls: ['./navbar.component.css'] // styleUrls should be an array
})
export class NavbarComponent implements OnInit {
  currentUser$: Observable<AuthUser | null>;

  constructor(public authService: AuthService, private router: Router) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {}

  logout() {
    this.authService.logout().subscribe(() => {
      console.log('Logged out from navbar, navigation handled by authService.');
    });
  }
}