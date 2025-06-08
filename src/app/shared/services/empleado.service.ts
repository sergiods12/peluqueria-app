import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Empleado } from '../models/empleado.model';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private apiUrl = 'http://localhost:8901/api/empleados';

  constructor(private http: HttpClient) { }

  getEmpleadosPorPeluqueria(peluqueriaId: number): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.apiUrl}/peluqueria/${peluqueriaId}`, { withCredentials: true });
  }
}
