// src/app/cliente/reservar-cita/reservar-cita.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { EmpleadoService } from '../../shared/services/empleado.service';
import { ServicioAppService } from '../../shared/services/servicio-app.service';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { Peluqueria } from '../../shared/models/peluqueria.model';
import { Empleado } from '../../shared/models/empleado.model';
import { Servicio } from '../../shared/models/servicio.model';
import { Tramo } from '../../shared/models/tramo.model';
import { forkJoin } from 'rxjs';
import { ReservaRequestDTO } from '../../shared/models/reserva-request-dto.model'; // Crea este modelo

interface TramoDisplay extends Tramo {
  estado: 'disponible' | 'reservadoOtro' | 'seleccionado' | 'noSeleccionable';
  esInicioPosible?: boolean;
}

@Component({
  selector: 'app-reservar-cita',
  templateUrl: './reservar-cita.component.html',
  // styleUrls: ['./reservar-cita.component.css']
})
export class ReservarCitaComponent implements OnInit {
  reservaForm: FormGroup;
  peluquerias: Peluqueria[] = [];
  empleadosPeluqueria: Empleado[] = [];
  servicios: Servicio[] = [];

  fechaSeleccionada: string = '';
  tramosDesdeBackend: Tramo[] = [];
  tramosParaMostrar: TramoDisplay[] = [];
  todosLosPosiblesIntervalosDelDia: { horaInicio: string, horaFin: string }[] = [];

  minDate: string;
  currentUser: AuthUser | null = null;

  mensajeError: string | null = null;
  mensajeExito: string | null = null;

  constructor(
    private fb: FormBuilder,
    private peluqueriaService: PeluqueriaService,
    private empleadoService: EmpleadoService,
    private servicioAppService: ServicioAppService,
    private tramoService: TramoService,
    private authService: AuthService
  ) {
    this.reservaForm = this.fb.group({
      peluqueria: [null, Validators.required],
      empleado: [{ value: null, disabled: true }, Validators.required],
      servicio: [{ value: null, disabled: true }, Validators.required],
    });

    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.generarTodosLosPosiblesIntervalosDelDia();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    forkJoin({
      peluquerias: this.peluqueriaService.getAllPeluquerias(),
      servicios: this.servicioAppService.getAllServicios(),
    }).subscribe(({ peluquerias, servicios }) => {
      this.peluquerias = peluquerias;
      this.servicios = servicios;
    });

    this.reservaForm.get('peluqueria')?.valueChanges.subscribe(peluqueriaId => {
      this.onPeluqueriaChange(peluqueriaId);
      this.reservaForm.get('servicio')?.enable();
    });

    this.reservaForm.get('empleado')?.valueChanges.subscribe(empleadoId => {
        if (this.fechaSeleccionada && empleadoId) this.cargarTramosDelEmpleado();
        else this.resetearVistaTramos();
    });

    this.reservaForm.get('servicio')?.valueChanges.subscribe(() => {
        this.procesarTramosParaMostrar(); // Reprocesar con el nuevo servicio
    });
  }

  generarTodosLosPosiblesIntervalosDelDia() {
    this.todosLosPosiblesIntervalosDelDia = [];
    for (let h = 9; h < 22; h++) { // De 09:00 a 21:30 (para tramos que terminan a las 22:00)
        this.todosLosPosiblesIntervalosDelDia.push({ 
            horaInicio: `${String(h).padStart(2, '0')}:00`, 
            horaFin: `${String(h).padStart(2, '0')}:30` 
        });
        if (h < 22 ) { // El último tramo de las 21:30 termina a las 22:00
             this.todosLosPosiblesIntervalosDelDia.push({ 
                horaInicio: `${String(h).padStart(2, '0')}:30`, 
                horaFin: `${String(h + 1).padStart(2, '0')}:00` 
            });
        }
    }
    // Quitar el último intervalo si es 22:00-22:30
    if (this.todosLosPosiblesIntervalosDelDia.length > 0 && this.todosLosPosiblesIntervalosDelDia[this.todosLosPosiblesIntervalosDelDia.length -1].horaInicio === "22:00") {
        this.todosLosPosiblesIntervalosDelDia.pop();
    }
  }

