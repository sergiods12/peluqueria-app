import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, tap, switchMap, catchError, finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common'; // Importar CommonModule

import { Peluqueria } from '../../shared/models/peluqueria.model';
import { Empleado } from '../../shared/models/empleado.model';
import { Servicio } from '../../shared/models/servicio.model';
import { Tramo } from '../../shared/models/tramo.model';

import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { EmpleadoService } from '../../shared/services/empleado.service';
import { ServicioAppService } from '../../shared/services/servicio-app.service';
import { TramoService } from '../../shared/services/tramo.service';
import { ReservaRequestDTO } from '../../shared/models/reserva-request-dto.model'; // Importar DTO

@Component({
  selector: 'app-reservar-cita',
  templateUrl: './reservar-cita.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class ReservarCitaComponent implements OnInit, OnDestroy {
  reservaForm!: FormGroup;
  peluquerias: Peluqueria[] = [];
  empleadosPeluqueria: Empleado[] = [];
  servicios: Servicio[] = [];
  tramosParaMostrar: Tramo[] = [];

  isLoadingPeluquerias = false;
  isLoadingEmpleados = false;
  isLoadingServicios = false;
  isLoadingTramos = false;

  minDate: string;
  mensajeError: string | null = null;
  mensajeExito: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private peluqueriaService: PeluqueriaService,
    private empleadoService: EmpleadoService,
    private servicioAppService: ServicioAppService,
    private tramoService: TramoService
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.reservaForm = this.fb.group({
      peluqueria: [null, Validators.required],
      empleado: [{ value: null, disabled: true }, Validators.required],
      servicio: [{ value: null, disabled: true }, Validators.required],
      fechaCita: [{ value: null, disabled: true }, Validators.required],
    });

    this.cargarPeluquerias();
    this.onPeluqueriaChanges();
    this.onEmpleadoChanges();
    this.onServicioOrFechaChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarPeluquerias(): void {
    this.isLoadingPeluquerias = true;
    this.peluqueriaService.getAllPeluquerias().pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoadingPeluquerias = false)
    ).subscribe({
      next: (data: Peluqueria[]) => this.peluquerias = data,
      error: (err: any) => {
        console.error('Error al cargar peluquerías:', err);
        this.mensajeError = 'No se pudieron cargar las peluquerías.';
      }
    });
  }

  onPeluqueriaChanges(): void {
    this.reservaForm.get('peluqueria')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      tap(() => {
        this.empleadosPeluqueria = [];
        this.servicios = [];
        this.reservaForm.get('empleado')?.reset({ value: null, disabled: true });
        this.reservaForm.get('servicio')?.reset({ value: null, disabled: true });
        this.reservaForm.get('fechaCita')?.reset({ value: null, disabled: true });
        this.tramosParaMostrar = [];
        this.mensajeError = null;
        this.mensajeExito = null;
      }),
      switchMap(peluqueriaId => {
        if (peluqueriaId) {
          this.isLoadingEmpleados = true;
          this.reservaForm.get('empleado')?.disable();
          return this.empleadoService.getEmpleadosPorPeluqueria(peluqueriaId).pipe(
            finalize(() => this.isLoadingEmpleados = false),
            catchError((err: any) => {
              console.error('Error al cargar empleados:', err);
              this.mensajeError = 'No se pudieron cargar los peluqueros para esta peluquería.';
              this.reservaForm.get('empleado')?.reset({ value: null, disabled: true });
              return [];
            })
          );
        }
        return [];
      })
    ).subscribe((empleados: Empleado[]) => {
      this.empleadosPeluqueria = empleados;
      if (empleados && empleados.length > 0) {
        this.reservaForm.get('empleado')?.enable();
      } else {
        this.reservaForm.get('empleado')?.reset({ value: null, disabled: true });
      }
    });
  }

  onEmpleadoChanges(): void {
    this.reservaForm.get('empleado')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      tap(() => {
        this.servicios = [];
        this.reservaForm.get('servicio')?.reset({ value: null, disabled: true });
        this.reservaForm.get('fechaCita')?.reset({ value: null, disabled: true });
        this.tramosParaMostrar = [];
        this.mensajeError = null;
        this.mensajeExito = null;
      }),
      switchMap(empleadoId => {
        if (empleadoId) {
          this.isLoadingServicios = true;
          this.reservaForm.get('servicio')?.disable();
          return this.servicioAppService.getAllServicios().pipe(
            finalize(() => this.isLoadingServicios = false),
            catchError((err: any) => {
              console.error('Error al cargar servicios:', err);
              this.mensajeError = 'No se pudieron cargar los servicios.';
              this.reservaForm.get('servicio')?.reset({ value: null, disabled: true });
              return [];
            })
          );
        }
        return [];
      })
    ).subscribe((servicios: Servicio[]) => {
      this.servicios = servicios;
      if (servicios && servicios.length > 0) {
        this.reservaForm.get('servicio')?.enable();
      } else {
        this.reservaForm.get('servicio')?.reset({ value: null, disabled: true });
      }
    });
  }

  onServicioOrFechaChanges(): void {
    this.reservaForm.get('servicio')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.intentarCargarTramos());
    this.reservaForm.get('fechaCita')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.intentarCargarTramos());

    this.reservaForm.get('servicio')?.valueChanges.pipe(
        takeUntil(this.destroy$)
    ).subscribe(servicioId => {
        if (servicioId) {
            this.reservaForm.get('fechaCita')?.enable();
        } else {
            this.reservaForm.get('fechaCita')?.reset({ value: null, disabled: true });
        }
        this.tramosParaMostrar = [];
    });
  }

  intentarCargarTramos(): void {
    const peluqueriaId = this.reservaForm.get('peluqueria')?.value;
    const empleadoId = this.reservaForm.get('empleado')?.value;
    const servicioId = this.reservaForm.get('servicio')?.value;
    const fecha = this.reservaForm.get('fechaCita')?.value;

    if (peluqueriaId && empleadoId && servicioId && fecha) {
      this.cargarTramosDisponibles(peluqueriaId, empleadoId, servicioId, fecha);
    } else {
      this.tramosParaMostrar = [];
    }
  }

  cargarTramosDisponibles(peluqueriaId: number, empleadoId: number, servicioId: number, fecha: string): void {
    this.isLoadingTramos = true;
    this.mensajeError = null;
    this.mensajeExito = null;
    this.tramosParaMostrar = [];

    this.tramoService.getTramosDisponibles(fecha, empleadoId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoadingTramos = false)
    ).subscribe({
      next: (tramosDesdeBackend: Tramo[]) => {
        const servicioSeleccionado = this.getServicioSeleccionado();
        if (!servicioSeleccionado) {
          this.tramosParaMostrar = [];
          this.mensajeError = 'Por favor, seleccione un servicio válido.';
          return;
        }
        const numTramosNecesarios = servicioSeleccionado.numTramos;

        this.tramosParaMostrar = tramosDesdeBackend.map((tramo, index, array) => {
          let estadoCalculado: 'disponible' | 'reservadoOtro' | 'seleccionado' | 'noSeleccionable' = 'noSeleccionable';
          let esInicioPosibleCalculado = false;

          // El backend ya debería indicar si el tramo está disponible (no tiene citaId y el empleado lo marcó como disponible)
          // La propiedad 'disponible' del tramo del backend es clave aquí.
          if (tramo.disponible && !tramo.citaId) {
            estadoCalculado = 'disponible';
            // Lógica para esInicioPosible
            let puedeSerInicio = true;
            if (index + numTramosNecesarios > array.length) {
              puedeSerInicio = false; 
            } else {
              for (let i = 0; i < numTramosNecesarios; i++) {
                const tramoConsecutivo = array[index + i];
                // Un tramo consecutivo no es válido si no existe, no está disponible según el backend, o ya tiene una cita
                if (!tramoConsecutivo || !tramoConsecutivo.disponible || tramoConsecutivo.citaId) {
                  puedeSerInicio = false;
                  break;
                }
              }
            }
            esInicioPosibleCalculado = puedeSerInicio;
          } else if (tramo.citaId) {
            estadoCalculado = 'reservadoOtro';
          } else if (!tramo.disponible) { // Si el empleado no lo marcó como disponible
              estadoCalculado = 'noSeleccionable';
          }

          return {
            ...tramo,
            estado: estadoCalculado,
            esInicioPosible: esInicioPosibleCalculado,
          };
        });

        if (this.tramosParaMostrar.length === 0 && tramosDesdeBackend.length > 0) {
            // Esto podría significar que hay tramos pero ninguno es válido para el servicio
            this.mensajeError = 'No hay suficientes horarios consecutivos disponibles para la duración del servicio seleccionado.';
        } else if (tramosDesdeBackend.length === 0) {
            this.mensajeError = 'No hay horarios definidos por el empleado para esta fecha.';
        }

        // Para el mensaje en HTML: "!isLoadingTramos && tramosParaMostrar.length > 0 && !hayTramosSeleccionables() && getTramosSeleccionados().length === 0"
        // Este se actualiza automáticamente al cambiar tramosParaMostrar
      },
      error: (err: any) => {
        console.error('Error al cargar tramos horarios:', err);
        this.mensajeError = 'Error al cargar los horarios disponibles. Intente de nuevo.';
      }
    });
  }

  seleccionarTramo(tramoSeleccionado: Tramo): void {
    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado || !tramoSeleccionado.esInicioPosible) return;

    const numTramosNecesarios = servicioSeleccionado.numTramos;
    const indiceInicio = this.tramosParaMostrar.findIndex(t => t.id === tramoSeleccionado.id);

    this.tramosParaMostrar.forEach(t => {
      if (t.estado === 'seleccionado') {
        // Re-evaluar su estado original antes de la selección
        if (t.disponible && !t.citaId) t.estado = 'disponible';
        else if (t.citaId) t.estado = 'reservadoOtro';
        else t.estado = 'noSeleccionable';
      }
    });
    
    // Recalcular esInicioPosible para todos los tramos disponibles después de deseleccionar
    this.tramosParaMostrar.forEach((t, idx, arr) => {
        if (t.estado === 'disponible') {
            let puedeSerInicio = true;
            if (idx + numTramosNecesarios > arr.length) {
                puedeSerInicio = false;
            } else {
                for (let i = 0; i < numTramosNecesarios; i++) {
                    const tramoConsecutivo = arr[idx + i];
                    if (!tramoConsecutivo || tramoConsecutivo.estado !== 'disponible') { // Solo puede seleccionar sobre disponibles
                        puedeSerInicio = false;
                        break;
                    }
                }
            }
            t.esInicioPosible = puedeSerInicio;
        } else {
            t.esInicioPosible = false; // Si no está disponible, no puede ser inicio
        }
    });


    // Ahora, si el tramo clickeado sigue siendo un inicio posible, lo seleccionamos
    const tramoActualizado = this.tramosParaMostrar[indiceInicio];
    if (tramoActualizado && tramoActualizado.estado === 'disponible' && tramoActualizado.esInicioPosible) {
        for (let i = 0; i < numTramosNecesarios; i++) {
            this.tramosParaMostrar[indiceInicio + i].estado = 'seleccionado';
        }
        this.mensajeError = null; // Limpiar error si la selección fue exitosa
    } else {
        this.mensajeError = "No se pueden seleccionar estos tramos para el servicio elegido.";
    }
  }


  getTramosSeleccionados(): Tramo[] {
    return this.tramosParaMostrar.filter(t => t.estado === 'seleccionado');
  }

  getServicioSeleccionado(): Servicio | undefined {
      return this.servicios.find(s => s.id === this.reservaForm.get('servicio')?.value);
  }

  hayTramosSeleccionables(): boolean {
    const servicio = this.getServicioSeleccionado();
    if (!servicio) return false;
    return this.tramosParaMostrar.some(t => t.estado === 'disponible' && t.esInicioPosible);
  }

  confirmarReserva(): void {
    this.mensajeError = null;
    this.mensajeExito = null;
    const tramosSeleccionados = this.getTramosSeleccionados();
    if (tramosSeleccionados.length === 0 || !tramosSeleccionados[0].id) {
      this.mensajeError = "Por favor, seleccione un tramo horario válido.";
      return;
    }
    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado || !servicioSeleccionado.id) {
        this.mensajeError = "Servicio no válido seleccionado.";
        return;
    }

    // Aquí necesitarías el ID del cliente logueado. Por ahora, usaré un placeholder.
    const clienteIdPlaceholder = 1; // DEBES REEMPLAZAR ESTO CON EL ID DEL CLIENTE AUTENTICADO

    const reservaDTO: ReservaRequestDTO = {
      primerTramoId: tramosSeleccionados[0].id,
      clienteId: clienteIdPlaceholder, 
      servicioId: servicioSeleccionado.id
    };

    console.log('Confirmando reserva DTO:', reservaDTO);
    this.isLoadingTramos = true;
    this.tramoService.reservarMultiplesTramos(reservaDTO).pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingTramos = false)
    ).subscribe({
        next: (resp: any) => {
            this.mensajeExito = '¡Cita reservada con éxito!';
            this.reservaForm.reset({
                peluqueria: null,
                empleado: { value: null, disabled: true },
                servicio: { value: null, disabled: true },
                fechaCita: { value: null, disabled: true }
            });
            this.empleadosPeluqueria = [];
            this.servicios = [];
            this.tramosParaMostrar = [];
        },
        error: (err: any) => {
            console.error('Error al confirmar reserva:', err);
            this.mensajeError = err.error?.message || err.message || 'No se pudo confirmar la reserva. Intente de nuevo.';
            this.intentarCargarTramos();
        }
    });
  }
}
