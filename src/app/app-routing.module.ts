import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterClienteComponent } from './auth/register-cliente/register-cliente.component';
import { RegisterEmpleadoComponent } from './auth/register-empleado/register-empleado.component';
import { ClienteDashboardComponent } from './cliente/cliente-dashboard/cliente-dashboard.component';
import { EmpleadoDashboardComponent } from './empleado/empleado-dashboard/empleado-dashboard.component';
import { authGuard } from './shared/guards/auth.guard'; // Ensure correct import path
import { roleGuard } from './shared/guards/role.guard'; // Ensure correct import path
import { ReservarCitaComponent } from './cliente/reservar-cita/reservar-cita.component';
import { CancelarReservaClienteComponent } from './cliente/cancelar-reserva-cliente/cancelar-reserva-cliente.component';
import { GestionCalendarioComponent } from './empleado/gestion-calendario/gestion-calendario.component';
import { CrearPeluqueriaComponent } from './empleado/crear-peluqueria/crear-peluqueria.component';
import { CrearEmpleadoComponent } from './empleado/crear-empleado/crear-empleado.component'; // Ensure this import exists



export const routes: Routes = [
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register-cliente', component: RegisterClienteComponent },
  {
    path: 'auth/register-empleado',
    component: RegisterEmpleadoComponent,
    canActivate: [authGuard, roleGuard], // Use implemented guards
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'cliente',
    component: ClienteDashboardComponent,
    canActivate: [authGuard, roleGuard], // Use implemented guards
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
    canActivate: [authGuard, roleGuard], // Use implemented guards
    data: { roles: ['EMPLEADO', 'ADMIN'] },
    children: [
      { path: 'calendario', component: GestionCalendarioComponent },
      {
        path: 'crear-peluqueria',
        component: CrearPeluqueriaComponent,
        canActivate: [roleGuard], // Use implemented guards
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'crear-empleado', // Ruta para crear empleado
        component: CrearEmpleadoComponent
        // Las guardas canActivate y data.roles del padre ('/empleado') ya protegen esta ruta.
        // Se puede añadir explícitamente si se desea mayor granularidad.
      },
      { path: '', redirectTo: 'calendario', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/auth/login' }
];