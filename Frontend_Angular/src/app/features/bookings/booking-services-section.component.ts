import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

@Component({
  selector: 'app-booking-services-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bss" *ngIf="state.booking() as b">
      <div class="bss-card">
        <h3 class="bss-title">Services ({{ b.services?.length || 0 }})</h3>
        <div class="bss-list" *ngIf="b.services?.length">
          <div class="bss-row" *ngFor="let s of b.services; let i = index">
            <div class="bss-order">{{ i + 1 }}</div>
            <div class="bss-info">
              <span class="bss-name">{{ s.name }}</span>
              <span class="bss-dur">{{ s.durationMin }} min</span>
            </div>
            <span class="bss-price">{{ s.price | currency }}</span>
          </div>
        </div>
        <div class="bss-empty-list" *ngIf="!b.services?.length">
          <p>No services added to this booking.</p>
        </div>
        <div class="bss-totals">
          <div class="bss-total-row"><span>Subtotal</span><span>{{ state.subtotal() | currency }}</span></div>
          <div class="bss-total-row bss-total-final"><span>Total</span><span>{{ (b.totalAmount || 0) | currency }}</span></div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .bss{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .bss-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bss-title{font-size:14px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em;padding-bottom:10px;border-bottom:1px solid #f3f4f6}
    .bss-list{display:grid;gap:6px}
    .bss-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6}
    .bss-row:last-child{border-bottom:0}
    .bss-order{width:28px;height:28px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#6b7280;flex-shrink:0}
    .bss-info{flex:1;display:grid;gap:2px}
    .bss-name{font-weight:600;font-size:14px;color:#374151}
    .bss-dur{font-size:12px;color:#9ca3af}
    .bss-price{font-weight:700;font-size:15px;color:#7c3aed}
    .bss-empty-list{padding:12px 0;color:#9ca3af;font-size:13px}
    .bss-totals{display:grid;gap:4px;margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb}
    .bss-total-row{display:flex;justify-content:space-between;font-size:13px;padding:2px 0}
    .bss-total-row span:first-child{color:#6b7280;font-weight:600}
    .bss-total-row span:last-child{font-weight:700;color:#374151}
    .bss-total-final span:last-child{font-size:16px;color:#7c3aed}
  `]
})
export class BookingServicesSectionComponent {
  state = inject(BookingDetailStateService);
}
