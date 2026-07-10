import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

@Component({
  selector: 'app-booking-resources-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="brs" *ngIf="state.booking() as b">
      <div class="brs-card" *ngIf="b.resource">
        <div class="brs-header">Assigned Resource</div>
        <div class="brs-resource">
          <span class="brs-icon">&#x1F4E6;</span>
          <div class="brs-info">
            <span class="brs-name">{{ b.resource.name }}</span>
            <span class="brs-type" *ngIf="b.resource.type">{{ b.resource.type }}</span>
          </div>
        </div>
        <a class="brs-link" routerLink="/app/resources">View Resources</a>
      </div>
      <div class="brs-card brs-none" *ngIf="!b.resource">
        <div class="brs-header">Assigned Resource</div>
        <p class="brs-none-text">No resource assigned to this booking.</p>
      </div>
    </section>
  `,
  styles: [`
    .brs{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .brs-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .brs-header{font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.06em;margin-bottom:10px}
    .brs-resource{display:flex;align-items:center;gap:14px;margin-bottom:12px}
    .brs-icon{font-size:28px}
    .brs-info{display:grid;gap:2px}
    .brs-name{font-weight:700;font-size:16px;color:#1f2937}
    .brs-type{font-size:13px;color:#6b7280}
    .brs-link{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.08);text-decoration:none}
    .brs-link:hover{background:rgba(245,158,11,.14)}
    .brs-none-text{color:#9ca3af;font-size:14px;margin:0}
  `]
})
export class BookingResourcesSectionComponent {
  state = inject(BookingDetailStateService);
}
