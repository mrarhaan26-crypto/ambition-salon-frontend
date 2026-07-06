import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommissionsService } from './commissions.service';

@Component({
  selector: 'app-commissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Commissions</h1>
          <p>Staff commission management.</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading commissions...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load commissions.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">

        <ng-container *ngIf="!data && !summary && !rules">
          <div class="empty"><p>No commission data available.</p></div>
        </ng-container>

        <div class="kpis" *ngIf="summary">
          <div class="kpi-card"><span>Total Commissions</span><strong>{{ summary.total | currency }}</strong></div>
          <div class="kpi-card"><span>Pending</span><strong>{{ summary.pending | currency }}</strong></div>
          <div class="kpi-card"><span>Paid</span><strong class="green">{{ summary.paid | currency }}</strong></div>
        </div>

        <div class="panel" *ngIf="data?.length">
          <h2>Staff Commissions</h2>
          <div class="tab-scroll">
            <table>
              <thead>
                <tr><th>Staff</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of data">
                  <td><strong>{{ c.staffName }}</strong></td>
                  <td>{{ c.amount | currency }}</td>
                  <td><span class="status-badge" [class.paid]="c.status === 'PAID'" [class.pending]="c.status === 'PENDING'">{{ c.status }}</span></td>
                  <td>{{ c.date | date:'mediumDate' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel rules-section" *ngIf="rules">
          <div class="rules-head">
            <h2>Commission Rules</h2>
            <button class="btn" (click)="openRuleForm(null)">+ Add Rule</button>
          </div>
          <div class="empty" *ngIf="!rules.length"><p>No rules configured.</p></div>
          <div class="tab-scroll" *ngIf="rules.length">
            <table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Value</th><th>Active</th><th></th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of rules">
                  <td>{{ r.name }}</td>
                  <td><span class="type-badge">{{ r.type }}</span></td>
                  <td>{{ r.type === 'PERCENTAGE' ? (r.value + '%') : (r.value | currency) }}</td>
                  <td><span class="status-badge" [class.active]="r.isActive">{{ r.isActive ? 'Active' : 'Inactive' }}</span></td>
                  <td class="actions-cell">
                    <button class="icon-btn" (click)="openRuleForm(r)">Edit</button>
                    <button class="icon-btn danger" (click)="confirmDeleteRule(r)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </ng-container>
    </section>

    <div class="drawer" *ngIf="ruleForm">
      <div class="drawer-panel">
        <h2>{{ ruleForm.id ? 'Edit' : 'Add' }} Commission Rule</h2>
        <div class="form">
          <input [(ngModel)]="ruleForm.name" placeholder="Rule name">
          <select [(ngModel)]="ruleForm.type">
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed</option>
          </select>
          <input [(ngModel)]="ruleForm.value" type="number" step="0.01" placeholder="Value">
          <label class="checkbox-label">
            <input [(ngModel)]="ruleForm.isActive" type="checkbox"> Active
          </label>
          <div class="form-actions">
            <button type="button" (click)="ruleForm = null">Cancel</button>
            <button (click)="saveRule()">{{ ruleForm.id ? 'Update' : 'Create' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="drawer" *ngIf="deleteTarget">
      <div class="drawer-panel confirm">
        <h2>Delete Rule</h2>
        <p>Are you sure you want to delete "{{ deleteTarget.name }}"?</p>
        <div class="form-actions">
          <button type="button" (click)="deleteTarget = null">Cancel</button>
          <button class="danger-btn" (click)="deleteRule()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    .green{color:#16a34a}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .rules-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .rules-head h2{margin:0}
    .btn{border:0;border-radius:12px;padding:10px 16px;background:#0b0b0b;color:white;font-weight:700;cursor:pointer}
    .tab-scroll{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th,td{padding:12px 14px;text-align:left;border-bottom:1px solid #f1f5f9}
    th{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
    .status-badge{font-size:11px;padding:3px 10px;border-radius:20px;background:#f3f4f6;font-weight:600}
    .status-badge.paid{background:#f0fdf4;color:#16a34a}
    .status-badge.pending{background:#fef3c7;color:#d97706}
    .status-badge.active{background:#f0fdf4;color:#16a34a}
    .type-badge{font-size:11px;padding:3px 10px;border-radius:20px;background:#eff6ff;color:#2563eb;font-weight:600}
    .actions-cell{display:flex;gap:6px}
    .icon-btn{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    .icon-btn.danger{color:#dc2626;border-color:#fecaca}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(440px,90%)}
    .drawer-panel h2{margin:0 0 20px}
    .drawer-panel.confirm p{color:#6b7280;margin:0 0 20px}
    .form{display:grid;gap:12px}
    .form input,.form select{padding:14px;border:1px solid #e5e7eb;border-radius:14px;font-size:14px}
    .checkbox-label{display:flex;align-items:center;gap:8px;font-size:14px;color:#374151;cursor:pointer}
    .checkbox-label input{width:18px;height:18px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    .danger-btn{background:#dc2626!important;color:white!important}
    @media(max-width:900px){.kpis{grid-template-columns:1fr}.head{flex-direction:column;align-items:stretch}}
  `]
})
export class CommissionsComponent {
  private api = inject(CommissionsService);

  loading = true;
  error = '';
  data: any = null;
  summary: any = null;
  rules: any = null;
  ruleForm: any = null;
  deleteTarget: any = null;

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getSummary().subscribe({ next: (d) => this.summary = d, error: () => {} });
    this.api.getAll().subscribe({ next: (d) => this.data = d, error: () => {} });
    this.api.getRules().subscribe({
      next: (d) => { this.rules = d; this.loading = false; },
      error: () => { this.error = 'Commission data unavailable.'; this.loading = false; },
    });
  }

  openRuleForm(rule: any) {
    if (rule) {
      this.ruleForm = { id: rule.id, name: rule.name, type: rule.type, value: rule.value, isActive: rule.isActive };
    } else {
      this.ruleForm = { name: '', type: 'PERCENTAGE', value: 0, isActive: true };
    }
  }

  saveRule() {
    const obs = this.ruleForm.id
      ? this.api.updateRule(this.ruleForm.id, this.ruleForm)
      : this.api.createRule(this.ruleForm);
    obs.subscribe({ next: () => { this.ruleForm = null; this.loadAll(); } });
  }

  confirmDeleteRule(rule: any) { this.deleteTarget = rule; }

  deleteRule() {
    this.api.deleteRule(this.deleteTarget.id).subscribe({ next: () => { this.deleteTarget = null; this.loadAll(); } });
  }
}
