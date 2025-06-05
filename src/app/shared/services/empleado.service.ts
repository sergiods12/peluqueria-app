// En tu empleado.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Empleado } from '../models/empleado.model'; // Ajusta la ruta

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private apiUrl = 'http://localhost:8901/api/empleados'; // O tu URL base de API

  constructor(private http: HttpClient) { }

  // ... otros métodos ...

  getEmpleadosPorPeluqueria(peluqueriaId: number): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.apiUrl}/peluqueria/${peluqueriaId}`);
    // La URL exacta '/peluqueria/${peluqueriaId}' dependerá de cómo tengas configurado tu backend.
  }
}
