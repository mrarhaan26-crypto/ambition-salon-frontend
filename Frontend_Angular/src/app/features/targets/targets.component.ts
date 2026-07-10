import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TargetsService } from './targets.service';
import { StaffTarget, TargetSummary } from './targets.models';

@Component({
  selector: 'app-targets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Targets</h1><p>Staff performance targets and goals.</p></div><button class="primary" (click)="openForm()">+ New Target</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="summary">
          <div class="kpi-card"><span class="kpi-lbl">Active Targets</span><span class="kpi-val">{{ summary.totalActive }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">On Track</span><span class="kpi-val good">{{ summary.onTrack }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Behind</span><span class="kpi-val bad">{{ summary.behind }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Achieved</span><span class="kpi-val good">{{ summary.achieved }}</span></div>
        </div>

        <div class="toolbar">
          <select [(ngModel)]="periodFilter" (change)="load()"><option value="">All Periods</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option></select>
        </div>

        <div class="empty" *ngIf="items.length===0"><p>No targets found.</p></div>
        <div class="target-grid" *ngIf="items.length>0">
          <div class="target-card" *ngFor="let t of items">
            <div class="target-head">
              <strong>{{ t.staffName }}</strong>
              <span class="period-badge">{{ t.period }}</span>
            </div>
            <div class="target-dates">{{ t.startDate | date:'MMM dd' }} – {{ t.endDate | date:'MMM dd, yyyy' }}</div>
            <div class="progress-row"><span>Revenue</span><div class="progress-bar"><div class="progress-fill" [style.width.%]="pct(t.achievedRevenue, t.revenueTarget)" [class.good]="pct(t.achievedRevenue,t.revenueTarget)>=100" [class.warn]="pct(t.achievedRevenue,t.revenueTarget)<50"></div></div><span class="prog-val">{{ t.achievedRevenue | currency }} / {{ t.revenueTarget | currency }}</span></div>
            <div class="progress-row"><span>Services</span><div class="progress-bar"><div class="progress-fill" [style.width.%]="pct(t.achievedServices, t.serviceTarget)" [class.good]="pct(t.achievedServices,t.serviceTarget)>=100" [class.warn]="pct(t.achievedServices,t.serviceTarget)<50"></div></div><span class="prog-val">{{ t.achievedServices }} / {{ t.serviceTarget }}</span></div>
            <div class="progress-row"><span>Clients</span><div class="progress-bar"><div class="progress-fill" [style.width.%]="pct(t.achievedClients, t.clientTarget)" [class.good]="pct(t.achievedClients,t.clientTarget)>=100" [class.warn]="pct(t.achievedClients,t.clientTarget)<50"></div></div><span class="prog-val">{{ t.achievedClients }} / {{ t.clientTarget }}</span></div>
            <div class="target-actions"><button (click)="editTarget(t)">Edit</button><button class="btn-remove" (click)="confirmDelete(t)">Delete</button></div>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>{{ editingId ? 'Edit Target' : 'New Target' }}</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Staff ID</label><input [(ngModel)]="form.staffId" placeholder="Staff ID"></div>
          <div class="form-group"><label>Period</label><select [(ngModel)]="form.period"><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option></select></div>
          <div class="form-group"><label>Start Date</label><input [(ngModel)]="form.startDate" type="date"></div>
          <div class="form-group"><label>End Date</label><input [(ngModel)]="form.endDate" type="date"></div>
          <div class="form-group"><label>Revenue Target ($)</label><input [(ngModel)]="form.revenueTarget" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Service Target</label><input [(ngModel)]="form.serviceTarget" type="number" min="0"></div>
          <div class="form-group"><label>Client Target</label><input [(ngModel)]="form.clientTarget" type="number" min="0"></div>
          <div class="form-group"><label>Product Target</label><input [(ngModel)]="form.productTarget" type="number" min="0"></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Saving...' : (editingId ? 'Update' : 'Create') }}</button></div>
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
    .kpi-val.good{color:#16a34a}.kpi-val.bad{color:#991b1b}
    .toolbar{display:flex;gap:10px;margin-bottom:4px}
    .toolbar select{padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .target-grid{display:grid;gap:12px}
    .target-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;display:grid;gap:10px}
    .target-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .target-head strong{font-size:16px;flex:1}
    .period-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px;background:#f3f4f6;color:#374151}
    .target-dates{font-size:13px;color:#6b7280}
    .progress-row{display:grid;grid-template-columns:60px 1fr 100px;gap:8px;align-items:center;font-size:12px}
    .progress-row span{color:#374151;font-weight:600}
    .progress-bar{height:8px;background:#f3f4f6;border-radius:6px;overflow:hidden}
    .progress-fill{height:100%;background:#6366f1;border-radius:6px;transition:width .4s ease}
    .progress-fill.good{background:#16a34a}
    .progress-fill.warn{background:#d97706}
    .prog-val{font-size:11px;color:#6b7280;text-align:right}
    .target-actions{display:flex;gap:6px;margin-top:4px}
    .target-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    @media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
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
export class TargetsComponent {
  private api = inject(TargetsService);
  items: StaffTarget[] = []; summary: TargetSummary | null = null;
  loading = true; error = '';
  periodFilter = '';
  showForm = false; editingId = '';
  form: any = { staffId: '', period: 'MONTHLY', startDate: '', endDate: '', revenueTarget: 0, serviceTarget: 0, clientTarget: 0, productTarget: 0 };
  formMsg = ''; formBusy = false;
  showDelete = false; deleteMsg = ''; deleteAction: (() => void) | null = null;

  ngOnInit() { this.load(); this.api.getSummary().subscribe({ next: d => this.summary = d }); }
  load() {
    this.loading = true; this.error = '';
    this.api.getAll({ period: this.periodFilter || undefined }).subscribe({
      next: d => { this.items = d; this.loading = false; },
      error: () => { this.error = 'Targets unavailable.'; this.loading = false; },
    });
  }
  pct(achieved: number, target: number): number { return target > 0 ? Math.min((achieved / target) * 100, 100) : 0; }
  openForm() { this.editingId = ''; this.form = { staffId: '', period: 'MONTHLY', startDate: '', endDate: '', revenueTarget: 0, serviceTarget: 0, clientTarget: 0, productTarget: 0 }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  editTarget(t: StaffTarget) {
    this.editingId = t.id;
    this.form = { staffId: t.staffId, period: t.period, startDate: t.startDate?.slice(0,10), endDate: t.endDate?.slice(0,10), revenueTarget: t.revenueTarget, serviceTarget: t.serviceTarget, clientTarget: t.clientTarget, productTarget: t.productTarget };
    this.showForm = true;
  }
  save() {
    this.formBusy = true; this.formMsg = '';
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.formBusy = false; this.load(); }, error: () => { this.formMsg = 'Failed to save target.'; this.formBusy = false; } });
  }
  confirmDelete(t: StaffTarget) { this.deleteMsg = `Delete target for ${t.staffName}?`; this.deleteAction = () => { this.api.remove(t.id).subscribe({ next: () => { this.showDelete = false; this.load(); } }); }; this.showDelete = true; }
  doDelete() { if (this.deleteAction) this.deleteAction(); }
}
