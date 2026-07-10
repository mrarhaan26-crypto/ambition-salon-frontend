import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { PaymentsService } from '../payments/payments.service';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-client-payments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cpy-container" role="region" aria-label="Payment History">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading payments…</p></div>
      <div *ngIf="error()" class="state-box error">⚠️ <p>{{ error() }}</p></div>
      <ng-container *ngIf="!loading() && !error()">
        <div class="cpy-header"><h3>Payments</h3><span class="cpy-count">{{ payments().length }} transactions</span></div>
        <div *ngIf="payments().length === 0" class="empty-state">No payments found</div>
        <div class="cpy-card" *ngFor="let p of payments(); trackBy: trackById">
          <div class="cpy-top"><span class="cpy-amount">₹{{ p.amount }}</span><span class="cpy-status" [class]="'cpys-' + p.status.toLowerCase()">{{ p.status }}</span></div>
          <div class="cpy-meta">{{ p.method }} · {{ p.createdAt | date:'medium' }}</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cpy-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-box.error{gap:8px}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .cpy-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .cpy-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cpy-count{font-size:12px;color:var(--text-soft,#64748b)}
    .cpy-card{padding:12px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;margin-bottom:6px}
    .cpy-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
    .cpy-amount{font-size:15px;font-weight:700;color:var(--text-strong,#111827)}
    .cpy-status{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .cpys-completed,.cpys-paid{background:#f0fdf4;color:#166534}
    .cpys-pending{background:#fef3c7;color:#92400e}
    .cpys-failed{background:#fef2f2;color:#991b1b}
    .cpy-meta{font-size:12px;color:var(--text-soft,#64748b)}
  `]
})
export class ClientPaymentsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private paymentsService = inject(PaymentsService);
  private destroy$ = new Subject<void>();
  readonly payments = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  trackById(_i: number, item: any): string { return item.id; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    this.paymentsService.getAll({ clientId } as any).pipe(
      catchError(err => { this.error.set('Failed to load payments'); this.loading.set(false); return of([]); }),
      takeUntil(this.destroy$)
    ).subscribe((res: any) => {
      this.payments.set(Array.isArray(res) ? res : res?.items || []);
      this.loading.set(false);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
