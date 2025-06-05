import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';
import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { Peluqueria } from '../../shared/models/peluqueria.model';
import { Empleado } from '../../shared/models/empleado.model';

@Component({
  selector: 'app-crear-empleado',
  templateUrl: './crear-empleado.component.html',
  // styleUrls: ['./crear-empleado.component.css'] // Descomenta si añades un archivo CSS
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class CrearEmpleadoComponent implements OnInit {
  crearEmpleadoForm: FormGroup;
  peluquerias: Peluqueria[] = [];
  rolesEspecializacion: string[] = ['Mujer', 'Hombre', 'Ambos']; // Coincide con Empleado.rol
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private peluqueriaService: PeluqueriaService,
    private router: Router // Aunque no se usa activamente para redirigir aquí, es bueno tenerlo por si acaso
  ) {
    this.crearEmpleadoForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      telefono: [''], // Opcional según el modelo Empleado
      dni: ['', Validators.required],
      peluqueriaId: [null, Validators.required], // Para seleccionar la peluquería
      rol: [null, Validators.required], // Este es el rol de especialización (Mujer, Hombre, Ambos)
      isAdmin: [false, Validators.required] // True for admin, false for peluquero
    });
  }

  ngOnInit(): void {
    this.loadPeluquerias();
  }

  loadPeluquerias(): void {
    this.peluqueriaService.getAllPeluquerias().subscribe({
      next: (data) => {
        this.peluquerias = data;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar las peluquerías.';
        console.error('Error cargando peluquerías:', err);
      }
    });
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.crearEmpleadoForm.invalid) {
      this.crearEmpleadoForm.markAllAsTouched();
      this.errorMessage = 'Por favor, completa todos los campos requeridos correctamente.';
      return;
    }

    const formValues = this.crearEmpleadoForm.value;

    // Construye el payload según Empleado.model.ts
    const empleadoPayload: Empleado = {
      nombre: formValues.nombre,
      email: formValues.email,
      password: formValues.password,
      dni: formValues.dni,
      rol: formValues.rol, // Rol de especialización
      isAdmin: formValues.isAdmin, // Define si el empleado es admin de la peluquería o peluquero normal
      telefono: formValues.telefono || undefined, // Enviar undefined si está vacío y es opcional
      // Asignamos la peluquería como un objeto con solo el ID,
      // el backend debería poder manejar esto para la relación.
      peluqueria: { id: formValues.peluqueriaId } as Peluqueria,
      // Los campos como 'horarioDisponible', 'direccion' (del empleado), 'tramos'
      // no se están recogiendo en este formulario. Si fueran necesarios para la creación,
      // habría que añadirlos al form y al payload.
    };

    // Asumimos que tu AuthService tiene un método registerEmpleado
    // y que el backend asignará el rol de sistema 'EMPLEADO' automáticamente al crear el usuario.
    this.authService.registerEmpleado(empleadoPayload).subscribe({
      next: (empleadoRegistrado) => {
        this.successMessage = `Empleado ${empleadoRegistrado.nombre} creado exitosamente.`;
        this.crearEmpleadoForm.reset({
          // Puedes establecer valores por defecto después de resetear si lo deseas
          isAdmin: false // Por ejemplo, resetear isAdmin a false
        });
        // Opcionalmente, puedes redirigir al usuario:
        // this.router.navigate(['/empleado/dashboard']); // o a una lista de empleados
      },
      error: (err) => {
        this.errorMessage = err.error?.message || err.message || 'Error al crear el empleado. Inténtalo de nuevo.';
        console.error('Error al crear empleado:', err);
      }
    });
  }
}
