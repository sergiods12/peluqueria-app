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

// Interfaz para la vista del calendario del empleado
interface TramoCalendarioDisplay {
  id?: number;
  horaInicio: string;
  horaFin: string;
  estado: 'disponible' | 'reservadoCliente' | 'bloqueadoEmpleado' | 'noDefinido';
  clienteNombre?: string; // Nombre del cliente si está reservado
  servicioNombre?: string; // Nombre del servicio si está reservado
  fecha: string;
  // Propiedades originales del backend para referencia si es necesario
  disponibleOriginal?: boolean;
  clienteOriginalId?: number | null;
  servicioOriginalId?: number | null;
  empleado?: Empleado; // Objeto empleado asociado (puede ser parcial)
  cliente?: Cliente | undefined; // Objeto cliente asociado (puede ser parcial o undefined)
  servicio?: Servicio | undefined; // Objeto servicio asociado (puede ser parcial o undefined)
  hueco?: string; // Campo hueco del backend
}

@Component({
  selector: 'app-gestion-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-calendario.component.html',
  styleUrls: ['./gestion-calendario.component.css'] // <--- Asegúrate que este archivo exista en la misma ruta
})
export class GestionCalendarioComponent implements OnInit {
  fechaSeleccionada: string = '';
  tramosDelDiaParaVista: TramoCalendarioDisplay[] = [];
  todosLosPosiblesIntervalosDelDia: { horaInicio: string, horaFin: string }[] = [];
  currentUser: AuthUser | null = null; // Usuario logueado (empleado)
  minDate: string; // Fecha mínima seleccionable
  isLoading = false; // Indicador de carga
  mensaje: string | null = null; // Mensajes de estado o error

  constructor(
    private tramoService: TramoService,
    private authService: AuthService // Servicio de autenticación
  ) {
    // Inicializar fecha mínima y fecha seleccionada a hoy
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.fechaSeleccionada = this.minDate;
    // Generar todos los intervalos de 30 minutos para la vista
    this.generarTodosLosPosiblesIntervalosDelDia();
  }

  ngOnInit(): void {
    // Obtener el usuario actual al inicializar el componente
    this.currentUser = this.authService.getCurrentUser();
    // Si el usuario es un empleado y está identificado, cargar sus tramos
    if (this.currentUser?.id && this.currentUser.rol !== 'CLIENTE') {
      this.cargarTramosParaEmpleado();
    } else if (!this.currentUser) {
      this.mensaje = "Por favor, inicie sesión para gestionar su calendario.";
    } else if (this.currentUser.rol === 'CLIENTE') {
       this.mensaje = "Acceso denegado. Esta página es solo para empleados.";
    }
  }

  // Genera una lista de intervalos de 30 minutos (ej. 09:00-09:30, 09:30-10:00)
  generarTodosLosPosiblesIntervalosDelDia(): void {
    this.todosLosPosiblesIntervalosDelDia = [];
    // Ejemplo: de 9:00 a 22:00
    for (let h = 9; h < 22; h++) {
      this.todosLosPosiblesIntervalosDelDia.push({
        horaInicio: `${String(h).padStart(2, '0')}:00`,
        horaFin: `${String(h).padStart(2, '0')}:30`
      });
      if (h < 21) { // Asegura que el último intervalo de las 21:30 termine a las 22:00
        this.todosLosPosiblesIntervalosDelDia.push({
          horaInicio: `${String(h).padStart(2, '0')}:30`,
          horaFin: `${String(h + 1).padStart(2, '0')}:00`
        });
      }
    }
    // Puedes ajustar este rango según el horario de la peluquería
  }

  // Se llama cuando cambia la fecha seleccionada en el input
  onFechaModelChange(): void {
    this.cargarTramosParaEmpleado();
  }

  // Carga los tramos del backend para la fecha y empleado seleccionados
  cargarTramosParaEmpleado(): void {
    if (!this.fechaSeleccionada || !this.currentUser?.id) {
      // Si no hay fecha o empleado, mostrar todos los intervalos como 'noDefinido'
      this.tramosDelDiaParaVista = this.mapearIntervalosBase([]);
      return;
    }
    this.isLoading = true;
    this.mensaje = null;
    // Llama al servicio para obtener los tramos.
    // Este endpoint debe devolver TODOS los tramos para el empleado y fecha,
    // incluyendo los disponibles, los bloqueados por el empleado y los reservados.
    this.tramoService.getTramosDisponibles(this.fechaSeleccionada, this.currentUser.id)
      .subscribe({
        next: (tramosDesdeBackend) => {
          // Mapear los intervalos base con los datos del backend
          this.tramosDelDiaParaVista = this.mapearIntervalosBase(tramosDesdeBackend);
          this.isLoading = false;
          if (tramosDesdeBackend.length === 0) {
             this.mensaje = "No hay horarios definidos por el empleado para esta fecha.";
          }
        },
        error: (err) => {
          this.mensaje = "Error al cargar los horarios.";
          console.error(err);
          // En caso de error, mostrar todos los intervalos como 'noDefinido'
          this.tramosDelDiaParaVista = this.mapearIntervalosBase([]);
          this.isLoading = false;
        }
      });
  }

