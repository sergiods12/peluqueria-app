// src/app/empleado/gestion-calendario/gestion-calendario.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  fecha: string;
  disponibleOriginal?: boolean;
  clienteOriginalId?: number | null;
  servicioOriginalId?: number | null;
  empleado?: Empleado;
  cliente?: Cliente | undefined; // Allow undefined for consistency with optional model props
  servicio?: Servicio | undefined; // Allow undefined
  hueco?: string;
}

@Component({
  selector: 'app-gestion-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-calendario.component.html',
  styleUrls: ['./gestion-calendario.component.scss']
})
export class GestionCalendarioComponent implements OnInit {
  fechaSeleccionada: string = '';
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
    this.fechaSeleccionada = this.minDate;
    this.generarTodosLosPosiblesIntervalosDelDia();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.id) {
      this.cargarTramosParaEmpleado();
    }
  }

  generarTodosLosPosiblesIntervalosDelDia(): void {
    this.todosLosPosiblesIntervalosDelDia = [];
    for (let h = 9; h < 22; h++) {
      this.todosLosPosiblesIntervalosDelDia.push({
        horaInicio: `${String(h).padStart(2, '0')}:00`,
        horaFin: `${String(h).padStart(2, '0')}:30`
      });
      if (h < 21) {
        this.todosLosPosiblesIntervalosDelDia.push({
          horaInicio: `${String(h).padStart(2, '0')}:30`,
          horaFin: `${String(h + 1).padStart(2, '0')}:00`
        });
      }
    }
  }

  onFechaModelChange(): void {
    this.cargarTramosParaEmpleado();
  }

  cargarTramosParaEmpleado(): void {
    if (!this.fechaSeleccionada || !this.currentUser?.id) {
      this.tramosDelDiaParaVista = this.mapearIntervalosBase([]);
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
          this.mensaje = "Error al cargar los horarios.";
          this.tramosDelDiaParaVista = this.mapearIntervalosBase([]);
          this.isLoading = false;
        }
      });
  }

  mapearIntervalosBase(tramosBackend: Tramo[]): TramoCalendarioDisplay[] {
    return this.todosLosPosiblesIntervalosDelDia.map(intervalo => {
      const tramoExistente = tramosBackend.find(
        t => t.horaInicio?.startsWith(intervalo.horaInicio) && t.fecha === this.fechaSeleccionada
      );
      if (tramoExistente) {
        return {
          id: tramoExistente.id,
          horaInicio: intervalo.horaInicio,
          horaFin: intervalo.horaFin,
          fecha: tramoExistente.fecha,
          estado: tramoExistente.disponible ? 'disponible' : (tramoExistente.cliente ? 'reservadoCliente' : 'bloqueadoEmpleado'),
          clienteNombre: tramoExistente.cliente?.nombre,
          servicioNombre: tramoExistente.servicio?.nombre,
          disponibleOriginal: tramoExistente.disponible,
          clienteOriginalId: tramoExistente.cliente?.id || null,
          servicioOriginalId: tramoExistente.servicio?.id || null,
          empleado: tramoExistente.empleado,
          cliente: tramoExistente.cliente,
          servicio: tramoExistente.servicio,
          hueco: tramoExistente.hueco
        };
      } else {
        return {
          horaInicio: intervalo.horaInicio,
          horaFin: intervalo.horaFin,
          fecha: this.fechaSeleccionada,
          estado: 'noDefinido'
        };
      }
    });
  }

  handleClickTramo(tramoVista: TramoCalendarioDisplay): void {
    this.mensaje = null;
    if (!this.currentUser?.id) {
      this.mensaje = "Error: Usuario no identificado.";
      return;
    }

    if (tramoVista.estado === 'reservadoCliente' && tramoVista.id) {
      if (confirm(`¿Cancelar la cita de ${tramoVista.clienteNombre || 'desconocido'} (${tramoVista.servicioNombre || 'N/A'}) a las ${tramoVista.horaInicio}?`)) {
        this.isLoading = true;
        this.tramoService.cancelarReserva(tramoVista.id).subscribe({
          next: () => { this.mensaje = "Cita cancelada."; this.cargarTramosParaEmpleado(); },
          error: (err) => { this.mensaje = "Error al cancelar cita."; console.error(err); this.isLoading = false; }
        });
      }
    } else if (tramoVista.id) { // Tramo existente (disponible o bloqueado por empleado)
      const tramoParaActualizar: Tramo = {
        id: tramoVista.id,
        fecha: tramoVista.fecha,
        horaInicio: tramoVista.horaInicio,
        horaFin: tramoVista.horaFin,
        disponible: !(tramoVista.estado === 'disponible'),
        empleado: { id: this.currentUser.id } as Empleado,
        // Corrected assignment: use undefined if null is not allowed by Tramo interface for optional fields
        cliente: (tramoVista.estado === 'disponible' || !(tramoVista.clienteOriginalId)) ? undefined : {id: tramoVista.clienteOriginalId} as Cliente,
        servicio: (tramoVista.estado === 'disponible' || !(tramoVista.servicioOriginalId)) ? undefined : {id: tramoVista.servicioOriginalId} as Servicio,
        hueco: tramoVista.estado === 'disponible' ? "bloqueado-manual" : "habilitado-manual"
      };
      this.isLoading = true;
      this.tramoService.updateTramo(tramoVista.id, tramoParaActualizar).subscribe({
         next: () => { this.mensaje = "Disponibilidad actualizada."; this.cargarTramosParaEmpleado(); },
         error: (err) => { this.mensaje = "Error al actualizar."; console.error(err); this.isLoading = false; }
      });
    } else { // Tramo no existente (estado 'noDefinido') -> crearlo como disponible
      const nuevoTramo: Tramo = {
        fecha: tramoVista.fecha,
        horaInicio: tramoVista.horaInicio,
        horaFin: tramoVista.horaFin,
        disponible: true,
        empleado: { id: this.currentUser.id } as Empleado,
        hueco: "creado-empleado",
        cliente: undefined, // Use undefined for optional fields
        servicio: undefined // Use undefined for optional fields
      };
      this.isLoading = true;
      this.tramoService.saveTramo(nuevoTramo).subscribe({
        next: () => { this.mensaje = "Tramo marcado como disponible."; this.cargarTramosParaEmpleado(); },
        error: (err) => { this.mensaje = "Error al crear tramo."; console.error(err); this.isLoading = false; }
      });
    }
  }
}