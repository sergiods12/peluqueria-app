// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterClienteComponent } from './auth/register-cliente/register-cliente.component';
import { RegisterEmpleadoComponent } from './auth/register-empleado/register-empleado.component';
import { ClienteDashboardComponent } from './cliente/cliente-dashboard/cliente-dashboard.component';
import { EmpleadoDashboardComponent } from './empleado/empleado-dashboard/empleado-dashboard.component';
import { authGuard } from './shared/guards/auth.guard';
import { roleGuard } from './shared/guards/role.guard';
import { ReservarCitaComponent } from './cliente/reservar-cita/reservar-cita.component';
import { CancelarReservaClienteComponent } from './cliente/cancelar-reserva-cliente/cancelar-reserva-cliente.component';
import { GestionCalendarioComponent } from './empleado/gestion-calendario/gestion-calendario.component';
import { CrearPeluqueriaComponent } from './empleado/crear-peluqueria/crear-peluqueria.component';

// DO NOT add "import { routes } from './app.routes';" in this file.
export const routes: Routes = [
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register-cliente', component: RegisterClienteComponent },
  {
    path: 'auth/register-empleado',
    component: RegisterEmpleadoComponent,
    canActivate: [authGuard, roleGuard], // Guards reactivados
    data: { roles: ['ADMIN'] }          // Se requiere rol ADMIN
  },
  {
    path: 'cliente',
    component: ClienteDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['CLIENTE'] },
    children: [
      { path: 'reservar', component: ReservarCitaComponent },
      { path: 'cancelar', component: CancelarReservaClienteComponent },
      { path: '', redirectTo: 'reservar', pathMatch: 'full' }
    ]
  },
  {
    path: 'empleado',
    component: EmpleadoDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['EMPLEADO', 'ADMIN'] },
    children: [
      { path: 'calendario', component: GestionCalendarioComponent },
      {
        path: 'crear-peluqueria',
        component: CrearPeluqueriaComponent,
        canActivate: [roleGuard], // Solo roleGuard aquí, authGuard ya está en el padre
        data: { roles: ['ADMIN'] }
      },
      { path: '', redirectTo: 'calendario', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/auth/login' }
];