  // Mapea la lista completa de intervalos de 30 minutos con los tramos existentes del backend
  mapearIntervalosBase(tramosBackend: Tramo[]): TramoCalendarioDisplay[] {
    return this.todosLosPosiblesIntervalosDelDia.map(intervalo => {
      // Buscar si existe un tramo en el backend que coincida con este intervalo de tiempo y fecha
      const tramoExistente = tramosBackend.find(
        // Comparar por hora de inicio y fecha
        t => t.horaInicio === intervalo.horaInicio && t.fecha === this.fechaSeleccionada
      );

      if (tramoExistente) {
        // Si existe un tramo en el backend para este intervalo
        let estadoDeterminado: TramoCalendarioDisplay['estado'];
        if (tramoExistente.citaId) { // Si tiene citaId, está reservado por un cliente
          estadoDeterminado = 'reservadoCliente';
        } else if (tramoExistente.disponible) { // Si no tiene citaId y está marcado como disponible
          estadoDeterminado = 'disponible';
        } else { // Si no tiene citaId y no está marcado como disponible, está bloqueado por el empleado
          estadoDeterminado = 'bloqueadoEmpleado';
        }

        return {
          id: tramoExistente.id,
          horaInicio: intervalo.horaInicio,
          horaFin: intervalo.horaFin,
          fecha: tramoExistente.fecha,
          estado: estadoDeterminado,
          // Incluir datos de cliente/servicio si están presentes en el tramo del backend
          clienteNombre: tramoExistente.cliente?.nombre,
          servicioNombre: tramoExistente.servicio?.nombre,
          // Guardar propiedades originales para referencia si es necesario
          disponibleOriginal: tramoExistente.disponible,
          clienteOriginalId: tramoExistente.cliente?.id || null,
          servicioOriginalId: tramoExistente.servicio?.id || null,
          empleado: tramoExistente.empleado,
          cliente: tramoExistente.cliente,
          servicio: tramoExistente.servicio,
          hueco: tramoExistente.hueco
        };
      } else {
        // Si no existe un tramo en el backend para este intervalo
        return {
          horaInicio: intervalo.horaInicio,
          horaFin: intervalo.horaFin,
          fecha: this.fechaSeleccionada,
          estado: 'noDefinido' // Indica que este intervalo no existe en la BBDD para esta fecha/empleado
        };
      }
    });
  }

  // Maneja el clic en un tramo en la vista del calendario
  handleClickTramo(tramoVista: TramoCalendarioDisplay): void {
    this.mensaje = null;
    if (!this.currentUser?.id) {
      this.mensaje = "Error: Usuario no identificado.";
      return;
    }

    // Crear un objeto Empleado parcial solo con el ID para asociarlo al tramo
    const empleadoParaTramo = { id: this.currentUser.id } as Empleado;

    if (tramoVista.estado === 'reservadoCliente' && tramoVista.id) {
      // Lógica para cancelar una cita existente
      if (confirm(`¿Cancelar la cita de ${tramoVista.clienteNombre || 'desconocido'} (${tramoVista.servicioNombre || 'N/A'}) a las ${tramoVista.horaInicio}?`)) {
        this.isLoading = true;
        // Llama al servicio para cancelar la reserva.
        // El backend debe eliminar la cita y marcar el tramo como disponible.
        this.tramoService.cancelarReserva(tramoVista.id).subscribe({
          next: () => {
            this.mensaje = "Cita cancelada.";
            // Recargar los tramos para actualizar la vista
            this.cargarTramosParaEmpleado();
          },
          error: (err) => {
            this.mensaje = "Error al cancelar cita.";
            console.error(err);
            this.isLoading = false;
          }
        });
      }
    } else if (tramoVista.id) {
      // Lógica para tramos existentes que no están reservados (disponible o bloqueado)
      // Se toggles la propiedad 'disponible' en el backend
      const tramoParaActualizar: Tramo = {
        id: tramoVista.id,
        fecha: tramoVista.fecha,
        horaInicio: tramoVista.horaInicio,
        horaFin: tramoVista.horaFin,
        disponible: !(tramoVista.estado === 'disponible'), // Si estaba 'disponible', ahora es false; si estaba 'bloqueadoEmpleado', ahora es true
        empleado: empleadoParaTramo, // Asociar al empleado actual
        // Al actualizar disponibilidad, se eliminan las referencias a cliente y servicio si existían (no deberían si no estaba reservado)
        cliente: undefined,
        servicio: undefined,
        hueco: tramoVista.estado === 'disponible' ? "bloqueado-manual" : "habilitado-manual" // Actualizar el hueco si es relevante
      };
      this.isLoading = true;
      // Llama al servicio para actualizar el tramo
      this.tramoService.updateTramo(tramoVista.id, tramoParaActualizar).subscribe({
         next: () => {
           this.mensaje = "Disponibilidad actualizada.";
           // Recargar los tramos para actualizar la vista
           this.cargarTramosParaEmpleado();
         },
         error: (err) => {
           this.mensaje = "Error al actualizar.";
           console.error(err);
           this.isLoading = false;
         }
      });
    } else {
      // Lógica para tramos que no existen en el backend (estado 'noDefinido')
      // Se crea un nuevo tramo en el backend, por defecto como disponible
      const nuevoTramo: Tramo = {
        fecha: tramoVista.fecha,
        horaInicio: tramoVista.horaInicio,
        horaFin: tramoVista.horaFin,
        disponible: true, // Al crearlo desde 'noDefinido', se marca como disponible
        empleado: empleadoParaTramo, // Asociar al empleado actual
        hueco: "creado-empleado", // Definir un hueco por defecto
        cliente: undefined, // No hay cliente ni servicio al crear un tramo disponible
        servicio: undefined
      };
      this.isLoading = true;
      // Llama al servicio para guardar el nuevo tramo
      this.tramoService.saveTramo(nuevoTramo).subscribe({
        next: () => {
          this.mensaje = "Tramo marcado como disponible.";
          // Recargar los tramos para actualizar la vista
          this.cargarTramosParaEmpleado();
        },
        error: (err) => {
          this.mensaje = "Error al crear tramo.";
          console.error(err);
          this.isLoading = false;
        }
      });
    }
  }
}
