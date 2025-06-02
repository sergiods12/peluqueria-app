// src/app/shared/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, EMPTY, map } from 'rxjs';
import { Cliente } from '../models/cliente.model';
import { Empleado } from '../models/empleado.model';
import { environment } from '../../../enviroments/enviroment';
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
    console.log("AuthService: Iniciando petición POST a /login");
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    const body = new HttpParams().set('username', email).set('password', password);

    return this.http.post(`${this.backendUrl}/login`, body.toString(), {
      headers: headers,
      observe: 'response',    // Observar la respuesta HTTP completa
      responseType: 'text',   // <<<--- CAMBIO TEMPORAL PARA DEPURAR: Tratar la respuesta como texto
      withCredentials: true
    }).pipe(
      map((response: HttpResponse<string>) => { // El cuerpo de la respuesta ahora es string
        console.log("AuthService: Respuesta completa recibida del POST a /login", response);
        console.log("AuthService: Cuerpo de la respuesta (como texto):", response.body);

        if (response.status === 200) { // Éxito explícito de RestAuthenticationSuccessHandler
          // Intentamos parsear el cuerpo por si es el JSON esperado
          try {
            const jsonBody = response.body ? JSON.parse(response.body) : {};
            console.log("AuthService: Cuerpo de respuesta 200 parseado como JSON:", jsonBody);
            // Aquí podrías verificar jsonBody.message si tu success handler lo envía
            console.log("AuthService: POST a /login con 200 OK, llamando a fetchUserDetailsAndNavigate.");
            this.fetchUserDetailsAndNavigate();
          } catch (e) {
            console.warn("AuthService: Respuesta 200 OK de /login pero no es JSON válido o está vacío. Procediendo igualmente a fetchUserDetails.", response.body, e);
            // Si el success handler solo devuelve 200 OK sin cuerpo, o un cuerpo no JSON,
            // igual procedemos a intentar obtener los detalles del usuario, ya que la sesión debería estar establecida.
            this.fetchUserDetailsAndNavigate();
          }
        } else {
          // Si el status no es 200, lo consideramos un error para el flujo de login
          // El failureHandler debería devolver un 401 con un cuerpo JSON.
          console.error("AuthService: POST a /login no devolvió 200 OK:", response.status, response.body);
          let errorMessage = `Login falló con estado: ${response.status}`;
          if (response.body) {
              try {
                  const errorBody = JSON.parse(response.body);
                  errorMessage = errorBody.message || errorMessage;
              } catch (e) { /* no era json, usar el cuerpo como string si existe */ 
                  errorMessage = response.body || errorMessage;
              }
          }
          throw new Error(errorMessage); // Será atrapado por catchError
        }
      }),
      catchError(err => {
        // Este catchError atrapa errores de red, o los errores lanzados desde el map
        console.error('AuthService: Error en la petición POST a /login (catchError global):', err);
        this.setUserInStorage(null);
        // Propagar el error para que el componente lo maneje (o un error más genérico)
        const httpError = err as any; // Para acceder a status o message si es un HttpErrorResponse
        throw new Error(httpError.error?.message || httpError.message || 'Error de autenticación o conexión.');
      })
    );
  }

  fetchUserDetailsAndNavigate() {
    console.log("AuthService: Iniciando fetchUserDetailsAndNavigate...");
    this.http.get<AuthUser>(`${this.backendUrl}${this.apiPrefix}/auth/me`, { withCredentials: true })
      .subscribe({
        next: (user) => {
          console.log("AuthService: Detalles del usuario recibidos de /api/auth/me:", user);
          this.setUserInStorage(user);
          const urlToNavigate = this.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
          this.redirectUrl = null;
          this.router.navigate([urlToNavigate]);
        },
        error: (err) => {
          console.error('AuthService: Fallo al obtener detalles del usuario de /api/auth/me:', err);
          this.setUserInStorage(null);
          this.router.navigate(['/auth/login']);
        }
      });
  }

  // ... resto de los métodos de AuthService (registerCliente, registerEmpleado, logout, etc.)
  registerCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.backendUrl}${this.apiPrefix}/clientes/register`, cliente);
  }

  registerEmpleado(empleado: Empleado): Observable<Empleado> {
    return this.http.post<Empleado>(`${this.backendUrl}${this.apiPrefix}/empleados`, empleado, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.post(`${this.backendUrl}/logout`, {}, { observe: 'response', responseType: 'text', withCredentials: true }).pipe(
      tap((response) => {
        console.log("Logout response status:", response.status);
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
      }),
      catchError((err) => {
        console.error('Logout failed, but cleaning local state anyway.', err);
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
        return EMPTY;
      })
    );
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