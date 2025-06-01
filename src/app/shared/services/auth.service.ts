import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, EMPTY } from 'rxjs';
import { Cliente } from '../models/cliente.model';
import { Empleado } from '../models/empleado.model';
import { environment } from '../../../environments/environment'; // This path should now be correct
import { Router } from '@angular/router';

export interface AuthUser { // Interfaz unificada para el usuario en el frontend
  id: number;
  nombre: string;
  email: string;
  rol: 'CLIENTE' | 'EMPLEADO' | 'ADMIN';
  isAdmin?: boolean; // Específico para empleados
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private backendUrl = environment.apiUrl;
  private apiPrefix = environment.apiPrefix;

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  private getUserFromStorage(): AuthUser | null {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  private setUserInStorage(user: AuthUser | null) {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(user);
  }

  login(email: string, password: string): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    const body = new HttpParams().set('username', email).set('password', password);

    return this.http.post(`${this.backendUrl}/login`, body.toString(), { // /login está en la raíz
      headers: headers,
      observe: 'response',
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.ok) {
          // Después de un login exitoso con formLogin, la cookie de sesión se establece.
          // Ahora, necesitamos obtener los detalles del usuario autenticado.
          this.fetchUserDetailsAndNavigate();
        }
      }),
      catchError(err => {
        console.error('Login HTTP request failed', err);
        this.setUserInStorage(null); // Asegurar que no quede usuario en storage si falla
        throw err; // Relanzar el error para que el componente lo maneje
      })
    );
  }

  // Este método se llama DESPUÉS de que el login HTTP (POST a /login) sea exitoso
  // y la cookie de sesión JSESSIONID esté (presumiblemente) establecida.
  fetchUserDetailsAndNavigate() {
    // Debes tener un endpoint en tu backend, por ejemplo, GET /api/auth/me
    // que devuelva los detalles del usuario actualmente autenticado (basado en su sesión).
    // Este endpoint debe estar protegido y solo accesible si el usuario está autenticado.
    this.http.get<AuthUser>(`${this.backendUrl}${this.apiPrefix}/auth/me`, { withCredentials: true })
      .subscribe({
        next: (user) => {
          this.setUserInStorage(user);
          if (user.rol === 'CLIENTE') {
            this.router.navigate(['/cliente']);
          } else if (user.rol === 'EMPLEADO' || user.rol === 'ADMIN') {
            this.router.navigate(['/empleado']);
          } else {
            this.router.navigate(['/auth/login']); // Fallback
          }
        },
        error: (err) => {
          console.error('Failed to fetch user details after login', err);
          this.setUserInStorage(null); // Limpiar en caso de error
          this.router.navigate(['/auth/login']); // Volver al login
        }
      });
  }


  registerCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.backendUrl}${this.apiPrefix}/clientes/register`, cliente, { withCredentials: true });
  }

  registerEmpleado(empleado: Empleado): Observable<Empleado> {
    return this.http.post<Empleado>(`${this.backendUrl}${this.apiPrefix}/empleados`, empleado, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.post(`${this.backendUrl}/logout`, {}, { // /logout está en la raíz
        observe: 'response',
        withCredentials: true
    }).pipe(
      tap(() => {
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
      }),
      catchError(err => {
        console.error('Logout failed', err);
        // Aunque falle, intentamos limpiar localmente
        this.setUserInStorage(null);
        this.router.navigate(['/auth/login']);
        return EMPTY; // O manejar el error de otra forma
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
    return !!user && user.rol === expectedRole;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    // En EmpleadoUserDetailsService, isAdmin se mapea a ROLE_ADMIN.
    // O si AuthUser tiene un campo isAdmin: return !!user && user.rol === 'ADMIN' && user.isAdmin;
    return !!user && user.rol === 'ADMIN';
  }
}