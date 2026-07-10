import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLogsService } from './audit-logs.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Audit Logs</h1>
          <p>System activity and audit trail.</p>
        </div>
      </div>

      <!-- Summary KPIs -->
      <div class="kpis" *ngIf="summary">
        <div class="kpi-card">
          <span>Total Logs</span>
          <strong>{{ summary.totalLogs || 0 }}</strong>
        </div>
        <div class="kpi-card">
          <span>Actions</span>
          <strong>{{ summary.uniqueActions || 0 }}</strong>
        </div>
        <div class="kpi-card">
          <span>Last 7 Days</span>
          <strong>{{ summary.last7Days || 0 }}</strong>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <select [(ngModel)]="filters.actionType" (change)="loadLogs()">
          <option value="">All Actions</option>
          <option *ngFor="let a of actionTypes" [value]="a">{{ a }}</option>
        </select>
        <select [(ngModel)]="filters.entityType" (change)="loadLogs()">
          <option value="">All Entities</option>
          <option *ngFor="let e of entityTypes" [value]="e">{{ e }}</option>
        </select>
        <input type="date" [(ngModel)]="filters.dateFrom">
        <input type="date" [(ngModel)]="filters.dateTo">
        <button (click)="loadLogs()">Apply</button>
        <button class="clear" (click)="clearFilters()">Clear</button>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading audit logs...</span>
      </div>

      <!-- Error -->
      <div class="error" *ngIf="error">
        <strong>Failed to load audit logs.</strong>
        <p>{{ error }}</p>
        <button (click)="loadLogs()">Retry</button>
      </div>

      <!-- Empty -->
      <div class="empty" *ngIf="!loading && !error && logs.length === 0">
        <strong>No audit logs found.</strong>
        <p>No system activity matches the current filters.</p>
      </div>

      <!-- Log Table -->
      <div class="panel" *ngIf="!loading && !error && logs.length > 0">
        <div class="tab-scroll">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of logs" (click)="openDetail(log)" class="clickable">
                <td><span class="action-badge">{{ log.action }}</span></td>
                <td>{{ log.entityType }}</td>
                <td class="mono">{{ log.entityId }}</td>
                <td>{{ log.timestamp | date:'MMM dd, yyyy h:mm a' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Drawer -->
      <div class="overlay" *ngIf="selectedLog" (click)="closeDetail()"></div>
      <div class="drawer" *ngIf="selectedLog">
        <div class="drawer-head">
          <h2>Log Detail</h2>
          <button class="close-btn" (click)="closeDetail()">&times;</button>
        </div>
        <div class="drawer-body">
          <div class="detail-row">
            <span>Action</span>
            <strong><span class="action-badge">{{ selectedLog.action }}</span></strong>
          </div>
          <div class="detail-row">
            <span>Entity Type</span>
            <strong>{{ selectedLog.entityType }}</strong>
          </div>
          <div class="detail-row">
            <span>Entity ID</span>
            <strong class="mono">{{ selectedLog.entityId }}</strong>
          </div>
          <div class="detail-row">
            <span>User ID</span>
            <strong class="mono">{{ selectedLog.userId || '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Timestamp</span>
            <strong>{{ selectedLog.timestamp | date:'MMM dd, yyyy h:mm:ss a' }}</strong>
          </div>
          <div class="detail-row" *ngIf="selectedLog.metadata">
            <span>Metadata</span>
            <pre class="metadata-json">{{ selectedLog.metadata | json }}</pre>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    .filter-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .filter-bar select,.filter-bar input{padding:10px;border:1px solid #e5e7eb;border-radius:12px}
    .filter-bar button{border:0;border-radius:12px;padding:10px 16px;background:#0b0b0b;color:white;font-weight:700;cursor:pointer}
    .filter-bar .clear{background:#f3f4f6;color:#374151}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{text-align:center;padding:48px;color:#6b7280}
    .empty strong{display:block;font-size:18px;margin-bottom:6px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .tab-scroll{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th,td{padding:12px 14px;text-align:left;border-bottom:1px solid #f1f5f9}
    th{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
    .clickable{cursor:pointer;transition:background .15s}
    .clickable:hover{background:#f8fafc}
    .action-badge{font-size:11px;padding:3px 10px;border-radius:20px;background:#eef2ff;color:#4338ca;font-weight:600;text-transform:uppercase}
    .mono{font-family:monospace}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:99}
    .drawer{position:fixed;top:0;right:0;bottom:0;width:420px;max-width:100vw;background:white;z-index:100;box-shadow:-8px 0 40px rgba(0,0,0,.1);display:grid;grid-template-rows:auto 1fr;overflow-y:auto}
    .drawer-head{display:flex;justify-content:space-between;align-items:center;padding:24px;border-bottom:1px solid #e5e7eb}
    .drawer-head h2{margin:0;font-size:22px}
    .close-btn{background:none;border:0;font-size:28px;cursor:pointer;color:#6b7280;padding:0 4px}
    .drawer-body{padding:24px;display:grid;gap:16px}
    .detail-row{display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f1f5f9}
    .detail-row span{color:#6b7280;font-size:13px;min-width:90px}
    .detail-row strong{text-align:right;word-break:break-all}
    .metadata-json{background:#f8fafc;border-radius:10px;padding:12px;font-size:12px;overflow-x:auto;max-width:220px;white-space:pre-wrap;margin:0}
    @media(max-width:900px){.kpis{grid-template-columns:1fr}.filter-bar{flex-direction:column;align-items:stretch}}
  `]
})
export class AuditLogsComponent {
  private api = inject(AuditLogsService);

  loading = true;
  error = '';
  logs: any[] = [];
  summary: any = null;
  selectedLog: any = null;

  filters = {
    actionType: '',
    entityType: '',
    dateFrom: '',
    dateTo: ''
  };

  actionTypes: string[] = [];
  entityTypes: string[] = [];

  ngOnInit() {
    this.loadSummary();
    this.loadLogs();
  }

  loadSummary() {
    this.api.getSummary().subscribe({
      next: (s) => { this.summary = s; },
      error: () => {}
    });
  }

  loadLogs() {
    this.loading = true;
    this.error = '';
    const params: any = {};
    if (this.filters.actionType) params.actionType = this.filters.actionType;
    if (this.filters.entityType) params.entityType = this.filters.entityType;
    if (this.filters.dateFrom) params.dateFrom = this.filters.dateFrom;
    if (this.filters.dateTo) params.dateTo = this.filters.dateTo;

    this.api.getAll(params).subscribe({
      next: (res) => {
        this.logs = res.data || res.logs || res || [];
        if (res.actions) this.actionTypes = res.actions;
        if (res.entities) this.entityTypes = res.entities;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Audit log data unavailable.';
        this.loading = false;
      }
    });
  }

  clearFilters() {
    this.filters = { actionType: '', entityType: '', dateFrom: '', dateTo: '' };
    this.loadLogs();
  }

  openDetail(log: any) {
    this.selectedLog = log;
  }

  closeDetail() {
    this.selectedLog = null;
  }
}
