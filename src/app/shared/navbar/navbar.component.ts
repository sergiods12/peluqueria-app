// src/app/shared/components/navbar/navbar.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService, AuthUser } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navbar', // <-- This must match the usage in app.component.html
  templateUrl: './navbar.component.html',
  // styleUrls: ['./navbar.component.css']
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