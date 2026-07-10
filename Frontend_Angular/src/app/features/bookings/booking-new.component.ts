import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-booking-new',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1 class="page-title">New Booking</h1>
          <p class="page-subtitle">Create a new salon appointment</p>
        </div>
      </div>
      <div class="header-actions">
        <a class="btn btn-secondary" routerLink="/app/bookings">Back to Bookings</a>
      </div>
    </div>
    <section class="page-body">
      <div class="placeholder-card">
        <strong>TODO:</strong> Replace with enterprise-page-header and full booking creation form.
      </div>
    </section>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .header-content { display: flex; align-items: center; gap: 16px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
    .page-subtitle { margin: 0; color: #6b7280; font-size: 14px; }
    .header-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
    .btn-secondary { background: #fff; color: #374151; border-color: #d1d5db; }
    .btn-secondary:hover { background: #f9fafb; }
    .page-body { padding: 0; }
    .placeholder-card { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 24px; color: #92400e; font-size: 14px; }
  `]
})
export class BookingNewComponent {}
