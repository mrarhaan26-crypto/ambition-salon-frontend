import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErrorLogsService } from './error-logs.service';

@Component({
  selector: 'app-error-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Error Logs</h1>
          <p>Application errors, exceptions, and stack traces.</p>
        </div>
        <button class="danger-btn" (click)="clearAll()">Clear All</button>
      </div>

      <div class="kpis" *ngIf="summary">
        <div class="kpi-card"><span>Total Errors</span><strong>{{ summary.total || 0 }}</strong></div>
        <div class="kpi-card"><span>Today</span><strong>{{ summary.today || 0 }}</strong></div>
        <div class="kpi-card"><span>Unresolved</span><strong class="red">{{ summary.unresolved || 0 }}</strong></div>
      </div>

      <div class="filter-bar">
        <select [(ngModel)]="filters.severity" (change)="load()"><option value="">All Severity</option><option *ngFor="let s of severities" [value]="s">{{ s }}</option></select>
        <select [(ngModel)]="filters.status" (change)="load()"><option value="">All Status</option><option value="open">Open</option><option value="resolved">Resolved</option><option value="in-progress">In Progress</option></select>
        <input type="date" [(ngModel)]="filters.dateFrom">
        <input type="date" [(ngModel)]="filters.dateTo">
        <button (click)="load()">Apply</button>
        <button class="clear" (click)="clearFilters()">Clear</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading error logs...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load error logs.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>
      <div class="empty" *ngIf="!loading && !error && logs.length === 0"><strong>No errors found.</strong><p>No errors match the current filters.</p></div>

      <div class="error-list" *ngIf="!loading && !error && logs.length > 0">
        <div class="error-item" *ngFor="let log of logs" [class.resolved]="log.status === 'resolved'">
          <div class="error-head">
            <span class="severity-badge" [class]="(log.severity || 'error').toLowerCase()">{{ log.severity || 'ERROR' }}</span>
            <strong>{{ log.message || log.error || 'Unknown error' }}</strong>
            <span class="error-time">{{ log.timestamp | date:'MMM dd, h:mm a' }}</span>
          </div>
          <div class="error-meta" *ngIf="log.source || log.endpoint">
            <span *ngIf="log.source">Source: {{ log.source }}</span>
            <span *ngIf="log.endpoint">Endpoint: {{ log.endpoint }}</span>
          </div>
          <div class="error-stack" *ngIf="log.stackTrace">
            <pre>{{ log.stackTrace }}</pre>
          </div>
          <div class="error-actions">
            <span class="status-label" [class.resolved]="log.status === 'resolved'">{{ log.status || 'open' }}</span>
            <button class="resolve-btn" *ngIf="log.status !== 'resolved'" (click)="resolve(log.id)">Mark Resolved</button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .danger-btn{padding:10px 20px;border-radius:12px;background:#dc2626;color:white;font-weight:700;border:0;cursor:pointer;font-size:13px}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
    .kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:20px;box-shadow:var(--card-shadow)}
    .kpi-card span{display:block;color:var(--muted);font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    .kpi-card strong.red{color:#dc2626}
    .filter-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
    .filter-bar select,.filter-bar input{padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text)}
    .filter-bar button{border:0;border-radius:12px;padding:10px 16px;background:var(--black);color:var(--white);font-weight:700;cursor:pointer}
    .filter-bar .clear{background:var(--soft);color:var(--text)}
    .error-list{display:flex;flex-direction:column;gap:10px}
    .error-item{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:18px 20px;box-shadow:var(--card-shadow)}
    .error-item.resolved{opacity:.6}
    .error-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
    .error-head strong{font-size:14px;flex:1}
    .severity-badge{font-size:10px;padding:2px 10px;border-radius:10px;font-weight:700;text-transform:uppercase;flex-shrink:0}
    .severity-badge.critical{background:#fee2e2;color:#dc2626}
    .severity-badge.error{background:#fef3c7;color:#d97706}
    .severity-badge.warning{background:#dbeafe;color:#1d4ed8}
    .severity-badge.info{background:#d1fae5;color:#059669}
    .error-time{font-size:11px;color:var(--muted);flex-shrink:0}
    .error-meta{display:flex;gap:16px;font-size:12px;color:var(--muted);margin-bottom:8px}
    .error-stack pre{background:var(--soft);border-radius:10px;padding:12px;font-size:11px;white-space:pre-wrap;max-height:120px;overflow-y:auto;margin:0 0 10px}
    .error-actions{display:flex;align-items:center;gap:12px}
    .status-label{font-size:11px;padding:3px 12px;border-radius:20px;background:#fef3c7;color:#92400e;font-weight:600;text-transform:capitalize}
    .status-label.resolved{background:#d1fae5;color:#065f46}
    .resolve-btn{padding:6px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;font-weight:600}
    .loading,.error,.empty{text-align:center;padding:48px;color:var(--muted)}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;margin-right:12px;vertical-align:middle}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error-state{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error-state strong{color:#991b1b}.error-state p{color:#7f1d1d;margin:8px 0}
    .error-state button{background:var(--black);color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    @media(max-width:768px){.kpis{grid-template-columns:1fr}.filter-bar{flex-direction:column;align-items:stretch}}
  `]
})
export class ErrorLogsComponent implements OnInit {
  private api = inject(ErrorLogsService);
  loading = true; error = '';
  logs: any[] = [];
  summary: any = null;
  severities: string[] = [];
  filters = { severity: '', status: '', dateFrom: '', dateTo: '' };

  ngOnInit() { this.loadSummary(); this.load(); }

  loadSummary() { this.api.getSummary().subscribe({ next: (s) => this.summary = s }); }

  load() {
    this.loading = true; this.error = '';
    const params: any = {};
    if (this.filters.severity) params.severity = this.filters.severity;
    if (this.filters.status) params.status = this.filters.status;
    if (this.filters.dateFrom) params.dateFrom = this.filters.dateFrom;
    if (this.filters.dateTo) params.dateTo = this.filters.dateTo;
    this.api.getAll(params).subscribe({
      next: (res) => {
        this.logs = res.data || res.logs || res || [];
        if (res.severities) this.severities = res.severities;
        this.loading = false;
      },
      error: (e) => { this.error = e.message || 'Error logs unavailable.'; this.loading = false; }
    });
  }

  clearFilters() { this.filters = { severity: '', status: '', dateFrom: '', dateTo: '' }; this.load(); }
  resolve(id: string) { this.api.resolve(id).subscribe({ next: () => this.load() }); }
  clearAll() {
    if (!confirm('Clear all error logs?')) return;
    this.api.clearAll().subscribe({ next: () => this.load() });
  }
}
