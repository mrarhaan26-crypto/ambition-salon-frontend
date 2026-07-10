import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

@Component({
  selector: 'app-booking-schedule-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bsc" *ngIf="state.booking() as b">
      <div class="bsc-card">
        <div class="bsc-header">Schedule</div>
        <div class="bsc-row">
          <span class="bsc-label">Date</span>
          <span class="bsc-value">{{ b.startTime | date:'EEEE, MMMM dd, yyyy' }}</span>
        </div>
        <div class="bsc-row">
          <span class="bsc-label">Start Time</span>
          <span class="bsc-value">{{ b.startTime | date:'h:mm a' }}</span>
        </div>
        <div class="bsc-row">
          <span class="bsc-label">End Time</span>
          <span class="bsc-value">{{ b.endTime | date:'h:mm a' }}</span>
        </div>
        <div class="bsc-row" *ngIf="getDurationMin(b) as dur">
          <span class="bsc-label">Duration</span>
          <span class="bsc-value">{{ dur }} minutes</span>
        </div>
      </div>
      <div class="bsc-card" *ngIf="b.services?.length">
        <div class="bsc-header">Services Timeline</div>
        <div class="bsc-svc" *ngFor="let s of b.services; let i = index">
          <span class="bsc-svc-order">{{ i + 1 }}</span>
          <span class="bsc-svc-name">{{ s.name }}</span>
          <span class="bsc-svc-dur">{{ s.durationMin }} min</span>
        </div>
      </div>
      <a class="bsc-cal-link" [routerLink]="'/app/calendar'" [queryParams]="{date: (b.startTime | date:'yyyy-MM-dd')}">
        Open in Calendar
      </a>
    </section>
  `,
  styles: [`
    .bsc{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .bsc-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bsc-header{font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.06em;margin-bottom:12px}
    .bsc-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
    .bsc-row:last-child{border-bottom:0}
    .bsc-label{color:#6b7280;font-weight:600}
    .bsc-value{font-weight:700;color:#374151}
    .bsc-svc{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6}
    .bsc-svc:last-child{border-bottom:0}
    .bsc-svc-order{width:24px;height:24px;border-radius:50%;background:rgba(124,58,237,.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#7c3aed;flex-shrink:0}
    .bsc-svc-name{flex:1;font-weight:600;font-size:14px;color:#374151}
    .bsc-svc-dur{font-size:13px;color:#9ca3af}
    .bsc-cal-link{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;color:#0ea5e9;background:rgba(14,165,233,.08);text-decoration:none;transition:background .15s;width:fit-content}
    .bsc-cal-link:hover{background:rgba(14,165,233,.14)}
  `]
})
export class BookingScheduleSectionComponent {
  state = inject(BookingDetailStateService);

  getDurationMin(b: { startTime: string; endTime: string }): number | null {
    if (!b.startTime || !b.endTime) return null;
    return Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000);
  }
}
