import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { CalendarService } from './calendar.service';
import { ConflictVisualService } from './calendar-conflict-engine/calendar-conflict-visual.service';
import { BookingsService } from '../bookings/bookings.service';
import type { CalendarBooking } from './calendar.models';

interface ConflictDisplay {
  bookingId: string;
  title: string;
  clientName: string;
  staffName: string;
  startTime: string;
  severity: string;
  type: string;
  message: string;
}

@Component({
  selector: 'app-calendar-conflicts-page',
  standalone: true,
  imports: [CommonModule, RouterModule, EnterpriseFeaturePageComponent],
  template: `
    <app-enterprise-feature-page
      themeKey="calendar"
      title="Conflict Center"
      subtitle="Review and resolve scheduling conflicts"
      icon="&#9888;"
      [breadcrumbs]="[
        { label: 'Calendar', link: '/app/calendar' },
        { label: 'Conflicts' }
      ]"
    >
      <div class="cc-controls">
        <button class="cc-btn cc-refresh" (click)="loadConflicts()">&#8635; Refresh</button>
        <span class="cc-count" *ngIf="conflicts.length > 0">{{ conflicts.length }} conflict(s) found</span>
        <span class="cc-count cc-clear" *ngIf="conflicts.length === 0">No conflicts</span>
      </div>

      <div class="cc-list" *ngIf="conflicts.length > 0">
        <div class="cc-item" *ngFor="let c of conflicts" [class.cc-severe]="c.severity === 'error'">
          <div class="cc-icon" [class.cc-icon-error]="c.severity === 'error'" [class.cc-icon-warn]="c.severity === 'warning'">&#9888;</div>
          <div class="cc-body">
            <div class="cc-title">{{ c.title }}</div>
            <div class="cc-detail">{{ c.message }}</div>
            <div class="cc-meta">
              <span class="cc-meta-item">&#128100; {{ c.clientName }}</span>
              <span class="cc-meta-item">&#128188; {{ c.staffName }}</span>
              <span class="cc-meta-item">&#128197; {{ c.startTime | date:'short' }}</span>
              <span class="cc-meta-item cc-type">{{ c.type }}</span>
            </div>
          </div>
          <div class="cc-actions">
            <a class="cc-action-btn" [routerLink]="'/app/bookings/' + c.bookingId">Open Booking</a>
          </div>
        </div>
      </div>

      <div class="cc-empty" *ngIf="conflicts.length === 0">
        <div class="cc-empty-icon">&#9989;</div>
        <h3>No Conflicts Detected</h3>
        <p>All appointments are currently conflict-free.</p>
      </div>
    </app-enterprise-feature-page>
  `,
  styles: [`
    .cc-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .cc-btn { height: 36px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; background: #fff; padding: 0 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .cc-btn:hover { background: var(--soft, #f7f7f7); }
    .cc-count { font-size: 13px; font-weight: 600; color: var(--muted, #6b7280); }
    .cc-clear { color: #16a34a; }
    .cc-list { display: flex; flex-direction: column; gap: 12px; }
    .cc-item { display: flex; align-items: flex-start; gap: 14px; background: #fff; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 16px; }
    .cc-item.cc-severe { border-left: 4px solid #dc2626; }
    .cc-icon { font-size: 20px; padding: 6px; border-radius: 50%; }
    .cc-icon-error { color: #dc2626; background: #fee2e2; }
    .cc-icon-warn { color: #f59e0b; background: #fef3c7; }
    .cc-body { flex: 1; }
    .cc-title { font-size: 14px; font-weight: 700; color: var(--text, #111); margin-bottom: 4px; }
    .cc-detail { font-size: 12px; color: var(--muted, #6b7280); margin-bottom: 8px; }
    .cc-meta { display: flex; gap: 12px; flex-wrap: wrap; }
    .cc-meta-item { font-size: 11px; color: var(--muted, #6b7280); }
    .cc-type { padding: 2px 8px; border-radius: 4px; background: var(--soft, #f7f7f7); font-weight: 600; text-transform: capitalize; }
    .cc-actions { flex-shrink: 0; }
    .cc-action-btn { display: inline-flex; padding: 8px 16px; border-radius: 8px; background: #0ea5e9; color: #fff; font-size: 12px; font-weight: 700; text-decoration: none; }
    .cc-action-btn:hover { background: #2563eb; }
    .cc-empty { text-align: center; padding: 60px 20px; }
    .cc-empty-icon { font-size: 48px; margin-bottom: 12px; }
    .cc-empty h3 { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
    .cc-empty p { font-size: 14px; color: var(--muted, #6b7280); margin: 0; }
  `]
})
export class CalendarConflictsPageComponent implements OnInit {
  private conflictVisual = inject(ConflictVisualService);
  private bookingsService = inject(BookingsService);

  conflicts: ConflictDisplay[] = [];
  private allBookings: Map<string, CalendarBooking> = new Map();

  ngOnInit(): void {
    this.loadConflicts();
  }

  loadConflicts(): void {
    const conflictStates = this.conflictVisual.getAllStates().filter(s => s.hasConflict);
    this.conflicts = [];
    for (const state of conflictStates) {
      this.bookingsService.getById(state.appointmentId).subscribe({
        next: (booking) => {
          const conflict = state.conflicts[0];
          this.conflicts.push({
            bookingId: state.appointmentId,
            title: booking?.title || 'Appointment',
            clientName: booking?.client?.fullName || 'Unknown',
            staffName: booking?.staff?.fullName || 'Unknown',
            startTime: booking?.startTime || '',
            severity: state.severity,
            type: conflict?.type || 'overlap',
            message: state.tooltip || conflict?.message || 'Scheduling conflict detected',
          });
        },
      });
    }
  }
}
