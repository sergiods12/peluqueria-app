// src/app/shared/services/tramo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tramo } from '../models/tramo.model';
import { ReservaRequestDTO } from '../models/reserva-request-dto.model';
import { environment } from '../../../environments/environment'; // This path MUST match your actual structure

@Injectable({
  providedIn: 'root'
})
export class TramoService {
  private apiUrl = `${environment.apiUrl}${environment.apiPrefix}/tramos`;

  constructor(private http: HttpClient) { }

  getTramosDisponibles(fecha: string, empleadoId: number): Observable<Tramo[]> {
    const params = new HttpParams()
      .set('fecha', fecha)
      .set('empleadoId', empleadoId.toString());
    return this.http.get<Tramo[]>(`${this.apiUrl}/disponibles`, { params, withCredentials: true });
  }

  // Used by CancelarReservaClienteComponent
  // Ensure your backend has an endpoint like /api/clientes/{id}/reservas or /api/tramos?clienteId={id}
  // For this example, assuming a /reservas endpoint under the cliente's specific path
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

  findById(id: number): Observable<Tramo> { // Added for completeness if needed
    return this.http.get<Tramo>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }
}