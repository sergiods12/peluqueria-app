import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service'; // Ajusta la ruta si es necesario
import { Empleado } from '../../shared/models/empleado.model'; // Asegúrate de que este modelo exista y sea correcto
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register-empleado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register-empleado.component.html',
  styleUrls: ['./register-empleado.component.scss'] // Puedes crear este archivo o eliminar la referencia
})
export class RegisterEmpleadoComponent implements OnInit {
  registerEmpleadoForm!: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerEmpleadoForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rol: ['', Validators.required] // 'EMPLEADO' o 'ADMIN'
      // Añade aquí más FormControls para otros datos del empleado
    });
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;
    if (this.registerEmpleadoForm.valid) {
      const empleadoData: Empleado = this.registerEmpleadoForm.value;
      
      // Asegúrate de que el modelo Empleado coincida con lo que espera tu backend
      // y que el servicio authService.registerEmpleado esté implementado correctamente.
      this.authService.registerEmpleado(empleadoData).subscribe({
        next: (response) => {
          this.successMessage = 'Empleado registrado exitosamente. Ahora puede iniciar sesión.';
          console.log('RegisterEmpleadoComponent: Empleado registrado:', response);
          this.registerEmpleadoForm.reset();
          // Opcionalmente, redirigir después de un tiempo o dejar que el usuario haga clic en el enlace
          // setTimeout(() => this.router.navigate(['/auth/login']), 3000);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Error al registrar el empleado. Por favor, inténtalo de nuevo.';
          console.error('RegisterEmpleadoComponent: Error en el registro:', err);
        }
      });
    } else {
      this.registerEmpleadoForm.markAllAsTouched();
      this.errorMessage = 'Por favor, corrige los errores en el formulario.';
    }
  }
}
