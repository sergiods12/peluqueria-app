// src/app/shared/models/servicio.model.ts
import { Tramo } from './tramo.model';

export interface Servicio {
  id?: number;
  nombre: string;
  precio: number;
  numTramos: number; // Importante para la lógica de reserva, indica cuántos tramos de 30min ocupa
  descripcion?: string;
  tramos?: Tramo[]; // Representa la relación OneToMany
}