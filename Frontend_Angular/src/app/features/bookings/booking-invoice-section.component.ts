import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

@Component({
  selector: 'app-booking-invoice-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bis" *ngIf="state.booking() as b">
      <div class="bis-card">
        <h3 class="bis-title">Invoice</h3>
        <div class="bis-summary">
          <div class="bis-row"><span>Booking</span><span>{{ b.title || 'Untitled' }}</span></div>
          <div class="bis-row"><span>Client</span><span>{{ state.clientName() }}</span></div>
          <div class="bis-row"><span>Date</span><span>{{ b.startTime | date:'MMM dd, yyyy' }}</span></div>
        </div>
        <div class="bis-services" *ngIf="b.services?.length">
          <div class="bis-svc" *ngFor="let s of b.services">
            <span>{{ s.name }}</span><span>{{ s.price | currency }}</span>
          </div>
        </div>
        <div class="bis-totals">
          <div class="bis-row"><span>Subtotal</span><span>{{ state.subtotal() | currency }}</span></div>
          <div class="bis-row bis-total"><span>Total</span><span>{{ (b.totalAmount || 0) | currency }}</span></div>
          <div class="bis-row bis-paid"><span>Paid</span><span>{{ state.paid() | currency }}</span></div>
          <div class="bis-row bis-due" *ngIf="state.due() > 0"><span>Due</span><span>{{ state.due() | currency }}</span></div>
        </div>
        <div class="bis-actions">
          <a class="bis-btn" routerLink="/app/invoices">View Invoices</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .bis{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .bis-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bis-title{font-size:14px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em;padding-bottom:10px;border-bottom:1px solid #f3f4f6}
    .bis-summary{display:grid;gap:6px;margin-bottom:12px}
    .bis-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
    .bis-row span:first-child{color:#6b7280;font-weight:600}
    .bis-row span:last-child{font-weight:700;color:#374151}
    .bis-services{display:grid;gap:4px;padding:8px 0;border-top:1px solid #f3f4f6}
    .bis-svc{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;color:#4b5563}
    .bis-totals{border-top:1px solid #f3f4f6;padding-top:8px;margin-top:4px}
    .bis-total span:last-child{font-size:16px;color:#7c3aed}
    .bis-paid span:last-child{color:#16a34a}
    .bis-due span:last-child{color:#dc2626}
    .bis-actions{margin-top:12px}
    .bis-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;color:#7c3aed;background:rgba(124,58,237,.08);text-decoration:none}
    .bis-btn:hover{background:rgba(124,58,237,.14)}
  `]
})
export class BookingInvoiceSectionComponent {
  state = inject(BookingDetailStateService);
}
