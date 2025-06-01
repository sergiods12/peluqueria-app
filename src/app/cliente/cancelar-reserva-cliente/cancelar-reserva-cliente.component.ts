// src/app/cliente/cancelar-reserva-cliente/cancelar-reserva-cliente.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Import CommonModule
import { Tramo } from '../../shared/models/tramo.model';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';

@Component({
  selector: 'app-cancelar-reserva-cliente',
  standalone: true,
  imports: [CommonModule], // CommonModule for *ngIf, *ngFor, date pipe
  templateUrl: './cancelar-reserva-cliente.component.html',
  // styleUrls: ['./cancelar-reserva-cliente.component.css']
})
export class CancelarReservaClienteComponent implements OnInit {
  misReservas: Tramo[] = [];
  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  isLoading = false;
  currentUser: AuthUser | null = null;

  constructor(
    private tramoService: TramoService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser && this.currentUser.id) {
      this.cargarMisReservas();
    } else {
        this.mensajeError = "No se pudo identificar al cliente.";
    }
  }

  cargarMisReservas(): void {
    if (!this.currentUser || !this.currentUser.id) return;
    this.isLoading = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    this.tramoService.getTramosByCliente(this.currentUser.id).subscribe({
      next: (tramos) => {
        const hoy = new Date().toISOString().split('T')[0];
        this.misReservas = tramos.filter(t =>
            t.fecha >= hoy // Assuming backend returns only this client's non-cancelled future/today reservations
        ).sort((a,b) => new Date(a.fecha + 'T' + a.horaInicio).getTime() - new Date(b.fecha + 'T' + b.horaInicio).getTime());
        this.isLoading = false;
      },
      error: (err) => {
        this.mensajeError = 'Error al cargar tus reservas.';
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  cancelarReserva(tramo: Tramo): void {
    if (!tramo.id) return;
    if (confirm(`¿Estás seguro de cancelar tu reserva para "${tramo.servicio?.nombre || 'el servicio'}" el ${new DatePipe('en-US').transform(tramo.fecha, 'dd/MM/yyyy')} a las ${tramo.horaInicio}?`)) {
      this.mensajeError = null;
      this.mensajeExito = null;
      this.isLoading = true; // Indicate loading during cancellation
      this.tramoService.cancelarReserva(tramo.id).subscribe({
        next: () => {
          this.mensajeExito = 'Reserva cancelada con éxito.';
          this.cargarMisReservas(); // Recargar la lista
          this.isLoading = false;
        },
        error: (err) => {
          this.mensajeError = 'Error al cancelar la reserva: ' + (err.error?.message || err.error || err.message);
          console.error(err);
          this.isLoading = false;
        }
      });
    }
  }
}