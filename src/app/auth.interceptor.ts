// c:\Users\Sergi\peluqueria-app\src\app\auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse // Importamos HttpErrorResponse para manejar errores
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs'; // Importamos throwError
import { catchError } from 'rxjs/operators'; // Importamos catchError
import { Router } from '@angular/router'; // Importamos Router para posible redirección

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) { // Inyectamos Router
    // Si tienes un servicio de autenticación (ej. AuthService) para obtener el token,
    // puedes inyectarlo aquí:
    // constructor(private authService: AuthService, private router: Router) {}
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // --- ¡SECCIÓN CRÍTICA! ---
    // Aquí es donde se obtiene el token de autenticación.
    // El ejemplo actual usa localStorage con la clave 'authToken'.
    //
    // 1. VERIFICA: Después de un inicio de sesión exitoso, ¿se está guardando un token en localStorage?
    //    Abre las herramientas de desarrollador de tu navegador (F12) -> Pestaña "Aplicación" (o "Almacenamiento") -> "Almacenamiento local".
    //    Deberías ver un elemento con una clave (ej. 'authToken') y un valor (el token).
    //
    // 2. ADAPTA: Si la clave es diferente (ej. 'userToken', 'jwt_token', 'miToken'),
    //    cambia 'authToken' en la línea de abajo para que coincida exactamente.
    //
    // 3. ALTERNATIVA: Si guardas el token en un servicio (ej. AuthService),
    //    inyecta ese servicio en el constructor y llama a su método aquí, por ejemplo:
    //    const authToken = this.authService.getToken();

    const authToken = localStorage.getItem('authToken'); // <-- ¡VERIFICA ESTA CLAVE Y MÉTODO DE OBTENCIÓN!
    console.log('AuthInterceptor: Retrieved token from localStorage with key "authToken":', authToken); // Log de diagnóstico

    let authReq = req;

    if (authToken) {
      console.log('AuthInterceptor: Token found, adding Authorization header.'); // Log de diagnóstico
      // Clonamos la petición para añadir la cabecera de Authorization.
      // Esto asume que tu API espera un "token Bearer".
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${authToken}`),
      });
    } else {
      console.warn('AuthInterceptor: No token found in localStorage for key "authToken". Request will be sent without Authorization header.'); // Log de diagnóstico
    }

    // Enviamos la petición (original o clonada con token) al siguiente manejador.
    // Añadimos un manejo básico del error 401 aquí mismo.
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.error('AuthInterceptor: Error 401 (Unauthorized) for URL:', req.urlWithParams, 'Backend responded with 401. Posiblemente token inválido o expirado. Redirigiendo al login.');
          // Opcional: Limpiar token inválido
          localStorage.removeItem('authToken'); // O la clave que uses
          // Redirigir al usuario a la página de login
          this.router.navigate(['/auth/login']);
        }
        // Re-lanzar el error para que sea manejado por el componente o servicio que hizo la petición
        return throwError(() => error);
      })
    );
  }
}
