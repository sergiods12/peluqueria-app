// src/app/cliente/cancelar-reserva-cliente/cancelar-reserva-cliente.component.ts
import { Component, OnInit } from '@angular/core';
import { Tramo } from '../../shared/models/tramo.model';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';

@Component({
  selector: 'app-cancelar-reserva-cliente',
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
        this.mensajeError = "No se pudo identificar al cliente para cargar las reservas.";
    }
  }

  cargarMisReservas(): void {
  if (!this.currentUser || !this.currentUser.id) return;
  this.isLoading = true;
  this.mensajeError = null;
  this.mensajeExito = null;

  // Assuming tramoService.getTramosByCliente(this.currentUser.id) calls GET /api/clientes/{id}/reservas
  // or a new endpoint GET /api/tramos/mis-reservas
  this.tramoService.getTramosByCliente(this.currentUser.id).subscribe({ // Or a new method
    next: (tramos) => {
      const hoy = new Date().toISOString().split('T')[0];
      this.misReservas = tramos.filter(t =>
          // Backend should ideally only return relevant reservations
          t.fecha >= hoy // Filter for future or today's reservations
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
    if (confirm(`¿Estás seguro de que quieres cancelar tu reserva para el servicio "${tramo.servicio?.nombre || 'desconocido'}" el ${tramo.fecha} a las ${tramo.horaInicio}?`)) {
      this.mensajeError = null;
      this.mensajeExito = null;
      this.tramoService.cancelarReserva(tramo.id).subscribe({
        next: () => {
          this.mensajeExito = 'Reserva cancelada con éxito.';
          this.cargarMisReservas(); // Recargar la lista
        },
        error: (err) => {
          this.mensajeError = 'Error al cancelar la reserva: ' + (err.error?.message || err.error || err.message);
          console.error(err);
        }
      });
    }
  }
}