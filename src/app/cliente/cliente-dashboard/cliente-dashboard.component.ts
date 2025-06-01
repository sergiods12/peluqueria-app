// src/app/cliente/cliente-dashboard/cliente-dashboard.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // For <router-outlet>
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cliente-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cliente-dashboard.component.html',
  // styleUrls: ['./cliente-dashboard.component.css']
})
export class ClienteDashboardComponent {
  constructor() { }
}