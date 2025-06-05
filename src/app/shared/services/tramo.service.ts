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
  private apiUrl = `${environment.apiUrl}${environment.apiPrefix}/tramos`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene TODOS los tramos para un empleado en una fecha específica.
   * Es crucial que el backend devuelva todos los tramos, incluyendo aquellos
   * donde `tramo.disponible` es `false` (marcados como no disponibles por el empleado)
   * y aquellos que ya tienen un `citaId`.
   * El frontend (ReservarCitaComponent) se encargará de la lógica de visualización.
   */
  getTramosDisponibles(fecha: string, empleadoId: number): Observable<Tramo[]> {
    let params = new HttpParams()
      .set('fecha', fecha)
      .set('empleadoId', empleadoId.toString());

    // Ajustado para usar el endpoint /query/by-employee-date
    // Este endpoint debe devolver TODOS los tramos para el empleado y fecha,
    // incluyendo los marcados como 'disponible: false' por el empleado.
    // los tramos para un empleado y fecha.
    return this.http.get<Tramo[]>(`${this.apiUrl}/query/by-employee-date`, { params, withCredentials: true });
  }

  getTramosByCliente(clienteId: number): Observable<Tramo[]> {
    return this.http.get<Tramo[]>(`${environment.apiUrl}${environment.apiPrefix}/clientes/${clienteId}/reservas`, { withCredentials: true });
  }

  reservarMultiplesTramos(reservaRequest: ReservaRequestDTO): Observable<Tramo[]> {
    return this.http.post<Tramo[]>(`${this.apiUrl}/reservar`, reservaRequest, { withCredentials: true });
  }

  cancelarReserva(tramoId: number): Observable<Tramo> {
    return this.http.put<Tramo>(`${this.apiUrl}/${tramoId}/cancelar`, {}, { withCredentials: true });
  }

  saveTramo(tramo: Tramo): Observable<Tramo> {
    return this.http.post<Tramo>(this.apiUrl, tramo, { withCredentials: true });
  }

  updateTramo(tramoId: number, tramo: Tramo): Observable<Tramo> {
    return this.http.put<Tramo>(`${this.apiUrl}/${tramoId}`, tramo, { withCredentials: true });
  }

  findById(id: number): Observable<Tramo> {
    return this.http.get<Tramo>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }
}
