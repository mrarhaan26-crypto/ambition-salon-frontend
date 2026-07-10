import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Client360StateService } from './client-360-state.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-appointments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ca-container" role="region" aria-label="Client Appointments">
      <div *ngIf="state.loading()" class="state-box loading"><div class="spinner"></div><p>Loading appointments…</p></div>
      <ng-container *ngIf="!state.loading()">
        <div class="ca-section">
          <h3 class="ca-section-title">Upcoming ({{ state.upcomingBookings().length }})</h3>
          <div *ngIf="state.upcomingBookings().length === 0" class="empty-state">No upcoming bookings</div>
          <div class="ca-card" *ngFor="let b of state.upcomingBookings(); trackBy: trackById">
            <div class="ca-card-header">
              <span class="ca-title">{{ b.title }}</span>
              <span class="ca-status" [class]="'status-' + b.status.toLowerCase()">{{ b.status }}</span>
            </div>
            <div class="ca-meta">{{ b.startTime | date:'medium' }} · {{ b.branch?.name || 'N/A' }}</div>
            <div class="ca-meta" *ngIf="b.staff?.fullName">Staff: {{ b.staff.fullName }}</div>
            <div class="ca-actions">
              <a [routerLink]="['/app/bookings', b.id]" class="ca-btn">View Booking</a>
            </div>
          </div>
        </div>
        <div class="ca-section">
          <h3 class="ca-section-title">Past ({{ state.completedBookings().length }})</h3>
          <div *ngIf="state.completedBookings().length === 0" class="empty-state">No past visits</div>
          <div class="ca-card past" *ngFor="let b of state.completedBookings().slice(0, 10); trackBy: trackById">
            <div class="ca-card-header">
              <span class="ca-title">{{ b.title }}</span>
              <span class="ca-status status-completed">COMPLETED</span>
            </div>
            <div class="ca-meta">{{ b.startTime | date:'mediumDate' }} · ₹{{ b.totalAmount }}</div>
            <div class="ca-actions"><a [routerLink]="['/app/bookings', b.id]" class="ca-btn">Details</a></div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .ca-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .ca-section{margin-bottom:20px}
    .ca-section-title{margin:0 0 10px;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .ca-card{padding:14px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px;margin-bottom:8px}
    .ca-card.past{opacity:.8}
    .ca-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px;flex-wrap:wrap}
    .ca-title{font-size:14px;font-weight:700;color:var(--text-strong,#111827)}
    .ca-status{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .status-confirmed,.status-pending{background:#eef2ff;color:#4338ca}
    .status-completed{background:#f0fdf4;color:#166534}
    .status-checked_in{background:#fef3c7;color:#92400e}
    .ca-meta{font-size:12px;color:var(--text-soft,#64748b);margin-bottom:4px}
    .ca-actions{margin-top:6px}
    .ca-btn{padding:5px 12px;border-radius:8px;background:var(--accent,#6366f1);color:#fff;font-size:12px;font-weight:600;text-decoration:none;display:inline-block}
    .ca-btn:hover{opacity:.9}
  `]
})
export class ClientAppointmentsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  state = inject(Client360StateService);
  private destroy$ = new Subject<void>();
  trackById(_i: number, item: any): string { return item.id; }
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
