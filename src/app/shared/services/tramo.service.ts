// src/app/shared/services/tramo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tramo } from '../models/tramo.model'; // Asume que tienes este modelo en Angular
import { ReservaRequestDTO } from '../models/reserva-request-dto.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TramoService {
  private apiUrl = `${environment.apiUrl}${environment.apiPrefix}`; // Ruta base API

  constructor(private http: HttpClient) { }

getTramosDisponibles(fecha: string, empleadoId: number): Observable<Tramo[]> {
    const params = new HttpParams()
      .set('fecha', fecha)
      .set('empleadoId', empleadoId.toString());
    return this.http.get<Tramo[]>(`${this.apiUrl}/tramos/query/by-employee-date`, { params, withCredentials: true });
  }

  // Método para obtener las reservas de un cliente específico
  getReservasByClienteId(clienteId: number): Observable<Tramo[]> {
    return this.http.get<Tramo[]>(`${this.apiUrl}/clientes/${clienteId}/reservas`, { withCredentials: true });
  }
  /**
   * Obtiene los tramos reservados por un cliente específico.
   * Usado por Cliente/CancelarReservaClienteComponent.
   * Debes implementar la llamada real al backend para esto.
   * Asumiendo que tu backend tiene un endpoint como: GET /api/clientes/{clienteId}/reservas
   */
  getTramosByCliente(clienteId: number): Observable<Tramo[]> {
    // console.warn(`TramoService: getTramosByCliente for clienteId ${clienteId} is a placeholder. Implement actual backend call.`);
    // Ejemplo de implementación (reemplaza con tu llamada HTTP real):
    return this.http.get<Tramo[]>(`${environment.apiUrl}${environment.apiPrefix}/clientes/${clienteId}/reservas`, { withCredentials: true });
  }

  /**
   * Realiza la reserva de múltiples tramos para un cliente y servicio.
   * Usado por Cliente/ReservarCitaComponent.
   * Debes implementar la llamada real al backend para esto.
   * Asumiendo que tu backend tiene un endpoint como: POST /api/tramos/reservar
   */
  reservarMultiplesTramos(reservaRequest: ReservaRequestDTO): Observable<Tramo[]> {
    return this.http.post<Tramo[]>(`${this.apiUrl}/tramos/reservar`, reservaRequest, { withCredentials: true });
  }

  /**
   * Permite a un cliente cancelar su propia reserva (tramo).
   * Usado por Cliente/CancelarReservaClienteComponent.
   * Debes implementar la llamada real al backend para esto.
   * Asumiendo que tu backend tiene un endpoint como: PUT /api/tramos/{tramoId}/cancelar-cliente
   * O DELETE si es más apropiado para tu API REST.
   */
 // Método para cancelar una reserva (un tramo o un grupo de tramos)
  cancelarReserva(tramoId: number): Observable<Tramo> { // El backend devuelve el tramo (o el principal del grupo) cancelado
    return this.http.put<Tramo>(`${this.apiUrl}/tramos/${tramoId}/cancelar`, {}, { withCredentials: true });
  }

  /**
   * Guarda un nuevo tramo en el backend.
   * Usado por Empleado/GestionCalendarioComponent (cuando el estado es 'noDefinido').
   * Debes implementar la llamada real al backend para esto.
   * Asumiendo que tu backend tiene un endpoint como: POST /api/tramos
   */
  saveTramo(tramo: Tramo): Observable<Tramo> {
      // console.warn('TramoService: saveTramo is a placeholder. Implement actual backend call.');
      // Ejemplo de implementación (reemplaza con tu llamada HTTP real):
      return this.http.post<Tramo>(this.apiUrl, tramo, { withCredentials: true });
  }

  /**
   * Actualiza un tramo existente en el backend.
   * Usado por Empleado/GestionCalendarioComponent (para toggles de disponibilidad).
   * Debes implementar la llamada real al backend para esto.
   * Asumiendo que tu backend tiene un endpoint como: PUT /api/tramos/{tramoId}
   */
  updateTramo(tramoId: number, tramo: Tramo): Observable<Tramo> {
    // console.warn(`TramoService: updateTramo for ID ${tramoId} is a placeholder. Implement actual backend call.`);
    // Ejemplo de implementación (reemplaza con tu llamada HTTP real):
    return this.http.put<Tramo>(`${this.apiUrl}/${tramoId}`, tramo, { withCredentials: true });
  }

  /**
   * Busca un tramo por su ID.
   * Puede ser útil, aunque no se usa directamente en los componentes proporcionados.
   */
  findById(id: number): Observable<Tramo> {
    return this.http.get<Tramo>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  // Puedes añadir otros métodos relacionados con tramos aquí
}
