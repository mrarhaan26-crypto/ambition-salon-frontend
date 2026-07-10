import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';
import { InventoryService } from '../inventory.service';
import { InventoryTransaction } from '../inventory.models';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-inventory-transactions',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="it-container">
      <div *ngIf="loading()" class="it-state loading"><div class="spinner"></div><p>Loading transactions…</p></div>
      <div *ngIf="error()" class="it-state error"><span class="state-icon">⚠️</span><p>{{ error() }}</p></div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="it-summary" *ngIf="summary(); let s">
          <div class="it-stat"><span>Total IN</span><strong>{{ s.totalIn }}</strong></div>
          <div class="it-stat"><span>Total OUT</span><strong>{{ s.totalOut }}</strong></div>
          <div class="it-stat"><span>Adjustments</span><strong>{{ s.adjustments }}</strong></div>
        </div>

        <div class="it-empty" *ngIf="transactions().length === 0">
          <strong>No stock movements yet.</strong>
          <p>Adjust stock to create the first inventory transaction.</p>
        </div>

        <div class="it-list" *ngIf="transactions().length > 0">
          <div class="it-item" *ngFor="let tx of transactions()">
            <span class="it-type" [class]="tx.type.toLowerCase()">{{ tx.type }}</span>
            <strong>{{ tx.quantity }}</strong>
            <span class="it-date">{{ tx.createdAt | date:'MMM dd, yyyy h:mm a' }}</span>
            <p class="it-notes">{{ tx.notes || 'No notes' }}</p>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .it-container{padding:0 4px;max-width:960px}
    .it-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .it-state.loading{display:flex;align-items:center;justify-content:center;gap:12px;color:var(--text-soft,#64748b)}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:#84cc16;border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .it-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
    .it-stat{text-align:center;padding:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px}
    .it-stat span{display:block;font-size:11px;color:var(--text-soft,#64748b);font-weight:700;text-transform:uppercase;margin-bottom:4px}
    .it-stat strong{font-size:22px;color:var(--text-strong,#111827)}
    .it-empty{padding:40px 20px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;color:var(--text-soft,#64748b)}
    .it-empty strong{color:var(--text-strong,#111827);display:block;margin-bottom:4px}
    .it-list{display:grid;gap:8px}
    .it-item{display:grid;grid-template-columns:auto auto 1fr;gap:10px;align-items:center;padding:12px 14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px}
    .it-type{padding:4px 9px;border-radius:999px;font-size:11px;font-weight:900}
    .it-type.in{background:#dcfce7;color:#166534}
    .it-type.out{background:#fef2f2;color:#991b1b}
    .it-type.adjustment{background:#eff6ff;color:#1d4ed8}
    .it-date{font-size:12px;color:var(--text-soft,#64748b)}
    .it-notes{grid-column:1/4;margin:0;font-size:13px;color:var(--text-soft,#64748b)}
  `]
})
export class InventoryTransactionsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(InventoryService);
  state = inject(InventoryDetailStateService);

  loading = signal(true);
  error = signal('');
  transactions = signal<InventoryTransaction[]>([]);

  summary = signal<{ totalIn: number; totalOut: number; adjustments: number } | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.api.getTransactions(id).pipe(catchError(err => {
        this.error.set(err?.error?.message || 'Transactions unavailable.');
        this.loading.set(false);
        return of([]);
      })).subscribe(list => {
        const txns = Array.isArray(list) ? list : [];
        this.transactions.set(txns);
        this.summary.set({
          totalIn: txns.filter(t => t.type === 'IN').length,
          totalOut: txns.filter(t => t.type === 'OUT').length,
          adjustments: txns.filter(t => t.type === 'ADJUSTMENT').length,
        });
        this.loading.set(false);
      });
    }
  }
}
