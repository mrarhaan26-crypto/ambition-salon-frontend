import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

@Component({
  selector: 'app-booking-client-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bcs" *ngIf="state.booking() as b">
      <div class="bcs-card" *ngIf="b.client">
        <div class="bcs-avatar">{{ (b.client.fullName || '?').charAt(0) }}</div>
        <div class="bcs-info">
          <h3>{{ b.client.fullName }}</h3>
          <span class="bcs-detail" *ngIf="b.client.phone">{{ b.client.phone }}</span>
          <span class="bcs-detail" *ngIf="b.client.email">{{ b.client.email }}</span>
        </div>
        <a class="bcs-link" [routerLink]="'/app/clients/' + b.clientId">View Profile</a>
      </div>
      <div class="bcs-card" *ngIf="state.clientDetail() as cd">
        <div class="bcs-section-title">Wallet & Loyalty</div>
        <div class="bcs-stat-row">
          <span class="bcs-stat-label">Wallet Balance</span>
          <span class="bcs-stat-value">{{ (cd.walletBalance ?? 0) | currency }}</span>
        </div>
      </div>
      <div class="bcs-empty" *ngIf="!b.client">
        <p>No client information available.</p>
      </div>
    </section>
    <section class="bcs-loading" *ngIf="state.loading()">
      <p>Loading client details...</p>
    </section>
  `,
  styles: [`
    .bcs{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .bcs-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bcs-avatar{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;margin-bottom:12px;box-shadow:0 4px 14px rgba(124,58,237,.3)}
    .bcs-info{display:grid;gap:4px;margin-bottom:12px}
    .bcs-info h3{margin:0;font-size:18px;font-weight:800;color:#1f2937}
    .bcs-detail{font-size:14px;color:#6b7280}
    .bcs-link{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;color:#7c3aed;background:rgba(124,58,237,.08);text-decoration:none;transition:background .15s}
    .bcs-link:hover{background:rgba(124,58,237,.14)}
    .bcs-section-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.06em;margin-bottom:8px}
    .bcs-stat-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;border-bottom:1px solid #f3f4f6}
    .bcs-stat-row:last-child{border-bottom:0}
    .bcs-stat-label{color:#6b7280;font-weight:600}
    .bcs-stat-value{font-weight:700;color:#7c3aed}
    .bcs-empty,.bcs-loading{padding:48px;text-align:center;color:#6b7280;background:#f9fafb;border-radius:12px;border:1px dashed #d1d5db}
  `]
})
export class BookingClientSectionComponent {
  state = inject(BookingDetailStateService);
}
