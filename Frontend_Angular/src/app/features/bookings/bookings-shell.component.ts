import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bookings-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: [``]
})
export class BookingsShellComponent {}
