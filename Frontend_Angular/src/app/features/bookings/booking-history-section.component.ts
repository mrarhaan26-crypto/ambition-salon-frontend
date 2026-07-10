import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

@Component({
  selector: 'app-booking-history-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bhs" *ngIf="state.booking() as b">
      <div class="bhs-card">
        <h3 class="bhs-title">Activity History</h3>
        <div class="bhs-list" *ngIf="state.activityLog().length">
          <div class="bhs-entry" *ngFor="let entry of state.activityLog()">
            <div class="bhs-dot"></div>
            <div class="bhs-content">
              <span class="bhs-action">{{ entry.action }}</span>
              <span class="bhs-time">{{ entry.timestamp | date:'MMM dd, yyyy h:mm a' }}</span>
              <span class="bhs-user" *ngIf="entry.user">{{ entry.user }}</span>
              <span class="bhs-details" *ngIf="entry.details">{{ entry.details }}</span>
            </div>
          </div>
        </div>
        <div class="bhs-empty" *ngIf="!state.activityLog().length">
          <p>No activity recorded yet.</p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .bhs{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .bhs-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bhs-title{font-size:14px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em;padding-bottom:10px;border-bottom:1px solid #f3f4f6}
    .bhs-list{display:grid;gap:0;position:relative}
    .bhs-list::before{content:'';position:absolute;left:7px;top:8px;bottom:8px;width:2px;background:#e5e7eb;border-radius:2px}
    .bhs-entry{display:flex;gap:14px;padding:10px 0;position:relative}
    .bhs-dot{width:16px;height:16px;border-radius:50%;background:#7c3aed;border:3px solid #ede9fe;flex-shrink:0;margin-top:2px;z-index:1}
    .bhs-content{flex:1;display:grid;gap:2px}
    .bhs-action{font-weight:600;font-size:14px;color:#374151}
    .bhs-time{font-size:12px;color:#9ca3af}
    .bhs-user{font-size:12px;color:#7c3aed;font-weight:600}
    .bhs-details{font-size:13px;color:#6b7280}
    .bhs-empty{padding:12px 0;color:#9ca3af;font-size:13px}
  `]
})
export class BookingHistorySectionComponent {
  state = inject(BookingDetailStateService);
}
