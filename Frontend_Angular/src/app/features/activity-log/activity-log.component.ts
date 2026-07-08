import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityLogService } from './activity-log.service';

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Activity Log</h1>
          <p>Real-time user activity stream across the platform.</p>
        </div>
      </div>

      <div class="kpis" *ngIf="summary">
        <div class="kpi-card"><span>Total Activities</span><strong>{{ summary.total || 0 }}</strong></div>
        <div class="kpi-card"><span>Today</span><strong>{{ summary.today || 0 }}</strong></div>
        <div class="kpi-card"><span>Unique Users</span><strong>{{ summary.uniqueUsers || 0 }}</strong></div>
      </div>

      <div class="filter-bar">
        <select [(ngModel)]="filters.action" (change)="load()"><option value="">All Actions</option><option *ngFor="let a of actionTypes" [value]="a">{{ a }}</option></select>
        <select [(ngModel)]="filters.userId" (change)="load()"><option value="">All Users</option><option *ngFor="let u of userIds" [value]="u">{{ u }}</option></select>
        <input type="date" [(ngModel)]="filters.dateFrom">
        <input type="date" [(ngModel)]="filters.dateTo">
        <button (click)="load()">Apply</button>
        <button class="clear" (click)="clearFilters()">Clear</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading activity log...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load activity log.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>
      <div class="empty" *ngIf="!loading && !error && logs.length === 0"><strong>No activity found.</strong><p>No activity matches the current filters.</p></div>

      <div class="activity-feed" *ngIf="!loading && !error && logs.length > 0">
        <div class="activity-item" *ngFor="let log of logs">
          <div class="activity-icon" [class]="log.action?.toLowerCase()">
            {{ log.action?.charAt(0) || '?' }}
          </div>
          <div class="activity-body">
            <div class="activity-head">
              <strong>{{ log.userName || log.userId || 'System' }}</strong>
              <span class="action-tag">{{ log.action }}</span>
              <span class="activity-time">{{ log.timestamp | date:'MMM dd, h:mm a' }}</span>
            </div>
            <p class="activity-desc">{{ log.description || log.action + ' on ' + log.entityType + ' ' + log.entityId }}</p>
            <span class="entity-tag" *ngIf="log.entityType">{{ log.entityType }}</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
    .kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:20px;box-shadow:var(--card-shadow)}
    .kpi-card span{display:block;color:var(--muted);font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    .filter-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
    .filter-bar select,.filter-bar input{padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text)}
    .filter-bar button{border:0;border-radius:12px;padding:10px 16px;background:var(--black);color:var(--white);font-weight:700;cursor:pointer}
    .filter-bar .clear{background:var(--soft);color:var(--text)}
    .activity-feed{display:flex;flex-direction:column;gap:8px}
    .activity-item{display:flex;gap:14px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;align-items:flex-start}
    .activity-icon{width:36px;height:36px;border-radius:50%;background:var(--soft);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0}
    .activity-icon.create{background:#dbeafe;color:#1d4ed8}
    .activity-icon.update{background:#fef3c7;color:#d97706}
    .activity-icon.delete{background:#fee2e2;color:#dc2626}
    .activity-icon.login{background:#d1fae5;color:#059669}
    .activity-icon.logout{background:#f3e8ff;color:#7c3aed}
    .activity-body{flex:1;min-width:0}
    .activity-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px}
    .activity-head strong{font-size:14px}
    .action-tag{font-size:10px;padding:2px 8px;border-radius:10px;background:var(--soft);font-weight:600;text-transform:uppercase}
    .activity-time{font-size:12px;color:var(--muted);margin-left:auto}
    .activity-desc{margin:4px 0 0;font-size:13px;color:var(--muted)}
    .entity-tag{font-size:11px;padding:2px 10px;border-radius:10px;background:var(--soft);color:var(--muted);margin-top:6px;display:inline-block}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:var(--muted)}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:var(--black);color:var(--white);border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{text-align:center;padding:48px;color:var(--muted)}
    .empty strong{display:block;font-size:18px;margin-bottom:6px}
    @media(max-width:768px){.kpis{grid-template-columns:1fr}.filter-bar{flex-direction:column;align-items:stretch}}
  `]
})
export class ActivityLogComponent implements OnInit {
  private api = inject(ActivityLogService);
  loading = true; error = '';
  logs: any[] = [];
  summary: any = null;
  actionTypes: string[] = [];
  userIds: string[] = [];
  filters = { action: '', userId: '', dateFrom: '', dateTo: '' };

  ngOnInit() { this.loadSummary(); this.load(); }

  loadSummary() { this.api.getSummary().subscribe({ next: (s) => this.summary = s }); }

  load() {
    this.loading = true; this.error = '';
    const params: any = {};
    if (this.filters.action) params.action = this.filters.action;
    if (this.filters.userId) params.userId = this.filters.userId;
    if (this.filters.dateFrom) params.dateFrom = this.filters.dateFrom;
    if (this.filters.dateTo) params.dateTo = this.filters.dateTo;
    this.api.getAll(params).subscribe({
      next: (res) => {
        this.logs = res.data || res.logs || res || [];
        if (res.actions) this.actionTypes = res.actions;
        if (res.userIds) this.userIds = res.userIds;
        this.loading = false;
      },
      error: (e) => { this.error = e.message || 'Activity log unavailable.'; this.loading = false; }
    });
  }

  clearFilters() { this.filters = { action: '', userId: '', dateFrom: '', dateTo: '' }; this.load(); }
}
