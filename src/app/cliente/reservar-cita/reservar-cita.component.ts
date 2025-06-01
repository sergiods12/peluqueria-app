import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // Ensure ReactiveFormsModule is here if standalone
import { CommonModule } from '@angular/common'; // Ensure CommonModule for pipes and directives if standalone

// ... other necessary imports (Peluqueria, Empleado, Servicio, Tramo, services, etc.)
import { Peluqueria } from '../../shared/models/peluqueria.model';
import { Empleado } from '../../shared/models/empleado.model';
import { Servicio } from '../../shared/models/servicio.model';
import { ReservaRequestDTO } from '../../shared/models/reserva-request-dto.model';
import { Tramo } from '../../shared/models/tramo.model'; // Ensure Tramo is imported
import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { EmpleadoService } from '../../shared/services/empleado.service';
import { ServicioAppService } from '../../shared/services/servicio-app.service';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { forkJoin } from 'rxjs';



interface TramoDisplay extends Tramo { // Ensure Tramo is defined or imported
  estado: 'disponible' | 'reservadoOtro' | 'seleccionado' | 'noSeleccionable';
  esInicioPosible?: boolean;
}


@Component({
  selector: 'app-reservar-cita',
  standalone: true,
  imports: [
    CommonModule,       // For *ngIf, *ngFor, async pipe, date pipe
    ReactiveFormsModule // For formGroup, formControlName
  ],
  templateUrl: './reservar-cita.component.html',
  styleUrls: ['./reservar-cita.component.scss']
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
  isLoadingTramos: boolean = false; // <<< DECLARE AND INITIALIZE HERE

  private selectedTramosIds: number[] = [];

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
    this.minDate = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    this.generarTodosLosPosiblesIntervalosDelDia();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    // Fetch initial data like peluquerias and servicios
    // Set isLoadingTramos = true before the call and false in subscribe/finalize
    this.isLoadingTramos = true;
    forkJoin({
      peluquerias: this.peluqueriaService.getAllPeluquerias(),
      servicios: this.servicioAppService.getAllServicios(),
    }).subscribe({
      next: ({ peluquerias, servicios }) => {
        this.peluquerias = peluquerias;
        this.servicios = servicios;
        this.isLoadingTramos = false;
      },
      error: (err) => {
        this.mensajeError = 'Error al cargar datos iniciales: ' + (err.error?.message || err.message);
        this.isLoadingTramos = false;
        console.error(err);
      }
    });


    this.reservaForm.get('peluqueria')?.valueChanges.subscribe(peluqueriaId => {
      this.onPeluqueriaChange(peluqueriaId);
      if (peluqueriaId) {
        this.reservaForm.get('servicio')?.enable();
      } else {
        this.reservaForm.get('servicio')?.disable();
        this.reservaForm.get('servicio')?.reset();
      }
    });

    this.reservaForm.get('empleado')?.valueChanges.subscribe(empleadoId => {
      if (this.fechaSeleccionada && empleadoId && this.reservaForm.get('servicio')?.value) {
        this.cargarTramosDelEmpleado();
      } else {
        this.resetearVistaTramos();
      }
    });

    this.reservaForm.get('servicio')?.valueChanges.subscribe(servicioId => {
      // Only load tramos if employee and date are also selected
      if (this.fechaSeleccionada && this.reservaForm.get('empleado')?.value && servicioId) {
        this.cargarTramosDelEmpleado(); // This will call procesarTramosParaMostrar
      } else {
         this.procesarTramosParaMostrar(); // Reprocess with new service (might clear tramos if other fields missing)
      }
    });
  }

  generarTodosLosPosiblesIntervalosDelDia(): void {
    this.todosLosPosiblesIntervalosDelDia = [];
    for (let h = 9; h < 22; h++) {
        this.todosLosPosiblesIntervalosDelDia.push({
            horaInicio: `${String(h).padStart(2, '0')}:00`,
            horaFin: `${String(h).padStart(2, '0')}:30`
        });
        // Ensure the last slot is 21:30 - 22:00
        if (h < 21) { // Only add .30 if it's not the last hour block before 22:00
             this.todosLosPosiblesIntervalosDelDia.push({
                horaInicio: `${String(h).padStart(2, '0')}:30`,
                horaFin: `${String(h + 1).padStart(2, '0')}:00`
            });
        }
    }
  }

  onPeluqueriaChange(peluqueriaId: string | number | null): void {
    this.reservaForm.get('empleado')?.reset({ value: null, disabled: true });
    this.empleadosPeluqueria = [];
    this.resetearVistaTramos();

    if (!peluqueriaId) return;

    const peluqueriaSeleccionada = this.peluquerias.find(p => p.id === +peluqueriaId);
    if (peluqueriaSeleccionada?.empleados && peluqueriaSeleccionada.empleados.length > 0) {
      this.empleadosPeluqueria = peluqueriaSeleccionada.empleados;
      this.reservaForm.get('empleado')?.enable();
    } else {
      console.warn('Peluquería seleccionada no tiene empleados en la data o se necesita cargar por separado.');
    }
  }

  onFechaChange(eventOrDate: Event | string): void {
    if (typeof eventOrDate === 'string') {
      this.fechaSeleccionada = eventOrDate;
    } else {
      const inputElement = eventOrDate.target as HTMLInputElement;
      this.fechaSeleccionada = inputElement.value;
    }
    // Only load tramos if other required fields are also present
    if (this.reservaForm.get('empleado')?.value && this.reservaForm.get('servicio')?.value) {
        this.cargarTramosDelEmpleado();
    }
  }

  cargarTramosDelEmpleado(): void {
    const empleadoId = this.reservaForm.get('empleado')?.value;
    // this.resetearVistaTramos(); // reset is good, but procesar will update based on tramosDesdeBackend
    if (this.fechaSeleccionada && empleadoId && this.reservaForm.get('servicio')?.value) {
      this.isLoadingTramos = true;
      this.mensajeError = null;
      this.tramoService.getTramosDisponibles(this.fechaSeleccionada, empleadoId)
        .subscribe({
          next: tramos => {
            this.tramosDesdeBackend = tramos;
            this.procesarTramosParaMostrar();
            this.isLoadingTramos = false;
          },
          error: err => {
            console.error("Error al cargar tramos:", err);
            this.mensajeError = "No se pudieron cargar los horarios para esta fecha.";
            this.tramosDesdeBackend = [];
            this.procesarTramosParaMostrar();
            this.isLoadingTramos = false;
          }
        });
    } else {
        this.tramosDesdeBackend = []; // Clear backend tramos if pre-requisites not met
        this.procesarTramosParaMostrar(); // Update display to show no tramos
    }
  }

  procesarTramosParaMostrar(): void {
    // If service is not selected, don't process or show tramos for selection
    const servicioSeleccionado: Servicio | undefined = this.getServicioSeleccionado();
    if (!this.reservaForm.get('peluqueria')?.value || !this.reservaForm.get('empleado')?.value || !this.fechaSeleccionada || !servicioSeleccionado) {
      this.tramosParaMostrar = [];
      this.selectedTramosIds = [];
      return;
    }

    const numTramosNecesarios = servicioSeleccionado.numTramos || 1;

    this.tramosParaMostrar = this.todosLosPosiblesIntervalosDelDia.map(intervalo => {
        const tramoBackend = this.tramosDesdeBackend.find(
            tb => tb.horaInicio.startsWith(intervalo.horaInicio) && tb.fecha === this.fechaSeleccionada
        );

        let calculatedEstado: TramoDisplay['estado'] = 'noSeleccionable';
        let esInicioPosible = false;
        let finalTramoData: Partial<Tramo> = {
            fecha: this.fechaSeleccionada,
            horaInicio: intervalo.horaInicio,
            horaFin: intervalo.horaFin,
            disponible: false,
            hueco: 'base-interval',
        };

        if (tramoBackend) {
            finalTramoData = { ...tramoBackend }; // Use backend data
            if (tramoBackend.disponible) {
                calculatedEstado = 'disponible';
                let countDisponiblesConsecutivos = 0;
                const indiceIntervaloActual = this.todosLosPosiblesIntervalosDelDia.findIndex(p => p.horaInicio === intervalo.horaInicio);

                for (let i = 0; i < numTramosNecesarios; i++) {
                    if (indiceIntervaloActual + i < this.todosLosPosiblesIntervalosDelDia.length) {
                        const siguienteIntervaloBase = this.todosLosPosiblesIntervalosDelDia[indiceIntervaloActual + i];
                        const tramoCorrespondiente = this.tramosDesdeBackend.find(
                            tb => tb.horaInicio.startsWith(siguienteIntervaloBase.horaInicio) && tb.fecha === this.fechaSeleccionada && tb.disponible
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
                calculatedEstado = 'reservadoOtro';
            }
        }

        // Override estado if selected
        if (finalTramoData.id && this.selectedTramosIds.includes(finalTramoData.id)) {
            calculatedEstado = 'seleccionado';
        }

        return {
            ...finalTramoData, // Spread properties from backend tramo or base interval
            estado: calculatedEstado,
            esInicioPosible
        } as TramoDisplay;
    });
  }

  seleccionarTramo(tramoClickeado: TramoDisplay): void {
    // Basic validation, procesarTramosParaMostrar should ensure esInicioPosible is correct
    if (!tramoClickeado.esInicioPosible || !tramoClickeado.id ) {
        this.mensajeError = "Este tramo no se puede seleccionar o no es un inicio válido.";
        return;
    }
    this.mensajeError = null; // Clear previous error

    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado || !servicioSeleccionado.id) return;

    const numTramosNecesarios = servicioSeleccionado.numTramos;
    const nuevosTramosSeleccionadosIds: number[] = [];
    const indiceClickeado = this.todosLosPosiblesIntervalosDelDia.findIndex(p => p.horaInicio === tramoClickeado.horaInicio);

    for (let i = 0; i < numTramosNecesarios; i++) {
        const targetIndexGlobal = indiceClickeado + i;
        if (targetIndexGlobal < this.todosLosPosiblesIntervalosDelDia.length) {
            const intervaloBase = this.todosLosPosiblesIntervalosDelDia[targetIndexGlobal];
            const tramoCorrespondiente = this.tramosDesdeBackend.find(
                tb => tb.horaInicio.startsWith(intervaloBase.horaInicio) && tb.fecha === this.fechaSeleccionada && tb.disponible
            );

            if (tramoCorrespondiente && tramoCorrespondiente.id) {
                nuevosTramosSeleccionadosIds.push(tramoCorrespondiente.id);
            } else {
                this.mensajeError = `El tramo de las ${intervaloBase.horaInicio} es necesario y no está disponible.`;
                this.selectedTramosIds = []; // Clear selection
                this.procesarTramosParaMostrar(); // Refresh display to show the error state
                return;
            }
        } else {
            this.mensajeError = "No hay suficientes tramos en el día para completar el servicio.";
            this.selectedTramosIds = []; // Clear selection
            this.procesarTramosParaMostrar(); // Refresh display
            return;
        }
    }
    this.selectedTramosIds = nuevosTramosSeleccionadosIds;
    this.procesarTramosParaMostrar(); // Re-run to update states based on new selection
  }

  resetearVistaTramos(): void {
    this.tramosDesdeBackend = [];
    // this.tramosParaMostrar = []; // Will be repopulated by procesarTramosParaMostrar
    this.selectedTramosIds = [];
    this.mensajeError = null;
    this.mensajeExito = null;
    this.procesarTramosParaMostrar(); // Call to clear display if needed
  }

  confirmarReserva(): void {
    this.mensajeError = null;
    this.mensajeExito = null;

    if (this.selectedTramosIds.length === 0) {
      this.mensajeError = "Por favor, selecciona los tramos para la reserva.";
      return;
    }
    if (!this.currentUser || this.currentUser.rol !== 'CLIENTE' || !this.currentUser.id) {
      this.mensajeError = "Debes estar logueado como cliente para reservar.";
      return;
    }
    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado || !servicioSeleccionado.id) {
        this.mensajeError = "Por favor, selecciona un servicio válido.";
        return;
    }

    const primerTramoIdValido = this.selectedTramosIds[0];

    const reservaRequest: ReservaRequestDTO = {
      primerTramoId: primerTramoIdValido,
      clienteId: this.currentUser.id,
      servicioId: servicioSeleccionado.id
    };

    this.tramoService.reservarMultiplesTramos(reservaRequest).subscribe({
      next: (tramosReservados) => {
        this.mensajeExito = `Reserva confirmada para "${servicioSeleccionado.nombre}".`;
        this.selectedTramosIds = []; // Clear selection
        this.cargarTramosDelEmpleado(); // Recargar tramos
      },
      error: (err) => {
        console.error("Error al confirmar reserva", err);
        this.mensajeError = `Error al confirmar la reserva: ${err.error?.message || err.message || 'Error desconocido.'}`;
        // Optionally, keep selection or clear it based on desired UX
        // this.selectedTramosIds = [];
        this.procesarTramosParaMostrar(); // Refresh display based on current selection state
      }
    });
  }

  getServicioSeleccionado(): Servicio | undefined {
    const servicioId = this.reservaForm.get('servicio')?.value;
    return this.servicios.find(s => s.id === +servicioId);
  }

  getTramosSeleccionadosIDs(): number[] { // Helper for procesarTramosParaMostrar
    return this.selectedTramosIds;
  }

  getTramosSeleccionados(): TramoDisplay[] {
    return this.tramosParaMostrar.filter(t => t.id && this.selectedTramosIds.includes(t.id));
  }

  hayTramosSeleccionables(): boolean {
    // This function indicates if there's ANY valid starting slot for the current service
    return this.tramosParaMostrar.some(t => t.esInicioPosible);
  }

  // No longer needed if `tramo.estado` is the source of truth after procesarTramosParaMostrar
  // isTramoSeleccionado(tramo: TramoDisplay): boolean {
  //   return !!tramo.id && this.selectedTramosIds.includes(tramo.id);
  // }

  // No longer needed if click handler checks tramo.esInicioPosible directly
  // puedeSeleccionarTramo(tramo: TramoDisplay): boolean {
  //   return tramo.estado === 'disponible' && !!tramo.esInicioPosible;
  // }
}