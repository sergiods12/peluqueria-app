import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Importar componentes standalone desde sus respectivas subcarpetas
import { CrearEmpleadoComponent } from './crear-empleado/crear-empleado.component';
import { EmpleadoDashboardComponent } from './empleado-dashboard/empleado-dashboard.component';
import { GestionCalendarioComponent } from './gestion-calendario/gestion-calendario.component';
import { CrearPeluqueriaComponent } from './crear-peluqueria/crear-peluqueria.component';

// No es necesario EmpleadoRoutingModule si app-routing.module.ts maneja las rutas de empleado
// y este módulo no se carga de forma perezosa.
// import { EmpleadoRoutingModule } from './empleado-routing.module';

@NgModule({
  declarations: [
    // Este array debe estar vacío si todos los componentes de empleado son standalone.
    // Si tienes componentes NO standalone que pertenecen a este módulo, decláralos aquí.
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // EmpleadoRoutingModule, // Descomentar solo si EmpleadoModule se carga de forma perezosa.

    // Importar componentes standalone que este módulo agrupa:
    CrearEmpleadoComponent,
    EmpleadoDashboardComponent,
    GestionCalendarioComponent,   // Asumiendo que es standalone y está en ./gestion-calendario/
    CrearPeluqueriaComponent    // Asumiendo que es standalone y está en ./crear-peluqueria/
  ]
})
export class EmpleadoModule { }
