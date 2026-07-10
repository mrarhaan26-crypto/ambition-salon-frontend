import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-booking-section-placeholder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="placeholder-section">
      <div class="placeholder-icon">📋</div>
      <h3>{{ sectionTitle }}</h3>
      <p>{{ sectionDescription }}</p>
      <div class="placeholder-note">
        <strong>TODO:</strong> Replace with enterprise-page-header and full {{ sectionKey }} implementation.
      </div>
      <a class="btn btn-secondary" routerLink="/app/bookings/{{ bookingId }}">Back to Booking Overview</a>
    </div>
  `,
  styles: [`
    .placeholder-section { text-align: center; padding: 48px 24px; background: #f9fafb; border-radius: 12px; border: 1px dashed #d1d5db; }
    .placeholder-icon { font-size: 48px; margin-bottom: 16px; }
    h3 { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: #111827; }
    p { font-size: 14px; color: #6b7280; margin: 0 0 16px; max-width: 400px; margin-left: auto; margin-right: auto; }
    .placeholder-note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; color: #92400e; font-size: 13px; display: inline-block; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
    .btn-secondary { background: #fff; color: #374151; border-color: #d1d5db; }
    .btn-secondary:hover { background: #f9fafb; }
  `]
})
export class BookingSectionPlaceholderComponent {
  private route = inject(ActivatedRoute);
  bookingId = this.route.snapshot.paramMap.get('id') || '';
  sectionKey = this.route.snapshot.url[this.route.snapshot.url.length - 1]?.path || '';
  sectionTitle: string;
  sectionDescription: string;

  private sectionInfo: Record<string, { title: string; description: string }> = {
    overview:   { title: 'Booking Overview', description: 'Booking identity, status, schedule and summary of every linked section.' },
    client:     { title: 'Client Information', description: 'View and edit client details for this booking.' },
    services:   { title: 'Services', description: 'Manage services included in this booking.' },
    staff:      { title: 'Staff Assignment', description: 'Assign or change staff for this booking.' },
    resources:  { title: 'Resources', description: 'Manage resource allocation for this booking.' },
    schedule:   { title: 'Schedule', description: 'View and adjust the booking schedule and time slots.' },
    payments:   { title: 'Payments', description: 'View and process payments for this booking.' },
    invoice:    { title: 'Invoice', description: 'View and manage invoices for this booking.' },
    notes:      { title: 'Notes', description: 'Add or view notes for this booking.' },
    photos:     { title: 'Photos', description: 'View photos associated with this booking.' },
    files:      { title: 'Files', description: 'Manage documents and files attached to this booking.' },
    forms:      { title: 'Forms', description: 'View and complete intake or consent forms for this booking.' },
    reminders:  { title: 'Reminders', description: 'Manage reminders and notifications for this booking.' },
    history:    { title: 'History', description: 'View the full history of changes to this booking.' },
    conflicts:  { title: 'Conflicts', description: 'View and resolve scheduling conflicts for this booking.' },
    ai:         { title: 'AI Insights', description: 'AI-powered suggestions and insights for this booking.' },
    settings:   { title: 'Booking Settings', description: 'Configure booking-level preferences and permissions.' },
  };

  constructor() {
    const info = this.sectionInfo[this.sectionKey] || { title: 'Section', description: 'Manage booking details.' };
    this.sectionTitle = info.title;
    this.sectionDescription = info.description;
  }
}
