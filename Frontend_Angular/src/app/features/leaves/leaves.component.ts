import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LeavesService } from './leaves.service';
import { LeaveRequest, LeaveSummary } from './leaves.models';

const LEAVE_TYPES: Record<string, string> = { SICK: 'Sick', VACATION: 'Vacation', PERSONAL: 'Personal', BEREAVEMENT: 'Bereavement', MATERNITY: 'Maternity', OTHER: 'Other' };

@Component({
  selector: 'app-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Leaves</h1><p>Staff leave requests and approvals.</p></div><button class="primary" (click)="openForm()">+ Request Leave</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="summary">
          <div class="kpi-card"><span class="kpi-lbl">Pending</span><span class="kpi-val warn">{{ summary.totalPending }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Approved</span><span class="kpi-val good">{{ summary.totalApproved }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Rejected</span><span class="kpi-val bad">{{ summary.totalRejected }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">On Leave Today</span><span class="kpi-val">{{ summary.staffOnLeave }}</span></div>
        </div>

        <div class="toolbar">
          <select [(ngModel)]="statusFilter" (change)="load()"><option value="">All Status</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select>
          <select [(ngModel)]="typeFilter" (change)="load()"><option value="">All Types</option><option *ngFor="let t of LEAVE_TYPES | keyvalue" [value]="t.key">{{ t.value }}</option></select>
        </div>

        <div class="empty" *ngIf="items.length === 0"><p>No leave requests found.</p></div>
        <div class="leave-list" *ngIf="items.length > 0">
          <div class="leave-card" *ngFor="let l of items">
            <div class="leave-head">
              <strong>{{ l.staffName }}</strong>
              <span class="lv-type">{{ LEAVE_TYPES[l.type] || l.type }}</span>
              <span class="status-badge" [class.pending]="l.status==='PENDING'" [class.approved]="l.status==='APPROVED'" [class.rejected]="l.status==='REJECTED'">{{ l.status }}</span>
            </div>
            <div class="leave-dates">{{ l.startDate | date:'MMM dd' }} – {{ l.endDate | date:'MMM dd, yyyy' }}</div>
            <p>{{ l.reason }}</p>
            <small *ngIf="l.approvedBy">Approved by {{ l.approvedBy }} on {{ l.approvedAt | date:'MMM dd' }}</small>
            <div class="leave-actions" *ngIf="l.status==='PENDING'">
              <button class="btn-approve" (click)="approve(l)">Approve</button>
              <button class="btn-reject" (click)="openReject(l)">Reject</button>
            </div>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>Request Leave</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Staff ID</label><input [(ngModel)]="form.staffId" placeholder="Staff ID"></div>
          <div class="form-group"><label>Type</label><select [(ngModel)]="form.type"><option value="SICK">Sick</option><option value="VACATION">Vacation</option><option value="PERSONAL">Personal</option><option value="BEREAVEMENT">Bereavement</option><option value="MATERNITY">Maternity</option><option value="OTHER">Other</option></select></div>
          <div class="form-group"><label>Start Date</label><input [(ngModel)]="form.startDate" type="date"></div>
          <div class="form-group"><label>End Date</label><input [(ngModel)]="form.endDate" type="date"></div>
          <div class="form-group"><label>Reason</label><textarea [(ngModel)]="form.reason" placeholder="Reason for leave"></textarea></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Saving...' : 'Submit' }}</button></div>
        </div>
      </div>
    </div>

    <div class="drawer-overlay drawer-centered" *ngIf="showReject" (click)="showReject=false">
      <div class="confirm-panel" (click)="$event.stopPropagation()">
        <h3>Reject Leave</h3><textarea [(ngModel)]="rejectReason" placeholder="Reason for rejection..." style="width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:12px;margin:12px 0;resize:vertical"></textarea>
        <div class="confirm-actions"><button (click)="showReject=false">Cancel</button><button class="btn-danger" (click)="doReject()">Reject</button></div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .primary:disabled{opacity:.5;cursor:default}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;display:grid;gap:4px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-lbl{font-size:13px;color:#6b7280;font-weight:600}.kpi-val{font-size:28px;font-weight:800}
    .kpi-val.warn{color:#d97706}.kpi-val.good{color:#16a34a}.kpi-val.bad{color:#991b1b}
    .toolbar{display:flex;gap:10px}.toolbar select{padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .leave-list{display:grid;gap:8px}
    .leave-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;display:grid;gap:8px}
    .leave-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .leave-head strong{flex:1;font-size:16px}
    .lv-type{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:#f3f4f6;color:#374151}
    .status-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px}
    .status-badge.pending{background:#fffbeb;color:#d97706}
    .status-badge.approved{background:#f0fdf4;color:#16a34a}
    .status-badge.rejected{background:#fef2f2;color:#991b1b}
    .leave-dates{font-size:13px;color:#6b7280;font-weight:600}
    .leave-card p{margin:0;font-size:14px;color:#374151}
    .leave-card small{color:#6b7280;font-size:12px}
    .leave-actions{display:flex;gap:8px}
    .btn-approve,.btn-reject{border:0;border-radius:10px;padding:8px 16px;font-weight:700;cursor:pointer;font-size:12px}
    .btn-approve{background:#f0fdf4;color:#16a34a}
    .btn-reject{background:#fef2f2;color:#991b1b}
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
    .form-group textarea{min-height:80px;resize:vertical}
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
export class LeavesComponent {
  private api = inject(LeavesService);
  readonly LEAVE_TYPES = LEAVE_TYPES;

  items: LeaveRequest[] = []; summary: LeaveSummary | null = null;
  loading = true; error = '';
  statusFilter = ''; typeFilter = '';
  showForm = false; form: any = { staffId: '', type: 'SICK', startDate: '', endDate: '', reason: '' };
  formMsg = ''; formBusy = false;
  showReject = false; rejecting: LeaveRequest | null = null; rejectReason = '';

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getAll({ status: this.statusFilter || undefined, type: this.typeFilter || undefined }).subscribe({
      next: d => { this.items = d; this.loading = false; },
      error: () => { this.error = 'Leaves unavailable.'; this.loading = false; },
    });
    this.api.getSummary().subscribe({ next: d => this.summary = d });
  }
  openForm() { this.form = { staffId: '', type: 'SICK', startDate: '', endDate: '', reason: '' }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  save() {
    this.formBusy = true; this.formMsg = '';
    this.api.create(this.form).subscribe({
      next: () => { this.closeForm(); this.formBusy = false; this.load(); },
      error: () => { this.formMsg = 'Failed to submit leave request.'; this.formBusy = false; },
    });
  }
  approve(l: LeaveRequest) {
    this.api.approve(l.id).subscribe({ next: () => this.load() });
  }
  openReject(l: LeaveRequest) { this.rejecting = l; this.rejectReason = ''; this.showReject = true; }
  doReject() {
    if (!this.rejecting) return;
    this.api.reject(this.rejecting.id, this.rejectReason || undefined).subscribe({ next: () => { this.showReject = false; this.rejecting = null; this.load(); } });
  }
}
