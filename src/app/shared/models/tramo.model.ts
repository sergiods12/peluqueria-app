// src/app/shared/models/tramo.model.ts
import { Empleado } from './empleado.model';
import { Cliente } from './cliente.model';
import { Servicio } from './servicio.model';

export interface Tramo {
  id?: number;
  fecha: string; // Se manejará como string YYYY-MM-DD para compatibilidad con input date y LocalDate
  hueco: string; // Campo definido en el backend
  horaInicio: string; // Se manejará como string HH:MM para LocalTime
  horaFin: string; // Se manejará como string HH:MM para LocalTime
  disponible: boolean;
  empleado?: Empleado; // Representa la relación ManyToOne con Empleado
  cliente?: Cliente;   // Representa la relación ManyToOne con Cliente
  servicio?: Servicio; // Representa la relación ManyToOne con Servicio
}