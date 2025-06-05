// src/app/app.config.ts
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, withXsrfConfiguration } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { DatePipe, registerLocaleData } from '@angular/common'; // Importar registerLocaleData
import localeEs from '@angular/common/locales/es'; // Importar el locale español

// Registrar los datos de localización para español
registerLocaleData(localeEs, 'es-ES');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })
    ),
    provideClientHydration(withEventReplay()),
    DatePipe, // DatePipe ya estaba, está bien
    { provide: LOCALE_ID, useValue: 'es-ES' } // Establecer 'es-ES' como el LOCALE_ID por defecto
  ]
};