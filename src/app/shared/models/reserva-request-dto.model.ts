export interface ReservaRequestDTO {
  tramoId: number;
  servicioId: number;
  clienteId: number;
  fecha: string;
  empleadoId: number; // ✅ Añade esta línea
}
