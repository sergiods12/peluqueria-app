// src/app/cliente/cancelar-reserva-cliente/cancelar-reserva-cliente.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // DatePipe for formatting
import { Tramo } from '../../shared/models/tramo.model';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service'; // Asegúrate que AuthUser esté exportado

@Component({
  selector: 'app-cancelar-reserva-cliente',
  standalone: true,
  imports: [CommonModule], // CommonModule provides *ngIf, *ngFor, DatePipe
  providers: [DatePipe], // <--- Añadir DatePipe a los providers
  templateUrl: './cancelar-reserva-cliente.component.html',
  // styleUrls: ['./cancelar-reserva-cliente.component.css'] // Descomenta si tienes este archivo
})
export class CancelarReservaClienteComponent implements OnInit {
  misReservas: Tramo[] = [];
  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  isLoading = false;
  currentUser: AuthUser | null = null;

  constructor(
    private tramoService: TramoService,
    private authService: AuthService,
    private datePipe: DatePipe // Inject if you need to use it in TS code
  ) { }

  ngOnInit(): void {
    // Usar getCurrentUser() si tu AuthService lo proporciona de forma síncrona
    // Si es un Observable, deberías suscribirte como en versiones anteriores
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.id) {
      this.cargarMisReservas();
    } else {
      this.mensajeError = "No se pudo identificar al cliente. Por favor, inicie sesión.";
    }
  }

  cargarMisReservas(): void {
    if (!this.currentUser?.id) return;
    this.isLoading = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    this.tramoService.getTramosByCliente(this.currentUser.id).subscribe({
      next: (tramos) => {
        const hoy = new Date().toISOString().split('T')[0];
        // Filtrar por fecha futura o igual a hoy, que tenga citaId, y que el cliente de la cita coincida con el usuario actual
        this.misReservas = tramos
          .filter(t => t.fecha >= hoy && t.citaId && t.cliente?.id === this.currentUser?.id)
          .sort((a,b) => new Date(a.fecha + 'T' + a.horaInicio).getTime() - new Date(b.fecha + 'T' + b.horaInicio).getTime()); // Ordenar por fecha y hora de inicio
        this.isLoading = false;
        // No establecer mensaje si la lista está vacía aquí, el HTML lo maneja
      },
      error: (err) => {
        this.mensajeError = 'Error al cargar tus reservas.';
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  cancelarReserva(tramo: Tramo): void {
    if (!tramo.id) {
      this.mensajeError = 'Error: No se puede cancelar una reserva sin ID.';
      return;
    }
    // Usar la instancia de DatePipe para formatear la fecha
    const fechaFormateada = this.datePipe.transform(tramo.fecha, 'dd/MM/yyyy', 'es-ES');
    if (confirm(`¿Estás seguro de cancelar tu reserva para "${tramo.servicio?.nombre || 'el servicio'}" el ${fechaFormateada} a las ${tramo.horaInicio}?`)) {
      this.isLoading = true;
      this.mensajeError = null;
      this.mensajeExito = null;
      this.tramoService.cancelarReserva(tramo.id).subscribe({
        next: () => {
          this.mensajeExito = 'Reserva cancelada con éxito.';
          // Recargar la lista de reservas después de una cancelación exitosa
          this.cargarMisReservas();
          this.isLoading = false;
        },
        error: (err) => {
          this.mensajeError = 'Error al cancelar la reserva: ' + (err.error?.message || err.message);
          console.error(err);
          this.isLoading = false;
        }
      });
    }
  }
}
