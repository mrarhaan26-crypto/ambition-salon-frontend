import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ResourcesService, RESOURCE_TYPES, RESOURCE_STATUSES } from './resources.service';
import { CalendarComponent } from '../calendar/calendar.component';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarComponent],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Enterprise Resource Management</h1>
          <p>Manage chairs, rooms, equipment, machines, spa &amp; VIP rooms, mirrors and wash stations.</p>
        </div>
        <button class="primary" (click)="openForm()">+ Add Resource</button>
      </div>

      <div class="tabs">
        <button [class.active]="tab === 'list'" (click)="tab = 'list'">Resources</button>
        <button [class.active]="tab === 'stats'" (click)="setTab('stats')">Statistics</button>
        <button [class.active]="tab === 'utilization'" (click)="setTab('utilization')">Utilization</button>
        <button [class.active]="tab === 'timeline'" (click)="setTab('timeline')">Resource Timeline</button>
      </div>

      <div class="auto-assign-bar" *ngIf="tab === 'list'">
        <input [(ngModel)]="autoAssignId" placeholder="Booking ID to auto-assign a resource">
        <button class="btn-ghost" (click)="runAutoAssign()">Auto-Assign Resource</button>
        <span class="auto-result" *ngIf="autoAssignResult">{{ autoAssignResult }}</span>
      </div>

      <!-- LIST TAB -->
      <ng-container *ngIf="tab === 'list'">
        <div class="toolbar">
          <select [(ngModel)]="typeFilter" (change)="load()">
            <option value="">All Types</option>
            <option *ngFor="let t of types" [value]="t">{{ t }}</option>
          </select>
          <select [(ngModel)]="statusFilter" (change)="load()">
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="BLOCKED">Blocked</option>
          </select>
          <select [(ngModel)]="activeFilter" (change)="load()">
            <option value="">All Active</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading resources...</span></div>
        <div class="error" *ngIf="error"><strong>Failed to load resources.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>
        <div class="empty" *ngIf="!loading && !error && resources.length === 0"><p>No resources found.</p></div>

        <div class="resource-grid" *ngIf="!loading && !error && resources.length > 0">
          <div class="resource-card" *ngFor="let r of resources"
            [class.inactive]="!r.isActive"
            [class.blocked]="r.status === 'BLOCKED'"
            [class.maintenance]="r.status === 'MAINTENANCE'"
            [style.borderLeftColor]="r.color || typeColor(r.type)">
            <div class="card-head">
              <strong>{{ r.name }}</strong>
              <span class="type-badge">{{ r.type }}</span>
            </div>
            <small *ngIf="r.description">{{ r.description }}</small>
            <div class="card-meta">
              <span class="status-dot" [class.active]="r.status === 'ACTIVE'" [class.maintenance-dot]="r.status === 'MAINTENANCE'" [class.blocked-dot]="r.status === 'BLOCKED'">{{ statusLabel(r.status) }}</span>
              <span class="meta-pill" *ngIf="r.capacity">Cap {{ r.capacity }}</span>
              <span class="meta-pill" *ngIf="r.cleaningBufferMin">Buffer {{ r.cleaningBufferMin }}m</span>
              <span class="meta-pill branch-name" *ngIf="r.branch?.name">{{ r.branch.name }}</span>
            </div>
            <div class="card-actions">
              <button (click)="setStatus(r, 'MAINTENANCE')" *ngIf="r.status !== 'MAINTENANCE'">Maint.</button>
              <button (click)="setStatus(r, 'BLOCKED')" *ngIf="r.status !== 'BLOCKED'">Block</button>
              <button (click)="setStatus(r, 'ACTIVE')" *ngIf="r.status !== 'ACTIVE'">Activate</button>
              <button (click)="edit(r)">Edit</button>
              <button class="btn-danger" (click)="confirmDelete(r)">Delete</button>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- STATS TAB -->
      <ng-container *ngIf="tab === 'stats'">
        <div class="loading" *ngIf="statsLoading"><div class="spinner"></div><span>Loading statistics...</span></div>
        <div class="stats-grid" *ngIf="stats">
          <div class="stat-card"><span class="stat-value">{{ stats.totalResources }}</span><span class="stat-label">Total Resources</span></div>
          <div class="stat-card green"><span class="stat-value">{{ stats.active }}</span><span class="stat-label">Active</span></div>
          <div class="stat-card amber"><span class="stat-value">{{ stats.maintenance }}</span><span class="stat-label">Maintenance</span></div>
          <div class="stat-card red"><span class="stat-value">{{ stats.blocked }}</span><span class="stat-label">Blocked</span></div>
          <div class="stat-card"><span class="stat-value">{{ stats.totalCapacity }}</span><span class="stat-label">Total Capacity</span></div>
        </div>
        <div class="stats-sub" *ngIf="stats">
          <h3>By Type</h3>
          <div class="chip-row">
            <span class="stat-chip" *ngFor="let t of stats.byType"><b>{{ t.count }}</b> {{ t.type }}</span>
          </div>
        </div>
      </ng-container>

      <!-- UTILIZATION TAB -->
      <ng-container *ngIf="tab === 'utilization'">
        <div class="toolbar">
          <select [(ngModel)]="utilPeriod" (change)="loadUtil()">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
        <div class="loading" *ngIf="utilLoading"><div class="spinner"></div><span>Loading utilization...</span></div>
        <div class="util-summary" *ngIf="util">
          <div class="stat-card"><span class="stat-value">{{ util.averageUtilization }}%</span><span class="stat-label">Average Utilization</span></div>
          <div class="stat-card amber"><span class="stat-value">{{ util.peakUtilization }}%</span><span class="stat-label">Peak Utilization</span></div>
        </div>
        <div class="util-list" *ngIf="util">
          <div class="util-row" *ngFor="let r of util.resources">
            <span class="util-name">{{ r.name }} <small>{{ r.type }}</small></span>
            <div class="util-bar"><span [style.width.%]="r.utilizationPercent" [style.background]="r.color || typeColor(r.type)"></span></div>
            <span class="util-pct">{{ r.utilizationPercent }}%</span>
          </div>
        </div>
      </ng-container>

      <!-- TIMELINE TAB (reuses existing calendar resource view) -->
      <ng-container *ngIf="tab === 'timeline'">
        <div class="timeline-note">Drag &amp; drop bookings, resolve conflicts and view the resource timeline using the enterprise calendar.</div>
        <app-calendar></app-calendar>
      </ng-container>

      <!-- FORM DRAWER -->
      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>{{ editingId ? 'Edit Resource' : 'Add Resource' }}</h2>
            <button class="close-btn" (click)="closeForm()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="form-group"><label>Name</label><input [(ngModel)]="form.name" placeholder="Resource name" required></div>
            <div class="form-group"><label>Type</label>
              <select [(ngModel)]="form.type">
                <option *ngFor="let t of types" [value]="t">{{ t }}</option>
              </select>
            </div>
            <div class="form-group"><label>Color</label><input type="color" [(ngModel)]="form.color" [value]="form.color || '#6366f1'"></div>
            <div class="form-group"><label>Status</label>
              <select [(ngModel)]="form.status">
                <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group"><label>Capacity</label><input type="number" min="1" [(ngModel)]="form.capacity"></div>
            <div class="form-group"><label>Cleaning Buffer (min)</label><input type="number" min="0" [(ngModel)]="form.cleaningBufferMin"></div>
            <div class="form-group"><label>Description</label><textarea [(ngModel)]="form.description" placeholder="Optional description"></textarea></div>
            <div class="form-group"><label>Branch ID</label><input [(ngModel)]="form.branchId" placeholder="Branch ID"></div>
            <div class="form-group" *ngIf="editingId"><label><input type="checkbox" [(ngModel)]="form.isActive"> Active</label></div>
            <div class="drawer-actions">
              <button (click)="closeForm()">Cancel</button>
              <button class="btn-primary" (click)="save()">{{ editingId ? 'Update' : 'Save' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- DELETE CONFIRM -->
      <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete = false">
        <div class="confirm-panel" (click)="$event.stopPropagation()">
          <h3>Delete Resource</h3>
          <p>Delete <strong>{{ deleting?.name }}</strong>? This cannot be undone.</p>
          <div class="confirm-actions"><button (click)="showDelete = false">Cancel</button><button class="btn-danger" (click)="doDelete()">Delete</button></div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:20px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:32px;margin:0;background:linear-gradient(120deg,#1e1b4b,#4338ca 55%,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#4f46e5,#6366f1);color:white;box-shadow:0 8px 22px rgba(99,102,241,.3)}
    .primary:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(99,102,241,.4)}
    .tabs{display:flex;gap:8px;flex-wrap:wrap}
    .tabs button{border:1px solid rgba(99,102,241,.18);background:rgba(255,255,255,.7);border-radius:12px;padding:10px 18px;font-weight:700;cursor:pointer;color:#4338ca;transition:all .2s}
    .tabs button.active{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border-color:#4f46e5;box-shadow:0 4px 14px rgba(99,102,241,.3)}
    .auto-assign-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:rgba(255,255,255,.7);border:1px solid rgba(99,102,241,.12);border-radius:14px;padding:10px 14px}
    .auto-assign-bar input{padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;flex:1;min-width:200px}
    .auto-result{font-size:12px;font-weight:700;color:#16a34a}
    .btn-ghost{border:1px solid rgba(99,102,241,.3);background:rgba(99,102,241,.08);border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;color:#4338ca}
    .toolbar{display:flex;gap:12px;flex-wrap:wrap}.toolbar select{padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:white}
    .loading,.error{text-align:center;padding:48px}.spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#4f46e5;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .resource-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
    .resource-card{background:white;border:1px solid #e5e7eb;border-left:6px solid #6366f1;border-radius:18px;padding:18px;display:grid;gap:8px;box-shadow:0 4px 18px rgba(15,23,42,.05);transition:transform .2s,box-shadow .2s}
    .resource-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(15,23,42,.1)}
    .resource-card.inactive{opacity:.6}
    .resource-card.blocked{border-left-color:#dc2626}
    .resource-card.maintenance{border-left-color:#d97706}
    .card-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
    .card-head strong{font-size:16px}
    .type-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:#eef2ff;color:#4338ca;text-transform:uppercase;white-space:nowrap}
    .card-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .branch-name{color:#6b7280;font-size:12px}
    .status-dot{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:#f0fdf4;color:#16a34a}
    .status-dot.maintenance-dot{background:#fef3c7;color:#b45309}
    .status-dot.blocked-dot{background:#fee2e2;color:#991b1b}
    .meta-pill{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:#f3f4f6;color:#374151}
    .card-actions{display:flex;gap:6px;margin-top:4px;flex-wrap:wrap}
    .card-actions button{border:1px solid #e5e7eb;border-radius:10px;padding:7px 11px;font-weight:700;cursor:pointer;background:white;font-size:12px;transition:all .15s}
    .card-actions button:hover{background:#f5f3ff;border-color:#c7d2fe}
    .btn-danger{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px}
    .stat-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;display:grid;gap:6px;text-align:center;box-shadow:0 4px 18px rgba(15,23,42,.05)}
    .stat-card.green{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:#bbf7d0}
    .stat-card.amber{background:linear-gradient(135deg,#fffbeb,#fef3c7);border-color:#fde68a}
    .stat-card.red{background:linear-gradient(135deg,#fef2f2,#fee2e2);border-color:#fecaca}
    .stat-value{font-size:28px;font-weight:800;color:#1e1b4b}
    .stat-label{font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase}
    .stats-sub{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:18px}
    .stats-sub h3{margin:0 0 10px;font-size:14px}
    .chip-row{display:flex;gap:8px;flex-wrap:wrap}
    .stat-chip{background:#eef2ff;color:#4338ca;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px}
    .util-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
    .util-list{display:grid;gap:10px}
    .util-row{display:grid;grid-template-columns:180px 1fr 56px;gap:12px;align-items:center;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:12px 16px}
    .util-name{font-weight:700;font-size:13px} .util-name small{color:#6b7280;font-weight:500}
    .util-bar{height:12px;background:#eef2ff;border-radius:999px;overflow:hidden}
    .util-bar span{display:block;height:100%;border-radius:999px;background:#6366f1;transition:width .4s ease}
    .util-pct{font-weight:800;text-align:right;color:#1e1b4b}
    .timeline-note{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18);border-radius:14px;padding:12px 16px;font-size:13px;color:#4338ca;font-weight:600}
    .drawer-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select,.form-group textarea{padding:12px;border:1px solid #e5e7eb;border-radius:12px}
    .form-group input[type=color]{height:44px;padding:4px;cursor:pointer}
    .form-group textarea{min-height:80px}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px}
    .btn-primary{background:linear-gradient(135deg,#4f46e5,#6366f1);color:white}
    .confirm-panel{background:white;border-radius:24px;padding:32px;width:min(420px,90%)}
    .confirm-panel h3{margin:0 0 12px}.confirm-panel p{color:#6b7280;margin:0 0 24px}
    .confirm-actions{display:flex;gap:10px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    @media(max-width:900px){.drawer-panel{width:100%}.util-row{grid-template-columns:120px 1fr 48px}}
  `]
})
export class ResourcesComponent implements OnInit {
  private api = inject(ResourcesService);
  types = RESOURCE_TYPES;
  statuses = RESOURCE_STATUSES;

  tab: 'list' | 'stats' | 'utilization' | 'timeline' = 'list';
  resources: any[] = [];
  loading = true; error = '';
  typeFilter = ''; statusFilter = ''; activeFilter = '';

  stats: any = null; statsLoading = false;
  util: any = null; utilLoading = false; utilPeriod = 'day';

  showForm = false; editingId = '';
  form: any = { name: '', type: 'CHAIR', status: 'ACTIVE', color: '#6366f1', capacity: 1, cleaningBufferMin: 0, description: '', branchId: '', isActive: true };
  showDelete = false; deleting: any = null;

  autoAssignId = ''; autoAssignResult = '';

  ngOnInit() { this.load(); }

  typeColor(type: string): string {
    const map: any = { CHAIR: '#6366f1', ROOM: '#0ea5e9', EQUIPMENT: '#f59e0b', STATION: '#10b981', MACHINE: '#ef4444', SPA_ROOM: '#ec4899', VIP_ROOM: '#a855f7', MIRROR: '#14b8a6', WASH_STATION: '#3b82f6' };
    return map[type] || '#6366f1';
  }

  statusLabel(s: string): string {
    return s === 'ACTIVE' ? 'Active' : s === 'MAINTENANCE' ? 'Maintenance' : 'Blocked';
  }

  setTab(t: 'stats' | 'utilization' | 'timeline') {
    this.tab = t;
    if (t === 'stats') this.loadStats();
    if (t === 'utilization') this.loadUtil();
  }

  load() {
    this.loading = true; this.error = '';
    const q: any = {};
    if (this.typeFilter) q.type = this.typeFilter;
    if (this.statusFilter) q.status = this.statusFilter;
    if (this.activeFilter) q.isActive = this.activeFilter;
    this.api.getAll(q).subscribe({
      next: d => { this.resources = d; this.loading = false; },
      error: () => { this.error = 'Resources unavailable.'; this.loading = false; }
    });
  }

  loadStats() {
    this.statsLoading = true;
    this.api.getStatistics({}).subscribe({ next: d => { this.stats = d; this.statsLoading = false; }, error: () => { this.stats = null; this.statsLoading = false; } });
  }

  loadUtil() {
    this.utilLoading = true;
    this.api.getUtilization({ period: this.utilPeriod }).subscribe({ next: d => { this.util = d; this.utilLoading = false; }, error: () => { this.util = null; this.utilLoading = false; } });
  }

  openForm() { this.editingId = ''; this.form = { name: '', type: 'CHAIR', status: 'ACTIVE', color: '#6366f1', capacity: 1, cleaningBufferMin: 0, description: '', branchId: '', isActive: true }; this.showForm = true; }
  closeForm() { this.showForm = false; }
  edit(r: any) {
    this.editingId = r.id;
    this.form = { name: r.name, type: r.type, status: r.status || 'ACTIVE', color: r.color || '#6366f1', capacity: r.capacity ?? 1, cleaningBufferMin: r.cleaningBufferMin ?? 0, description: r.description || '', branchId: r.branchId || '', isActive: r.isActive };
    this.showForm = true;
  }
  save() {
    const payload = {
      name: this.form.name, type: this.form.type, status: this.form.status,
      color: this.form.color, capacity: Number(this.form.capacity), cleaningBufferMin: Number(this.form.cleaningBufferMin),
      description: this.form.description, branchId: this.form.branchId, isActive: this.form.isActive !== false
    };
    const obs = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    obs.subscribe({ next: () => { this.closeForm(); this.load(); } });
  }

  setStatus(r: any, status: string) {
    this.api.setStatus(r.id, status).subscribe({ next: () => this.load() });
  }

  confirmDelete(r: any) { this.deleting = r; this.showDelete = true; }
  doDelete() { if (!this.deleting) return; this.api.remove(this.deleting.id).subscribe({ next: () => { this.showDelete = false; this.deleting = null; this.load(); } }); }

  runAutoAssign() {
    if (!this.autoAssignId) return;
    this.api.autoAssign({ bookingId: this.autoAssignId }).subscribe({
      next: (res) => { this.autoAssignResult = res.assigned ? `Assigned to ${res.resourceName}` : (res.message || 'No free resource'); },
      error: () => { this.autoAssignResult = 'Auto-assign failed'; }
    });
  }
}
