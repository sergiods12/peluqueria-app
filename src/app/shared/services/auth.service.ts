// src/app/shared/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, EMPTY, map } from 'rxjs';
import { Cliente } from '../models/cliente.model';
import { Empleado } from '../models/empleado.model';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'CLIENTE' | 'EMPLEADO' | 'ADMIN';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private backendUrl = environment.apiUrl;
  private apiPrefix = environment.apiPrefix;

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();
  public redirectUrl: string | null = null; // <<< ADD THIS LINE if it's missing

  constructor(private http: HttpClient, private router: Router) { }

  private getUserFromStorage(): AuthUser | null {
    if (typeof localStorage !== 'undefined') {
      const user = localStorage.getItem('currentUser');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  private setUserInStorage(user: AuthUser | null) {
    if (typeof localStorage !== 'undefined') {
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('currentUser');
      }
    }
    this.currentUserSubject.next(user);
  }

  login(email: string, password: string): Observable<void> {
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    const body = new HttpParams().set('username', email).set('password', password);

    return this.http.post(`${this.backendUrl}/login`, body.toString(), {
      headers: headers,
      observe: 'response',
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.ok) {
          this.fetchUserDetailsAndNavigate();
        } else {
          throw new Error(`Login failed with status: ${response.status}`);
        }
      }),
      catchError(err => {
        console.error('Login HTTP request failed in AuthService', err);
        this.setUserInStorage(null);
        throw err;
      })
    );
  }

  fetchUserDetailsAndNavigate() {
    this.http.get<AuthUser>(`${this.backendUrl}${this.apiPrefix}/auth/me`, { withCredentials: true })
      .subscribe({
        next: (user) => {
          this.setUserInStorage(user);
          // Navigate to the stored redirectUrl or to a default dashboard
          const urlToNavigate = this.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
          this.redirectUrl = null; // Clear the redirectUrl after using it
          this.router.navigate([urlToNavigate]);
        },
        error: (err) => {
          console.error('Failed to fetch user details after login', err);
          this.setUserInStorage(null);
          this.router.navigate(['/auth/login']);
        }
      });
  }

  registerCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.backendUrl}${this.apiPrefix}/clientes/register`, cliente);
  }

  registerEmpleado(empleado: Empleado): Observable<Empleado> {
    return this.http.post<Empleado>(`${this.backendUrl}${this.apiPrefix}/empleados`, empleado, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.post(`${this.backendUrl}/logout`, {}, {
        observe: 'response',
        withCredentials: true
    }).pipe(
      tap(() => {
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
      }),
      catchError(err => {
        console.error('Logout failed, but cleaning local state anyway.', err);
        this.setUserInStorage(null); // Ensure local state is cleared
        this.router.navigate(['/auth/login']); // Navigate to login
        return EMPTY;
      })
    );
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  hasRole(expectedRole: 'CLIENTE' | 'EMPLEADO' | 'ADMIN'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (expectedRole === 'ADMIN') {
        return user.rol === 'ADMIN';
    }
    if (expectedRole === 'EMPLEADO') {
        return user.rol === 'EMPLEADO' || user.rol === 'ADMIN';
    }
    return user.rol === expectedRole;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return !!user && user.rol === 'ADMIN';
  }
}