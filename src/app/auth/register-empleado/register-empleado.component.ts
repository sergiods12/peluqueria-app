// src/app/auth/register-empleado/register-empleado.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';
import { PeluqueriaService } from '../../shared/services/peluqueria.service';
import { Empleado } from '../../shared/models/empleado.model';
import { Peluqueria } from '../../shared/models/peluqueria.model';

@Component({
  selector: 'app-register-empleado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule], // FormsModule for [ngValue]
  templateUrl: './register-empleado.component.html'
  // styleUrls: ['./register-empleado.component.css'] // If you have styles
})
export class RegisterEmpleadoComponent implements OnInit {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  peluquerias: Peluqueria[] = [];
  // Use this property name in your template's *ngFor
  rolesEmpleadoDescriptivos = ['Peluquero General', 'Especialista Cortes Mujer', 'Especialista Cortes Hombre', 'Especialista Color', 'Barbero', 'Recepcionista', 'Estilista Unisex'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private peluqueriaService: PeluqueriaService
  ) {
    this.registerForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dni: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      rol: ['', Validators.required], // This will bind to one of the rolesEmpleadoDescriptivos
      isAdmin: [false, Validators.required],
      peluqueriaId: [null, Validators.required],
      telefono: [''],
      direccion: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.peluqueriaService.getAllPeluquerias().subscribe(data => {
      this.peluquerias = data;
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    Object.values(this.registerForm.controls).forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
    if (this.registerForm.errors?.['mismatch'] && this.registerForm.get('confirmPassword')) {
        this.registerForm.get('confirmPassword')?.setErrors({'mismatch': true});
    }

    if (this.registerForm.invalid) {
      return;
    }
    this.errorMessage = null;
    this.successMessage = null;

    // Destructure all values, then assemble the payload
    const formValue = this.registerForm.value;
    const empleadoParaEnviar: Empleado = {
      id: undefined, // Or null, depending on your backend for new entities
      nombre: formValue.nombre,
      email: formValue.email,
      dni: formValue.dni,
      password: formValue.password, // Password will be hashed by backend
      rol: formValue.rol, // Descriptive role
      isAdmin: formValue.isAdmin,
      peluqueria: { id: formValue.peluqueriaId } as Peluqueria, // Send as Peluqueria object with ID
      telefono: formValue.telefono,
      direccion: formValue.direccion,
      horarioDisponible: '', // Add default or remove if not set here
      tramos: [] // Add default or remove if not set here
    };

    this.authService.registerEmpleado(empleadoParaEnviar).subscribe({
      next: () => {
        this.successMessage = '¡Empleado registrado con éxito!';
        this.registerForm.reset({ isAdmin: false, peluqueriaId: null, rol: '' }); // Reset form to initial state
      },
      error: (err) => {
        console.error('Employee registration failed', err);
        this.errorMessage = err.error?.message || err.error?.error || 'Error en el registro del empleado.';
      }
    });
  }
}