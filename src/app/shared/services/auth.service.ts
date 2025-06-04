// src/app/shared/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse, HttpErrorResponse } from '@angular/common/http'; // <-- HttpErrorResponse añadido aquí
import { BehaviorSubject, Observable, tap, catchError, EMPTY, map } from 'rxjs';
import { Cliente } from '../models/cliente.model';
import { Empleado } from '../models/empleado.model';
import { environment } from '../../../environments/environment'; // Asegúrate que esta ruta es correcta
import { Router } from '@angular/router';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'CLIENTE' | 'EMPLEADO' | 'ADMIN'; // Rol del sistema
  isAdmin?: boolean; // Opcional, ya que el rol ADMIN lo implica
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
    console.log('AuthService: Instanciado. Usando backendUrl:', this.backendUrl, 'con apiPrefix:', this.apiPrefix);
  }

  private getUserFromStorage(): AuthUser | null {
    if (typeof localStorage !== 'undefined') {
      const userJson = localStorage.getItem('currentUser');
      if (userJson) {
        try {
          return JSON.parse(userJson);
        } catch (e) {
          console.error('AuthService: Error al parsear currentUser de localStorage', e);
          localStorage.removeItem('currentUser');
          return null;
        }
      }
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
    console.log('AuthService: setUserInStorage actualizando currentUserSubject con:', user);
    this.currentUserSubject.next(user);
  }

  login(email: string, password: string): Observable<void> {
    const loginUrl = `${this.backendUrl}/login`;
    console.log(`AuthService: Iniciando POST a ${loginUrl} para email:`, email);
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    const body = new HttpParams().set('username', email).set('password', password);

    return this.http.post(loginUrl, body.toString(), {
      headers: headers,
      observe: 'response',
      responseType: 'text',
      withCredentials: true
    }).pipe(
      map((response: HttpResponse<string>) => {
        console.log("AuthService: Respuesta completa recibida del POST a /login:", response);
        if (response.status === 200) {
          // Si el backend está configurado para AJAX, el cuerpo no debería ser HTML.
          // Si aún devuelve HTML aquí, es un problema del backend.
          if (response.body && response.body.trim().startsWith('<!DOCTYPE html>')) {
             console.warn("AuthService: Login HTTP 200 OK, pero el cuerpo es HTML. El backend debería devolver una respuesta vacía o JSON para AJAX.");
             // A pesar del HTML, si la cookie de sesión se establece, fetchUserDetailsAndNavigate podría funcionar.
          } else {
            console.log("AuthService: Login HTTP 200 OK. Cuerpo:", response.body);
          }
          this.fetchUserDetailsAndNavigate();
        } else {
          // Esto no debería ocurrir si el backend devuelve 401 directamente en caso de fallo.
          console.error("AuthService: Respuesta inesperada de /login (no 200 ni error HTTP):", response);
          let errorMessage = `Login falló con estado: ${response.status}.`;
           if (response.body) {
              try {
                  const errorBody = JSON.parse(response.body);
                  errorMessage = errorBody.message || errorBody.error || errorMessage;
              } catch (e) {
                  if (response.body.length > 0 && response.body.length < 200) {
                    errorMessage = response.body;
                  }
              }
          }
          throw new Error(errorMessage);
        }
      }),
      catchError(err => {
        this.setUserInStorage(null);
        let message = 'Error de autenticación o conexión.';
        if (err instanceof HttpErrorResponse) {
            // El backend devolvió un error HTTP (ej: 401)
            message = `Error ${err.status}: Credenciales incorrectas o usuario no autorizado.`;
            if (err.error && typeof err.error === 'string') {
                try {
                    const errorBody = JSON.parse(err.error);
                    message = errorBody.message || errorBody.error || message;
                } catch (e) {
                    // Si el error no es JSON, usar el texto si es corto
                    if (err.error.length < 200) message = err.error;
                }
            } else if (err.error?.message) {
                message = err.error.message;
            }
        } else if (err instanceof Error) {
            message = err.message;
        }
        console.error('AuthService: Error en la tubería de login:', err);
        throw new Error(message);
      })
    );
  }

  fetchUserDetailsAndNavigate() {
    const userDetailsUrl = `${this.backendUrl}${this.apiPrefix}/auth/me`;
    console.log(`AuthService: Iniciando fetchUserDetailsAndNavigate para ${userDetailsUrl}...`);
    this.http.get<AuthUser>(userDetailsUrl, { withCredentials: true }).subscribe({
      next: (user) => {
        console.log("AuthService: Detalles del usuario recibidos de /api/auth/me:", user);
        if (user && user.id != null && user.email && user.rol && user.nombre) {
          if (!['CLIENTE', 'EMPLEADO', 'ADMIN'].includes(user.rol)) {
            console.error("AuthService: Rol de usuario inválido recibido de /api/auth/me:", user.rol);
            this.setUserInStorage(null);
            this.router.navigate(['/auth/login']);
            return;
          }
          this.setUserInStorage(user);
          const urlToNavigate = this.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
          this.redirectUrl = null;
          this.router.navigate([urlToNavigate]);
        } else {
          console.error("AuthService: Datos de usuario inválidos desde /api/auth/me:", user);
          this.setUserInStorage(null);
          this.router.navigate(['/auth/login']);
        }
      },
      error: (err) => {
        console.error('AuthService: Fallo al obtener detalles del usuario de /api/auth/me:', err);
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
      }
    });
  }

  logout(): Observable<any> {
    const logoutUrl = `${this.backendUrl}/logout`;
    console.log(`AuthService: Iniciando logout a ${logoutUrl}...`);
    return this.http.post(logoutUrl, {}, { observe: 'response', responseType: 'text', withCredentials: true }).pipe(
      tap(() => {
        console.log('AuthService: Logout HTTP exitoso o con error manejado. Limpiando estado local.');
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
      }),
      catchError((err) => {
        console.error('AuthService: Error durante el logout HTTP. Limpiando estado local de todas formas.', err);
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
        return EMPTY;
      })
    );
  }

  registerCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.backendUrl}${this.apiPrefix}/clientes/register`, cliente, { withCredentials: true });
  }

  registerEmpleado(empleado: Empleado): Observable<Empleado> {
    const registerEmpleadoUrl = `${this.backendUrl}${this.apiPrefix}/empleados`;
    console.log("AuthService: Intentando registrar empleado en URL:", registerEmpleadoUrl, "con datos:", empleado);
    return this.http.post<Empleado>(registerEmpleadoUrl, empleado, { withCredentials: true });
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
