import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { WalletService } from '../wallet/wallet.service';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { Client360StateService } from './client-360-state.service';

@Component({
  selector: 'app-client-wallet',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cw-container" role="region" aria-label="Wallet">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading wallet…</p></div>
      <ng-container *ngIf="!loading()">
        <div class="cw-hero">
          <div class="cw-balance">₹{{ state.walletBalance().toLocaleString() }}</div>
          <div class="cw-balance-label">Wallet Balance</div>
        </div>
        <div class="cw-header"><h3>Transactions</h3></div>
        <div *ngIf="transactions().length === 0" class="empty-state">No wallet transactions yet</div>
        <div class="cw-card" *ngFor="let t of transactions(); trackBy: trackById">
          <div class="cw-type" [class.credit]="t.type==='CREDIT'" [class.debit]="t.type==='DEBIT'">{{ t.type }}</div>
          <div class="cw-amount" [class.credit]="t.type==='CREDIT'" [class.debit]="t.type==='DEBIT'">{{ t.type === 'CREDIT' ? '+' : '-' }}₹{{ t.amount }}</div>
          <div class="cw-meta">{{ t.notes || '' }} · Balance: ₹{{ t.balanceAfter }} · {{ t.createdAt | date:'mediumDate' }}</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cw-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .cw-hero{text-align:center;padding:28px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-radius:16px;margin-bottom:16px}
    .cw-balance{font-size:42px;font-weight:800;color:#1e40af}
    .cw-balance-label{font-size:14px;color:#1e3a5f;font-weight:600}
    .cw-header{margin-bottom:12px}
    .cw-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cw-card{padding:12px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;margin-bottom:6px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    .cw-type{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569}
    .cw-type.credit{background:#f0fdf4;color:#166534}
    .cw-type.debit{background:#fef2f2;color:#991b1b}
    .cw-amount{font-size:14px;font-weight:700}
    .cw-amount.credit{color:#166534}
    .cw-amount.debit{color:#dc2626}
    .cw-meta{font-size:12px;color:var(--text-soft,#64748b);flex:1}
  `]
})
export class ClientWalletComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private walletService = inject(WalletService);
  state = inject(Client360StateService);
  private destroy$ = new Subject<void>();
  readonly transactions = signal<any[]>([]);
  readonly loading = signal(true);
  trackById(_i: number, item: any): string { return item.id; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    const id = this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
    this.walletService.getClientWallet(clientId).pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$)
    ).subscribe((res: any) => {
      this.transactions.set(res?.transactions || []);
      this.loading.set(false);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
