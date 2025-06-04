// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, withXsrfConfiguration, withFetch } from '@angular/common/http';
import { routes } from './app.routes'; // Correct import
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { DatePipe } from '@angular/common'; // Import DatePipe

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withFetch()
    ),
    provideClientHydration(withEventReplay()), // provideClientHydration es para el cliente
    DatePipe
  ]
};
