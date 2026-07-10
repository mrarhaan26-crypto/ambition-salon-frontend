import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

@Component({
  selector: 'app-booking-notes-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bns" *ngIf="state.booking() as b">
      <div class="bns-card">
        <h3 class="bns-title">Booking Notes</h3>
        <div class="bns-content" *ngIf="b.notes; else noNotes">
          <p>{{ b.notes }}</p>
          <span class="bns-meta">Added during booking creation</span>
        </div>
        <ng-template #noNotes>
          <div class="bns-empty">
            <p>No notes attached to this booking.</p>
          </div>
        </ng-template>
      </div>
    </section>
  `,
  styles: [`
    .bns{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .bns-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bns-title{font-size:14px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em;padding-bottom:10px;border-bottom:1px solid #f3f4f6}
    .bns-content p{margin:0 0 8px;font-size:14px;color:#4b5563;line-height:1.6;white-space:pre-wrap}
    .bns-meta{font-size:12px;color:#9ca3af}
    .bns-empty{padding:12px 0;color:#9ca3af;font-size:13px}
  `]
})
export class BookingNotesSectionComponent {
  state = inject(BookingDetailStateService);
}
