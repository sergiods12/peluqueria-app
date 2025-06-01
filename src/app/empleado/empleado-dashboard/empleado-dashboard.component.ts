// src/app/empleado/empleado-dashboard/empleado-dashboard.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // For <router-outlet>
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empleado-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './empleado-dashboard.component.html',
  // styleUrls: ['./empleado-dashboard.component.css']
})
export class EmpleadoDashboardComponent {
    constructor() {}
}