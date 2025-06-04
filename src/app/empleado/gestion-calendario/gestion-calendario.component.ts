// c:\Users\Sergi\peluqueria-app\src\app\empleado\gestion-calendario\gestion-calendario.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Importa DatePipe aquí
import { FormsModule } from '@angular/forms';
import { TramoService } from '../../shared/services/tramo.service';
import { EmpleadoService } from '../../shared/services/empleado.service'; // Necesario para cargar empleados para admin
import { PeluqueriaService } from '../../shared/services/peluqueria.service'; // Puede ser necesario para obtener la peluquería del admin
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { Tramo } from '../../shared/models/tramo.model';
import { Empleado } from '../../shared/models/empleado.model';
import { Peluqueria } from '../../shared/models/peluqueria.model';
import { forkJoin, of } from 'rxjs'; // Importa forkJoin y of
import { catchError, switchMap } from 'rxjs/operators'; // Importa operadores

@Component({
  selector: 'app-gestion-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-calendario.component.html',
  styleUrls: ['./gestion-calendario.component.scss'], // o .css
  providers: [DatePipe] // Provee DatePipe
})
export class GestionCalendarioComponent implements OnInit {
  fechaSeleccionada: string = '';
  selectedEmpleadoId: number | null = null;
  empleados: Empleado[] = [];
  tramos: Tramo[] = [];
  currentUser: AuthUser | null = null;
  mensaje: string | null = null;
  isLoading: boolean = false;
  minDate: string = '';

  constructor(
    private tramoService: TramoService,
    private empleadoService: EmpleadoService, // Inyecta EmpleadoService
    private peluqueriaService: PeluqueriaService, // Inyecta PeluqueriaService
    private authService: AuthService,
    private datePipe: DatePipe
  ) {
    const today = new Date();
    this.fechaSeleccionada = this.datePipe.transform(today, 'yyyy-MM-dd') || '';
    this.minDate = this.fechaSeleccionada; // Inicializa minDate a hoy
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser || (!this.authService.hasRole('EMPLEADO') && !this.authService.hasRole('ADMIN'))) {
      console.warn("GestionCalendarioComponent: Usuario no logueado o sin rol EMPLEADO/ADMIN. Redirigiendo...");
      this.authService.logout().subscribe(); // Redirigir al login
      return; // Salir de ngOnInit
    }

