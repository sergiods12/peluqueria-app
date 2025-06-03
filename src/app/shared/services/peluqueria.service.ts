import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Peluqueria } from '../models/peluqueria.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PeluqueriaService {
  private apiUrl = `${environment.apiUrl}${environment.apiPrefix}/peluquerias`;

  constructor(private http: HttpClient) { }

  getAllPeluquerias(): Observable<Peluqueria[]> {
    return this.http.get<Peluqueria[]>(this.apiUrl);
  }

  createPeluqueria(peluqueria: Peluqueria): Observable<Peluqueria> {
    return this.http.post<Peluqueria>(this.apiUrl, peluqueria);
  }
}