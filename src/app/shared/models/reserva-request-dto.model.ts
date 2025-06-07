export interface ReservaRequestDTO {
  tramoId: number;
  servicioId: number;
  clienteId: number;
  fecha: string;
  empleadoId: number; 
  idsTramos: number[];
  primerTramoId: number;

}
