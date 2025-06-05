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
import { ReservaRequestDTO } from '../../shared/models/reserva-request-dto.model';

@Component({
  selector: 'app-reservar-cita',
  templateUrl: './reservar-cita.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  // Asegúrate de que este archivo CSS exista en la misma carpeta que este componente TS.
  styleUrls: ['./reservar-cita.component.css']
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

  // !!! IMPORTANTE: Reemplaza esto con la lógica real para obtener el ID del cliente logueado
  private currentClienteId: number | null = 1; // Ejemplo: Asume que el cliente con ID 1 está logueado

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

    // =========================================================================================
    // NOTA IMPORTANTE:
    // Para que se muestren TODOS los tramos (incluyendo los que el peluquero marcó como
    // "no disponibles", es decir, `tramo.disponible === false`), el servicio
    // `this.tramoService.getTramosDisponibles(fecha, empleadoId)` DEBE devolverlos.
    // Si el servicio solo devuelve tramos "libres" (donde tramo.disponible es true y no hay citaId),
    // el componente no podrá mostrar los tramos que el empleado marcó como no disponibles.
    // La lógica de este componente está preparada para procesar y mostrar todos los tipos de tramos
    // si son provistos por el servicio.
    // =========================================================================================
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
          let estadoCalculado: Tramo['estado'];
          let esInicioPosibleCalculado = false;

          if (tramo.citaId) {
            // Si el tramo tiene una citaId, está reservado.
            // Idealmente, el backend indicaría si la cita es del currentClienteId.
            // Por ahora, lo marcamos como 'reservadoOtro'. Se actualizará a 'reservadoCurrentUser' después de una reserva exitosa.
             estadoCalculado = 'reservadoOtro'; // Se mostrará en ROJO
          } else if (tramo.disponible) { // 'tramo.disponible' viene del backend. True = empleado lo marcó como disponible.
            estadoCalculado = 'disponible'; // Se mostrará en BLANCO (o color por defecto)
          } else {
            // Si no tiene citaId y tramo.disponible es false,
            // significa que el peluquero marcó este tramo como NO disponible.
            estadoCalculado = 'noSeleccionable'; // Se mostrará en GRIS
          }

          // 'esInicioPosible' solo es relevante para tramos que están en estado 'disponible'
          if (estadoCalculado === 'disponible') {
            let puedeSerInicio = true;
            if (index + numTramosNecesarios > array.length) {
              puedeSerInicio = false;
            } else {
              for (let i = 0; i < numTramosNecesarios; i++) {
                const tramoConsecutivo = array[index + i];
                // Para ser parte de una nueva selección, los tramos consecutivos deben estar realmente disponibles
                // (según el backend, es decir, tramo.disponible === true) y no tener ya una cita.
                if (!tramoConsecutivo || !tramoConsecutivo.disponible || tramoConsecutivo.citaId) {
                  puedeSerInicio = false;
                  break;
                }
              }
            }
            esInicioPosibleCalculado = puedeSerInicio;
          }
          // Para cualquier otro estado ('reservadoOtro', 'noSeleccionable', 'reservadoCurrentUser'),
          // esInicioPosibleCalculado permanecerá false, lo cual es correcto.

          return {
            ...tramo,
            estado: estadoCalculado,
            esInicioPosible: esInicioPosibleCalculado,
          };
        });

        if (tramosDesdeBackend.length === 0) {
            this.mensajeError = 'No hay horarios definidos por el empleado para esta fecha.';
        } else if (this.tramosParaMostrar.length > 0 && !this.hayTramosSeleccionables()) {
             this.mensajeError = 'No hay suficientes horarios consecutivos disponibles que cumplan con la duración del servicio seleccionado.';
        } else {
             this.mensajeError = null;
        }
      },
      error: (err: any) => {
        console.error('Error al cargar tramos horarios:', err);
        this.mensajeError = 'Error al cargar los horarios disponibles. Intente de nuevo.';
      }
    });
  }

  seleccionarTramo(tramoSeleccionado: Tramo): void {
    if (tramoSeleccionado.estado !== 'disponible' || !tramoSeleccionado.esInicioPosible) {
        if (tramoSeleccionado?.estado === 'disponible' && !tramoSeleccionado?.esInicioPosible) {
             this.mensajeError = 'Este horario no permite iniciar el servicio seleccionado (tramos insuficientes).';
        }
        return;
    }
    this.mensajeError = null;

    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado) return;

    const numTramosNecesarios = servicioSeleccionado.numTramos;
    const indiceInicio = this.tramosParaMostrar.findIndex(t => t.id === tramoSeleccionado.id);

    // Deseleccionar todos los tramos previamente seleccionados
    this.tramosParaMostrar.forEach(t => {
      if (t.estado === 'seleccionado') {
        // Revertir al estado original basado en los datos del backend
        if (t.citaId) {
             t.estado = 'reservadoOtro';
        } else if (t.disponible) {
            t.estado = 'disponible';
        } else {
            t.estado = 'noSeleccionable';
        }
      }
    });

    // Seleccionar los nuevos tramos
    for (let i = 0; i < numTramosNecesarios; i++) {
      const tramoActual = this.tramosParaMostrar[indiceInicio + i];
      if (tramoActual) { // Asegurarse de que el tramo exista en el array
          tramoActual.estado = 'seleccionado'; // Se mostrará en NARANJA
      }
    }
  }

  cancelarSeleccion(): void {
    this.mensajeError = null;
    this.mensajeExito = null;
    this.tramosParaMostrar.forEach(t => {
      if (t.estado === 'seleccionado') {
        // Revertir al estado original
        if (t.citaId) {
             t.estado = 'reservadoOtro';
        } else if (t.disponible) {
            t.estado = 'disponible';
        } else {
            t.estado = 'noSeleccionable';
        }
      }
    });

    // Recalcular esInicioPosible para todos los tramos disponibles después de cancelar
    const servicioSeleccionado = this.getServicioSeleccionado();
    const numTramosNecesarios = servicioSeleccionado ? servicioSeleccionado.numTramos : 0;

    this.tramosParaMostrar.forEach((t, idx, arr) => {
        if (t.estado === 'disponible' && numTramosNecesarios > 0) {
            let puedeSerInicio = true;
            if (idx + numTramosNecesarios > arr.length) {
                puedeSerInicio = false;
            } else {
                for (let i = 0; i < numTramosNecesarios; i++) {
                    const tramoConsecutivo = arr[idx + i];
                    // Para ser parte de una nueva selección, los tramos consecutivos deben estar realmente disponibles
                    if (!tramoConsecutivo || tramoConsecutivo.estado !== 'disponible') {
                        puedeSerInicio = false;
                        break;
                    }
                }
            }
            t.esInicioPosible = puedeSerInicio;
        } else {
            t.esInicioPosible = false;
        }
    });
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
      this.mensajeError = "Por favor, seleccione un tramo horario válido para reservar.";
      return;
    }
    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado || !servicioSeleccionado.id) {
        this.mensajeError = "Servicio no válido seleccionado.";
        return;
    }

    if (this.currentClienteId === null) {
        this.mensajeError = "Error: No se pudo obtener el ID del cliente logueado.";
        console.error("Cliente ID is null. Cannot confirm reservation.");
        return;
    }

    const reservaDTO: ReservaRequestDTO = {
      primerTramoId: tramosSeleccionados[0].id,
      clienteId: this.currentClienteId,
      servicioId: servicioSeleccionado.id
    };

    this.isLoadingTramos = true;
    this.tramoService.reservarMultiplesTramos(reservaDTO).pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingTramos = false)
    ).subscribe({
        next: (resp: any) => { // Idealmente, 'resp' tendría un tipo definido si el backend devuelve un objeto específico
            this.mensajeExito = '¡Cita reservada con éxito!';
            // Actualizar el estado de los tramos recién reservados a 'reservadoCurrentUser'
            tramosSeleccionados.forEach(tramoReservado => {
                const tramoEnLista = this.tramosParaMostrar.find(t => t.id === tramoReservado.id);
                if (tramoEnLista) {
                    tramoEnLista.estado = 'reservadoCurrentUser'; // Se mostrará en VERDE
                    tramoEnLista.esInicioPosible = false; // Ya no es un inicio posible
                    // Aquí también deberías asignar el citaId y clienteId devueltos por el backend si es necesario
                    // y si tu modelo Tramo los tiene (ej. tramoEnLista.citaId = resp.cita?.id;)
                    // tramoEnLista.cliente = { id: this.currentClienteId } as Cliente; // Si tienes el objeto cliente
                }
            });
            // Opcional: Limpiar el formulario o solo los campos de selección de tramos
            // this.reservaForm.reset({ ... }); // O solo resetear fecha/hora
        },
        error: (err: any) => {
            console.error('Error al confirmar reserva:', err);
            const backendErrorMessage = err.error?.message || err.message;
            this.mensajeError = backendErrorMessage || 'No se pudo confirmar la reserva. Intente de nuevo.';
            // Si la reserva falla, es buena idea revertir la selección visual
            this.cancelarSeleccion();
        }
    });
  }

  get hayTramosSeleccionadosEnUI(): boolean {
      return this.tramosParaMostrar.some(t => t.estado === 'seleccionado');
  }
}
