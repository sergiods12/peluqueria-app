// src/app/empleado/gestion-calendario/gestion-calendario.component.ts
import { Component, OnInit } from '@angular/core';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { Tramo } from '../../shared/models/tramo.model';
import { Empleado } from '../../shared/models/empleado.model'; // Para tipar el empleado

interface TramoCalendarioDisplay {
  id?: number; // ID del tramo si existe
  horaInicio: string;
  horaFin: string;
  estado: 'disponible' | 'reservadoCliente' | 'bloqueadoEmpleado' | 'noDefinido';
  clienteNombre?: string;
  servicioNombre?: string;
}

@Component({
  selector: 'app-gestion-calendario',
  templateUrl: './gestion-calendario.component.html',
  // styleUrls: ['./gestion-calendario.component.css']
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
    this.fechaSeleccionada = this.minDate; // Seleccionar hoy por defecto
    this.generarTodosLosPosiblesIntervalosDelDia();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser && this.currentUser.id) {
      this.cargarTramosParaEmpleado();
    }
  }

  generarTodosLosPosiblesIntervalosDelDia() {
    this.todosLosPosiblesIntervalosDelDia = [];
     for (let h = 9; h < 22; h++) {
        this.todosLosPosiblesIntervalosDelDia.push({ 
            horaInicio: `${String(h).padStart(2, '0')}:00`, 
            horaFin: `${String(h).padStart(2, '0')}:30` 
        });
        if (h < 22 ) {
             this.todosLosPosiblesIntervalosDelDia.push({ 
                horaInicio: `${String(h).padStart(2, '0')}:30`, 
                horaFin: `${String(h + 1).padStart(2, '0')}:00` 
            });
        }
    }
    if (this.todosLosPosiblesIntervalosDelDia.length > 0 && this.todosLosPosiblesIntervalosDelDia[this.todosLosPosiblesIntervalosDelDia.length -1].horaInicio === "22:00") {
        this.todosLosPosiblesIntervalosDelDia.pop();
    }
  }

  onFechaChangeEmpleado(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.fechaSeleccionada = inputElement.value;
    this.cargarTramosParaEmpleado();
  }

  cargarTramosParaEmpleado(): void {
    if (!this.fechaSeleccionada || !this.currentUser || !this.currentUser.id) {
      this.tramosDelDiaParaVista = this.mapearIntervalosBase([]); // Mostrar vacíos si no hay data
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
          this.mensaje = "Error al cargar los horarios.";
          this.tramosDelDiaParaVista = this.mapearIntervalosBase([]);
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
          horaInicio: intervalo.horaInicio,
          horaFin: intervalo.horaFin,
          estado: tramoExistente.disponible ? 'disponible' : (tramoExistente.cliente ? 'reservadoCliente' : 'bloqueadoEmpleado'),
          clienteNombre: tramoExistente.cliente?.nombre,
          servicioNombre: tramoExistente.servicio?.nombre
        };
      } else {
        return {
          horaInicio: intervalo.horaInicio,
          horaFin: intervalo.horaFin,
          estado: 'noDefinido'
        };
      }
    });
  }

  handleClickTramo(tramoVista: TramoCalendarioDisplay): void {
    this.mensaje = null;
    if (!this.currentUser || !this.currentUser.id) return;

    if (tramoVista.estado === 'reservadoCliente' && tramoVista.id) {
      // Cancelar cita del cliente
      if (confirm(`¿Cancelar la cita de <span class="math-inline">\{tramoVista\.clienteNombre\} \(</span>{tramoVista.servicioNombre || ''}) a las ${tramoVista.horaInicio}?`)) {
        this.tramoService.cancelarReserva(tramoVista.id).subscribe({
          next: () => { this.mensaje = "Cita cancelada."; this.cargarTramosParaEmpleado(); },
          error: (err) => { this.mensaje = "Error al cancelar cita."; console.error(err); }
        });
      }
    } else if (tramoVista.id) { // Tramo existente (disponible o bloqueado por empleado) -> cambiar disponibilidad
      const tramoOriginal = { // Reconstruir un Tramo parcial para enviar al backend
        id: tramoVista.id,
        fecha: this.fechaSeleccionada,
        horaInicio: tramoVista.horaInicio,
        horaFin: tramoVista.horaFin,
        disponible: ! (tramoVista.estado === 'disponible'), // Invertir para actualizar
        empleado: { id: this.currentUser.id } as Empleado,
        // cliente y servicio se setean a null si se hace disponible, o se mantienen si se bloquea
        cliente: undefined,
        servicio: undefined,
        hueco: "gestion-empleado" // O el valor original si lo tuvieras
      };
      // Usar el PUT /api/tramos/{id} para actualizarlo
      this.tramoService.updateTramo(tramoVista.id, tramoOriginal as Tramo).subscribe({
         next: () => { this.mensaje = "Disponibilidad actualizada."; this.cargarTramosParaEmpleado(); },
         error: (err) => { this.mensaje = "Error al actualizar."; console.error(err); }
      });

    } else { // Tramo no existente (noDefinido) -> crearlo como disponible
      const nuevoTramo: Tramo = {
        fecha: this.fechaSeleccionada,
        horaInicio: tramoVista.horaInicio,
        horaFin: tramoVista.horaFin,
        disponible: true,
        empleado: { id: this.currentUser.id } as Empleado,
        hueco: "creado-empleado",
        // cliente y servicio son null/undefined por defecto
      };
      this.tramoService.saveTramo(nuevoTramo).subscribe({
        next: () => { this.mensaje = "Tramo marcado como disponible."; this.cargarTramosParaEmpleado(); },
        error: (err) => { this.mensaje = "Error al crear tramo."; console.error(err); }
      });
    }
  }
}