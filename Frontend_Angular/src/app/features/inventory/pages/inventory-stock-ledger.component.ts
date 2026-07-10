import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';
import { InventoryService } from '../inventory.service';
import { StockLedgerEntry } from '../inventory.models';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-inventory-stock-ledger',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="isl-container">
      <div *ngIf="loading()" class="isl-state loading"><div class="spinner"></div><p>Loading stock ledger…</p></div>
      <div *ngIf="error()" class="isl-state error"><span class="state-icon">⚠️</span><p>{{ error() }}</p></div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="isl-empty" *ngIf="entries().length === 0">
          <strong>Stock Ledger</strong>
          <p>Ledger integration ready. Entries will appear when backend ledger API is connected.</p>
        </div>

        <div class="isl-table" *ngIf="entries().length > 0">
          <div class="isl-row isl-head">
            <span>Date</span><span>Type</span><span>In</span><span>Out</span><span>Balance</span><span>Reference</span><span>Notes</span>
          </div>
          <div class="isl-row" *ngFor="let e of entries()">
            <span>{{ e.date | date:'shortDate' }}</span>
            <span class="isl-type" [class]="e.type.toLowerCase()">{{ e.type }}</span>
            <span>{{ e.in }}</span><span>{{ e.out }}</span>
            <strong>{{ e.balance }}</strong>
            <span>{{ e.reference || '-' }}</span>
            <span>{{ e.notes || '-' }}</span>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .isl-container{padding:0 4px;max-width:960px}
    .isl-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .isl-state.loading{display:flex;align-items:center;justify-content:center;gap:12px;color:var(--text-soft,#64748b)}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:#84cc16;border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .isl-empty{padding:40px 20px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;color:var(--text-soft,#64748b)}
    .isl-empty strong{display:block;color:var(--text-strong,#111827);margin-bottom:4px}
    .isl-table{display:grid;gap:2px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;overflow:hidden}
    .isl-row{display:grid;grid-template-columns:100px 80px 60px 60px 70px 110px 1fr;gap:8px;padding:10px 14px;font-size:13px;align-items:center}
    .isl-head{background:var(--surface-muted,#f8fafc);font-size:11px;font-weight:800;color:var(--text-soft,#64748b);text-transform:uppercase}
    .isl-type{padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;justify-self:start}
    .isl-type.in{background:#dcfce7;color:#166534}
    .isl-type.out{background:#fef2f2;color:#991b1b}
    @media(max-width:700px){.isl-row{grid-template-columns:repeat(2,1fr);font-size:12px}.isl-head{display:none}}
  `]
})
export class InventoryStockLedgerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(InventoryService);
  state = inject(InventoryDetailStateService);

  loading = signal(true);
  error = signal('');
  entries = signal<StockLedgerEntry[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.api.getStockLedger(id).pipe(catchError(err => {
        this.error.set(err?.error?.message || 'Stock ledger data unavailable.');
        this.loading.set(false);
        return of([]);
      })).subscribe(list => {
        this.entries.set(Array.isArray(list) ? list : []);
        this.loading.set(false);
      });
    }
  }
}
