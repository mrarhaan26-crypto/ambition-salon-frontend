import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';
import { CommissionsService } from '../../commissions/commissions.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-staff-commission',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scm-container" role="region" aria-label="Staff Commission">
      <div *ngIf="loading()" class="scm-state loading" role="status">
        <div class="spinner"></div><p>Loading commission data…</p>
      </div>
      <div *ngIf="error()" class="scm-state error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="scm-summary" *ngIf="summary()">
          <div class="scm-stat"><span>Total</span><strong>{{ summary()?.total ?? 0 | currency:'USD':'symbol':'1.0-0' }}</strong></div>
          <div class="scm-stat"><span>Pending</span><strong class="amber">{{ summary()?.pending ?? 0 | currency:'USD':'symbol':'1.0-0' }}</strong></div>
          <div class="scm-stat"><span>Approved</span><strong class="green">{{ summary()?.approved ?? 0 | currency:'USD':'symbol':'1.0-0' }}</strong></div>
          <div class="scm-stat"><span>Paid</span><strong>{{ summary()?.paid ?? 0 | currency:'USD':'symbol':'1.0-0' }}</strong></div>
        </div>

        <div class="scm-empty" *ngIf="payments().length === 0">
          <p>No commission payments found.</p>
        </div>

        <div class="scm-list" *ngIf="payments().length > 0">
          <div class="scm-item" *ngFor="let p of payments()">
            <div class="scm-item-head">
              <strong>{{ p.description || 'Commission Payment' }}</strong>
              <span class="scm-status" [class]="p.status?.toLowerCase()">{{ p.status }}</span>
            </div>
            <div class="scm-item-body">
              <span>{{ p.amount | currency:'USD':'symbol':'1.0-0' }}</span>
              <span *ngIf="p.date">· {{ p.date | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .scm-container{padding:0 4px;max-width:960px}
    .scm-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .scm-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .scm-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
    .scm-stat{text-align:center;padding:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px}
    .scm-stat span{display:block;font-size:12px;color:var(--text-soft,#64748b);margin-bottom:4px}
    .scm-stat strong{font-size:18px;color:var(--text-strong,#111827)}.green{color:#166534}.amber{color:#d97706}
    .scm-empty{padding:40px 20px;text-align:center;color:var(--text-soft,#64748b);background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .scm-list{display:grid;gap:8px}
    .scm-item{padding:12px 14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px}
    .scm-item-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
    .scm-item-head strong{color:var(--text-strong,#111827);font-size:13px}
    .scm-status{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .scm-status.pending{background:#fef3c7;color:#92400e}
    .scm-status.approved{background:#dbeafe;color:#1e40af}
    .scm-status.paid{background:#dcfce7;color:#166534}
    .scm-item-body{font-size:12px;color:var(--text-soft,#64748b);display:flex;gap:8px}
  `]
})
export class StaffCommissionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private commissionApi = inject(CommissionsService);
  state = inject(StaffDetailStateService);
  loading = signal(true);
  error = signal('');
  payments = signal<any[]>([]);
  summary = signal<any>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.loadData(id);
    }
  }

  private loadData(id: string) {
    this.commissionApi.getByStaff(id).pipe(catchError(() => { this.error.set('Commission data unavailable'); this.loading.set(false); return of([]); }))
      .subscribe(d => { this.payments.set(Array.isArray(d) ? d : []); this.loading.set(false); });
    this.commissionApi.getSummary().pipe(catchError(() => of(null)))
      .subscribe(d => this.summary.set(d));
  }
}
