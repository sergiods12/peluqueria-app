export interface Cliente {
  id?: number;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  username: string; // DNI en el backend
  password?: string; // Solo para registro/login
  // tramos?: Tramo[]; // O TramoDTO[] // Si los tramos se incluyen directamente
}