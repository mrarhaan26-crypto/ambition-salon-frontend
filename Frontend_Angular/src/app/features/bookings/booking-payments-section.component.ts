import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingDetailStateService } from './booking-detail-state.service';
import { BookingsService } from './bookings.service';

@Component({
  selector: 'app-booking-payments-section',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <section class="bps" *ngIf="state.booking() as b">
      <div class="bps-card">
        <h3 class="bps-title">Payment Summary</h3>
        <div class="bps-summary">
          <div class="bps-row"><span>Total</span><span>{{ (b.totalAmount || 0) | currency }}</span></div>
          <div class="bps-row bps-paid"><span>Paid</span><span>{{ state.paid() | currency }}</span></div>
          <div class="bps-row bps-due" *ngIf="state.due() > 0"><span>Due</span><span>{{ state.due() | currency }}</span></div>
          <div class="bps-row bps-balanced" *ngIf="state.due() <= 0"><span>Balance</span><span>Paid in Full</span></div>
        </div>
      </div>
      <div class="bps-card" *ngIf="state.payments().length">
        <h3 class="bps-title">Payment History</h3>
        <div class="bps-payment" *ngFor="let p of state.payments()">
          <div class="bps-pay-info">
            <span class="bps-pay-amt">{{ p.amount | currency }}</span>
            <span class="bps-pay-method">{{ p.method }}</span>
            <span class="bps-pay-status" [class.paid]="p.status === 'PAID' || p.status === 'COMPLETED'">{{ p.status }}</span>
          </div>
          <span class="bps-pay-date">{{ p.createdAt | date:'MMM dd, h:mm a' }}</span>
        </div>
      </div>
      <div class="bps-empty" *ngIf="!state.payments().length && !state.paymentsLoading()">
        <p>No payments recorded yet.</p>
      </div>
      <div class="bps-loading" *ngIf="state.paymentsLoading()">Loading payments...</div>
    </section>
  `,
  styles: [`
    .bps{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .bps-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bps-title{font-size:14px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em;padding-bottom:10px;border-bottom:1px solid #f3f4f6}
    .bps-summary{display:grid;gap:6px}
    .bps-row{display:flex;justify-content:space-between;font-size:14px;padding:4px 0}
    .bps-row span:first-child{color:#6b7280;font-weight:600}
    .bps-row span:last-child{font-weight:700;color:#374151}
    .bps-paid span:last-child{color:#16a34a;font-size:16px}
    .bps-due span:last-child{color:#dc2626;font-size:16px}
    .bps-balanced span:last-child{color:#16a34a}
    .bps-payment{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6}
    .bps-payment:last-child{border-bottom:0}
    .bps-pay-info{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .bps-pay-amt{font-weight:700;font-size:15px;color:#374151}
    .bps-pay-method{font-size:12px;color:#9ca3af;background:#f3f4f6;padding:2px 8px;border-radius:4px}
    .bps-pay-status{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e}
    .bps-pay-status.paid{background:#d1fae5;color:#065f46}
    .bps-pay-date{font-size:12px;color:#9ca3af}
    .bps-empty,.bps-loading{padding:48px;text-align:center;color:#6b7280;background:#f9fafb;border-radius:12px;border:1px dashed #d1d5db}
  `]
})
export class BookingPaymentsSectionComponent {
  state = inject(BookingDetailStateService);
}
