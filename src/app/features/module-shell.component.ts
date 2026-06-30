import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-module-shell',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <ng-container *ngIf="title === 'home'; else modulePage">
      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading dashboard...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load dashboard.</strong>
        <p>{{ error }}</p>
        <button (click)="loadDashboard()">Retry</button>
      </div>

      <section class="home" *ngIf="!loading && !error">
        <!-- Premium Dashboard Header -->
        <div class="dashboard-header">
          <div>
            <h1>Ambition Command Dashboard</h1>
            <p class="header-subtitle">Today's salon performance, bookings, revenue, and alerts in one place</p>
          </div>
          <div class="header-meta">
            <span class="header-date">{{ today | date:'EEEE, MMMM d, y' }}</span>
            <span class="live-badge"><span class="dot"></span>Live business data</span>
          </div>
        </div>

        <!-- 6 KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card card-revenue">
            <div class="kpi-content">
              <span class="kpi-label">Today Revenue</span>
              <strong class="kpi-value">{{ (healthData?.revenue ?? 0) | currency }}</strong>
              <span class="kpi-meta">From POS sales today</span>
            </div>
            <div class="kpi-indicator"></div>
          </div>
          <div class="kpi-card card-bookings">
            <div class="kpi-content">
              <span class="kpi-label">Today Bookings</span>
              <strong class="kpi-value">{{ healthData?.bookings ?? 0 }}</strong>
              <span class="kpi-meta">Appointments scheduled today</span>
            </div>
            <div class="kpi-indicator"></div>
          </div>
          <div class="kpi-card card-pending">
            <div class="kpi-content">
              <span class="kpi-label">Pending Bookings</span>
              <strong class="kpi-value">{{ pendingCount }}</strong>
              <span class="kpi-meta">Awaiting confirmation</span>
            </div>
            <div class="kpi-indicator"></div>
          </div>
          <div class="kpi-card card-clients">
            <div class="kpi-content">
              <span class="kpi-label">Active Clients</span>
              <strong class="kpi-value">{{ clientData?.active ?? 0 }}</strong>
              <span class="kpi-meta">Visited in last 30 days</span>
            </div>
            <div class="kpi-indicator"></div>
          </div>
          <div class="kpi-card card-staff">
            <div class="kpi-content">
              <span class="kpi-label">Staff Utilization</span>
              <strong class="kpi-value">{{ staffList.length }}</strong>
              <span class="kpi-meta">Total staff on roster</span>
            </div>
            <div class="kpi-indicator"></div>
          </div>
          <div class="kpi-card card-stock">
            <div class="kpi-content">
              <span class="kpi-label">Low Stock Alerts</span>
              <strong class="kpi-value">{{ inventoryData?.lowStock ?? 0 }}</strong>
              <span class="kpi-meta">Items below minimum stock level</span>
            </div>
            <div class="kpi-indicator"></div>
          </div>
        </div>

        <!-- Upcoming Bookings + AI Business Insights -->
        <div class="grid">
          <div class="panel">
            <h2>Upcoming Bookings</h2>
            <div class="empty" *ngIf="bookings.length === 0">No upcoming bookings.</div>
            <div class="row" *ngFor="let b of bookings">
              <div>
                <strong>{{ b.customerName || 'Guest' }}</strong>
                <span>{{ b.serviceName || 'Service' }}</span>
              </div>
              <b>{{ b.startTime | date:'shortTime' }}</b>
            </div>
          </div>

          <div class="panel">
            <h2>AI Business Insights</h2>
            <div class="empty" *ngIf="insights.length === 0">No insights available.</div>
            <div class="insight" *ngFor="let ins of insights">{{ ins }}</div>
          </div>
        </div>

        <!-- Quick Actions + Staff Performance -->
        <div class="grid">
          <div class="panel">
            <h2>Quick Actions</h2>
            <div class="quick-actions">
              <a routerLink="/app/bookings" class="qa-btn">Book Appointment</a>
              <a routerLink="/app/clients" class="qa-btn">Add Client</a>
              <a routerLink="/app/pos" class="qa-btn">Checkout POS</a>
              <a routerLink="/app/marketing" class="qa-btn">Send Campaign</a>
            </div>
          </div>

          <div class="panel">
            <h2>Staff Performance</h2>
            <div class="empty" *ngIf="staffList.length === 0">No staff data.</div>
            <div class="row" *ngFor="let s of staffList">
              <div>
                <strong>{{ s.fullName || s.name }}</strong>
                <span>{{ s.role || 'Staff' }}</span>
              </div>
              <b>{{ s.totalBookings || s.score || 0 }}</b>
            </div>
          </div>
        </div>
      </section>
    </ng-container>

    <ng-template #modulePage>
      <h1>{{ title }}</h1>
      <p>{{ title }} module foundation for Ambition Unisex Salon Software.</p>
      <div class="module-cards">
        <div class="card"><h3>Status</h3><b>Ready</b><p>Foundation created</p></div>
        <div class="card"><h3>Module</h3><b>{{ title }}</b><p>Next milestone</p></div>
        <div class="card"><h3>API</h3><b>Planned</b><p>Backend integration later</p></div>
      </div>
    </ng-template>
  `,
  styles: [`
    h1{font-size:36px;margin:0 0 14px}
    .home{display:grid;gap:24px}
    .muted{color:#6b7280}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px}
    .panel h2{margin:0 0 18px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .row{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #f1f5f9}
    .row:last-child{border-bottom:0}
    .row span{display:block;color:#6b7280;margin-top:4px}
    .empty{padding:24px;text-align:center;color:#9ca3af;font-size:14px}
    .insight{padding:14px;border-radius:16px;background:#f8fafc;margin-bottom:12px;font-size:14px}
    .quick-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .qa-btn{display:block;border:1px solid #e5e7eb;background:#fff;border-radius:16px;padding:14px;font-weight:800;text-align:center;text-decoration:none;color:#0b0b0b;transition:background .15s}
    .qa-btn:hover{background:#f3f4f6}
    .module-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:24px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center;margin-bottom:24px}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}

    .dashboard-header{display:flex;justify-content:space-between;align-items:flex-start;background:linear-gradient(135deg,#0b0b0b 0%,#1a1a2e 100%);color:white;border-radius:28px;padding:36px 40px}
    .dashboard-header h1{font-size:32px;margin:0 0 8px;font-weight:800;letter-spacing:-.02em}
    .header-subtitle{margin:0;color:#94a3b8;font-size:15px;max-width:480px;line-height:1.5}
    .header-meta{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
    .header-date{font-size:14px;color:#cbd5e1;font-weight:500}
    .live-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.15);color:#10b981;font-size:12px;font-weight:700;padding:5px 14px;border-radius:100px;text-transform:uppercase;letter-spacing:.05em}
    .live-badge .dot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

    .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:20px;display:flex;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,.05);transition:box-shadow .2s,transform .2s}
    .kpi-card:hover{box-shadow:0 8px 24px rgba(15,23,42,.08);transform:translateY(-2px)}
    .kpi-indicator{width:5px;flex-shrink:0}
    .card-revenue .kpi-indicator{background:#10b981}
    .card-bookings .kpi-indicator{background:#3b82f6}
    .card-pending .kpi-indicator{background:#f59e0b}
    .card-clients .kpi-indicator{background:#8b5cf6}
    .card-staff .kpi-indicator{background:#06b6d4}
    .card-stock .kpi-indicator{background:#f43f5e}
    .kpi-content{padding:20px 24px;flex:1}
    .kpi-label{display:block;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
    .kpi-value{display:block;font-size:36px;font-weight:800;color:#0f172a;line-height:1.1;margin-bottom:6px;letter-spacing:-.02em}
    .kpi-meta{display:block;color:#94a3b8;font-size:13px}

    @media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:1000px){.grid,.module-cards{grid-template-columns:1fr}.dashboard-header{flex-direction:column;gap:16px}.header-meta{align-items:flex-start}}
    @media(max-width:600px){.kpi-grid{grid-template-columns:1fr}}
  `]
})
export class ModuleShellComponent {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  title = this.route.snapshot.data['title'] || 'home';

  loading = false;
  error = '';
  dashboard: any = null;
  bookings: any[] = [];
  staffList: any[] = [];
  insights: string[] = [];

  healthData: any = null;
  clientData: any = null;
  inventoryData: any = null;
  pendingCount = 0;

  get today(): Date { return new Date(); }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
  }

  ngOnInit() {
    if (this.title === 'home') {
      this.loadDashboard();
    }
  }

  loadDashboard() {
    this.loading = true;
    this.error = '';
    this.http.get<any>('http://localhost:3000/api/advanced-reports').subscribe({
      next: (d) => {
        this.dashboard = {
          kpis: {
            totalRevenue: d.totalRevenue ?? 0,
            totalBookings: d.totalBookings ?? 0,
            newClients: d.totalClients ?? 0,
            lowStockItems: 0,
          },
        };
        this.loading = false;
      },
      error: () => {
        this.error = 'Dashboard data unavailable.';
        this.loading = false;
      },
    });
    this.http.get<any>('http://localhost:3000/api/advanced-reports/clients').subscribe({
      next: (d) => {
        this.clientData = d;
        if (this.dashboard) this.dashboard.kpis.newClients = d.newThisMonth ?? 0;
      },
    });
    this.http.get<any>('http://localhost:3000/api/advanced-reports/inventory').subscribe({
      next: (d) => {
        this.inventoryData = d;
        if (this.dashboard) this.dashboard.kpis.lowStockItems = d.lowStock ?? 0;
      },
    });
    this.http.get<any>('http://localhost:3000/api/advanced-reports/bookings').subscribe({
      next: (d) => {
        const pending = d?.byStatus?.find((s: any) => s.status === 'PENDING');
        this.pendingCount = pending?.count ?? 0;
      },
    });
    this.http.get<any[]>('http://localhost:3000/api/appointments?limit=5').subscribe({
      next: (d) => { this.bookings = d || []; },
    });
    this.http.get<any[]>('http://localhost:3000/api/staff').subscribe({
      next: (d) => { this.staffList = d || []; },
    });
    this.http.get<any>('http://localhost:3000/api/owner-command-center/health').subscribe({
      next: (d) => {
        this.healthData = d;
        if (d?.insights) this.insights = d.insights.slice(0, 4);
      },
    });
  }
}
