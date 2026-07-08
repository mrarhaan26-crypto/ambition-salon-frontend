import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiLogsService } from './api-logs.service';

@Component({
  selector: 'app-api-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>API Logs</h1>
          <p>Request and response logs for all API endpoints.</p>
        </div>
        <button class="danger-btn" (click)="clearAll()">Clear All Logs</button>
      </div>

      <div class="kpis" *ngIf="summary">
        <div class="kpi-card"><span>Total Requests</span><strong>{{ summary.total || 0 }}</strong></div>
        <div class="kpi-card"><span>Success (2xx)</span><strong class="green">{{ summary.success || 0 }}</strong></div>
        <div class="kpi-card"><span>Errors (4xx/5xx)</span><strong class="red">{{ summary.errors || 0 }}</strong></div>
      </div>

      <div class="filter-bar">
        <select [(ngModel)]="filters.method" (change)="load()"><option value="">All Methods</option><option *ngFor="let m of methods" [value]="m">{{ m }}</option></select>
        <select [(ngModel)]="filters.statusCode" (change)="load()"><option value="">All Status</option><option *ngFor="let c of statusCodes" [value]="c">{{ c }}</option></select>
        <input [(ngModel)]="filters.endpoint" placeholder="Endpoint path..." class="filter-input">
        <button (click)="load()">Search</button>
        <button class="clear" (click)="clearFilters()">Clear</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading API logs...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load API logs.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>
      <div class="empty" *ngIf="!loading && !error && logs.length === 0"><strong>No API logs found.</strong><p>No requests match the current filters.</p></div>

      <table class="api-table" *ngIf="!loading && !error && logs.length > 0">
        <thead>
          <tr>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Status</th>
            <th>Duration</th>
            <th>IP</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let log of logs" (click)="openDetail(log)" class="clickable">
            <td><span class="method-badge" [class]="log.method?.toLowerCase()">{{ log.method }}</span></td>
            <td class="mono">{{ log.endpoint || log.path || '-' }}</td>
            <td><span class="status-code" [class.success]="log.statusCode < 400" [class.error]="log.statusCode >= 400">{{ log.statusCode }}</span></td>
            <td>{{ log.duration }}ms</td>
            <td class="mono">{{ log.ipAddress || '-' }}</td>
            <td>{{ log.timestamp | date:'MMM dd, h:mm:ss a' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="overlay" *ngIf="selectedLog" (click)="closeDetail()"></div>
    <div class="drawer" *ngIf="selectedLog">
      <div class="drawer-head"><h2>API Log Detail</h2><button class="close-btn" (click)="closeDetail()">&times;</button></div>
      <div class="drawer-body">
        <div class="detail-row"><span>Method</span><strong><span class="method-badge" [class]="selectedLog.method?.toLowerCase()">{{ selectedLog.method }}</span></strong></div>
        <div class="detail-row"><span>Endpoint</span><strong class="mono">{{ selectedLog.endpoint || selectedLog.path }}</strong></div>
        <div class="detail-row"><span>Status</span><strong>{{ selectedLog.statusCode }}</strong></div>
        <div class="detail-row"><span>Duration</span><strong>{{ selectedLog.duration }}ms</strong></div>
        <div class="detail-row"><span>IP Address</span><strong class="mono">{{ selectedLog.ipAddress }}</strong></div>
        <div class="detail-row"><span>User ID</span><strong class="mono">{{ selectedLog.userId || '-' }}</strong></div>
        <div class="detail-row"><span>Timestamp</span><strong>{{ selectedLog.timestamp | date:'MMM dd, yyyy h:mm:ss a' }}</strong></div>
        <div class="detail-row" *ngIf="selectedLog.requestBody"><span>Request</span><pre class="json-block">{{ selectedLog.requestBody | json }}</pre></div>
        <div class="detail-row" *ngIf="selectedLog.responseBody"><span>Response</span><pre class="json-block">{{ selectedLog.responseBody | json }}</pre></div>
        <div class="detail-row" *ngIf="selectedLog.error"><span>Error</span><pre class="json-block error-block">{{ selectedLog.error }}</pre></div>
      </div>
    </div>
  `,
  styles: [`
    .danger-btn{padding:10px 20px;border-radius:12px;background:#dc2626;color:white;font-weight:700;border:0;cursor:pointer;font-size:13px}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
    .kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:20px;box-shadow:var(--card-shadow)}
    .kpi-card span{display:block;color:var(--muted);font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    .kpi-card strong.green{color:#059669}
    .kpi-card strong.red{color:#dc2626}
    .filter-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
    .filter-bar select,.filter-bar input{padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text)}
    .filter-bar button{border:0;border-radius:12px;padding:10px 16px;background:var(--black);color:var(--white);font-weight:700;cursor:pointer}
    .filter-bar .clear{background:var(--soft);color:var(--text)}
    .filter-input{min-width:200px}
    .api-table{width:100%;border-collapse:collapse;font-size:13px;background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden}
    .api-table th,.api-table td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--border)}
    .api-table th{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;background:var(--soft)}
    .api-table tr:last-child td{border-bottom:0}
    .clickable{cursor:pointer;transition:background .15s}
    .clickable:hover{background:var(--soft)}
    .method-badge{font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700;text-transform:uppercase}
    .method-badge.get{background:#dbeafe;color:#1d4ed8}
    .method-badge.post{background:#d1fae5;color:#059669}
    .method-badge.put{background:#fef3c7;color:#d97706}
    .method-badge.patch{background:#f3e8ff;color:#7c3aed}
    .method-badge.delete{background:#fee2e2;color:#dc2626}
    .status-code{font-weight:700;font-family:monospace}
    .status-code.success{color:#059669}
    .status-code.error{color:#dc2626}
    .mono{font-family:monospace;font-size:12px}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:99}
    .drawer{position:fixed;top:0;right:0;bottom:0;width:460px;max-width:100vw;background:var(--surface);z-index:100;box-shadow:-8px 0 40px rgba(0,0,0,.1);overflow-y:auto}
    .drawer-head{display:flex;justify-content:space-between;align-items:center;padding:24px;border-bottom:1px solid var(--border)}
    .drawer-head h2{margin:0;font-size:20px}
    .close-btn{background:none;border:0;font-size:28px;cursor:pointer;color:var(--muted);padding:0 4px}
    .drawer-body{padding:24px;display:grid;gap:14px}
    .detail-row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)}
    .detail-row span{color:var(--muted);font-size:13px;min-width:80px}
    .detail-row strong{text-align:right;word-break:break-all}
    .json-block{background:var(--soft);border-radius:10px;padding:12px;font-size:11px;overflow-x:auto;max-width:260px;white-space:pre-wrap;margin:0;max-height:200px;overflow-y:auto}
    .json-block.error-block{background:#fef2f2;color:#dc2626}
    @media(max-width:768px){.kpis{grid-template-columns:1fr}.filter-bar{flex-direction:column;align-items:stretch}.filter-input{min-width:auto}}
  `]
})
export class ApiLogsComponent implements OnInit {
  private api = inject(ApiLogsService);
  loading = true; error = '';
  logs: any[] = [];
  summary: any = null;
  selectedLog: any = null;
  methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  statusCodes: string[] = [];
  filters = { method: '', statusCode: '', endpoint: '' };

  ngOnInit() { this.loadSummary(); this.load(); }

  loadSummary() { this.api.getSummary().subscribe({ next: (s) => this.summary = s }); }

  load() {
    this.loading = true; this.error = '';
    const params: any = {};
    if (this.filters.method) params.method = this.filters.method;
    if (this.filters.statusCode) params.statusCode = this.filters.statusCode;
    if (this.filters.endpoint) params.endpoint = this.filters.endpoint;
    this.api.getAll(params).subscribe({
      next: (res) => {
        this.logs = res.data || res.logs || res || [];
        if (res.statusCodes) this.statusCodes = res.statusCodes;
        this.loading = false;
      },
      error: (e) => { this.error = e.message || 'API logs unavailable.'; this.loading = false; }
    });
  }

  clearFilters() { this.filters = { method: '', statusCode: '', endpoint: '' }; this.load(); }
  openDetail(log: any) { this.selectedLog = log; }
  closeDetail() { this.selectedLog = null; }
  clearAll() {
    if (!confirm('Clear all API logs?')) return;
    this.api.clearAll().subscribe({ next: () => this.load() });
  }
}
