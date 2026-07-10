import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';
import { StaffService } from '../staff.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-staff-performance',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spf-container" role="region" aria-label="Staff Performance">
      <div *ngIf="loading()" class="spf-state loading" role="status">
        <div class="spinner"></div><p>Loading performance data…</p>
      </div>
      <div *ngIf="error()" class="spf-state error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="spf-empty" *ngIf="!perfData()">
          <p>Performance data unavailable. Real metrics will appear once bookings and services data is collected.</p>
        </div>

        <div class="spf-grid" *ngIf="perfData()">
          <div class="spf-card"><span>Total Bookings</span><strong>{{ perfData()?.summary?.totalBookings ?? '—' }}</strong></div>
          <div class="spf-card"><span>Completed</span><strong class="green">{{ perfData()?.summary?.completedBookings ?? '—' }}</strong></div>
          <div class="spf-card"><span>Cancelled</span><strong class="red">{{ perfData()?.summary?.cancelledBookings ?? '—' }}</strong></div>
          <div class="spf-card"><span>No-show</span><strong class="amber">{{ perfData()?.summary?.noShowBookings ?? '—' }}</strong></div>
          <div class="spf-card"><span>Revenue</span><strong>{{ perfData()?.summary?.revenue ? (perfData()?.summary?.revenue | currency:'USD':'symbol':'1.0-0') : '—' }}</strong></div>
          <div class="spf-card"><span>Completion Rate</span><strong>{{ perfData()?.summary?.completionRate ?? '—' }}{{ perfData()?.summary?.completionRate !== undefined ? '%' : '' }}</strong></div>
          <div class="spf-card"><span>Average Ticket</span><strong>{{ perfData()?.summary?.averageTicket ? (perfData()?.summary?.averageTicket | currency:'USD':'symbol':'1.0-0') : '—' }}</strong></div>
          <div class="spf-card"><span>Avg Rating</span><strong>{{ perfData()?.summary?.averageRating ?? '—' }}</strong></div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .spf-container{padding:0 4px;max-width:960px}
    .spf-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spf-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .spf-empty{padding:40px 20px;text-align:center;color:var(--text-soft,#64748b);background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
    .spf-card{padding:18px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;text-align:center}
    .spf-card span{display:block;font-size:12px;color:var(--text-soft,#64748b);margin-bottom:6px}
    .spf-card strong{font-size:22px;color:var(--text-strong,#111827)}
    .green{color:#166534}.red{color:#dc2626}.amber{color:#d97706}
  `]
})
export class StaffPerformanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(StaffService);
  state = inject(StaffDetailStateService);
  loading = signal(true);
  error = signal('');
  perfData = signal<any>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.api.getPerformance(id).pipe(catchError(() => { this.error.set('Performance data unavailable'); this.loading.set(false); return of(null); }))
        .subscribe(d => { this.perfData.set(d); this.loading.set(false); });
    }
  }
}
