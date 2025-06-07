// reservar-cita.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, tap, switchMap, catchError, finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

import { Peluqueria } from '../../shared/models/peluqueria.model';
import { Empleado } from '../../shared/models/empleado.model';
import { Servicio } from '../../shared/models/servicio.model';
import { Tramo } from '../../shared/models/tramo.model';


import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { EmpleadoService } from '../../shared/services/empleado.service';
import { ServicioAppService } from '../../shared/services/servicio-app.service';
import { TramoService } from '../../shared/services/tramo.service';
import { ReservaRequestDTO } from '../../shared/models/reserva-request-dto.model';
import { AuthService } from '../../shared/services/auth.service'; // Importar AuthService

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
  isConfirmingReserva = false;

  minDate: string;
  mensajeError: string | null = null;
  mensajeExito: string | null = null;

  private destroy$ = new Subject<void>();

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

  getColor(tramo: Tramo): { [key: string]: string } {
    if (!tramo || typeof tramo.estado === 'undefined') {
      return {
        'background-color': 'grey',
        'color': 'white',
        'border-color': '#555'
      };
    }

    switch (tramo.estado) {
      case 'seleccionado': // Naranja (antes Amarillo)
        return {
          'background-color': 'orange', // Cambiado a naranja
          'color': '#333',
          'border-color': '#e69500' // Un naranja más oscuro para el borde
        };
      case 'reservadoPropio': // Verde
        return {
          'background-color': '#28a745',
          'color': 'white',
          'border-color': '#1e7e34'
        };
      case 'reservadoOtro': // Rojo
        return {
          'background-color': 'red',
          'color': 'white',
          'border-color': '#b30000'
        };
      case 'disponible': // Blanco (si es un inicio posible) o un gris claro si no lo es pero está disponible
        return {
          'background-color': 'white',
          'color': '#333',
          'border-color': '#ccc'
        };
      case 'noSeleccionable': // Gris
        return {
          'background-color': 'lightgrey',
          'color': '#555',
          'border-color': '#aaa'
        };
      default:
        return {
          'background-color': 'grey',
          'color': 'white',
          'border-color': '#555'
        };
    }
  }

  getTramoTitle(tramo: Tramo): string {
    switch (tramo.estado) {
      case 'seleccionado':
        return 'Horario seleccionado (haz clic para deseleccionar)';
      case 'reservadoPropio':
        return 'Reservado por ti';
      case 'reservadoOtro':
        return 'Horario ya reservado';
      case 'disponible':
        return tramo.esInicioPosible ? 'Seleccionar este horario' : 'Horario disponible (no encaja para iniciar servicio)';
      case 'noSeleccionable':
        return 'Horario no disponible (definido así por el empleado o no encaja)';
      default:
        return 'Horario';
    }
  }

  cancelarSeleccion(): void {
    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado) return;

    let deseleccionRealizada = false;
    this.tramosParaMostrar.forEach(t => {
      if (t.estado === 'seleccionado') {
        if (t.disponible && !t.citaId) { // Si originalmente era disponible y no tenía cita
            t.estado = 'disponible';
        } else { // Si no, vuelve a no seleccionable (podría haber tenido cita o no ser disponible)
            t.estado = 'noSeleccionable';
        }
        deseleccionRealizada = true;
      }
    });
    if (deseleccionRealizada) {
      this.recalculateEsInicioPosibleForAllTramos();
    }
    this.mensajeError = null;
    this.mensajeExito = null;
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
         if (this.reservaForm.get('peluqueria')?.value) {
            this.mensajeError = 'No hay peluqueros disponibles para la peluquería seleccionada.';
        }
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
    this.reservaForm.get('servicio')?.valueChanges.pipe(
        takeUntil(this.destroy$)
    ).subscribe(servicioId => {
        if (servicioId) {
            this.reservaForm.get('fechaCita')?.enable();
        } else {
            this.reservaForm.get('fechaCita')?.reset({ value: null, disabled: true });
        }
        this.tramosParaMostrar = [];
        this.mensajeError = null;
        this.mensajeExito = null;
        this.intentarCargarTramos();
    });

    this.reservaForm.get('fechaCita')?.valueChanges.pipe(
        takeUntil(this.destroy$)
    ).subscribe(() => {
        this.tramosParaMostrar = [];
        this.mensajeError = null;
        this.mensajeExito = null;
        this.intentarCargarTramos();
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

      tramosDesdeBackend.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));


        this.tramosParaMostrar = tramosDesdeBackend.map((tramo, index, array) => {
          let estadoCalculado: 'disponible' | 'reservadoOtro' | 'noSeleccionable';
          let esInicioPosibleCalculado = false;

          if (tramo.citaId) { // Ya está reservado
            estadoCalculado = 'reservadoOtro'; // Rojo
          } else if (tramo.disponible) { // Marcado como disponible por el empleado y no reservado
            estadoCalculado = 'disponible'; // Blanco
            // Calcular si puede ser un inicio de selección
            if (numTramosNecesarios > 0) {
              let puedeSerInicio = true;
              if (index + numTramosNecesarios > array.length) {
                puedeSerInicio = false;
              } else {
                for (let i = 0; i < numTramosNecesarios; i++) {
                  const tramoConsecutivo = array[index + i];
                  // Para ser inicio, todos los tramos necesarios deben estar marcados como 'disponible' por el empleado y no tener cita
                  if (!tramoConsecutivo || !tramoConsecutivo.disponible || tramoConsecutivo.citaId) {
                    puedeSerInicio = false;
                    break;
                  }
                }
              }
              esInicioPosibleCalculado = puedeSerInicio;
            }
          } else { // No disponible por el empleado y no reservado
            estadoCalculado = 'noSeleccionable'; // Gris
          }

          return {
            ...tramo,
            estado: estadoCalculado as 'disponible' | 'reservadoOtro' | 'seleccionado' | 'noSeleccionable' | 'reservadoPropio',
            esInicioPosible: esInicioPosibleCalculado,
          };
        });

        if (this.tramosParaMostrar.length === 0 && tramosDesdeBackend.length > 0) {
            this.mensajeError = 'No hay suficientes horarios consecutivos disponibles para la duración del servicio seleccionado.';
        } else if (tramosDesdeBackend.length === 0) {
            this.mensajeError = 'No hay horarios definidos por el empleado para esta fecha.';
        }
      },
      error: (err: any) => {
        console.error('Error al cargar tramos horarios:', err);
        this.mensajeError = 'Error al cargar los horarios disponibles. Intente de nuevo.';
      }
    });
  }

  seleccionarTramo(tramoClickeado: Tramo): void {
    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado) {
        this.mensajeError = "Por favor, seleccione primero un servicio.";
        return;
    }

    const numTramosNecesarios = servicioSeleccionado.numTramos;
    const indiceClickeado = this.tramosParaMostrar.findIndex(t => t.id === tramoClickeado.id);

    // Comportamiento al hacer clic:
    if (tramoClickeado.estado === 'seleccionado') {
        // Si se hace clic en un tramo ya seleccionado, se deselecciona todo el bloque.
        this.cancelarSeleccion();
        this.mensajeError = null; // Limpiar error si la acción fue deseleccionar
        return;
    } else if (tramoClickeado.estado === 'disponible' && tramoClickeado.esInicioPosible) {
        // Si se hace clic en un tramo disponible que puede ser inicio:
        // 1. Deseleccionar cualquier tramo previamente seleccionado.
        this.tramosParaMostrar.forEach(t => {
            if (t.estado === 'seleccionado') {
                 // Vuelve a disponible si lo era y no está reservado por otro
                t.estado = (t.disponible && !t.citaId) ? 'disponible' : 'noSeleccionable';
            }
        });

        // 2. Seleccionar el nuevo bloque de tramos.
        for (let i = 0; i < numTramosNecesarios; i++) {
            const tramoASeleccionar = this.tramosParaMostrar[indiceClickeado + i];
            // Asegurarse de que todos los tramos del bloque estén realmente disponibles
            if (tramoASeleccionar && tramoASeleccionar.disponible && !tramoASeleccionar.citaId) {
                tramoASeleccionar.estado = 'seleccionado'; // Amarillo
            } else {
                // Si algo sale mal (no debería si esInicioPosible es correcto), revertir.
                this.mensajeError = "Error al seleccionar el bloque. Algunos tramos no están disponibles.";
                this.cancelarSeleccion(); // Limpia la selección parcial.
                return;
            }
        }
        this.mensajeError = null; // Limpiar error si la selección fue exitosa
    } else if (tramoClickeado.estado === 'reservadoOtro' || tramoClickeado.estado === 'reservadoPropio') {
        this.mensajeError = "Este horario ya está reservado.";
    } else if (tramoClickeado.estado === 'noSeleccionable' || (tramoClickeado.estado === 'disponible' && !tramoClickeado.esInicioPosible)) {
        this.mensajeError = "Este horario no está disponible o no puede iniciar la selección para el servicio elegido.";
    }

    // Después de cualquier cambio en la selección, recalcular 'esInicioPosible' para todos.
    this.recalculateEsInicioPosibleForAllTramos();
  }

  private recalculateEsInicioPosibleForAllTramos(): void {
    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado) {
      // Si no hay servicio, ningún tramo es inicio posible
      this.tramosParaMostrar.forEach(t => t.esInicioPosible = false);
      return;
    }
    const numTramosNecesarios = servicioSeleccionado.numTramos;

    this.tramosParaMostrar.forEach((tramoActual, idx, arr) => {
      // Para ser un inicio posible, un tramo debe estar en estado 'disponible' (blanco)
      if (tramoActual.estado === 'disponible') {
        let puedeSerInicio = true;
        if (idx + numTramosNecesarios > arr.length) {
          puedeSerInicio = false;
        } else {
          for (let i = 0; i < numTramosNecesarios; i++) {
            const tramoConsecutivo = arr[idx + i];
            // Todos los tramos del bloque deben estar también en estado 'disponible'
            if (!tramoConsecutivo || tramoConsecutivo.estado !== 'disponible') {
              puedeSerInicio = false;
              break;
            }
          }
        }
        tramoActual.esInicioPosible = puedeSerInicio;
      } else {
        // Si no está 'disponible' (blanco), no puede ser un inicio.
        tramoActual.esInicioPosible = false;
      }
    });
  }

  getTramosSeleccionados(): Tramo[] {
    return this.tramosParaMostrar.filter(t => t.estado === 'seleccionado');
  }

  getServicioSeleccionado(): Servicio | undefined {
      const servicioId = this.reservaForm.get('servicio')?.value;
      if (!servicioId) return undefined;
      return this.servicios.find(s => s.id === servicioId);
  }

  hayTramosSeleccionables(): boolean {
    const servicio = this.getServicioSeleccionado();
    if (!servicio) return false;
    return this.tramosParaMostrar.some(t => t.estado === 'disponible' && t.esInicioPosible);
  }

  confirmarReserva(): void {
    this.mensajeError = null;
    this.mensajeExito = null;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.rol !== 'CLIENTE') {
      this.mensajeError = "Debe estar logueado como cliente para realizar una reserva.";
      return;
    }

    const clienteId = currentUser.id;
    const tramosSeleccionados = this.getTramosSeleccionados();

    if (tramosSeleccionados.length === 0 || !tramosSeleccionados[0]?.id) {
      this.mensajeError = "Por favor, seleccione un tramo horario válido.";
      return;
    }

    const algunoReservado = tramosSeleccionados.some(t => !t.disponible || t.cliente);
    if (algunoReservado) {
      this.mensajeError = "Uno o más tramos seleccionados ya no están disponibles. Recarga y vuelve a intentar.";
      this.intentarCargarTramos();
      return;
    }

    const servicioSeleccionado = this.getServicioSeleccionado();
    if (!servicioSeleccionado || !servicioSeleccionado.id) {
      this.mensajeError = "Servicio no válido seleccionado.";
      return;
    }

    const empleadoIdValue = this.reservaForm.get('empleado')?.value;
    const fechaCitaValue = this.reservaForm.get('fechaCita')?.value;

    if (!empleadoIdValue || !fechaCitaValue) {
      this.mensajeError = "Empleado y fecha deben estar seleccionados.";
      return;
    }

    const idsDeTramosSeleccionados = tramosSeleccionados.map(t => t.id!);

    const reservaDTO: ReservaRequestDTO = {
      primerTramoId: idsDeTramosSeleccionados[0],
      clienteId: clienteId,
      servicioId: servicioSeleccionado.id,
      idsTramos: idsDeTramosSeleccionados,
      tramoId: idsDeTramosSeleccionados[0], // redundante pero por compatibilidad
      empleadoId: empleadoIdValue,
      fecha: fechaCitaValue
    };

    console.log('Confirmando reserva DTO:', reservaDTO);
    this.isConfirmingReserva = true;

    this.tramoService.reservarTramos(reservaDTO).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isConfirmingReserva = false)
    ).subscribe({
      next: (resp: any) => {
        this.mensajeExito = 'Reserva realizada con éxito';
        const tramosReservadosIds = this.getTramosSeleccionados().map(t => t.id!); // Asegurar que id no es undefined

        this.tramosParaMostrar.forEach(t => {
          if (t.id && tramosReservadosIds.includes(t.id)) { // Comprobar que t.id existe
            t.estado = 'reservadoPropio';
            t.esInicioPosible = false;
          }
        });
        this.recalculateEsInicioPosibleForAllTramos();
      },
      error: (err: any) => {
        console.error('Error al confirmar reserva:', err);
        this.mensajeError = err.error?.message || err.message || 'No se pudo realizar la reserva.';
        this.intentarCargarTramos();
      }
    });
  }
}
