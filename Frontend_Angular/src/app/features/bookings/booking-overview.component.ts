import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

type StatusColor = 'confirmed' | 'completed' | 'pending' | 'cancelled' | 'no_show' | 'checked_in';

const STATUS_MAP: Record<string, StatusColor> = {
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  CHECKED_IN: 'checked_in',
};

@Component({
  selector: 'app-booking-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bo">
      <ng-container *ngIf="state.booking() as b">
        <div class="bo-hero" [class]="'hero-' + statusClass">
          <div class="bo-hero-main">
            <div class="bo-avatar">{{ (state.clientName() || '?').charAt(0) }}</div>
            <div class="bo-hero-info">
              <h2>{{ state.clientName() }}</h2>
              <p class="bo-hero-title">{{ b.title }}</p>
              <div class="bo-hero-meta">
                <span class="bo-status" [class]="'st-' + statusClass">{{ b.status }}</span>
                <span class="bo-date">{{ b.startTime | date:'EEE, MMM dd, yyyy' }}</span>
                <span class="bo-time">{{ b.startTime | date:'h:mm a' }} – {{ b.endTime | date:'h:mm a' }}</span>
                <span class="bo-duration" *ngIf="getDurationMin(b) as dur">{{ dur }} min</span>
              </div>
            </div>
          </div>
          <div class="bo-hero-amount">
            <span class="bo-amount-label">Total</span>
            <span class="bo-amount-value">{{ (b.totalAmount || 0) | currency }}</span>
          </div>
        </div>

        <div class="bo-grid">
          <div class="bo-card" *ngIf="b.client">
            <div class="bo-card-header">Client</div>
            <div class="bo-card-body">
              <span class="bo-card-name">{{ b.client.fullName }}</span>
              <span class="bo-card-detail" *ngIf="b.client.phone">{{ b.client.phone }}</span>
              <span class="bo-card-detail" *ngIf="b.client.email">{{ b.client.email }}</span>
            </div>
          </div>
          <div class="bo-card" *ngIf="b.staff">
            <div class="bo-card-header">Staff</div>
            <div class="bo-card-body">
              <span class="bo-card-name">{{ b.staff.fullName }}</span>
              <span class="bo-card-detail" *ngIf="b.staff.role">{{ b.staff.role }}</span>
            </div>
          </div>
          <div class="bo-card" *ngIf="b.branch?.name">
            <div class="bo-card-header">Branch</div>
            <div class="bo-card-body">
              <span class="bo-card-name">{{ b.branch?.name }}</span>
              <span class="bo-card-detail" *ngIf="b.branch?.city">{{ b.branch.city }}</span>
            </div>
          </div>
          <div class="bo-card" *ngIf="b.resource?.name">
            <div class="bo-card-header">Resource</div>
            <div class="bo-card-body">
              <span class="bo-card-name">{{ b.resource?.name }}</span>
              <span class="bo-card-detail" *ngIf="b.resource?.type">{{ b.resource.type }}</span>
            </div>
          </div>
        </div>

        <div class="bo-section" *ngIf="b.services?.length">
          <h3 class="bo-section-title">Services ({{ b.services.length }})</h3>
          <div class="bo-services">
            <div class="bo-svc" *ngFor="let s of b.services">
              <div class="bo-svc-info">
                <span class="bo-svc-name">{{ s.name }}</span>
                <span class="bo-svc-dur">{{ s.durationMin }} min</span>
              </div>
              <span class="bo-svc-price">{{ s.price | currency }}</span>
            </div>
          </div>
          <div class="bo-totals">
            <div class="bo-total-row"><span>Subtotal</span><span>{{ state.subtotal() | currency }}</span></div>
            <div class="bo-total-row bo-total-final"><span>Total</span><span>{{ (b.totalAmount || 0) | currency }}</span></div>
            <div class="bo-total-row bo-paid"><span>Paid</span><span>{{ state.paid() | currency }}</span></div>
            <div class="bo-total-row bo-due" *ngIf="state.due() > 0"><span>Due</span><span>{{ state.due() | currency }}</span></div>
          </div>
        </div>

        <div class="bo-section" *ngIf="b.notes">
          <h3 class="bo-section-title">Notes</h3>
          <div class="bo-notes">{{ b.notes }}</div>
        </div>

        <div class="bo-section" *ngIf="state.activityLog().length">
          <h3 class="bo-section-title">Activity</h3>
          <div class="bo-activity">
            <div class="bo-act-entry" *ngFor="let entry of state.activityLog()">
              <span class="bo-act-action">{{ entry.action }}</span>
              <span class="bo-act-time">{{ entry.timestamp | date:'MMM dd, h:mm a' }}</span>
              <span class="bo-act-user" *ngIf="entry.user">{{ entry.user }}</span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="bo-empty" *ngIf="!state.booking() && !state.loading()">
        <p>No booking data available.</p>
      </div>
    </section>
  `,
  styles: [`
    .bo{display:grid;gap:20px;padding:4px 0;max-width:960px}
    .bo-hero{display:flex;align-items:center;justify-content:space-between;gap:20px;
      background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-radius:16px;padding:20px 24px;
      border:1px solid rgba(124,58,237,.12);flex-wrap:wrap}
    .bo-hero.hero-confirmed{background:linear-gradient(135deg,#eff6ff,#dbeafe);border-color:rgba(59,130,246,.15)}
    .bo-hero.hero-completed{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:rgba(22,163,74,.15)}
    .bo-hero.hero-pending{background:linear-gradient(135deg,#fffbeb,#fef3c7);border-color:rgba(234,179,8,.15)}
    .bo-hero.hero-cancelled{background:linear-gradient(135deg,#fef2f2,#fee2e2);border-color:rgba(220,38,38,.12)}
    .bo-hero.hero-no_show{background:linear-gradient(135deg,#f9fafb,#f3f4f6);border-color:rgba(107,114,128,.12)}
    .bo-hero.hero-checked_in{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-color:rgba(139,92,246,.15)}
    .bo-hero-main{display:flex;align-items:center;gap:16px;flex:1;min-width:200px}
    .bo-avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;
      display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;flex-shrink:0;
      box-shadow:0 4px 14px rgba(124,58,237,.3)}
    .bo-hero-info h2{margin:0;font-size:20px;font-weight:800;color:#1f2937}
    .bo-hero-title{margin:2px 0 0;font-size:14px;color:#6b7280}
    .bo-hero-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
    .bo-status{font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em}
    .st-confirmed{background:#dbeafe;color:#1d4ed8}
    .st-completed{background:#d1fae5;color:#065f46}
    .st-pending{background:#fef3c7;color:#92400e}
    .st-cancelled{background:#fee2e2;color:#991b1b}
    .st-no_show{background:#f3f4f6;color:#6b7280}
    .st-checked_in{background:#ede9fe;color:#6d28d9}
    .bo-date,.bo-time{font-size:13px;color:#4b5563;font-weight:600}
    .bo-duration{font-size:12px;font-weight:700;color:#7c3aed;background:rgba(124,58,237,.1);padding:2px 10px;border-radius:999px}
    .bo-hero-amount{text-align:right;flex-shrink:0}
    .bo-amount-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.04em}
    .bo-amount-value{font-size:24px;font-weight:800;color:#7c3aed}
    .bo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
    .bo-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bo-card-header{font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.06em;margin-bottom:6px}
    .bo-card-body{display:grid;gap:2px}
    .bo-card-name{font-weight:700;font-size:15px;color:#1f2937}
    .bo-card-detail{font-size:13px;color:#6b7280}
    .bo-section{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bo-section-title{font-size:13px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em}
    .bo-services{display:grid;gap:6px}
    .bo-svc{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6}
    .bo-svc:last-child{border-bottom:0}
    .bo-svc-info{display:flex;gap:10px;align-items:center}
    .bo-svc-name{font-weight:600;font-size:14px;color:#374151}
    .bo-svc-dur{font-size:12px;color:#9ca3af}
    .bo-svc-price{font-weight:700;font-size:14px;color:#7c3aed}
    .bo-totals{display:grid;gap:4px;margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb}
    .bo-total-row{display:flex;justify-content:space-between;font-size:13px;padding:2px 0}
    .bo-total-row span:first-child{color:#6b7280;font-weight:600}
    .bo-total-row span:last-child{font-weight:700;color:#374151}
    .bo-total-final{border-top:2px solid #e5e7eb;padding-top:6px;margin-top:2px}
    .bo-total-final span:last-child{font-size:16px;color:#7c3aed}
    .bo-paid span:last-child{color:#16a34a}
    .bo-due span:last-child{color:#dc2626}
    .bo-notes{font-size:14px;color:#4b5563;line-height:1.6;white-space:pre-wrap}
    .bo-activity{display:grid;gap:8px}
    .bo-act-entry{display:flex;gap:12px;align-items:center;font-size:13px;padding:6px 0;border-bottom:1px solid #f3f4f6}
    .bo-act-entry:last-child{border-bottom:0}
    .bo-act-action{font-weight:600;color:#374151;flex:1}
    .bo-act-time{color:#9ca3af;font-size:12px}
    .bo-act-user{color:#7c3aed;font-weight:600;font-size:12px}
    .bo-empty{padding:48px;text-align:center;color:#6b7280;background:#f9fafb;border-radius:12px;border:1px dashed #d1d5db}
  `]
})
export class BookingOverviewComponent {
  state = inject(BookingDetailStateService);

  get statusClass(): StatusColor {
    return STATUS_MAP[this.state.status()] || 'pending';
  }

  getDurationMin(b: { startTime: string; endTime: string }): number | null {
    if (!b.startTime || !b.endTime) return null;
    const diff = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
    return Math.round(diff / 60000);
  }
}
