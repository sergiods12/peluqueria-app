import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Servicio } from '../models/servicio.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServicioAppService {
  private apiUrl = `${environment.apiUrl}${environment.apiPrefix}/servicios`;

  constructor(private http: HttpClient) { }

  getAllServicios(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(this.apiUrl, { withCredentials: true });
  }
}
