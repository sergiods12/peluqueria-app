// src/app/shared/services/tramo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tramo } from '../models/tramo.model';
import { ReservaRequestDTO } from '../models/reserva-request-dto.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TramoService {
  // Asegúrate de que esta URL base sea correcta para tu backend
  private apiUrl = `${environment.apiUrl}${environment.apiPrefix}/tramos`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene TODOS los tramos para un empleado en una fecha específica.
   * Es crucial que el backend devuelva todos los tramos, incluyendo aquellos
   * donde `tramo.disponible` es `false` (marcados como no disponibles por el empleado)
   * y aquellos que ya tienen un `citaId`.
   * Usado por Empleado/GestionCalendarioComponent.
   */
  getTramosDisponibles(fecha: string, empleadoId: number): Observable<Tramo[]> {
    let params = new HttpParams()
      .set('fecha', fecha)
      .set('empleadoId', empleadoId.toString());

    // Ajustado para usar el endpoint /query/by-employee-date
    // Este endpoint debe devolver TODOS los tramos para el empleado y fecha,
    // incluyendo los marcados como 'disponible: false' por el empleado.
    return this.http.get<Tramo[]>(`${this.apiUrl}/query/by-employee-date`, { params, withCredentials: true });
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
    // console.warn('TramoService: reservarMultiplesTramos is a placeholder. Implement actual backend call.');
    // Ejemplo de implementación (reemplaza con tu llamada HTTP real):
    return this.http.post<Tramo[]>(`${this.apiUrl}/reservar`, reservaRequest, { withCredentials: true });
  }

  /**
   * Permite a un cliente cancelar su propia reserva (tramo).
   * Usado por Cliente/CancelarReservaClienteComponent.
   * Debes implementar la llamada real al backend para esto.
   * Asumiendo que tu backend tiene un endpoint como: PUT /api/tramos/{tramoId}/cancelar-cliente
   * O DELETE si es más apropiado para tu API REST.
   */
  cancelarReserva(tramoId: number): Observable<Tramo> {
    // console.warn(`TramoService: cancelarReserva for tramoId ${tramoId} is a placeholder. Implement actual backend call.`);
    // Ejemplo de implementación (reemplaza con tu llamada HTTP real):
    // Asumo que el backend devuelve el tramo actualizado (ej. con citaId=null, disponible=true)
    return this.http.put<Tramo>(`${this.apiUrl}/${tramoId}/cancelar-cliente`, {}, { withCredentials: true });
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
