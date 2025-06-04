import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Empleado } from '../models/empleado.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private apiUrl = `${environment.apiUrl}${environment.apiPrefix}/empleados`;

  constructor(private http: HttpClient) { }

  getEmpleadosByPeluqueria(peluqueriaId: number): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${environment.apiUrl}${environment.apiPrefix}/peluquerias/${peluqueriaId}/empleados`);
  }

  // Other methods if needed by RegisterEmpleado or other components
  getEmpleadoById(id: number): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.apiUrl}/${id}`);
  }
}
