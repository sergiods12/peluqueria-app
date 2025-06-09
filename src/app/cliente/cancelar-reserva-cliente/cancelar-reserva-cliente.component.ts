// cancelar-reserva-cliente.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Tramo } from '../../shared/models/tramo.model';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

interface ReservaMostrable {
  idPrimerTramo: number;
  citaId: string;
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
  imports: [CommonModule],
  providers: [DatePipe],
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
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.id) {
      this.cargarReservasCliente(this.currentUser.id);
    } else {
      this.mensajeError = "No se pudo identificar al cliente.";
    }
  }

  cargarReservasCliente(clienteId: number): void {
    if (!clienteId) return;
    this.isLoading = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    this.tramoService.getReservasPorCliente(clienteId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (tramos: Tramo[]) => {
        const tramosFiltrados = tramos.filter(t =>
          !t.disponible &&
          t.cliente?.id === clienteId &&
          t.servicio?.id
        );

        this.reservasMostrables = this.procesarTramosParaMostrar(tramosFiltrados);

        if (this.reservasMostrables.length === 0) {
          this.mensajeError = "No tienes reservas activas.";
        }
      },
      error: (err) => {
        this.mensajeError = 'Error al cargar tus reservas.';
        console.error(err);
      }
    });
  }

  private procesarTramosParaMostrar(tramos: Tramo[]): ReservaMostrable[] {
    const agrupadas = new Map<string, Tramo[]>();
    let contadorSinReserva = 1;

    tramos.forEach(tramo => {
      let clave = tramo.reservaId;
      if (!clave) {
        // Si no tiene reservaId, lo agrupamos por una clave temporal
        clave = 'S/' + (tramo.fecha + '_' + tramo.horaInicio + '_' + (contadorSinReserva++));
      }

      if (!agrupadas.has(clave)) agrupadas.set(clave, []);
      agrupadas.get(clave)?.push(tramo);
    });

    const resultado: ReservaMostrable[] = [];
    agrupadas.forEach((grupo, clave) => {
      grupo.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      const primero = grupo[0];
      const ultimo = grupo[grupo.length - 1];

      resultado.push({
        citaId: clave,
        idPrimerTramo: primero.id!,
        nombrePeluqueria: primero.empleado?.peluqueria?.nombre || 'No especificada',
        nombreEmpleado: primero.empleado?.nombre || 'No especificado',
        fecha: primero.fecha,
        horaInicio: primero.horaInicio,
        horaFin: ultimo.horaFin,
        nombreServicio: primero.servicio?.nombre || 'Servicio no especificado',
        precioServicio: primero.servicio?.precio || 0
      });
    });

    return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));
  }

  cancelarReserva(idPrimerTramo: number): void {
    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) return;

    this.isLoading = true;
    this.mensajeExito = null;
    this.mensajeError = null;

    this.tramoService.cancelarReserva(idPrimerTramo).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        this.mensajeExito = 'Reserva cancelada con éxito.';
        if (this.currentUser?.id) this.cargarReservasCliente(this.currentUser.id);
      },
      error: (err) => {
        this.mensajeError = 'Error al cancelar la reserva: ' + (err.error?.message || err.message);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
