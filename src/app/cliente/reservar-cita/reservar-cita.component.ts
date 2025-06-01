// src/app/cliente/reservar-cita/reservar-cita.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, date pipe
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // Essential for formGroup
// ... other imports from your previous full component code ...
import { Peluqueria } from '../../shared/models/peluqueria.model';
import { Empleado } from '../../shared/models/empleado.model';
import { Servicio } from '../../shared/models/servicio.model';
import { Tramo } from '../../shared/models/tramo.model';
import { ReservaRequestDTO } from '../../shared/models/reserva-request-dto.model';
import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { EmpleadoService } from '../../shared/services/empleado.service';
import { ServicioAppService } from '../../shared/services/servicio-app.service';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { forkJoin } from 'rxjs';

interface TramoDisplay extends Tramo {
  estado: 'disponible' | 'reservadoOtro' | 'seleccionado' | 'noSeleccionable';
  esInicioPosible?: boolean;
}

@Component({
  selector: 'app-reservar-cita',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule // Ensure this is imported
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
  isLoadingTramos: boolean = false;
  private selectedTramosIds: number[] = [];

  constructor(
    private fb: FormBuilder,
    private peluqueriaService: PeluqueriaService,
    private empleadoService: EmpleadoService,
    private servicioAppService: ServicioAppService,
    private tramoService: TramoService,
    private authService: AuthService
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];

    this.reservaForm = this.fb.group({
      peluqueria: [null, Validators.required],
      empleado: [{ value: null, disabled: true }, Validators.required], // Initial disabled state managed here
      servicio: [{ value: null, disabled: true }, Validators.required], // Initial disabled state managed here
      fechaCita: [this.minDate, Validators.required]
    });
    this.fechaSeleccionada = this.minDate;
    this.generarTodosLosPosiblesIntervalosDelDia();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadInitialData();

    this.reservaForm.get('peluqueria')?.valueChanges.subscribe(peluqueriaId => {
      this.onPeluqueriaChange(peluqueriaId); // This will enable/disable 'empleado'
      if (peluqueriaId) {
        this.reservaForm.get('servicio')?.enable(); // Enable 'servicio'
      } else {
        this.reservaForm.get('servicio')?.reset({ value: null, disabled: true });
        this.reservaForm.get('empleado')?.reset({ value: null, disabled: true });
      }
      this.attemptLoadTramos();
    });

    this.reservaForm.get('empleado')?.valueChanges.subscribe(() => {
      this.attemptLoadTramos();
    });

    this.reservaForm.get('servicio')?.valueChanges.subscribe(() => {
      this.attemptLoadTramos();
    });

    this.reservaForm.get('fechaCita')?.valueChanges.subscribe(dateValue => {
      if (dateValue) {
        this.fechaSeleccionada = dateValue;
        this.attemptLoadTramos();
      } else {
        this.resetearVistaTramos();
      }
    });
     if (this.reservaForm.get('fechaCita')?.value) { // Initial load based on default date
        this.fechaSeleccionada = this.reservaForm.get('fechaCita')?.value;
        this.attemptLoadTramos();
    }
  }

  loadInitialData(): void {
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
        this.mensajeError = 'Error al cargar datos iniciales.';
        this.isLoadingTramos = false;
        console.error(err);
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
        if (h < 21) {
             this.todosLosPosiblesIntervalosDelDia.push({
                horaInicio: `${String(h).padStart(2, '0')}:30`,
                horaFin: `${String(h + 1).padStart(2, '0')}:00`
            });
        }
    }
  }

  onPeluqueriaChange(peluqueriaId: string | number | null): void {
    this.empleadosPeluqueria = [];
    // No need to reset tramos here, attemptLoadTramos will handle it based on new state

    if (!peluqueriaId) {
      this.reservaForm.get('empleado')?.disable(); // Explicitly disable if no peluqueria
      return;
    }

    const peluqueriaSeleccionada = this.peluquerias.find(p => p.id === +peluqueriaId);
    if (peluqueriaSeleccionada?.empleados && peluqueriaSeleccionada.empleados.length > 0) {
      this.empleadosPeluqueria = peluqueriaSeleccionada.empleados;
      this.reservaForm.get('empleado')?.enable();
    } else {
      this.reservaForm.get('empleado')?.disable();
      console.warn('Peluquería seleccionada no tiene empleados o necesita cargarlos.');
    }
  }

  attemptLoadTramos(): void {
    const empleadoId = this.reservaForm.get('empleado')?.value;
    const servicioId = this.reservaForm.get('servicio')?.value;
    const fecha = this.reservaForm.get('fechaCita')?.value;

    if (empleadoId && servicioId && fecha) {
      this.cargarTramosDelEmpleado(+empleadoId, fecha);
    } else {
      this.resetearVistaTramos();
    }
  }

  cargarTramosDelEmpleado(empleadoId: number, fecha: string): void {
    this.isLoadingTramos = true;
    this.mensajeError = null;
    this.selectedTramosIds = [];

    this.tramoService.getTramosDisponibles(fecha, empleadoId)
      .subscribe({
        next: tramos => {
          this.tramosDesdeBackend = tramos;
          this.procesarTramosParaMostrar();
          this.isLoadingTramos = false;
        },
        error: err => {
          console.error("Error al cargar tramos:", err);
          this.mensajeError = "Error al cargar los horarios para el empleado.";
          this.tramosDesdeBackend = [];
          this.procesarTramosParaMostrar();
          this.isLoadingTramos = false;
        }
      });
  }

  procesarTramosParaMostrar(): void {
    const servicioSeleccionado: Servicio | undefined = this.getServicioSeleccionado();
    const fecha = this.reservaForm.get('fechaCita')?.value;

    if (!this.reservaForm.get('empleado')?.value || !fecha || !servicioSeleccionado) {
      this.tramosParaMostrar = [];
      this.selectedTramosIds = [];
      return;
    }
    const numTramosNecesarios = servicioSeleccionado.numTramos || 1;

    this.tramosParaMostrar = this.todosLosPosiblesIntervalosDelDia.map(intervaloBase => {
      const tramoBackend = this.tramosDesdeBackend.find(
        tb => tb.horaInicio.startsWith(intervaloBase.horaInicio) && tb.fecha === fecha
      );
      let calculatedEstado: TramoDisplay['estado'] = 'noSeleccionable';
      let esInicioPosible = false;
      let displayTramoData: Partial<Tramo> & { horaInicio: string, horaFin: string, fecha: string, disponible: boolean } = {
        id: undefined, fecha: fecha, horaInicio: intervaloBase.horaInicio, horaFin: intervaloBase.horaFin, disponible: false,
      };

      if (tramoBackend) {
        displayTramoData = { ...displayTramoData, ...tramoBackend };
        if (tramoBackend.disponible) {
          calculatedEstado = 'disponible';
          let countDisponiblesConsecutivos = 0;
          const indiceIntervaloActual = this.todosLosPosiblesIntervalosDelDia.findIndex(p => p.horaInicio === intervaloBase.horaInicio);
          for (let i = 0; i < numTramosNecesarios; i++) {
            if (indiceIntervaloActual + i < this.todosLosPosiblesIntervalosDelDia.length) {
              const siguienteIntervalo = this.todosLosPosiblesIntervalosDelDia[indiceIntervaloActual + i];
              const tramoCorresp = this.tramosDesdeBackend.find(
                tb => tb.horaInicio.startsWith(siguienteIntervalo.horaInicio) && tb.fecha === fecha && tb.disponible
              );
              if (tramoCorresp) { countDisponiblesConsecutivos++; } else { break; }
            } else { break; }
          }
          if (countDisponiblesConsecutivos === numTramosNecesarios) esInicioPosible = true;
        } else { calculatedEstado = 'reservadoOtro'; }
      }

      if (displayTramoData.id && this.selectedTramosIds.includes(displayTramoData.id)) {
        calculatedEstado = 'seleccionado';
      }

      return { ...(displayTramoData as Tramo), estado: calculatedEstado, esInicioPosible } as TramoDisplay;
    });
  }

  seleccionarTramo(tramoClickeado: TramoDisplay): void {
    if (!tramoClickeado.esInicioPosible || !tramoClickeado.id) {
      this.mensajeError = "Este tramo no puede iniciar una reserva."; return;
    }
    this.mensajeError = null;
    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado || !servicioSeleccionado.id) return;

    const numTramosNecesarios = servicioSeleccionado.numTramos;
    const nuevosTramosIds: number[] = [];
    const fechaActual = this.reservaForm.get('fechaCita')?.value;
    const indiceClickeadoGlobal = this.todosLosPosiblesIntervalosDelDia.findIndex(p => p.horaInicio === tramoClickeado.horaInicio);

    for (let i = 0; i < numTramosNecesarios; i++) {
      const targetIndexGlobal = indiceClickeadoGlobal + i;
      if (targetIndexGlobal < this.todosLosPosiblesIntervalosDelDia.length) {
        const intervaloBase = this.todosLosPosiblesIntervalosDelDia[targetIndexGlobal];
        const tramoCorresp = this.tramosDesdeBackend.find(
          tb => tb.horaInicio.startsWith(intervaloBase.horaInicio) && tb.fecha === fechaActual && tb.disponible
        );
        if (tramoCorresp && tramoCorresp.id) {
          nuevosTramosIds.push(tramoCorresp.id);
        } else {
          this.mensajeError = `El tramo de las ${intervaloBase.horaInicio} (o uno subsiguiente) no está disponible.`;
          this.selectedTramosIds = []; this.procesarTramosParaMostrar(); return;
        }
      } else {
        this.mensajeError = "No hay suficientes tramos en el día para este servicio.";
        this.selectedTramosIds = []; this.procesarTramosParaMostrar(); return;
      }
    }
    this.selectedTramosIds = nuevosTramosIds;
    this.procesarTramosParaMostrar();
  }

  resetearVistaTramos(): void {
    this.tramosDesdeBackend = [];
    this.selectedTramosIds = [];
    this.procesarTramosParaMostrar();
  }

  confirmarReserva(): void {
    this.mensajeError = null; this.mensajeExito = null;
    if (this.selectedTramosIds.length === 0) {
      this.mensajeError = "Por favor, selecciona los tramos."; return;
    }
    if (!this.currentUser || this.currentUser.rol !== 'CLIENTE' || !this.currentUser.id) {
      this.mensajeError = "Debe estar logueado como cliente."; return;
    }
    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado || !servicioSeleccionado.id) {
      this.mensajeError = "Seleccione un servicio."; return;
    }
    const primerTramoId = this.selectedTramosIds[0];
    const reservaRequest: ReservaRequestDTO = {
      primerTramoId: primerTramoId, clienteId: this.currentUser.id, servicioId: servicioSeleccionado.id
    };
    this.tramoService.reservarMultiplesTramos(reservaRequest).subscribe({
      next: () => {
        this.mensajeExito = `Reserva confirmada para ${servicioSeleccionado.nombre}.`;
        this.selectedTramosIds = [];
        this.attemptLoadTramos();
      },
      error: (err) => {
        this.mensajeError = `Error: ${err.error?.message || err.message || 'No se pudo confirmar.'}`;
        this.procesarTramosParaMostrar();
      }
    });
  }

  getServicioSeleccionado(): Servicio | undefined {
    const servicioId = this.reservaForm.get('servicio')?.value;
    return this.servicios.find(s => s.id === +servicioId);
  }

  getTramosSeleccionados(): TramoDisplay[] {
    return this.tramosParaMostrar.filter(t => t.id && this.selectedTramosIds.includes(t.id));
  }

  hayTramosSeleccionables(): boolean {
    return this.tramosParaMostrar.some(t => t.esInicioPosible && t.estado === 'disponible');
  }
}