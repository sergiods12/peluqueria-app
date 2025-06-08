// src/app/shared/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, EMPTY, map, switchMap, throwError } from 'rxjs';
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
  public redirectUrl: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    if (this.currentUserSubject.value) {
      console.log('AuthService: Usuario recuperado del storage:', this.currentUserSubject.value);
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private getUserFromStorage(): AuthUser | null {
    if (!this.isBrowser()) return null;

    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
    return null;
  }

  private setUserInStorage(user: AuthUser | null) {
    if (!this.isBrowser()) return;

    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(user);
  }

  private clearUserFromStorage() {
    if (this.isBrowser()) {
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
  }

  login(email: string, password: string): Observable<AuthUser> {
    const loginUrl = `${this.backendUrl}/login`;
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    const body = new HttpParams().set('username', email).set('password', password);

    return this.http.post(loginUrl, body.toString(), {
      headers,
      observe: 'response',
      responseType: 'text',
      withCredentials: true
    }).pipe(
      switchMap((response: HttpResponse<string>) => {
        if (response.status === 200) {
          return this.fetchUserDetails();
        } else {
          return throwError(() => new Error(`Login falló con estado: ${response.status}.`));
        }
      }),
      tap(user => {
        this.setUserInStorage(user);
        const urlToNavigate = this.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
        this.redirectUrl = null;
        this.router.navigate([urlToNavigate]);
      }),
      catchError(err => {
        this.clearUserFromStorage();
        this.router.navigate(['/auth/login']);
        return throwError(() => new Error(err.message || 'Error de autenticación.'));
      })
    );
  }

  private fetchUserDetails(): Observable<AuthUser> {
    const userDetailsUrl = `${this.backendUrl}${this.apiPrefix}/auth/me`;
    return this.http.get<AuthUser>(userDetailsUrl, { withCredentials: true }).pipe(
      map(response => {
        if (!response || !response.email || !response.nombre || !response.rol) {
          throw new Error("Datos de usuario inválidos o incompletos recibidos del servidor.");
        }
        return response;
      }),
      catchError(err => {
        this.clearUserFromStorage();
        return throwError(() => new Error(err.message || 'Error al obtener detalles del usuario.'));
      })
    );
  }

  logout(): Observable<any> {
    const logoutUrl = `${this.backendUrl}/logout`;
    return this.http.post(logoutUrl, {}, {
      observe: 'response',
      responseType: 'text',
      withCredentials: true
    }).pipe(
      tap(() => {
        this.clearUserFromStorage();
        this.router.navigate(['/auth/login']);
      }),
      catchError(err => {
        this.clearUserFromStorage();
        this.router.navigate(['/auth/login']);
        return EMPTY;
      })
    );
  }

  registerCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(
      `${this.backendUrl}${this.apiPrefix}/clientes/register`,
      cliente,
      { withCredentials: true }
    );
  }

  registerEmpleado(empleado: Empleado): Observable<Empleado> {
    return this.http.post<Empleado>(
      `${this.backendUrl}${this.apiPrefix}/empleados`,
      empleado,
      { withCredentials: true }
    );
  }

  getCurrentUser = (): AuthUser | null => this.currentUserSubject.value;

  isLoggedIn = (): boolean => !!this.getCurrentUser();

  hasRole(role: 'CLIENTE' | 'EMPLEADO' | 'ADMIN'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    if (role === 'ADMIN') return user.rol === 'ADMIN';
    if (role === 'EMPLEADO') return user.rol === 'EMPLEADO' || user.rol === 'ADMIN';

    return user.rol === role;
  }

  isAdmin = () => this.hasRole('ADMIN');
}
