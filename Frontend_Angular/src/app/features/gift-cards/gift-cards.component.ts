import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GiftCardsService } from './gift-cards.service';

@Component({
  selector: 'app-gift-cards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Gift Cards</h1>
          <p>Create and manage gift cards.</p>
        </div>
        <button class="primary" (click)="openCreate()">+ New Gift Card</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading gift cards...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card"><span>Total Cards</span><strong>{{ items.length }}</strong></div>
          <div class="kpi-card"><span>Active</span><strong>{{ countByStatus('ACTIVE') }}</strong></div>
          <div class="kpi-card"><span>Redeemed</span><span class="value">{{ countByStatus('REDEEMED') }}</span></div>
        </div>

        <div class="panel">
          <h2>All Gift Cards</h2>
          <div class="empty" *ngIf="items.length === 0"><p>No gift cards yet.</p></div>
          <div class="table" *ngIf="items.length > 0">
            <div class="table-row header">
              <span>Code</span><span>Client</span><span>Balance</span><span>Status</span><span>Expires</span><span>Actions</span>
            </div>
            <div class="table-row" *ngFor="let g of items">
              <span class="code">{{ g.code }}</span>
              <span>{{ g.client?.fullName || 'Unassigned' }}</span>
              <span class="balance">{{ g.balance | currency }} / {{ g.initialBalance | currency }}</span>
              <span><span class="status-badge" [class.active]="g.status === 'ACTIVE'" [class.redeemed]="g.status === 'REDEEMED'" [class.expired]="g.status === 'EXPIRED'">{{ g.status }}</span></span>
              <span>{{ g.expiresAt ? (g.expiresAt | date:'MMM dd, yyyy') : 'No expiry' }}</span>
              <span class="actions">
                <button (click)="editItem(g)">Edit</button>
              </span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer" *ngIf="showForm">
        <div class="drawer-panel">
          <h2>{{ editingId ? 'Edit Gift Card' : 'New Gift Card' }}</h2>
          <div class="form">
            <input [(ngModel)]="form.code" placeholder="Card code (e.g. GIFT-001)">
            <input [(ngModel)]="form.initialBalance" type="number" step="0.01" placeholder="Initial balance">
            <select [(ngModel)]="form.status">
              <option value="ACTIVE">Active</option>
              <option value="REDEEMED">Redeemed</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <input [(ngModel)]="form.expiresAt" type="date" placeholder="Expiry date">
            <div class="form-actions">
              <button type="button" (click)="showForm = false">Cancel</button>
              <button (click)="save()">{{ editingId ? 'Update' : 'Create' }}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong,.kpi-card .value{font-size:24px;font-weight:700}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .table{display:grid;gap:2px}
    .table-row{display:grid;grid-template-columns:1fr 1.5fr 1fr 1fr 1fr 0.8fr;padding:12px 16px;background:#f8fafc;border-radius:8px;align-items:center;gap:8px}
    .table-row.header{font-weight:700;font-size:12px;color:#6b7280;background:transparent}
    .code{font-family:monospace;font-weight:700}
    .balance{font-weight:600}
    .status-badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .status-badge.active{background:#f0fdf4;color:#16a34a}
    .status-badge.redeemed{background:#f3f4f6;color:#6b7280}
    .status-badge.expired{background:#fee2e2;color:#991b1b}
    .actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(440px,90%)}
    .drawer-panel h2{margin:0 0 20px}
    .form{display:grid;gap:12px}
    .form input,select{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    @media(max-width:1000px){.table-row{grid-template-columns:1fr 1fr 1fr;gap:4px}}
  `]
})
export class GiftCardsComponent {
  private api = inject(GiftCardsService);
  items: any[] = [];
  loading = true;
  error = '';
  showForm = false;
  editingId = '';
  form: any = { code: '', initialBalance: 0, status: 'ACTIVE', expiresAt: '' };

  countByStatus(status: string) { return this.items.filter(c => c.status === status).length; }

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({ next: (d) => { this.items = d; this.loading = false; }, error: () => { this.error = 'Failed to load gift cards.'; this.loading = false; } });
  }

  openCreate() { this.editingId = ''; this.form = { code: '', initialBalance: 0, status: 'ACTIVE', expiresAt: '' }; this.showForm = true; }

  editItem(g: any) { this.editingId = g.id; this.form = { code: g.code, initialBalance: g.initialBalance, status: g.status, expiresAt: g.expiresAt ? g.expiresAt.slice(0, 10) : '' }; this.showForm = true; }

  save() {
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.showForm = false; this.loadAll(); } });
  }
}
