import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutomationsService } from './automations.service';

@Component({
  selector: 'app-automations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Automations</h1>
          <p>Automate salon workflows with trigger-action rules.</p>
        </div>
        <button class="primary" (click)="showForm = true; form = { name: '', triggerType: 'BOOKING_CREATED', actionType: 'SEND_NOTIFICATION', config: '', isActive: true }">+ New Rule</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card"><span>Total Rules</span><strong>{{ rules.length }}</strong></div>
          <div class="kpi-card"><span>Active</span><strong>{{ activeCount }}</strong></div>
          <div class="kpi-card"><span>Events Logged</span><strong>{{ events.length }}</strong></div>
        </div>

        <div class="panel">
          <h2>Automation Rules</h2>
          <div class="empty" *ngIf="rules.length === 0"><p>No automation rules defined.</p></div>
          <div class="table" *ngIf="rules.length > 0">
            <div class="th"><span>Name</span><span>Trigger</span><span>Action</span><span>Active</span><span>Actions</span></div>
            <div class="tr" *ngFor="let r of rules">
              <span><strong>{{ r.name }}</strong></span>
              <span><span class="badge badge-trigger">{{ r.triggerType }}</span></span>
              <span><span class="badge badge-action">{{ r.actionType }}</span></span>
              <span><span class="badge" [class.active]="r.isActive">{{ r.isActive ? 'Active' : 'Inactive' }}</span></span>
              <span class="actions">
                <button (click)="r.isActive ? doDisable(r) : doEnable(r)">{{ r.isActive ? 'Disable' : 'Enable' }}</button>
                <button class="danger" (click)="doDelete(r)">Delete</button>
              </span>
            </div>
          </div>
        </div>

        <div class="panel" *ngIf="events.length > 0">
          <h2>Event Log</h2>
          <div class="table">
            <div class="th"><span>Trigger</span><span>Action</span><span>Status</span><span>Date</span></div>
            <div class="tr" *ngFor="let e of events">
              <span>{{ e.triggerType }}</span><span>{{ e.actionType }}</span>
              <span><span class="badge" [class]="'evt-'+e.status.toLowerCase()">{{ e.status }}</span></span>
              <span>{{ e.createdAt | date:'MMM dd, h:mm a' }}</span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer-overlay" *ngIf="showForm" (click)="showForm = false">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>{{ editingId ? 'Edit Rule' : 'New Rule' }}</h2>
            <button class="close-btn" (click)="showForm = false">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="create-form">
              <input [(ngModel)]="form.name" placeholder="Rule name">
              <select [(ngModel)]="form.triggerType">
                <option value="BOOKING_CREATED">Booking Created</option>
                <option value="BOOKING_CANCELLED">Booking Cancelled</option>
                <option value="BOOKING_COMPLETED">Booking Completed</option>
                <option value="CLIENT_BIRTHDAY">Client Birthday</option>
                <option value="CLIENT_INACTIVE">Client Inactive</option>
                <option value="LOW_STOCK">Low Stock</option>
              </select>
              <select [(ngModel)]="form.actionType">
                <option value="SEND_NOTIFICATION">Send Notification</option>
                <option value="CREATE_TASK_PLACEHOLDER">Create Task (Placeholder)</option>
                <option value="APPLY_TAG_PLACEHOLDER">Apply Tag (Placeholder)</option>
              </select>
              <textarea [(ngModel)]="form.config" placeholder="Config JSON (optional)"></textarea>
              <div class="drawer-actions">
                <button (click)="showForm = false">Cancel</button>
                <button class="btn-primary" (click)="doSave()">Save</button>
              </div>
            </div>
            <div class="drawer-loading" *ngIf="busy"><div class="spinner"></div><span>Saving...</span></div>
            <div class="drawer-error" *ngIf="saveError">{{ saveError }}</div>
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
    .kpi-card strong{font-size:24px}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .table{display:grid;gap:2px;font-size:13px}
    .th,.tr{display:grid;grid-template-columns:2fr 1.5fr 1.5fr 1fr 1fr;padding:10px 12px;align-items:center;gap:8px}
    .th{font-weight:700;color:#6b7280}
    .tr{background:#f8fafc;border-radius:8px}
    .badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .badge.active{background:#f0fdf4;color:#16a34a}
    .badge:not(.active){background:#f3f4f6;color:#6b7280}
    .badge-trigger{background:#dbeafe;color:#1d4ed8}
    .badge-action{background:#f3e8ff;color:#7c3aed}
    .evt-completed{background:#f0fdf4;color:#16a34a}
    .evt-pending{background:#fef3c7;color:#a16207}
    .evt-failed{background:#fee2e2;color:#991b1b}
    .actions{display:flex;gap:4px}
    .actions button{border:1px solid #e5e7eb;border-radius:6px;padding:4px 10px;font-weight:600;cursor:pointer;background:white;font-size:10px}
    .actions .danger{background:#fee2e2;color:#991b1b}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white;z-index:1}
    .drawer-header h2{margin:0;font-size:20px}
    .close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280;padding:0;line-height:1}
    .drawer-body{padding:24px 28px;display:grid;gap:20px}
    .drawer-actions{display:flex;gap:10px;flex-wrap:wrap}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px}
    .btn-primary{background:#0b0b0b;color:white}
    .drawer-loading{display:flex;align-items:center;gap:10px;justify-content:center;padding:12px;color:#6b7280;font-size:13px}
    .drawer-error{background:#fef2f2;color:#991b1b;padding:12px;border-radius:12px;font-size:13px;text-align:center}
    .create-form{display:grid;gap:12px}
    .create-form input,select,textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    textarea{min-height:80px}
    @media(max-width:900px){.kpis{grid-template-columns:1fr}.drawer-panel{width:100%}}
  `]
})
export class AutomationsComponent {
  private api = inject(AutomationsService);

  rules: any[] = [];
  events: any[] = [];
  loading = true;
  error = '';
  showForm = false;
  editingId = '';
  form: any = {};
  busy = false;
  saveError = '';
  get activeCount() { return this.rules.filter(r => r.isActive).length; }

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({
      next: (d) => { this.rules = d; this.loading = false; },
      error: () => { this.error = 'Failed to load automations.'; this.loading = false; },
    });
    this.api.getEvents().subscribe({ next: (d) => this.events = d, error: () => {} });
  }

  doEnable(r: any) { this.api.enable(r.id).subscribe({ next: () => this.loadAll() }); }
  doDisable(r: any) { this.api.disable(r.id).subscribe({ next: () => this.loadAll() }); }

  doDelete(r: any) {
    if (!confirm(`Delete rule "${r.name}"?`)) return;
    this.api.remove(r.id).subscribe({ next: () => this.loadAll() });
  }

  doSave() {
    this.busy = true; this.saveError = '';
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({
      next: () => { this.busy = false; this.showForm = false; this.loadAll(); },
      error: (e) => { this.busy = false; this.saveError = e.error?.message || 'Save failed.'; },
    });
  }
}
