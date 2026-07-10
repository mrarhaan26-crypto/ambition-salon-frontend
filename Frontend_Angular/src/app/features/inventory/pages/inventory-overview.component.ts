import { Component, inject, computed, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventoryDetailStateService } from '../inventory-detail-state.service';
import { InventoryService } from '../inventory.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-inventory-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="io-container">
      <div *ngIf="state.loading()" class="io-state loading"><div class="spinner"></div><p>Loading product…</p></div>
      <div *ngIf="state.error()" class="io-state error"><span class="state-icon">⚠️</span><p>{{ state.error() }}</p></div>

      <ng-container *ngIf="!state.loading() && !state.error() && state.product()">
        <div class="io-hero">
          <div class="io-hero-icon">📦</div>
          <div class="io-hero-info">
            <div class="io-hero-row">
              <h2>{{ state.productName() }}</h2>
              <span class="io-status" [class]="stockStatusClass()">{{ state.stockStatus() }}</span>
              <span class="io-active" [class.active]="state.productIsActive()" [class.inactive]="!state.productIsActive()">
                {{ state.productIsActive() ? 'Active' : 'Archived' }}
              </span>
            </div>
            <div class="io-hero-meta">
              <span *ngIf="state.productSku()">SKU: {{ state.productSku() }}</span>
              <span *ngIf="state.productCategory()">Category: {{ state.productCategory() }}</span>
            </div>
          </div>
        </div>

        <div class="io-kpis">
          <div class="io-kpi"><span>Quantity</span><strong>{{ state.productQuantity() }} {{ state.productUnit() }}</strong></div>
          <div class="io-kpi"><span>Min Stock</span><strong>{{ state.productMinStock() }} {{ state.productUnit() }}</strong></div>
          <div class="io-kpi"><span>Price</span><strong>{{ state.productPrice() | currency:'USD':'symbol':'1.2-2' }}</strong></div>
          <div class="io-kpi"><span>Stock Value</span><strong>{{ stockValue() | currency:'USD':'symbol':'1.2-2' }}</strong></div>
        </div>

        <div class="io-card" *ngIf="state.product()?.description">
          <h3>Description</h3>
          <p>{{ state.product()?.description }}</p>
        </div>

        <div class="io-actions">
          <button class="io-btn" (click)="showAdjustForm.set(true)" [disabled]="!state.productIsActive()">Adjust Stock</button>
          <button class="io-btn io-btn-secondary" (click)="toggleActive()">
            {{ state.productIsActive() ? 'Archive Product' : 'Activate Product' }}
          </button>
        </div>

        <div class="io-drawer-overlay" *ngIf="showAdjustForm()" (click)="showAdjustForm.set(false)">
          <div class="io-drawer" (click)="$event.stopPropagation()">
            <div class="io-drawer-head"><h3>Adjust Stock</h3><button class="io-icon-btn" (click)="showAdjustForm.set(false)">x</button></div>
            <div class="io-drawer-current">
              <span>Current</span><strong>{{ state.productQuantity() }} {{ state.productUnit() }}</strong>
              <span>Projected</span><strong>{{ projectedQty() }} {{ state.productUnit() }}</strong>
            </div>
            <div class="io-drawer-fields">
              <label>Type<select [(ngModel)]="adjustType"><option value="IN">IN - Add stock</option><option value="OUT">OUT - Remove stock</option><option value="ADJUSTMENT">ADJUSTMENT - Set quantity</option></select></label>
              <label>Quantity<input [(ngModel)]="adjustQty" type="number" min="1"></label>
              <label>Notes<input [(ngModel)]="adjustNotes" placeholder="Reason"></label>
            </div>
            <div class="io-drawer-error" *ngIf="adjustError()">{{ adjustError() }}</div>
            <div class="io-drawer-actions"><button class="io-btn io-btn-ghost" (click)="showAdjustForm.set(false)">Cancel</button><button class="io-btn" (click)="doAdjust()" [disabled]="adjustBusy()">Apply</button></div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .io-container{padding:0 4px;max-width:960px}
    .io-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .io-state.loading{display:flex;align-items:center;justify-content:center;gap:12px;color:var(--text-soft,#64748b)}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:#84cc16;border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .io-hero{display:flex;gap:16px;padding:20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px;margin-bottom:16px}
    .io-hero-icon{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#84cc16,#22c55e);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0}
    .io-hero-info{flex:1;min-width:0}
    .io-hero-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
    .io-hero-row h2{margin:0;font-size:20px;font-weight:800;color:var(--text-strong,#111827)}
    .io-status{padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700}
    .io-status.In{background:#dcfce7;color:#166534}.io-status.Low{background:#fef3c7;color:#92400e}.io-status.Out{background:#fef2f2;color:#991b1b}.io-status.Archived{background:#f3f4f6;color:#4b5563}
    .io-active{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .io-active.active{background:#dcfce7;color:#166534}.io-active.inactive{background:#f3f4f6;color:#4b5563}
    .io-hero-meta{font-size:12px;color:var(--text-soft,#64748b);display:flex;flex-wrap:wrap;gap:8px}
    .io-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
    .io-kpi{text-align:center;padding:16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px}
    .io-kpi span{display:block;font-size:11px;color:var(--text-soft,#64748b);font-weight:700;text-transform:uppercase;margin-bottom:6px}
    .io-kpi strong{font-size:20px;color:var(--text-strong,#111827)}
    .io-card{background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;padding:18px;margin-bottom:16px}
    .io-card h3{margin:0 0 8px;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .io-card p{margin:0;color:var(--text-soft,#64748b);font-size:14px;line-height:1.5}
    .io-actions{display:flex;gap:10px;margin-bottom:16px}
    .io-btn{display:inline-flex;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;border:0;cursor:pointer;background:linear-gradient(135deg,#84cc16,#22c55e);color:#fff}
    .io-btn-secondary{background:var(--surface-muted,#f1f5f9);color:var(--text-strong,#111827)}
    .io-btn-ghost{background:var(--surface-muted,#f1f5f9);color:var(--text-strong,#111827)}
    .io-btn:disabled{opacity:.5;cursor:not-allowed}
    .io-drawer-overlay{position:fixed;inset:0;background:rgba(15,23,42,.38);display:flex;justify-content:flex-end;z-index:50}
    .io-drawer{background:white;width:min(480px,100%);padding:24px;overflow-y:auto}
    .io-drawer-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .io-drawer-head h3{margin:0;font-size:18px;font-weight:800}
    .io-icon-btn{width:34px;height:34px;border:1px solid #e5e7eb;background:white;border-radius:10px;font-weight:900;cursor:pointer}
    .io-drawer-current{display:grid;grid-template-columns:1fr auto;gap:8px;background:#f8fafc;border:1px solid #eef2f7;border-radius:14px;padding:14px;margin-bottom:14px}
    .io-drawer-current span{color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase}
    .io-drawer-fields label{display:grid;gap:5px;margin-bottom:12px;font-size:12px;font-weight:700;color:#64748b}
    .io-drawer-fields input,.io-drawer-fields select{padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;min-width:0}
    .io-drawer-error{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;color:#991b1b;font-size:12px;margin-bottom:12px}
    .io-drawer-actions{display:flex;gap:10px;justify-content:flex-end}
    @media(max-width:600px){.io-kpis{grid-template-columns:repeat(2,1fr)}}
  `]
})
export class InventoryOverviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(InventoryService);
  state = inject(InventoryDetailStateService);

  showAdjustForm = signal(false);
  adjustType = signal('IN');
  adjustQty = signal(1);
  adjustNotes = signal('');
  adjustError = signal('');
  adjustBusy = signal(false);

  readonly stockValue = computed(() => {
    return Math.max(0, Number(this.state.productQuantity()) || 0) * Math.max(0, Number(this.state.productPrice()) || 0);
  });

  readonly stockStatusClass = computed(() => {
    const status = this.state.stockStatus();
    if (status === 'In Stock') return 'In';
    if (status === 'Low Stock') return 'Low';
    if (status === 'Out of Stock') return 'Out';
    return 'Archived';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }

  toggleActive() {
    const p = this.state.product();
    if (!p) return;
    this.api.update(p.id, { isActive: !p.isActive }).pipe(catchError(() => of(null))).subscribe(() => this.state.refresh());
  }

  doAdjust() {
    const p = this.state.product();
    if (!p) return;
    this.adjustError.set('');
    const qty = Number(this.adjustQty());
    if (!qty || qty <= 0) { this.adjustError.set('Quantity must be greater than zero.'); return; }
    this.adjustBusy.set(true);
    this.api.adjustStock(p.id, { type: this.adjustType(), quantity: qty, notes: String(this.adjustNotes()).trim() })
      .pipe(catchError(err => { this.adjustError.set(err?.error?.message || 'Adjustment failed.'); this.adjustBusy.set(false); return of(null); }))
      .subscribe(() => { if (!this.adjustError()) { this.adjustBusy.set(false); this.showAdjustForm.set(false); this.state.refresh(); } });
  }

  get projectedQty() {
    const current = Number(this.state.productQuantity()) || 0;
    const qty = Number(this.adjustQty()) || 0;
    return () => {
      if (this.adjustType() === 'IN') return current + qty;
      if (this.adjustType() === 'OUT') return Math.max(0, current - qty);
      return qty;
    };
  }
}
