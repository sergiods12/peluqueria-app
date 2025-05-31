// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module'; // Provides RouterModule
import { AppComponent } from './app.component';

// Import your feature modules or declare components directly if not using feature modules for these
// For simplicity, the components were previously declared directly.
// If you used "ng generate module auth --route auth --module app", etc.,
// then AuthModule, ClienteModule, EmpleadoModule would be imported instead of individual components.
// Let's stick to direct declarations for now as per the full code generation.

import { LoginComponent } from './auth/login/login.component';
import { RegisterClienteComponent } from './auth/register-cliente/register-cliente.component';
import { RegisterEmpleadoComponent } from './auth/register-empleado/register-empleado.component';
import { ClienteDashboardComponent } from './cliente/cliente-dashboard/cliente-dashboard.component';
import { ReservarCitaComponent } from './cliente/reservar-cita/reservar-cita.component';
import { CancelarReservaClienteComponent } from './cliente/cancelar-reserva-cliente/cancelar-reserva-cliente.component';
import { EmpleadoDashboardComponent } from './empleado/empleado-dashboard/empleado-dashboard.component';
import { CrearPeluqueriaComponent } from './empleado/crear-peluqueria/crear-peluqueria.component';
import { GestionCalendarioComponent } from './empleado/gestion-calendario/gestion-calendario.component';

// Import SharedModule IF NavbarComponent is in SharedModule
import { SharedModule } from './shared/shared.module'; // <-- Import SharedModule

@NgModule({
  declarations: [
    AppComponent, // AppComponent is declared here

    // Declare components from Auth, Cliente, Empleado modules IF
    // you are NOT lazy loading them or putting them in separate Angular modules.
    // The AppRoutingModule is set up for direct component routing, not lazy loading of modules.
    LoginComponent,
    RegisterClienteComponent,
    RegisterEmpleadoComponent,
    ClienteDashboardComponent,
    ReservarCitaComponent,
    CancelarReservaClienteComponent,
    EmpleadoDashboardComponent,
    CrearPeluqueriaComponent,
    GestionCalendarioComponent,
    // DO NOT declare NavbarComponent here if it's in SharedModule
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,     // <-- Imports AppRoutingModule (which exports RouterModule)
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule          // <-- Import SharedModule (which exports NavbarComponent)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }