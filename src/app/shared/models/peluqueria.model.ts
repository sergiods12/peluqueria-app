import { Empleado } from './empleado.model';

export interface Peluqueria {
  id?: number;
  nombre: string;
  direccion: string;
  telefono: string;
  empleados?: Empleado[]; // Representa la relación OneToMany
}