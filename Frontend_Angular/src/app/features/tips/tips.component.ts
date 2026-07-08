import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TipsService } from './tips.service';
import { TipRecord, TipSummary } from './tips.models';

@Component({
  selector: 'app-tips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Tips</h1><p>Tip tracking and distribution.</p></div><button class="primary" (click)="openForm()">+ Record Tip</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="summary">
          <div class="kpi-card"><span class="kpi-lbl">Total Tips</span><span class="kpi-val">{{ summary.totalTips | currency }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Cash</span><span class="kpi-val">{{ summary.totalCash | currency }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Card</span><span class="kpi-val">{{ summary.totalCard | currency }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Average/Staff</span><span class="kpi-val">{{ summary.averagePerStaff | currency }}</span></div>
        </div>

        <div class="toolbar">
          <select [(ngModel)]="typeFilter" (change)="load()"><option value="">All Types</option><option value="CASH">Cash</option><option value="CARD">Card</option><option value="POOL">Pool</option></select>
          <input [(ngModel)]="dateFrom" type="date" (change)="load()">
          <input [(ngModel)]="dateTo" type="date" (change)="load()">
        </div>

        <div class="empty" *ngIf="items.length===0"><p>No tips recorded.</p></div>
        <div class="tips-list" *ngIf="items.length>0">
          <div class="tip-row header">
            <span>Date</span><span>Staff</span><span>Type</span><span>Amount</span><span>Source</span><span>Actions</span>
          </div>
          <div class="tip-row" *ngFor="let t of items">
            <span>{{ t.date | date:'MMM dd' }}</span>
            <span class="tcell-name">{{ t.staffName }}</span>
            <span><span class="type-badge" [class.cash]="t.type==='CASH'" [class.card]="t.type==='CARD'" [class.pool]="t.type==='POOL'">{{ t.type }}</span></span>
            <span class="tip-amount">{{ t.amount | currency }}</span>
            <span class="tip-source">{{ t.source || '—' }}</span>
            <span class="actions"><button (click)="confirmDelete(t)">Delete</button></span>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>Record Tip</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Staff ID</label><input [(ngModel)]="form.staffId" placeholder="Staff ID"></div>
          <div class="form-group"><label>Date</label><input [(ngModel)]="form.date" type="date"></div>
          <div class="form-group"><label>Amount ($)</label><input [(ngModel)]="form.amount" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Type</label><select [(ngModel)]="form.type"><option value="CASH">Cash</option><option value="CARD">Card</option><option value="POOL">Pool</option></select></div>
          <div class="form-group"><label>Source</label><input [(ngModel)]="form.source" placeholder="e.g. Client name or service"></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Saving...' : 'Record' }}</button></div>
        </div>
      </div>
    </div>

    <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete=false">
      <div class="confirm-panel" (click)="$event.stopPropagation()">
        <h3>Confirm Delete</h3><p>Delete this tip record?</p>
        <div class="confirm-actions"><button (click)="showDelete=false">Cancel</button><button class="btn-danger" (click)="doDelete()">Delete</button></div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;display:grid;gap:4px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-lbl{font-size:13px;color:#6b7280;font-weight:600}.kpi-val{font-size:28px;font-weight:800}
    .toolbar{display:flex;gap:10px;margin-bottom:4px}
    .toolbar select,.toolbar input[type=date]{padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .tips-list{display:grid;gap:2px}
    .tip-row{display:grid;grid-template-columns:1fr 1.5fr 0.8fr 0.8fr 1fr 0.8fr;padding:12px 16px;background:#f8fafc;border-radius:8px;align-items:center;gap:8px}
    .tip-row.header{font-weight:700;font-size:12px;color:#6b7280;background:transparent;padding:8px 16px}
    .tcell-name{font-weight:600}
    .tip-amount{font-weight:800;font-size:15px}
    .tip-source{font-size:12px;color:#6b7280}
    .type-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px}
    .type-badge.cash{background:#f0fdf4;color:#16a34a}
    .type-badge.card{background:#eff6ff;color:#2563eb}
    .type-badge.pool{background:#fffbeb;color:#d97706}
    .actions button{border:1px solid #e5e7eb;border-radius:6px;padding:5px 10px;font-weight:600;cursor:pointer;background:white;font-size:10px}
    @media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.tip-row{grid-template-columns:1fr 1fr 1fr}}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-primary{background:#0b0b0b;color:white}
    .msg{padding:12px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;text-align:center}
    .confirm-panel{background:white;border-radius:24px;padding:28px;width:min(420px,90%)}
    .confirm-panel h3{margin:0 0 8px}
    .confirm-actions{display:flex;gap:10px;margin-top:12px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-danger{background:#fee2e2;color:#991b1b}
    @media(max-width:900px){.drawer-panel{width:100%}}
  `]
})
export class TipsComponent {
  private api = inject(TipsService);
  items: TipRecord[] = []; summary: TipSummary | null = null;
  loading = true; error = '';
  typeFilter = ''; dateFrom = ''; dateTo = '';
  showForm = false;
  form: any = { staffId: '', date: '', amount: 0, type: 'CASH', source: '' };
  formMsg = ''; formBusy = false;
  showDelete = false; deleting: TipRecord | null = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getAll({ type: this.typeFilter || undefined, from: this.dateFrom || undefined, to: this.dateTo || undefined }).subscribe({
      next: d => { this.items = d; this.loading = false; },
      error: () => { this.error = 'Tips unavailable.'; this.loading = false; },
    });
    this.api.getSummary().subscribe({ next: d => this.summary = d });
  }
  openForm() { this.form = { staffId: '', date: '', amount: 0, type: 'CASH', source: '' }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  save() {
    this.formBusy = true; this.formMsg = '';
    this.api.create(this.form).subscribe({
      next: () => { this.closeForm(); this.formBusy = false; this.load(); },
      error: () => { this.formMsg = 'Failed to record tip.'; this.formBusy = false; },
    });
  }
  confirmDelete(t: TipRecord) { this.deleting = t; this.showDelete = true; }
  doDelete() {
    if (!this.deleting) return;
    this.api.remove(this.deleting.id).subscribe({ next: () => { this.showDelete = false; this.deleting = null; this.load(); } });
  }
}
