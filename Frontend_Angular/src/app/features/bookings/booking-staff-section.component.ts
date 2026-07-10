import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

@Component({
  selector: 'app-booking-staff-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bss" *ngIf="state.booking() as b">
      <div class="bss-card" *ngIf="b.staff">
        <div class="bss-header">Primary Staff</div>
        <div class="bss-staff">
          <div class="bss-avatar">{{ (b.staff.fullName || '?').charAt(0) }}</div>
          <div class="bss-info">
            <span class="bss-name">{{ b.staff.fullName }}</span>
            <span class="bss-role" *ngIf="b.staff.role">{{ b.staff.role }}</span>
          </div>
        </div>
        <a class="bss-link" [routerLink]="'/app/staff/' + b.staffId">View Staff Profile</a>
      </div>
      <div class="bss-card" *ngIf="b.branch">
        <div class="bss-header">Branch</div>
        <div class="bss-info">
          <span class="bss-name">{{ b.branch.name }}</span>
          <span class="bss-role" *ngIf="b.branch.city">{{ b.branch.city }}</span>
        </div>
      </div>
      <div class="bss-empty" *ngIf="!b.staff">
        <p>No staff assigned to this booking.</p>
      </div>
    </section>
  `,
  styles: [`
    .bss{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .bss-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bss-header{font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.06em;margin-bottom:10px}
    .bss-staff{display:flex;align-items:center;gap:14px;margin-bottom:12px}
    .bss-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#10b981,#14b8a6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0;box-shadow:0 4px 12px rgba(16,185,129,.3)}
    .bss-info{display:grid;gap:2px}
    .bss-name{font-weight:700;font-size:16px;color:#1f2937}
    .bss-role{font-size:13px;color:#6b7280}
    .bss-link{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;color:#10b981;background:rgba(16,185,129,.08);text-decoration:none;transition:background .15s}
    .bss-link:hover{background:rgba(16,185,129,.14)}
    .bss-empty{padding:48px;text-align:center;color:#6b7280;background:#f9fafb;border-radius:12px;border:1px dashed #d1d5db}
  `]
})
export class BookingStaffSectionComponent {
  state = inject(BookingDetailStateService);
}
