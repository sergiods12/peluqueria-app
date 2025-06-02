import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Empleado } from '../models/empleado.model';
import { environment } from '../../../enviroments/enviroment';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private apiUrl = `<span class="math-inline">\{environment\.apiUrl\}</span>{environment.apiPrefix}/empleados`;

  constructor(private http: HttpClient) { }

  getEmpleadosByPeluqueria(peluqueriaId: number): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`<span class="math-inline">\{environment\.apiUrl\}</span>{environment.apiPrefix}/peluquerias/${peluqueriaId}/empleados`); // Assuming this endpoint
  }

  // Other methods if needed by RegisterEmpleado or other components
  getEmpleadoById(id: number): Observable<Empleado> {
    return this.http.get<Empleado>(`<span class="math-inline">\{this\.apiUrl\}/</span>{id}`);
  }
}