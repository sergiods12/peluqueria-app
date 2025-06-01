// src/app/empleado/gestion-calendario/gestion-calendario.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // CommonModule provides DatePipe, *ngIf, *ngFor
import { FormsModule } from '@angular/forms';   // For [(ngModel)]

import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { Tramo } from '../../shared/models/tramo.model';
import { Empleado } from '../../shared/models/empleado.model';
import { Cliente } from '../../shared/models/cliente.model';
import { Servicio } from '../../shared/models/servicio.model';

interface TramoCalendarioDisplay {
  id?: number;
  horaInicio: string;
  horaFin: string;
  estado: 'disponible' | 'reservadoCliente' | 'bloqueadoEmpleado' | 'noDefinido';
  clienteNombre?: string;
  servicioNombre?: string;
  fecha: string; // Ensure fecha is part of this, should be YYYY-MM-DD string
  disponibleOriginal?: boolean;
  clienteOriginalId?: number | null; // To store the ID of the original client if any
  servicioOriginalId?: number | null; // To store the ID of the original service if any
}

@Component({
  selector: 'app-gestion-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-calendario.component.html',
  // styleUrls: ['./gestion-calendario.component.css'] // Uncomment if you have styles
})
export class GestionCalendarioComponent implements OnInit {
  fechaSeleccionada: string = ''; // Format YYYY-MM-DD
  tramosDelDiaParaVista: TramoCalendarioDisplay[] = [];
  todosLosPosiblesIntervalosDelDia: { horaInicio: string, horaFin: string }[] = [];

  currentUser: AuthUser | null = null;
  minDate: string;
  isLoading = false;
  mensaje: string | null = null;

