import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';
import { FormsService } from '../forms/forms.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-booking-forms-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bfs">
      <div class="bfs-card">
        <h3 class="bfs-title">Booking Forms</h3>
        <div class="bfs-loading" *ngIf="loading">Loading forms...</div>
        <div class="bfs-empty" *ngIf="!loading && forms.length === 0">
          <p>No forms associated with this booking.</p>
        </div>
        <div class="bfs-list" *ngIf="!loading && forms.length > 0">
          <div class="bfs-item" *ngFor="let f of forms">
            <span class="bfs-icon">&#x1F4CB;</span>
            <div class="bfs-info">
              <span class="bfs-name">{{ f.name || f.title || 'Form' }}</span>
            </div>
            <span class="bfs-status">{{ f.status || 'Pending' }}</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .bfs{display:grid;gap:16px;max-width:640px;padding:4px 0}
    .bfs-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bfs-title{font-size:14px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em;padding-bottom:10px;border-bottom:1px solid #f3f4f6}
    .bfs-loading,.bfs-empty{padding:12px 0;color:#9ca3af;font-size:13px}
    .bfs-list{display:grid;gap:6px}
    .bfs-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6}
    .bfs-item:last-child{border-bottom:0}
    .bfs-icon{font-size:20px}
    .bfs-info{flex:1}
    .bfs-name{font-weight:600;font-size:14px;color:#374151}
    .bfs-status{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e}
  `]
})
export class BookingFormsSectionComponent implements OnInit {
  private state = inject(BookingDetailStateService);
  private formsService = inject(FormsService);
  forms: any[] = [];
  loading = true;

  ngOnInit(): void {
    const clientId = this.state.booking()?.clientId;
    if (clientId) {
      this.formsService.getAll({ clientId } as any).pipe(
        catchError(() => of([]))
      ).subscribe((f: any) => {
        this.forms = Array.isArray(f) ? f : [];
        this.loading = false;
      });
    } else {
      this.loading = false;
    }
  }
}
