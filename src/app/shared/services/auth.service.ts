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
  isAdmin?: boolean;
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
    console.log('AuthService: Instanciado. Usando backendUrl:', this.backendUrl);
  }

  private getUserFromStorage(): AuthUser | null {
    if (typeof localStorage !== 'undefined') {
      const userJson = localStorage.getItem('currentUser');
      if (userJson) { try { return JSON.parse(userJson); } catch (e) { localStorage.removeItem('currentUser'); return null; } }
    }
    return null;
  }

  private setUserInStorage(user: AuthUser | null) {
    if (typeof localStorage !== 'undefined') {
      if (user) localStorage.setItem('currentUser', JSON.stringify(user));
      else localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(user);
  }

  login(email: string, password: string): Observable<void> {
    const loginUrl = `${this.backendUrl}/login`;
    console.log(`AuthService: Iniciando POST a ${loginUrl} para email:`, email);
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    const body = new HttpParams().set('username', email).set('password', password);
    return this.http.post(loginUrl, body.toString(), { headers, observe: 'response', responseType: 'text', withCredentials: true }).pipe(
      map((response: HttpResponse<string>) => {
        console.log("AuthService: Respuesta completa recibida del POST a /login:", response);
        if (response.status === 200) {
          this.fetchUserDetailsAndNavigate();
        } else {
          let errorMessage = `Login falló con estado: ${response.status}.`;
          if (response.body) { try { const eb = JSON.parse(response.body); errorMessage = eb.message || eb.error || errorMessage; } catch (e) { if (response.body.length > 0 && response.body.length < 200) errorMessage = response.body;}}
          throw new Error(errorMessage);
        }
      }),
      catchError(err => {
        this.setUserInStorage(null);
        const message = (err instanceof Error) ? err.message : (err.error?.message || err.message || 'Error de autenticación o conexión.');
        throw new Error(message);
      })
    );
  }

  fetchUserDetailsAndNavigate() {
    const userDetailsUrl = `${this.backendUrl}${this.apiPrefix}/auth/me`;
    this.http.get<AuthUser>(userDetailsUrl, { withCredentials: true }).subscribe({
      next: (user) => {
        if (user && user.id != null && user.email && user.rol && user.nombre) {
          this.setUserInStorage(user);
          const urlToNavigate = this.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
          this.redirectUrl = null; this.router.navigate([urlToNavigate]);
        } else {
          this.setUserInStorage(null); this.router.navigate(['/auth/login']);
        }
      },
      error: (err) => { this.setUserInStorage(null); this.router.navigate(['/auth/login']); }
    });
  }

  logout(): Observable<any> {
    const logoutUrl = `${this.backendUrl}/logout`;
    return this.http.post(logoutUrl, {}, { observe: 'response', responseType: 'text', withCredentials: true }).pipe(
      tap(() => { this.setUserInStorage(null); this.router.navigate(['/auth/login']); }),
      catchError(() => { this.setUserInStorage(null); this.router.navigate(['/auth/login']); return EMPTY; })
    );
  }

  registerCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.backendUrl}${this.apiPrefix}/clientes/register`, cliente, { withCredentials: true });
  }

  registerEmpleado(empleado: Empleado): Observable<Empleado> {
    // <<<--- VERIFICA Y USA LA URL CORRECTA DEL BACKEND ---<<<
    // El error dice que Angular llama a /api/empleados/register
    // Pero tu EmpleadoController.java está mapeado a POST /api/empleados
    const registerEmpleadoUrl = `${this.backendUrl}${this.apiPrefix}/empleados`; // SIN /register
    console.log("AuthService: Intentando registrar empleado en URL:", registerEmpleadoUrl, "con datos:", empleado);
    return this.http.post<Empleado>(registerEmpleadoUrl, empleado, { withCredentials: true }); // withCredentials ES CRUCIAL
  }

  getCurrentUser = () => this.currentUserSubject.value;
  isLoggedIn = () => !!this.getCurrentUser();
  hasRole(role: 'CLIENTE' | 'EMPLEADO' | 'ADMIN'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (role === 'ADMIN') return user.rol === 'ADMIN';
    if (role === 'EMPLEADO') return user.rol === 'EMPLEADO' || user.rol === 'ADMIN';
    return user.rol === role;
  }
  isAdmin = () => this.hasRole('ADMIN');
}