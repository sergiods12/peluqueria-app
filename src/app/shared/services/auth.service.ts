// src/app/shared/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http'; // HttpResponse importado
import { BehaviorSubject, Observable, tap, catchError, EMPTY, map } from 'rxjs';
import { Cliente } from '../models/cliente.model'; // Asegúrate que esta ruta es correcta
import { Empleado } from '../models/empleado.model';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'CLIENTE' | 'EMPLEADO' | 'ADMIN';
  // isAdmin ya está implícito en el rol 'ADMIN', pero si tu backend lo envía explícitamente, puedes mantenerlo.
  // Si solo el rol es la fuente de verdad para isAdmin, puedes quitarlo de aquí.
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
  public redirectUrl: string | null = null; // Para redirigir después del login

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
    this.currentUserSubject.next(user);
  }

  login(email: string, password: string, isEmpleadoLogin: boolean = false): Observable<void> {
    console.log(`AuthService: Iniciando petición POST a /login para email: ${email}, como empleado: ${isEmpleadoLogin}`);
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    let body = new HttpParams()
      .set('username', email)
      .set('password', password);
    body = body.set('isEmpleado', isEmpleadoLogin.toString()); // Añadimos el parámetro para el backend

    return this.http.post(`${this.backendUrl}/login`, body.toString(), {
      headers: headers,
      observe: 'response',    // Observar la respuesta HTTP completa
      responseType: 'text',   // <<<--- CAMBIO IMPORTANTE: Tratar la respuesta como texto inicialmente
      withCredentials: true   // Para enviar y recibir cookies de sesión
    }).pipe(
      map((response: HttpResponse<string>) => { // El cuerpo de la respuesta (response.body) ahora es un string
        console.log("AuthService: Respuesta completa recibida del POST a /login:", response);
        console.log("AuthService: Cuerpo de la respuesta (como texto):", response.body);
        console.log("AuthService: Status de la respuesta:", response.status);

        if (response.status === 200) { // Éxito explícito de nuestro RestAuthenticationSuccessHandler
          // Aunque el cuerpo podría ser "{"message":"Login Exitoso"}",
          // el hecho de que sea 200 OK es suficiente para proceder.
          // La cookie de sesión ya debería estar establecida por el backend.
          console.log("AuthService: POST a /login devolvió 200 OK. Llamando a fetchUserDetailsAndNavigate.");
          this.fetchUserDetailsAndNavigate();
        } else {
          // Si el status no es 200 (por ejemplo, 401 del RestAuthenticationFailureHandler,
          // u otro error inesperado que no fue atrapado por catchError antes).
          console.error("AuthService: POST a /login no devolvió 200 OK en el map:", response.status, response.body);
          let errorMessage = `Login falló con estado: ${response.status}.`;
          if (response.body) { // Intentar obtener un mensaje más específico si el cuerpo existe
              try {
                  // Si el failure handler devuelve JSON, esto lo parseará
                  const errorBody = JSON.parse(response.body);
                  errorMessage = errorBody.message || errorBody.error || errorMessage;
              } catch (e) { 
                  // Si no es JSON, o está vacío, usar el cuerpo como texto si es útil
                  if (response.body.length > 0 && response.body.length < 100) { // Evitar mensajes HTML largos
                    errorMessage = response.body;
                  }
              }
          }
          throw new Error(errorMessage); // Esto será atrapado por el catchError de esta tubería (pipe)
        }
      }),
      catchError(err => {
        // Este catchError atrapa errores de red (ej. servidor caído, CORS no resuelto por preflight)
        // o los errores lanzados desde el 'map' anterior.
        console.error('AuthService: Error en la tubería de /login (catchError):', err);
        this.setUserInStorage(null); // Limpiar cualquier estado de usuario persistente

        // Preparar un mensaje de error para el componente.
        // Si err ya es un Error con un mensaje, usarlo. Sino, crear uno genérico.
        const message = (err instanceof Error) ? err.message : 'Error de autenticación o conexión desconocida.';
        throw new Error(message); // Relanzar para que el componente LoginComponent lo maneje y muestre al usuario.
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
            this.setUserInStorage(user);
            const urlToNavigate = this.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
            this.redirectUrl = null;
            console.log("AuthService: Redirigiendo a:", urlToNavigate);
            this.router.navigate([urlToNavigate]);
          } else {
            console.error("AuthService: Datos de usuario inválidos o incompletos desde /api/auth/me. Usuario recibido:", user);
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
      responseType: 'text', // El logoutSuccessHandler de Spring devuelve 200 OK, el cuerpo puede ser texto o JSON
      withCredentials: true
    }).pipe(
      tap((response) => {
        console.log("AuthService: Respuesta del logout backend, status:", response.status, "Cuerpo:", response.body);
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
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

  registerCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.backendUrl}${this.apiPrefix}/clientes/register`, cliente);
  }

  registerEmpleado(empleado: Empleado): Observable<Empleado> {
    // Assuming your backend endpoint for registering employees is /api/empleados/register
    return this.http.post<Empleado>(`${this.backendUrl}${this.apiPrefix}/empleados/register`, empleado, { withCredentials: true });
}
}