    // Lógica para cargar empleados y tramos iniciales
    if (this.authService.isAdmin()) {
      console.log("GestionCalendarioComponent: Usuario es ADMIN.");
      // *** TODO: Implementar carga REAL de empleados para ADMIN ***
      // Deberías llamar a un servicio para obtener los empleados de la peluquería del admin.
      // Ejemplo simulado (reemplazar con llamada a empleadoService):
      this.empleados = [
        // Asegúrate de que estos empleados tengan un ID válido en tu base de datos
        { id: 1, nombre: 'Empleado A (Simulado)', email: 'a@test.com', dni: '11111111A', rol: 'Peluquero General', peluqueria: { id: 1, nombre: 'Pelu 1' } as Peluqueria, isAdmin: false, horarioDisponible: '' },
        { id: 5, nombre: 'Empleado B (Simulado)', email: 'b@test.com', dni: '22222222B', rol: 'Barbero', peluqueria: { id: 1, nombre: 'Pelu 1' } as Peluqueria, isAdmin: false, horarioDisponible: '' },
        // Si quieres que el propio admin aparezca en la lista para ver su calendario:
        // { id: this.currentUser.id, nombre: this.currentUser.nombre, email: this.currentUser.email, dni: (this.currentUser as any).dni || 'ADMIN_DNI_PLACEHOLDER', rol: this.currentUser.rol, peluqueria: { id: (this.currentUser as any).peluqueriaId || 1, nombre: 'Pelu 1' } as Peluqueria, isAdmin: true, horarioDisponible: '' },
      ];
      // Para el admin, selectedEmpleadoId es inicialmente null. Debe seleccionar un empleado.
      this.selectedEmpleadoId = null;

      // *** Ejemplo de cómo cargar empleados REALES para el admin (requiere endpoint en backend) ***
      // Asumiendo que el AuthUser tiene peluqueriaId
      // if ((this.currentUser as any).peluqueriaId) {
      //   this.empleadoService.getEmpleadosByPeluqueriaId((this.currentUser as any).peluqueriaId).subscribe({
      //     next: (empleados) => {
      //       this.empleados = empleados;
      //       console.log("Empleados cargados para admin:", empleados);
      //       // Opcional: seleccionar el primer empleado por defecto o el propio admin si está en la lista
      //       // if (this.empleados.length > 0) {
      //       //   this.selectedEmpleadoId = this.empleados[0].id || null;
      //       //   this.loadTramos(); // Cargar tramos para el primer empleado
      //       // }
      //     },
      //     error: (err) => {
      //       console.error("Error al cargar empleados para admin:", err);
      //       this.mensaje = "Error al cargar la lista de empleados.";
      //     }
      //   });
      // } else {
      //    console.error("Usuario admin sin peluqueriaId.");
      //    this.mensaje = "No se pudo determinar la peluquería del administrador.";
      // }

    } else if (this.authService.hasRole('EMPLEADO')) {
      console.log("GestionCalendarioComponent: Usuario es EMPLEADO.");
      // Para el empleado normal, solo se ve a sí mismo
      if (this.currentUser.id) {
        this.selectedEmpleadoId = this.currentUser.id;
        // Necesitas el DNI y peluqueriaId del currentUser si no están en AuthUser
        const currentUserDni = (this.currentUser as any).dni || 'EMPLEADO_DNI_PLACEHOLDER';
        const currentUserPeluqueriaId = (this.currentUser as any).peluqueriaId || 1; // Asumir o cargar
        this.empleados = [
          {
            id: this.currentUser.id,
            nombre: this.currentUser.nombre,
            email: this.currentUser.email,
            dni: currentUserDni,
            rol: this.currentUser.rol,
            peluqueria: { id: currentUserPeluqueriaId, nombre: 'Peluqueria' } as Peluqueria, // Placeholder o cargar
            isAdmin: false,
            horarioDisponible: ''
          },
        ];
        // Cargar tramos automáticamente para el empleado logueado
        this.loadTramos();
      } else {
        console.error("Usuario empleado sin ID.");
        this.mensaje = "No se pudo obtener la información del empleado logueado.";
      }
    }
  }

  onDateChange(event: any): void {
    this.fechaSeleccionada = event.target.value;
    // Solo cargar tramos si hay un empleado seleccionado (siempre para empleado normal, después de selección para admin)
    if (this.selectedEmpleadoId !== null && this.fechaSeleccionada) {
      this.loadTramos();
    } else {
       console.log('onDateChange: No se cargan tramos, falta empleado o fecha.');
       // Limpiar tramos si se cambia la fecha sin empleado seleccionado (caso admin antes de seleccionar)
       this.tramos = [];
       this.mensaje = "Selecciona un empleado y una fecha para ver los tramos.";
    }
  }

  onEmpleadoChange(event: any): void {
    const empleadoId = parseInt(event.target.value, 10);
    console.log('onEmpleadoChange: event.target.value:', event.target.value);
    if (!isNaN(empleadoId)) {
        this.selectedEmpleadoId = empleadoId;
        console.log('onEmpleadoChange: selectedEmpleadoId establecido a:', this.selectedEmpleadoId);
        // Cargar tramos solo si hay fecha seleccionada
        if (this.fechaSeleccionada) {
          this.loadTramos();
        } else {
           console.log('onEmpleadoChange: No se cargan tramos, falta fecha.');
           // Limpiar tramos si se selecciona empleado sin fecha seleccionada
           this.tramos = [];
           this.mensaje = "Selecciona una fecha para ver los tramos del empleado.";
        }
    } else {
        console.log('onEmpleadoChange: Empleado no válido seleccionado (NaN). Limpiando selección y tramos.');
        // Si se selecciona la opción "Selecciona un empleado" (valor vacío o inválido)
        this.selectedEmpleadoId = null;
        this.tramos = [];
        this.mensaje = "Selecciona un empleado y una fecha para ver los tramos.";
    }
    // Asegúrate de que Angular detecte el cambio si la lista de empleados es la misma
    // pero el contenido de los tramos debe cambiar. A veces es necesario this.cdr.detectChanges() si usas OnPush.
  }

  // Este método parece redundante si onEmpleadoChange y onDateChange llaman a loadTramos
  // Si tu plantilla lo llama, asegúrate de que selectedEmpleadoId y fechaSeleccionada estén definidos
  cargarTramosParaEmpleado(): void {
     if (this.selectedEmpleadoId !== null && this.fechaSeleccionada) {
        this.loadTramos();
     } else {
        console.warn("No se puede cargar tramos: Empleado o fecha no seleccionados.");
        this.tramos = [];
        this.mensaje = "Selecciona un empleado y una fecha para ver los tramos.";
     }
  }


  loadTramos(): void {
    // Verificar que tenemos empleado y fecha antes de llamar al servicio
    if (this.fechaSeleccionada && this.selectedEmpleadoId !== null) {
      this.mensaje = null; // Limpiar mensajes anteriores
      this.isLoading = true;
      console.log(`GestionCalendarioComponent: Cargando tramos para fecha ${this.fechaSeleccionada} y empleado ${this.selectedEmpleadoId}`);

      // La llamada al servicio sigue siendo la misma, ya que queremos ver los tramos
      // disponibles para el empleado seleccionado en esa fecha.
      this.tramoService.getTramosDisponibles(this.fechaSeleccionada, this.selectedEmpleadoId).subscribe({
        next: (data) => {
          console.log("GestionCalendarioComponent: Tramos recibidos:", data);
          this.tramos = data;
          this.isLoading = false;
          if (data.length === 0) {
            this.mensaje = `No hay tramos disponibles para el empleado seleccionado en la fecha ${this.fechaSeleccionada}.`;
          }
        },
        error: (err) => {
          console.error('GestionCalendarioComponent: Error al cargar tramos:', err);
          this.tramos = [];
          this.isLoading = false;
          if (err.status === 401 || err.status === 403) {
            this.mensaje = "No autorizado para ver el calendario. Asegúrate de tener los permisos correctos.";
          } else {
            this.mensaje = "Error al cargar el calendario. Inténtalo de nuevo más tarde.";
          }
        }
      });
    } else {
      // Esto no debería ocurrir si las llamadas se hacen después de verificar
      // selectedEmpleadoId y fechaSeleccionada, pero es una seguridad.
      console.warn("loadTramos llamado sin empleado o fecha seleccionada.");
      this.tramos = [];
      this.mensaje = "Selecciona un empleado y una fecha para ver los tramos.";
    }
  }

  handleClickTramo(tramo: Tramo): void {
    console.log('GestionCalendarioComponent: Click en tramo:', tramo);
    // Aquí iría la lógica para interactuar con el tramo seleccionado,
    // por ejemplo, abrir un modal para crear/editar una reserva o bloquear el tramo.
    // Esta lógica dependerá de lo que quieras permitir hacer al empleado/admin con el tramo.
    // Por ahora, solo logueamos el click.
  }

  // Método auxiliar para verificar si el usuario actual es admin
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
