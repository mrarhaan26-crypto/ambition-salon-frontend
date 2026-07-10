import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { InvoicesService } from '../invoices/invoices.service';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-client-invoices',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ci-container" role="region" aria-label="Invoices">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading invoices…</p></div>
      <ng-container *ngIf="!loading()">
        <div class="ci-header"><h3>Invoices</h3><span class="ci-count">{{ invoices().length }} total</span></div>
        <div *ngIf="invoices().length === 0" class="empty-state">No invoices found</div>
        <div class="ci-card" *ngFor="let inv of invoices(); trackBy: trackById">
          <div class="ci-top"><span class="ci-number">{{ inv.invoiceNumber || inv.id.slice(0,8) }}</span><span class="ci-status" [class]="'cis-' + inv.status.toLowerCase()">{{ inv.status }}</span></div>
          <div class="ci-meta">₹{{ inv.total }} · {{ inv.createdAt | date:'mediumDate' }}</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .ci-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .ci-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .ci-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .ci-count{font-size:12px;color:var(--text-soft,#64748b)}
    .ci-card{padding:12px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;margin-bottom:6px}
    .ci-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
    .ci-number{font-size:14px;font-weight:600;color:var(--text-strong,#111827)}
    .ci-status{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .cis-issued,.cis-paid{background:#f0fdf4;color:#166534}
    .cis-draft{background:#f1f5f9;color:#475569}
    .cis-void{background:#fef2f2;color:#991b1b}
    .ci-meta{font-size:12px;color:var(--text-soft,#64748b);margin-top:2px}
  `]
})
export class ClientInvoicesComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private invoicesService = inject(InvoicesService);
  private destroy$ = new Subject<void>();
  readonly invoices = signal<any[]>([]);
  readonly loading = signal(true);
  trackById(_i: number, item: any): string { return item.id; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    this.invoicesService.getAll({ clientId } as any).pipe(
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).subscribe((res: any) => {
      this.invoices.set(Array.isArray(res) ? res : res?.items || []);
      this.loading.set(false);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
