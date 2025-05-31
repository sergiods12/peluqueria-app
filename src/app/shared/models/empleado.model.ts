import { Peluqueria } from './peluqueria.model';
import { Tramo } from './tramo.model';

export interface Empleado {
  id?: number;
  nombre: string;
  isAdmin: boolean; // True for admin, false for peluquero
  rol: string; // Mujer, Hombre, Ambos
  horarioDisponible?: string;
  telefono?: string;
  email: string;
  password?: string; // Para el registro y login del empleado
  dni: string;
  direccion?: string;
  peluqueria?: Peluqueria; // Representa la relación ManyToOne
  tramos?: Tramo[];
}