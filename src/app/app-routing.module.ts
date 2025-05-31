// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterClienteComponent } from './auth/register-cliente/register-cliente.component';
import { RegisterEmpleadoComponent } from './auth/register-empleado/register-empleado.component';
import { ClienteDashboardComponent } from './cliente/cliente-dashboard/cliente-dashboard.component';
import { EmpleadoDashboardComponent } from './empleado/empleado-dashboard/empleado-dashboard.component';
import { AuthGuard } from './shared/guards/auth.guard';
import { RoleGuard } from './shared/guards/role.guard';
import { ReservarCitaComponent } from './cliente/reservar-cita/reservar-cita.component';
import { CancelarReservaClienteComponent } from './cliente/cancelar-reserva-cliente/cancelar-reserva-cliente.component';
import { GestionCalendarioComponent } from './empleado/gestion-calendario/gestion-calendario.component';
import { CrearPeluqueriaComponent } from './empleado/crear-peluqueria/crear-peluqueria.component';

const routes: Routes = [
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register-cliente', component: RegisterClienteComponent },
  {
    path: 'auth/register-empleado',
    component: RegisterEmpleadoComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'cliente',
    component: ClienteDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
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
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['EMPLEADO', 'ADMIN'] },
    children: [
      { path: 'calendario', component: GestionCalendarioComponent },
      {
        path: 'crear-peluqueria',
        component: CrearPeluqueriaComponent,
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] }
      },
      { path: '', redirectTo: 'calendario', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/auth/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule] // <-- Make sure RouterModule is exported
})
export class AppRoutingModule { }