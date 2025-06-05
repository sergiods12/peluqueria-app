// src/app/cliente/cancelar-reserva-cliente/cancelar-reserva-cliente.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // CommonModule para *ngIf, *ngFor, DatePipe
import { RouterModule } from '@angular/router'; // Si usas routerLink
import { Tramo } from '../../shared/models/tramo.model';
import { TramoService } from '../../shared/services/tramo.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';

@Component({
  selector: 'app-cancelar-reserva-cliente',
  standalone: true,
  imports: [CommonModule, RouterModule], // DatePipe está disponible a través de CommonModule
  templateUrl: './cancelar-reserva-cliente.component.html',
  styleUrls: ['./cancelar-reserva-cliente.component.scss'] // O .css, o elimina si no tienes estilos
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
    private datePipe: DatePipe // Inyectar DatePipe para usar en TypeScript si es necesario (opcional aquí)
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser && this.currentUser.id) {
      this.cargarMisReservas();
    } else {
        this.mensajeError = "No se pudo identificar al cliente. Por favor, inicie sesión.";
    }
  }

  cargarMisReservas(): void {
    if (!this.currentUser || !this.currentUser.id) {
      this.mensajeError = "Identificación de cliente no disponible.";
      return;
    }
    this.isLoading = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    this.tramoService.getReservasByClienteId(this.currentUser.id).subscribe({
      next: (tramos) => {
        // El backend ya debería devolver solo las activas y ordenadas.
        // Si necesitas filtrar más (ej. solo futuras), puedes hacerlo aquí.
        const hoy = new Date();
        hoy.setHours(0,0,0,0); // Para comparar solo fechas

        this.misReservas = tramos.filter(tramo => {
            // Convertir fecha del tramo (YYYY-MM-DD string) a objeto Date para comparar
            // Es más seguro comparar strings si el formato es consistente
            const fechaTramo = tramo.fecha; // Ya es string YYYY-MM-DD
            const fechaHoyString = hoy.toISOString().split('T')[0];
            return fechaTramo >= fechaHoyString; // Mostrar reservas de hoy en adelante
        });
        // El backend ya debería ordenarlas, pero por si acaso:
        // .sort((a,b) => new Date(a.fecha + 'T' + a.horaInicio).getTime() - new Date(b.fecha + 'T' + b.horaInicio).getTime());
        
        if (this.misReservas.length === 0) {
            this.mensaje = "No tienes reservas activas en este momento.";
        } else {
            this.mensaje = null;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.mensajeError = 'Error al cargar tus reservas: ' + (err.error?.message || err.message);
        console.error(err);
        this.isLoading = false;
      }
    });
  }
  
  mensaje: string | null = null; // Para mensajes como "No tienes reservas"

  confirmarCancelacion(tramo: Tramo): void {
    if (!tramo.id) {
      this.mensajeError = "No se puede cancelar una reserva sin ID.";
      return;
    }
    // Formatear la fecha para el mensaje de confirmación
    const fechaFormateada = this.datePipe.transform(tramo.fecha, 'dd/MM/yyyy', 'es-ES');
    const confirmacion = confirm(
      `¿Estás seguro de que quieres cancelar tu reserva para el servicio "${tramo.servicio?.nombre || 'desconocido'}" ` +
      `el día ${fechaFormateada} de ${tramo.horaInicio} a ${tramo.horaFin} ` +
      `con ${tramo.empleado?.nombre || 'peluquero desconocido'}?`
    );

    if (confirmacion) {
      this.cancelarReserva(tramo.id);
    }
  }

  cancelarReserva(tramoId: number): void {
    this.isLoading = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    this.tramoService.cancelarReserva(tramoId).subscribe({
      next: (tramoCancelado) => {
        this.mensajeExito = `Reserva para el servicio "${tramoCancelado.servicio?.nombre || ''}" a las ${tramoCancelado.horaInicio} cancelada con éxito.`;
        // Recargar la lista de reservas para reflejar el cambio
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