  constructor(
    private tramoService: TramoService,
    private authService: AuthService
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.fechaSeleccionada = this.minDate; // Default to today
    this.generarTodosLosPosiblesIntervalosDelDia();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser && this.currentUser.id) {
      this.cargarTramosParaEmpleado(); // Load for default date (today)
    }
  }

  generarTodosLosPosiblesIntervalosDelDia() {
    this.todosLosPosiblesIntervalosDelDia = [];
     for (let h = 9; h < 22; h++) { // From 09:00
        this.todosLosPosiblesIntervalosDelDia.push({
            horaInicio: `${String(h).padStart(2, '0')}:00`,
            horaFin: `${String(h).padStart(2, '0')}:30`
        });
        if (h < 21 ) { // Last full hour block for .30 slot is 20:30-21:00. 21:30 slot ends at 22:00.
             this.todosLosPosiblesIntervalosDelDia.push({
                horaInicio: `${String(h).padStart(2, '0')}:30`,
                horaFin: `${String(h + 1).padStart(2, '0')}:00`
            });
        }
    }
  }

  // Called when the date input changes
  onFechaModelChange(): void {
    this.cargarTramosParaEmpleado();
  }

  cargarTramosParaEmpleado(): void {
    if (!this.fechaSeleccionada || !this.currentUser || !this.currentUser.id) {
      this.tramosDelDiaParaVista = this.mapearIntervalosBase([]); // Show empty structure
      return;
    }
    this.isLoading = true;
    this.mensaje = null;
    this.tramoService.getTramosDisponibles(this.fechaSeleccionada, this.currentUser.id)
      .subscribe({
        next: (tramosDesdeBackend) => {
          this.tramosDelDiaParaVista = this.mapearIntervalosBase(tramosDesdeBackend);
          this.isLoading = false;
        },
        error: (err) => {
          console.error("Error al cargar tramos para empleado:", err);
          this.mensaje = "Error al cargar los horarios para la fecha seleccionada.";
          this.tramosDelDiaParaVista = this.mapearIntervalosBase([]); // Clear view on error
          this.isLoading = false;
        }
      });
  }

  mapearIntervalosBase(tramosBackend: Tramo[]): TramoCalendarioDisplay[] {
    return this.todosLosPosiblesIntervalosDelDia.map(intervalo => {
      const tramoExistente = tramosBackend.find(
        t => t.horaInicio.startsWith(intervalo.horaInicio) && t.fecha === this.fechaSeleccionada
      );

      if (tramoExistente) {
        return {
          id: tramoExistente.id,
          horaInicio: intervalo.horaInicio, // Use interval for consistency
          horaFin: intervalo.horaFin,     // Use interval for consistency
          fecha: tramoExistente.fecha,      // Date from the backend tramo
          estado: tramoExistente.disponible ? 'disponible' : (tramoExistente.cliente ? 'reservadoCliente' : 'bloqueadoEmpleado'),
          clienteNombre: tramoExistente.cliente?.nombre,
          servicioNombre: tramoExistente.servicio?.nombre,
          // Store original details for potential updates if needed
          disponibleOriginal: tramoExistente.disponible,
          clienteOriginalId: tramoExistente.cliente?.id || null,
          servicioOriginalId: tramoExistente.servicio?.id || null,
        };
      } else {
        // This is a base interval not defined in the backend for this employee/date
        return {
          horaInicio: intervalo.horaInicio,
          horaFin: intervalo.horaFin,
          fecha: this.fechaSeleccionada, // The currently selected date
          estado: 'noDefinido'
          // id, clienteNombre, servicioNombre etc. will be undefined
        };
      }
    });
  }

  handleClickTramo(tramoVista: TramoCalendarioDisplay): void {
    this.mensaje = null; // Clear previous messages
    if (!this.currentUser || !this.currentUser.id) {
      this.mensaje = "Error: No se pudo identificar al empleado.";
      return;
    }

    if (tramoVista.estado === 'reservadoCliente' && tramoVista.id) {
      // Case 1: Cancel a client's reservation
      if (confirm(`¿Está seguro de que desea cancelar la cita de ${tramoVista.clienteNombre || 'un cliente'} para el servicio "${tramoVista.servicioNombre || 'desconocido'}" a las ${tramoVista.horaInicio}?`)) {
        this.isLoading = true;
        this.tramoService.cancelarReserva(tramoVista.id).subscribe({
          next: () => {
            this.mensaje = "Cita cancelada con éxito.";
            this.cargarTramosParaEmpleado(); // Refresh list
          },
          error: (err) => {
            this.mensaje = "Error al cancelar la cita: " + (err.error?.message || err.message);
            console.error(err);
            this.isLoading = false;
          }
        });
      }
    } else if (tramoVista.id) {
      // Case 2: Toggle availability of an existing tramo (marked 'disponible' or 'bloqueadoEmpleado')
      const tramoParaActualizar: Tramo = {
        id: tramoVista.id,
        fecha: tramoVista.fecha, // Use the date from the tramoVista
        horaInicio: tramoVista.horaInicio,
        horaFin: tramoVista.horaFin,
        disponible: !(tramoVista.estado === 'disponible'), // Toggle current availability
        empleado: { id: this.currentUser.id } as Empleado,
        // If making available (was 'bloqueadoEmpleado' or 'disponible' and now blocking):
        // If it was 'disponible' and is now being blocked, keep client/service if they were there (unlikely for 'disponible')
        // If it was 'bloqueadoEmpleado' and is now made 'disponible', clear client/service.
        cliente: (tramoVista.estado === 'disponible') ? null : (tramoVista.clienteOriginalId ? {id: tramoVista.clienteOriginalId} as Cliente : null),
        servicio: (tramoVista.estado === 'disponible') ? null : (tramoVista.servicioOriginalId ? {id: tramoVista.servicioOriginalId} as Servicio : null),
        hueco: tramoVista.estado === 'disponible' ? "bloqueado-empleado" : "hecho-disponible" // Indicate action
      };
      this.isLoading = true;
      this.tramoService.updateTramo(tramoVista.id, tramoParaActualizar).subscribe({
         next: () => {
           this.mensaje = `El tramo de ${tramoVista.horaInicio} ha sido ${tramoParaActualizar.disponible ? 'marcado como disponible' : 'bloqueado'}.`;
           this.cargarTramosParaEmpleado(); // Refresh list
          },
         error: (err) => {
           this.mensaje = "Error al actualizar la disponibilidad del tramo: " + (err.error?.message || err.message);
           console.error(err);
           this.isLoading = false;
          }
      });
    } else {
      // Case 3: Create a new tramo and mark it as available (was 'noDefinido')
      const nuevoTramo: Tramo = {
        // id is auto-generated by backend
        fecha: tramoVista.fecha, // Date from the tramoVista, which should be this.fechaSeleccionada
        horaInicio: tramoVista.horaInicio,
        horaFin: tramoVista.horaFin,
        disponible: true, // Mark as available
        empleado: { id: this.currentUser.id } as Empleado,
        hueco: "creado-empleado-disponible", // Custom identifier
        cliente: null, // New tramos are initially unbooked
        servicio: null, // New tramos initially have no service
      };
      this.isLoading = true;
      this.tramoService.saveTramo(nuevoTramo).subscribe({
        next: () => {
          this.mensaje = `Tramo de ${nuevoTramo.horaInicio} marcado como disponible.`;
          this.cargarTramosParaEmpleado(); // Refresh list
        },
        error: (err) => {
          this.mensaje = "Error al crear el nuevo tramo disponible: " + (err.error?.message || err.message);
          console.error(err);
          this.isLoading = false;
        }
      });
    }
  }
}