import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { OwnerCommandCenterService } from './owner-command-center.service';

@Component({
  selector: 'app-owner-command-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Owner Command Center</h1>
          <p>Business health &amp; quick overview.</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading command center...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load dashboard.</strong>
        <p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error && data">
        <div class="health-card" [class.good]="health?.score >= 50" [class.attention]="health?.score < 50">
          <span class="health-score">{{ health?.score || 0 }}%</span>
          <span class="health-label">Health Score</span>
          <span class="health-status">{{ health?.status || '—' }}</span>
        </div>

        <div class="kpi-row">
          <div class="kpi-card"><span class="kpi-val">{{ data.todayBookings }}</span><span class="kpi-lbl">Today Bookings</span></div>
          <div class="kpi-card green"><span class="kpi-val">{{ data.todayRevenue | currency }}</span><span class="kpi-lbl">Today Revenue</span></div>
          <div class="kpi-card"><span class="kpi-val">{{ data.activeStaff }}</span><span class="kpi-lbl">Clocked In</span></div>
          <div class="kpi-card"><span class="kpi-val">{{ data.totalStaff }}</span><span class="kpi-lbl">Total Staff</span></div>
          <div class="kpi-card warn"><span class="kpi-val">{{ data.lowStockItems }}</span><span class="kpi-lbl">Low Stock Items</span></div>
          <div class="kpi-card"><span class="kpi-val">{{ data.totalClients }}</span><span class="kpi-lbl">Total Clients</span></div>
          <div class="kpi-card"><span class="kpi-val">{{ data.totalTasks }}</span><span class="kpi-lbl">Active Tasks</span></div>
          <div class="kpi-card"><span class="kpi-val">{{ data.unreadNotifications }}</span><span class="kpi-lbl">Unread Notifications</span></div>
        </div>

        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <div class="action-card" *ngFor="let a of actions" (click)="navigate(a)">
            <strong>{{ a.label }}</strong>
            <small>{{ a.action }}</small>
          </div>
        </div>
      </ng-container>

      <div class="empty" *ngIf="!loading && !error && !data">
        <p>Owner command center data unavailable.</p>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}h2{font-size:20px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .health-card{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:32px;text-align:center;display:grid;gap:4px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .health-card.good{background:#f0fdf4}.health-card.attention{background:#fef2f2}
    .health-score{font-size:48px;font-weight:900;line-height:1}
    .health-label{font-size:14px;color:#6b7280;font-weight:600}
    .health-status{font-size:16px;font-weight:700}
    .kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:20px;display:grid;gap:4px;box-shadow:0 8px 25px rgba(15,23,42,.05)}
    .kpi-val{font-size:28px;font-weight:800;line-height:1}
    .kpi-lbl{font-size:12px;color:#6b7280;font-weight:600}
    .kpi-card.green .kpi-val{color:#16a34a}
    .kpi-card.warn .kpi-val{color:#dc2626}
    .actions-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
    .action-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;cursor:pointer;transition:box-shadow .2s;display:grid;gap:6px}
    .action-card:hover{box-shadow:0 8px 25px rgba(15,23,42,.1)}
    .action-card strong{font-size:15px}.action-card small{font-size:12px;color:#6b7280;text-transform:capitalize}
    @media(max-width:900px){.kpi-row{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:600px){.kpi-row{grid-template-columns:1fr}.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class OwnerCommandCenterComponent {
  private api = inject(OwnerCommandCenterService);
  data: any = null;
  health: any = null;
  actions: any[] = [];
  loading = true;
  error = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    this.api.getDashboard().subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.error = 'Dashboard data unavailable.'; this.loading = false; },
    });
    this.api.getHealth().subscribe({ next: (d) => { this.health = d; } });
    this.api.getActions().subscribe({ next: (d) => { this.actions = d; } });
  }

  navigate(a: any) { window.location.hash = a.route; }
}
