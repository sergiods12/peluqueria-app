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

  constructor(private http: HttpClient, private router: Router) {
    console.log('AuthService: Instanciado. Usuario inicial desde storage:', this.currentUserSubject.value);
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
    this.currentUserSubject.next(user); // <<<--- NOTIFICA A LOS SUSCRIPTORES (COMO EL NAVBAR)
  }

  login(email: string, password: string, isEmpleadoLogin: boolean = false): Observable<void> {
    console.log(`AuthService: Iniciando POST a /login para email: ${email}, como empleado: ${isEmpleadoLogin}`);
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    let body = new HttpParams()
      .set('username', email)
      .set('password', password);
    body = body.set('isEmpleado', isEmpleadoLogin.toString()); // Añadimos el nuevo parámetro

    return this.http.post(`${this.backendUrl}/login`, body.toString(), {
      headers: headers,
      observe: 'response',
      responseType: 'text',
      withCredentials: true
    }).pipe(
      map((response: HttpResponse<string>) => {
        console.log("AuthService: Respuesta del POST a /login:", response);
        if (response.status === 200) {
          console.log("AuthService: Login HTTP 200 OK. Cuerpo:", response.body, "Llamando a fetchUserDetailsAndNavigate.");
          this.fetchUserDetailsAndNavigate(); // CRUCIAL: Obtener detalles del usuario y actualizar estado
        } else {
          console.error("AuthService: Respuesta inesperada de /login:", response);
          throw new Error(`Respuesta inesperada del servidor: ${response.status}`);
        }
      }),
      catchError(err => {
        console.error('AuthService: Error en la petición POST a /login (catchError):', err);
        this.setUserInStorage(null);
        let errorMessage = 'Error de autenticación o conexión.';
        if (err.status === 401) {
          errorMessage = 'Email o contraseña incorrectos.';
          // Comprobar si err.error es una cadena y podría ser JSON antes de intentar parsear
          if (err.error && typeof err.error === 'string') {
            try {
              const errorBody = JSON.parse(err.error);
              // Usar el mensaje del errorBody solo si es una cadena válida y no vacía
              if (errorBody && typeof errorBody.message === 'string' && errorBody.message.trim() !== '') {
                errorMessage = errorBody.message;
              }
            } catch (e) {
              // El cuerpo del error no era JSON válido. Mantenemos el mensaje de error genérico.
              console.warn('AuthService: El cuerpo de la respuesta de error no era JSON válido:', err.error);
              // Opcionalmente, si err.error es texto plano y quieres mostrarlo:
              // errorMessage = err.error; (¡Cuidado con mostrar HTML o información sensible!)
            }
          }
        }
        throw new Error(errorMessage);
      })
    );
  }

  fetchUserDetailsAndNavigate() {
    console.log("AuthService: Iniciando fetchUserDetailsAndNavigate para /api/auth/me...");
    this.http.get<AuthUser>(`${this.backendUrl}${this.apiPrefix}/auth/me`, { withCredentials: true })
      .subscribe({
        next: (user) => {
          console.log("AuthService: Detalles del usuario recibidos de /api/auth/me:", user);
          if (user && user.id != null && user.email && user.rol && user.nombre) {
            this.setUserInStorage(user); // <<<--- AQUÍ SE ACTUALIZA EL ESTADO GLOBALMENTE
            const urlToNavigate = this.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
            this.redirectUrl = null;
            console.log("AuthService: Redirigiendo a:", urlToNavigate);
            this.router.navigate([urlToNavigate]);
          } else {
            console.error("AuthService: Datos de usuario inválidos desde /api/auth/me", user);
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
    console.log("AuthService: Iniciando logout...");
    return this.http.post(`${this.backendUrl}/logout`, {}, {
      observe: 'response',
      responseType: 'text',
      withCredentials: true
    }).pipe(
      tap((response) => {
        console.log("AuthService: Respuesta del logout backend, status:", response.status);
        this.setUserInStorage(null); // Limpia el usuario y actualiza el BehaviorSubject
        this.router.navigate(['/auth/login']); // Redirige al login
      }),
      catchError((err) => {
        console.error('AuthService: Error durante el logout, limpiando estado local de todas formas.', err);
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
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
    if (expectedRole === 'ADMIN') return user.rol === 'ADMIN';
    if (expectedRole === 'EMPLEADO') return user.rol === 'EMPLEADO' || user.rol === 'ADMIN';
    return user.rol === expectedRole;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  // Métodos de registro
  registerCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.backendUrl}${this.apiPrefix}/clientes/register`, cliente);
  }

  registerEmpleado(empleado: Empleado): Observable<Empleado> {
    // Asegúrate que el endpoint y el cuerpo de la solicitud sean los correctos para tu backend
    return this.http.post<Empleado>(`${this.backendUrl}${this.apiPrefix}/empleados/register`, empleado, { withCredentials: true });
  }
}
