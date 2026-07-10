import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PayrollService } from './payroll.service';
import { PayrollRecord, PayrollSummary } from './payroll.models';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Payroll</h1><p>Staff payroll processing and history.</p></div><button class="primary" (click)="openForm()">+ New Record</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="summary">
          <div class="kpi-card"><span class="kpi-lbl">Total Payroll</span><span class="kpi-val">{{ summary.totalPayroll | currency }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Staff Count</span><span class="kpi-val">{{ summary.totalStaff }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Average Pay</span><span class="kpi-val">{{ summary.averagePay | currency }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Pending</span><span class="kpi-val warn">{{ summary.pendingCount }}</span></div>
        </div>

        <div class="toolbar">
          <select [(ngModel)]="statusFilter" (change)="load()"><option value="">All Status</option><option value="DRAFT">Draft</option><option value="PROCESSED">Processed</option><option value="PAID">Paid</option></select>
          <input [(ngModel)]="periodFilter" placeholder="Period (e.g. 2026-07)" (input)="load()">
        </div>

        <div class="empty" *ngIf="items.length===0"><p>No payroll records found.</p></div>
        <div class="table-wrap" *ngIf="items.length>0">
          <div class="table">
            <div class="table-row header">
              <span>Staff</span><span>Period</span><span>Salary</span><span>Commission</span><span>Tips</span><span>Deductions</span><span>Net Pay</span><span>Status</span><span>Actions</span>
            </div>
            <div class="table-row" *ngFor="let p of items">
              <span class="tcell-name">{{ p.staffName }}</span>
              <span>{{ p.period }}</span>
              <span>{{ p.baseSalary | currency }}</span>
              <span>{{ p.commissions | currency }}</span>
              <span>{{ p.tips | currency }}</span>
              <span class="negative">-{{ p.deductions | currency }}</span>
              <span class="net-pay">{{ p.netPay | currency }}</span>
              <span><span class="status-badge" [class.draft]="p.status==='DRAFT'" [class.processed]="p.status==='PROCESSED'" [class.paid]="p.status==='PAID'">{{ p.status }}</span></span>
              <span class="actions">
                <button *ngIf="p.status==='DRAFT'" (click)="process(p)">Process</button>
                <button *ngIf="p.status==='PROCESSED'" (click)="markPaid(p)">Mark Paid</button>
                <button class="btn-remove" *ngIf="p.status==='DRAFT'" (click)="confirmDelete(p)">Delete</button>
              </span>
            </div>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>New Payroll Record</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Staff ID</label><input [(ngModel)]="form.staffId" placeholder="Staff ID"></div>
          <div class="form-group"><label>Period</label><input [(ngModel)]="form.period" placeholder="e.g. 2026-07"></div>
          <div class="form-group"><label>Base Salary ($)</label><input [(ngModel)]="form.baseSalary" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Commissions ($)</label><input [(ngModel)]="form.commissions" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Tips ($)</label><input [(ngModel)]="form.tips" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Bonuses ($)</label><input [(ngModel)]="form.bonuses" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Deductions ($)</label><input [(ngModel)]="form.deductions" type="number" min="0" step="0.01"></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Creating...' : 'Create' }}</button></div>
        </div>
      </div>
    </div>

    <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete=false">
      <div class="confirm-panel" (click)="$event.stopPropagation()">
        <h3>Confirm Delete</h3><p>{{ deleteMsg }}</p>
        <div class="confirm-actions"><button (click)="showDelete=false">Cancel</button><button class="btn-danger" (click)="doDelete()">Delete</button></div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .btn-remove{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;display:grid;gap:4px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-lbl{font-size:13px;color:#6b7280;font-weight:600}.kpi-val{font-size:28px;font-weight:800}
    .kpi-val.warn{color:#d97706}
    .toolbar{display:flex;gap:10px}
    .toolbar select,.toolbar input{padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .table-wrap{overflow-x:auto}
    .table{display:grid;gap:2px;min-width:800px}
    .table-row{display:grid;grid-template-columns:1.2fr 0.7fr 0.7fr 0.7fr 0.6fr 0.6fr 0.7fr 0.7fr 0.8fr;padding:12px 16px;background:#f8fafc;border-radius:8px;align-items:center;gap:8px}
    .table-row.header{font-weight:700;font-size:12px;color:#6b7280;background:transparent;padding:8px 16px}
    .tcell-name{font-weight:600}
    .negative{color:#991b1b;font-weight:600}
    .net-pay{font-weight:800;font-size:15px}
    .status-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px}
    .status-badge.draft{background:#f3f4f6;color:#6b7280}
    .status-badge.processed{background:#fffbeb;color:#d97706}
    .status-badge.paid{background:#f0fdf4;color:#16a34a}
    .actions{display:flex;gap:4px}
    .actions button{border:1px solid #e5e7eb;border-radius:6px;padding:5px 8px;font-weight:600;cursor:pointer;background:white;font-size:10px}
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
    @media(max-width:900px){.drawer-panel{width:100%}.kpis{grid-template-columns:repeat(2,1fr)}}
  `]
})
export class PayrollComponent {
  private api = inject(PayrollService);
  items: PayrollRecord[] = []; summary: PayrollSummary | null = null;
  loading = true; error = '';
  statusFilter = ''; periodFilter = '';
  showForm = false;
  form: any = { staffId: '', period: '', baseSalary: 0, commissions: 0, tips: 0, bonuses: 0, deductions: 0 };
  formMsg = ''; formBusy = false;
  showDelete = false; deleteMsg = ''; deleteAction: (() => void) | null = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getAll({ status: this.statusFilter || undefined, period: this.periodFilter || undefined }).subscribe({
      next: d => { this.items = d; this.loading = false; },
      error: () => { this.error = 'Payroll unavailable.'; this.loading = false; },
    });
    this.api.getSummary().subscribe({ next: d => this.summary = d });
  }
  openForm() { this.form = { staffId: '', period: '', baseSalary: 0, commissions: 0, tips: 0, bonuses: 0, deductions: 0 }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  save() {
    this.formBusy = true; this.formMsg = '';
    this.api.create(this.form).subscribe({
      next: () => { this.closeForm(); this.formBusy = false; this.load(); },
      error: () => { this.formMsg = 'Failed to create payroll record.'; this.formBusy = false; },
    });
  }
  process(p: PayrollRecord) {
    this.api.process(p.id).subscribe({ next: () => this.load() });
  }
  markPaid(p: PayrollRecord) {
    this.api.markPaid(p.id).subscribe({ next: () => this.load() });
  }
  confirmDelete(p: PayrollRecord) { this.deleteMsg = `Delete payroll for ${p.staffName} (${p.period})?`; this.deleteAction = () => { this.api.remove(p.id).subscribe({ next: () => { this.showDelete = false; this.load(); } }); }; this.showDelete = true; }
  doDelete() { if (this.deleteAction) this.deleteAction(); }
}
