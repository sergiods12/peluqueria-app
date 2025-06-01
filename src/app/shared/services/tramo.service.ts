 import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tramo } from '../models/tramo.model';
import { ReservaRequestDTO } from '../models/reservar-cita.component'; // Ensure this model exists
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TramoService {
  private apiUrl = `<span class="math-inline">\{environment\.apiUrl\}</span>{environment.apiPrefix}/tramos`;

  constructor(private http: HttpClient) { }

  getTramosDisponibles(fecha: string, empleadoId: number): Observable<Tramo[]> {
    const params = new HttpParams()
      .set('fecha', fecha)
      .set('empleadoId', empleadoId.toString());
    return this.http.get<Tramo[]>(`${this.apiUrl}/disponibles`, { params });
  }

  // For CancelarReservaClienteComponent - ideally a dedicated backend endpoint
  // GET /api/tramos/cliente/{clienteId} or GET /api/clientes/me/reservas
  // This is a placeholder if you keep client-side filtering:
  getTramosByCliente(clienteId: number): Observable<Tramo[]> {
    // This would be better as a dedicated backend endpoint.
    // As a fallback, if your backend allows fetching all tramos (not recommended for performance):
    // return this.http.get<Tramo[]>(`<span class="math-inline">\{this\.apiUrl\}/cliente/</span>{clienteId}`); // if such an endpoint exists
    // For now, assuming the component will filter or a more specific endpoint needs to be created in backend.
    // The existing `getTramosParaClienteSimulado` in `cancelar-reserva-cliente.component.ts` would use this.
    // Let's assume a new backend endpoint like /api/clientes/{clienteId}/reservas
    return this.http.get<Tramo[]>(`<span class="math-inline">\{environment\.apiUrl\}</span>{environment.apiPrefix}/clientes/${clienteId}/reservas`);
  }


  reservarMultiplesTramos(reservaRequest: ReservaRequestDTO): Observable<Tramo[]> {
    return this.http.post<Tramo[]>(`${this.apiUrl}/reservar`, reservaRequest);
  }

  cancelarReserva(tramoId: number): Observable<Tramo> {
    return this.http.put<Tramo>(`<span class="math-inline">\{this\.apiUrl\}/</span>{tramoId}/cancelar`, {});
  }

  saveTramo(tramo: Tramo): Observable<Tramo> {
    return this.http.post<Tramo>(this.apiUrl, tramo);
  }

  updateTramo(tramoId: number, tramo: Tramo): Observable<Tramo> {
    return this.http.put<Tramo>(`<span class="math-inline">\{this\.apiUrl\}/</span>{tramoId}`, tramo);
  }
}
