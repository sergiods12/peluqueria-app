import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Tramo } from '../../shared/models/tramo.model';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

interface ReservaMostrable {
  idPrimerTramo: number;
  citaId: number;
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
    console.log('Cliente logueado:', this.currentUser);
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

    this.tramoService.getTramosByCliente(clienteId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (tramos: Tramo[]) => {
        console.log('Tramos recibidos del backend:', tramos);

        // ⚠️ Filtro más laxo para debug temporal
        const tramosFiltrados = tramos.filter(t =>
          t.cliente?.id === clienteId
        );

        // ✅ Si todo funciona, puedes volver a este filtro más estricto:
        /*
        const hoy = new Date().toISOString().split('T')[0];
        const tramosFiltrados = tramos.filter(t =>
          t.citaId &&
          t.fecha >= hoy &&
          !t.disponible &&
          t.cliente?.id === clienteId
        );
        */

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

  private procesarTramosParaMostrar(tramos: Tramo[]): ReservaMostrable[] {
    const citasMap = new Map<number, Tramo[]>();
    tramos.forEach(tramo => {
      const grupo = citasMap.get(tramo.citaId!) || [];
      grupo.push(tramo);
      citasMap.set(tramo.citaId!, grupo);
    });

    const resultado: ReservaMostrable[] = [];
    citasMap.forEach((tramosDeCita, citaId) => {
      if (tramosDeCita.length > 0) {
        tramosDeCita.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
        const primerTramo = tramosDeCita[0];
        const ultimoTramo = tramosDeCita[tramosDeCita.length - 1];
        resultado.push({
          citaId,
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

    resultado.sort((a, b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha);
      return dateComparison !== 0 ? dateComparison : a.horaInicio.localeCompare(b.horaInicio);
    });

    return resultado;
  }

  cancelarReserva(idPrimerTramo: number): void {
    const reserva = this.reservasMostrables.find(r => r.idPrimerTramo === idPrimerTramo);
    let confirmMsg = "¿Estás seguro de que quieres cancelar esta reserva?";
    if (reserva) {
      const fecha = this.datePipe.transform(reserva.fecha, 'dd/MM/yyyy', 'es-ES');
      confirmMsg = `¿Estás seguro de cancelar tu reserva para "${reserva.nombreServicio}" el ${fecha} a las ${reserva.horaInicio}?`;
    }

    if (confirm(confirmMsg)) {
      this.isLoading = true;
      this.mensajeError = null;
      this.mensajeExito = null;

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