  onPeluqueriaChange(peluqueriaId: string | number | null) {
    this.reservaForm.get('empleado')?.reset({ value: null, disabled: true });
    this.empleadosPeluqueria = [];
    this.resetearVistaTramos();

    if (!peluqueriaId) return;

    const peluqueriaSeleccionada = this.peluquerias.find(p => p.id === +peluqueriaId);
    if (peluqueriaSeleccionada?.empleados && peluqueriaSeleccionada.empleados.length > 0) {
      this.empleadosPeluqueria = peluqueriaSeleccionada.empleados;
      this.reservaForm.get('empleado')?.enable();
    } else {
      // Si la peluquería no trae empleados, podrías cargarlos por separado si es necesario
      // this.empleadoService.getEmpleadosByPeluqueriaId(+peluqueriaId).subscribe(...)
      console.warn('Peluquería seleccionada no tiene empleados en la data o se necesita cargar por separado.');
    }
  }

  onFechaChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.fechaSeleccionada = inputElement.value;
    this.cargarTramosDelEmpleado();
  }

  cargarTramosDelEmpleado(): void {
    const empleadoId = this.reservaForm.get('empleado')?.value;
    this.resetearVistaTramos();
    if (this.fechaSeleccionada && empleadoId) {
      this.tramoService.getTramosDisponibles(this.fechaSeleccionada, empleadoId)
        .subscribe({
          next: tramos => {
            this.tramosDesdeBackend = tramos;
            this.procesarTramosParaMostrar();
          },
          error: err => {
            console.error("Error al cargar tramos:", err);
            this.mensajeError = "No se pudieron cargar los horarios para esta fecha.";
            this.tramosDesdeBackend = [];
            this.procesarTramosParaMostrar();
          }
        });
    }
  }

  procesarTramosParaMostrar(): void {
    this.mensajeError = null;
    this.mensajeExito = null;
    const servicioSeleccionado: Servicio | undefined = this.getServicioSeleccionado();
    const numTramosNecesarios = servicioSeleccionado?.numTramos || 1;

    this.tramosParaMostrar = this.todosLosPosiblesIntervalosDelDia.map(intervalo => {
        const tramoBackend = this.tramosDesdeBackend.find(
            tb => tb.horaInicio.startsWith(intervalo.horaInicio) && tb.fecha === this.fechaSeleccionada
        );

        let estado: TramoDisplay['estado'] = 'noSeleccionable';
        let esInicioPosible = false;
        let idTramoBackend: number | undefined = undefined;

        if (tramoBackend) {
            idTramoBackend = tramoBackend.id;
            if (tramoBackend.disponible) {
                estado = 'disponible';
                // Verificar si se pueden reservar N tramos desde aquí
                let countDisponiblesConsecutivos = 0;
                const indiceIntervaloActual = this.todosLosPosiblesIntervalosDelDia.findIndex(p => p.horaInicio === intervalo.horaInicio);

                for (let i = 0; i < numTramosNecesarios; i++) {
                    if (indiceIntervaloActual + i < this.todosLosPosiblesIntervalosDelDia.length) {
                        const siguienteIntervalo = this.todosLosPosiblesIntervalosDelDia[indiceIntervaloActual + i];
                        const tramoCorrespondiente = this.tramosDesdeBackend.find(
                            tb => tb.horaInicio.startsWith(siguienteIntervalo.horaInicio) && tb.fecha === this.fechaSeleccionada && tb.disponible
                        );
                        if (tramoCorrespondiente) {
                            countDisponiblesConsecutivos++;
                        } else {
                            break; 
                        }
                    } else {
                        break; 
                    }
                }
                if (countDisponiblesConsecutivos === numTramosNecesarios) {
                    esInicioPosible = true;
                }
            } else { 
                estado = 'reservadoOtro';
            }
        }
        // Si no hay tramoBackend, se considera 'noSeleccionable' porque no fue marcado como disponible por el empleado.

        return {
            id: idTramoBackend, // ID del tramo si existe en backend
            fecha: this.fechaSeleccionada,
            horaInicio: intervalo.horaInicio,
            horaFin: intervalo.horaFin,
            disponible: tramoBackend?.disponible || false,
            empleado: tramoBackend?.empleado,
            cliente: tramoBackend?.cliente,
            servicio: tramoBackend?.servicio,
            hueco: tramoBackend?.hueco || '',
            estado,
            esInicioPosible
        } as TramoDisplay;
    });
  }

  seleccionarTramo(tramoClickeado: TramoDisplay): void {
    if (tramoClickeado.estado !== 'disponible' || !tramoClickeado.esInicioPosible) {
        console.warn("Este tramo no es un inicio válido para la selección.");
        return;
    }

    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado) return;
    const numTramosNecesarios = servicioSeleccionado.numTramos;

    // Desmarcar selección anterior y marcar la nueva
    const indiceClickeado = this.tramosParaMostrar.findIndex(t => t.horaInicio === tramoClickeado.horaInicio);
    this.tramosParaMostrar.forEach((t, idx) => {
        if (t.estado === 'seleccionado') t.estado = 'disponible'; // Volver a disponible

        if (idx >= indiceClickeado && idx < indiceClickeado + numTramosNecesarios) {
            if (this.tramosParaMostrar[idx].estado === 'disponible') { // Solo marcar si es realmente disponible
                 this.tramosParaMostrar[idx].estado = 'seleccionado';
            }
        }
    });
    // Re-evaluar la posibilidad de inicio para todos, por si la selección cambia algo
    this.procesarTramosParaMostrar(); 
    // Asegurar que los seleccionados mantengan el estado 'seleccionado' y 'esInicioPosible' si son el inicio
     this.tramosParaMostrar.forEach((t, idx) => {
        if (idx >= indiceClickeado && idx < indiceClickeado + numTramosNecesarios) {
            if(this.tramosParaMostrar[idx].id && this.tramosParaMostrar[idx].disponible) { //Solo si existe y está disponible
               this.tramosParaMostrar[idx].estado = 'seleccionado';
               if(idx === indiceClickeado) this.tramosParaMostrar[idx].esInicioPosible = true;
            }
        }
    });
  }

  resetearVistaTramos() {
    this.tramosDesdeBackend = [];
    this.tramosParaMostrar = [];
    this.mensajeError = null;
    this.mensajeExito = null;
    // No reseteamos la fecha aquí, se usa para recargar
  }

  confirmarReserva(): void {
    this.mensajeError = null;
    this.mensajeExito = null;
    const tramosSeleccionadosParaReserva = this.getTramosSeleccionados();

    if (tramosSeleccionadosParaReserva.length === 0 || !tramosSeleccionadosParaReserva[0].id) {
      this.mensajeError = "Por favor, selecciona un tramo válido para iniciar la reserva.";
      return;
    }

    if (!this.currentUser || this.currentUser.rol !== 'CLIENTE') {
      this.mensajeError = "Debes estar logueado como cliente para reservar.";
      return;
    }

    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado || !servicioSeleccionado.id) {
        this.mensajeError = "Por favor, selecciona un servicio válido.";
        return;
    }

    const primerTramoIdValido = tramosSeleccionadosParaReserva[0].id;

    const reservaRequest: ReservaRequestDTO = {
      primerTramoId: primerTramoIdValido,
      clienteId: this.currentUser.id,
      servicioId: servicioSeleccionado.id
    };

    this.tramoService.reservarMultiplesTramos(reservaRequest).subscribe({
      next: (tramosReservados) => {
        this.mensajeExito = `Reserva confirmada con éxito para "${servicioSeleccionado.nombre}". Se han reservado ${tramosReservados.length} tramo(s).`;
        this.cargarTramosDelEmpleado(); // Recargar tramos para ver los cambios
        this.reservaForm.get('peluqueria')?.markAsPristine(); // Opcional: resetear estado del form
        // Considera resetear la selección de tramos o todo el formulario si es apropiado
      },
      error: (err) => {
        console.error("Error al confirmar reserva", err);
        this.mensajeError = `Error al confirmar la reserva: ${err.error?.message || err.error || err.message || 'Error desconocido.'}`;
        this.cargarTramosDelEmpleado(); // Recargar para ver el estado actual por si algo cambió parcialmente
      }
    });
  }

  // Funciones de ayuda para el template
  getServicioSeleccionado(): Servicio | undefined {
    const servicioId = this.reservaForm.get('servicio')?.value;
    return this.servicios.find(s => s.id === +servicioId);
  }

  getTramosSeleccionados(): TramoDisplay[] {
    return this.tramosParaMostrar.filter(t => t.estado === 'seleccionado');
  }

  hayTramosSeleccionables(): boolean {
    if (this.tramosParaMostrar.length === 0 && this.fechaSeleccionada && this.reservaForm.get('empleado')?.value && this.reservaForm.get('servicio')?.value) {
        return true; 
    }
    return this.tramosParaMostrar.some(t => t.esInicioPosible && t.estado === 'disponible');
  }
}