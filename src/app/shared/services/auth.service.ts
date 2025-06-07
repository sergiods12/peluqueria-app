// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, EMPTY, map, switchMap, throwError } from 'rxjs';
import { Cliente } from '../models/cliente.model';
import { Empleado } from '../models/empleado.model';
import { environment } from '../../../environments/environment'; // Asegúrate que esta ruta es correcta
import { Router } from '@angular/router';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'CLIENTE' | 'EMPLEADO' | 'ADMIN'; // Rol del sistema
}

// Interface for the expected response from /api/auth/me if it includes a token
interface AuthUserResponse extends AuthUser {
  token?: string; // The JWT token
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
    if (this.currentUserSubject.value) {
      console.log('AuthService: Usuario recuperado del storage:', this.currentUserSubject.value);
    }
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
        // If user is null (e.g., during logout), ensure both currentUser and authToken are cleared.
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        console.log('AuthService: authToken removed from localStorage during setUserInStorage(null).');
      }
    }
    console.log('AuthService: setUserInStorage actualizando currentUserSubject con:', user);
    this.currentUserSubject.next(user);
  }

  private clearUserAndTokenFromStorage() {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        console.log('AuthService: currentUser and authToken removed from localStorage.');
    }
    this.currentUserSubject.next(null);
  }

  login(email: string, password: string): Observable<AuthUser> {
    const loginUrl = `${this.backendUrl}/login`;
    console.log(`AuthService: Iniciando POST a ${loginUrl} para email:`, email);
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    const body = new HttpParams().set('username', email).set('password', password);

    return this.http.post(loginUrl, body.toString(), {
      headers: headers,
      observe: 'response',
      responseType: 'text', // Asumimos que el backend devuelve texto o cuerpo vacío en 200 OK para /login
      withCredentials: true
    }).pipe(
      switchMap((response: HttpResponse<string>) => {
        console.log("AuthService: Respuesta completa recibida del POST a /login:", response);
        if (response.status === 200) {
          console.log("AuthService: Login HTTP 200 OK. Cuerpo:", response.body, "Procediendo a fetchUserDetails.");
          return this.fetchUserDetails();
        } else {
          console.error("AuthService: Respuesta inesperada de /login:", response);
          let errorMessage = `Login falló con estado: ${response.status}.`;
           if (response.body) {
              try {
                  const errorBody = JSON.parse(response.body);
                  errorMessage = errorBody.message || errorBody.error || errorMessage;
              } catch (e) {
                  // Si no es JSON, y es un texto corto, usarlo.
                  if (typeof response.body === 'string' && response.body.length > 0 && response.body.length < 200) {
                    errorMessage = response.body;
                  }
              }
          }
          return throwError(() => new Error(errorMessage));
        }
      }),
      tap(user => {
        // Este tap se ejecuta después de que fetchUserDetails es exitoso
        console.log("AuthService: Detalles del usuario recibidos y validados:", user);
        this.setUserInStorage(user); // Esto guarda currentUser, pero el token se guarda en fetchUserDetails
        const urlToNavigate = this.redirectUrl || (user.rol === 'CLIENTE' ? '/cliente' : '/empleado');
        this.redirectUrl = null; // Limpiar redirectUrl después de usarlo
        console.log("AuthService: Navegando a:", urlToNavigate);
        this.router.navigate([urlToNavigate]);
      }),
      catchError(err => {
        console.error('AuthService: Error en el flujo de login o fetchUserDetails:', err);
        this.clearUserAndTokenFromStorage(); // Ensure user and token are cleared from storage
        this.router.navigate(['/auth/login']); // Redirigir a login en caso de error
        const message = (err instanceof Error) ? err.message : (err.error?.message || err.message || 'Error de autenticación o conexión.');
        return throwError(() => new Error(message)); // Propagar el error para que el componente lo maneje
      })
    );
  }

  private fetchUserDetails(): Observable<AuthUser> {
    const userDetailsUrl = `${this.backendUrl}${this.apiPrefix}/auth/me`;
    console.log(`AuthService: Iniciando fetchUserDetails para ${userDetailsUrl}...`);
    // Expect AuthUserResponse which might include a token
    return this.http.get<AuthUserResponse>(userDetailsUrl, { withCredentials: true }).pipe(
      map(response => { // response es de tipo AuthUserResponse
        console.log("AuthService: Raw response from /api/auth/me:", response); // Log para depuración

        if (!response || response.id == null || !response.email || !response.rol || !response.nombre) {
          console.error("AuthService: Datos de usuario inválidos o incompletos desde /api/auth/me:", response);
          throw new Error("Datos de usuario inválidos o incompletos recibidos del servidor.");
        }

        if (!['CLIENTE', 'EMPLEADO', 'ADMIN'].includes(response.rol)) {
          console.error("AuthService: Rol de usuario inválido recibido de /api/auth/me:", response.rol);
          throw new Error("Rol de usuario inválido recibido del servidor.");
        }

        // Manejo del token
        if (response.token) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('authToken', response.token);
            console.log('AuthService: authToken stored in localStorage from fetchUserDetails.');
          } else {
            console.warn('AuthService: localStorage is not available, cannot store authToken.');
          }
        } else {
          console.warn('AuthService: No token field found or token is empty in the response from /api/auth/me. This is likely the cause of missing Authorization headers.');
          // Considerar si esto debería ser un error que impida el login si el token es esencial.
        }

        // Construir el objeto AuthUser para el BehaviorSubject y el retorno
        const authUser: AuthUser = {
          id: response.id,
          nombre: response.nombre,
          email: response.email,
          rol: response.rol
        };
        // Actualizar currentUserSubject aquí también, después de tener el AuthUser y potencialmente el token.
        // this.currentUserSubject.next(authUser); // OJO: setUserInStorage ya hace esto.
                                                // El token se guarda en localStorage, currentUser en localStorage y en el BehaviorSubject.
        return authUser;
      }),
      catchError(err => {
        console.error('AuthService: Error en fetchUserDetails:', err);
        this.clearUserAndTokenFromStorage(); // Limpiar almacenamiento en caso de error aquí
        return throwError(() => new Error(err.message || 'Error al obtener detalles del usuario.'));
      })
    );
  }

  logout(): Observable<any> {
    const logoutUrl = `${this.backendUrl}/logout`;
    console.log(`AuthService: Iniciando logout a ${logoutUrl}...`);
    return this.http.post(logoutUrl, {}, { observe: 'response', responseType: 'text', withCredentials: true }).pipe(
      tap((response) => {
        console.log('AuthService: Logout HTTP response:', response.status);
        console.log('AuthService: Logout exitoso, limpiando usuario, token y navegando a /auth/login.');
        this.clearUserAndTokenFromStorage();
        this.router.navigate(['/auth/login']);
      }),
      catchError((err) => {
        console.error('AuthService: Fallo en la llamada de logout al backend:', err, 'Limpiando usuario y navegando a /auth/login de todas formas.');
        this.clearUserAndTokenFromStorage();
        this.router.navigate(['/auth/login']); // Navigate even if backend logout fails
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

  getCurrentUser = (): AuthUser | null => this.currentUserSubject.value;

  isLoggedIn = (): boolean => !!this.getCurrentUser();

  hasRole(role: 'CLIENTE' | 'EMPLEADO' | 'ADMIN'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    if (role === 'ADMIN') {
      return user.rol === 'ADMIN';
    }
    if (role === 'EMPLEADO') {
      return user.rol === 'EMPLEADO' || user.rol === 'ADMIN';
    }
    return user.rol === role;
  }
  isAdmin = () => this.hasRole('ADMIN');
}
