import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { Client360StateService } from './client-360-state.service';

@Component({
  selector: 'app-client-loyalty',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cl-container" role="region" aria-label="Loyalty">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading loyalty data…</p></div>
      <ng-container *ngIf="!loading()">
        <div class="cl-hero">
          <div class="cl-points">{{ state.loyaltyPoints() }}</div>
          <div class="cl-points-label">Loyalty Points</div>
        </div>
        <div class="cl-header"><h3>Reward Transactions</h3></div>
        <div *ngIf="rewards().length === 0" class="empty-state">No loyalty transactions yet</div>
        <div class="cl-card" *ngFor="let r of rewards(); trackBy: trackById">
          <div class="cl-type" [class.earned]="r.type==='EARNED'" [class.redeemed]="r.type==='REDEEMED'">{{ r.type }}</div>
          <div class="cl-points-val">{{ r.type === 'EARNED' ? '+' : '-' }}{{ r.points }} pts</div>
          <div class="cl-meta">{{ r.description || '' }} · {{ r.createdAt | date:'mediumDate' }}</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cl-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .cl-hero{text-align:center;padding:28px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:16px;margin-bottom:16px}
    .cl-points{font-size:42px;font-weight:800;color:#92400e}
    .cl-points-label{font-size:14px;color:#78350f;font-weight:600}
    .cl-header{margin-bottom:12px}
    .cl-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cl-card{padding:12px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;margin-bottom:6px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    .cl-type{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569}
    .cl-type.earned{background:#f0fdf4;color:#166534}
    .cl-type.redeemed{background:#fef2f2;color:#991b1b}
    .cl-points-val{font-size:14px;font-weight:700;color:var(--text-strong,#111827)}
    .cl-meta{font-size:12px;color:var(--text-soft,#64748b);flex:1}
  `]
})
export class ClientLoyaltyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private loyaltyService = inject(LoyaltyService);
  state = inject(Client360StateService);
  private destroy$ = new Subject<void>();
  readonly rewards = signal<any[]>([]);
  readonly loading = signal(true);
  trackById(_i: number, item: any): string { return item.id; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    const id = this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
    this.loyaltyService.getClient(clientId).pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$)
    ).subscribe((res: any) => {
      this.rewards.set(res?.transactions || res?.rewards || []);
      this.loading.set(false);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
