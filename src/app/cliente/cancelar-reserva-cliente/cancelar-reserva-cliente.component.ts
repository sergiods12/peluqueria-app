import { Component, OnInit, OnDestroy } from '@angular/core'; // Import OnDestroy
import { CommonModule, DatePipe } from '@angular/common'; // DatePipe for formatting
import { Tramo } from '../../shared/models/tramo.model';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

interface ReservaMostrable {
  idPrimerTramo: number; // ID del primer tramo de la cita, útil para la cancelación
  citaId: number; // El ID de la cita que agrupa los tramos
  nombrePeluqueria: string;
  nombreEmpleado: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  nombreServicio: string;
  precioServicio: number;
}

@Component({
  selector: 'app-cancelar-reserva-cliente',
  standalone: true,
  imports: [CommonModule], // CommonModule provides *ngIf, *ngFor, DatePipe
  templateUrl: './cancelar-reserva-cliente.component.html',
  styleUrl: './cancelar-reserva-cliente.component.scss'
})
export class CancelarReservaClienteComponent implements OnInit, OnDestroy {
  reservasMostrables: ReservaMostrable[] = [];
  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  isLoading = false;
  currentUser: AuthUser | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private tramoService: TramoService,
    private authService: AuthService,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.id) {
      this.cargarReservasCliente(this.currentUser.id);
    } else {
      this.mensajeError = "No se pudo identificar al cliente.";
    }
  }

  cargarReservasCliente(clienteId: number): void {
    if (!this.currentUser?.id) return;
    this.isLoading = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    this.tramoService.getTramosByCliente(clienteId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (tramos: Tramo[]) => {
        const hoy = new Date().toISOString().split('T')[0];
        const tramosFiltrados = tramos.filter(t =>
          t.citaId && // Debe tener citaId para ser parte de una reserva agrupada
          t.fecha >= hoy &&
          !t.disponible && // No disponible significa que está reservado
          t.cliente?.id === clienteId
        );
        this.reservasMostrables = this.procesarTramosParaMostrar(tramosFiltrados);
        if (this.reservasMostrables.length === 0 && !this.mensajeError) {
          this.mensajeError = "No tienes reservas futuras activas.";
        }
      },
      error: (err) => {
        this.mensajeError = 'Error al cargar tus reservas.';
        console.error(err);
      }
    });
  }

  private procesarTramosParaMostrar(tramosDeReservasActivas: Tramo[]): ReservaMostrable[] {
    if (!tramosDeReservasActivas || tramosDeReservasActivas.length === 0) return [];

    const citasMap = new Map<number, Tramo[]>();
    tramosDeReservasActivas.forEach(tramo => {
      const citaTramos = citasMap.get(tramo.citaId!) || [];
      citaTramos.push(tramo);
      citasMap.set(tramo.citaId!, citaTramos);
    });

    const resultado: ReservaMostrable[] = [];
    citasMap.forEach((tramosDeCita, citaId) => {
      if (tramosDeCita.length > 0) {
        tramosDeCita.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)); // Ordenar por hora
        const primerTramo = tramosDeCita[0];
        const ultimoTramo = tramosDeCita[tramosDeCita.length - 1];

        resultado.push({
          citaId: citaId,
          idPrimerTramo: primerTramo.id!,
          nombrePeluqueria: primerTramo.empleado?.peluqueria?.nombre || 'No especificada',
          nombreEmpleado: primerTramo.empleado?.nombre || 'No especificado',
          fecha: primerTramo.fecha,
          horaInicio: primerTramo.horaInicio,
          horaFin: ultimoTramo.horaFin,
          nombreServicio: primerTramo.servicio?.nombre || 'Servicio no especificado',
          precioServicio: primerTramo.servicio?.precio || 0,
        });
      }
    });
     // Ordenar las reservas finales por fecha y hora de inicio
     resultado.sort((a,b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha);
      if (dateComparison !== 0) {
          return dateComparison;
      }
      return a.horaInicio.localeCompare(b.horaInicio);
    });
    return resultado;
  }

  cancelarReserva(idPrimerTramoDeLaCita: number): void {
    const reservaACancelar = this.reservasMostrables.find(r => r.idPrimerTramo === idPrimerTramoDeLaCita);
    let confirmMessage = "¿Estás seguro de que quieres cancelar esta reserva?";
    if (reservaACancelar) {
        const fechaFormateada = this.datePipe.transform(reservaACancelar.fecha, 'dd/MM/yyyy', 'es-ES');
        confirmMessage = `¿Estás seguro de cancelar tu reserva para "${reservaACancelar.nombreServicio}" el ${fechaFormateada} a las ${reservaACancelar.horaInicio}?`;
    }

    if (confirm(confirmMessage)) {
      this.isLoading = true;
      this.mensajeError = null;
      this.mensajeExito = null;
      this.tramoService.cancelarReserva(idPrimerTramoDeLaCita).pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: () => {
          this.mensajeExito = 'Reserva cancelada con éxito.';
          if (this.currentUser?.id) {
            this.cargarReservasCliente(this.currentUser.id);
          }
        },
        error: (err) => {
          this.mensajeError = 'Error al cancelar la reserva: ' + (err.error?.message || err.message);
          console.error(err);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}