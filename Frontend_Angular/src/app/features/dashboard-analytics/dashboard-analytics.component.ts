import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DashboardAnalyticsService } from './dashboard-analytics.service';
import { DashboardOverview, RevenueAnalytics, OperationsAnalytics, StaffAnalytics, ClientActivity } from './dashboard-analytics.models';

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Dashboard Analytics</h1>
          <p>Revenue, bookings, operations, client activity, and staff performance.</p>
        </div>
        <button class="refresh-btn" (click)="loadAll()" [disabled]="loading">Refresh</button>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading analytics...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load analytics.</strong>
        <p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <!-- Overview KPIs -->
        <div class="kpis" *ngIf="overview">
          <div class="kpi-card">
            <span class="label">Bookings</span>
            <strong>{{ overview.kpis.totalBookings }}</strong>
            <small [class.green]="overview.kpis.bookingGrowth >= 0" [class.red]="overview.kpis.bookingGrowth < 0">
              {{ overview.kpis.bookingGrowth >= 0 ? '+' : '' }}{{ overview.kpis.bookingGrowth }}%
            </small>
          </div>
          <div class="kpi-card">
            <span class="label">Revenue</span>
            <strong>{{ overview.kpis.revenue | currency:'USD':'symbol':'1.0-0' }}</strong>
            <small [class.green]="overview.kpis.revenueGrowth >= 0" [class.red]="overview.kpis.revenueGrowth < 0">
              {{ overview.kpis.revenueGrowth >= 0 ? '+' : '' }}{{ overview.kpis.revenueGrowth }}%
            </small>
          </div>
          <div class="kpi-card">
            <span class="label">Total Clients</span>
            <strong>{{ overview.kpis.totalClients }}</strong>
            <small>+{{ overview.kpis.newClients }} new</small>
          </div>
          <div class="kpi-card">
            <span class="label">Staff</span>
            <strong>{{ overview.kpis.totalStaff }}</strong>
          </div>
          <div class="kpi-card">
            <span class="label">Waitlist</span>
            <strong>{{ overview.kpis.pendingWaitlist }}</strong>
          </div>
          <div class="kpi-card">
            <span class="label">Walk-ins</span>
            <strong>{{ overview.kpis.activeWalkIns }}</strong>
          </div>
        </div>

        <!-- Revenue Section -->
        <div class="panel" *ngIf="revenue">
          <h2>Revenue</h2>
          <div class="revenue-summary">
            <div class="revenue-stat">
              <span>Total Revenue</span>
              <strong>{{ revenue.summary.total | currency:'USD':'symbol':'1.2-2' }}</strong>
            </div>
            <div class="revenue-stat">
              <span>Avg Per Booking</span>
              <strong>{{ revenue.summary.averagePerBooking | currency:'USD':'symbol':'1.2-2' }}</strong>
            </div>
            <div class="revenue-stat">
              <span>Completed Bookings</span>
              <strong>{{ revenue.summary.completedBookings }}</strong>
            </div>
          </div>

          <h3>Revenue by Status</h3>
          <div class="status-bars">
            <div class="status-bar-row" *ngFor="let s of revenue.byStatus">
              <span class="status-label">{{ s.status }}</span>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="getStatusPct(s.amount, revenue.summary.total)"></div>
              </div>
              <span class="status-amount">{{ s.amount | currency:'USD':'symbol':'1.0-0' }} ({{ s.count }})</span>
            </div>
          </div>

          <h3>Top Services</h3>
          <div class="services-list">
            <div class="service-row" *ngFor="let svc of revenue.topServices">
              <strong>{{ svc.name }}</strong>
              <span>{{ svc.revenue | currency:'USD':'symbol':'1.0-0' }} ({{ svc.bookings }} bookings)</span>
            </div>
          </div>

          <h3>Daily Revenue (last 7 days)</h3>
          <div class="daily-chart">
            <div class="daily-bar-wrap" *ngFor="let d of revenue.daily | slice:-7">
              <div class="daily-bar" [style.height.%]="getDailyPct(d.revenue, revenue.daily)">
                <span class="daily-val">{{ d.revenue | currency:'USD':'symbol':'1.0-0' }}</span>
              </div>
              <span class="daily-label">{{ d.date | date:'EEE' }}</span>
            </div>
          </div>
        </div>

        <!-- Operations Section -->
        <div class="grid-2" *ngIf="operations">
          <div class="panel">
            <h2>Operations</h2>
            <div class="ops-grid">
              <div class="ops-item"><span>Total</span><b>{{ operations.kpis.totalBookings }}</b></div>
              <div class="ops-item"><span>Completed</span><b class="green">{{ operations.kpis.completedBookings }}</b></div>
              <div class="ops-item"><span>Pending</span><b class="amber">{{ operations.kpis.pendingBookings }}</b></div>
              <div class="ops-item"><span>Cancelled</span><b class="red">{{ operations.kpis.cancelledBookings }}</b></div>
              <div class="ops-item"><span>No-show</span><b class="red">{{ operations.kpis.noShowBookings }}</b></div>
              <div class="ops-item"><span>Waitlist</span><b>{{ operations.kpis.waitlistEntries }}</b></div>
              <div class="ops-item"><span>Walk-ins</span><b>{{ operations.kpis.walkIns }}</b></div>
            </div>
          </div>

          <div class="panel">
            <h2>Rates</h2>
            <div class="rate-cards">
              <div class="rate-card">
                <div class="rate-circle" [class]="getRateClass(operations.kpis.completionRate)">
                  <span>{{ operations.kpis.completionRate }}%</span>
                </div>
                <span>Completion</span>
              </div>
              <div class="rate-card">
                <div class="rate-circle" [class]="getRateClass(100 - operations.kpis.cancellationRate)">
                  <span>{{ operations.kpis.cancellationRate }}%</span>
                </div>
                <span>Cancellation</span>
              </div>
              <div class="rate-card">
                <div class="rate-circle" [class]="getRateClass(100 - operations.kpis.noShowRate)">
                  <span>{{ operations.kpis.noShowRate }}%</span>
                </div>
                <span>No-show</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Staff + Client Activity -->
        <div class="grid-2" *ngIf="staffData">
          <div class="panel">
            <h2>Staff Performance</h2>
            <div class="staff-summary">
              <span>Active: <b>{{ staffData.summary.activeStaff }}</b></span>
              <span>Inactive: <b>{{ staffData.summary.inactiveStaff }}</b></span>
              <span>Total: <b>{{ staffData.summary.totalStaff }}</b></span>
            </div>
            <div class="staff-bar-list">
              <div class="staff-bar-row" *ngFor="let s of staffData.staff">
                <div class="staff-bar-info">
                  <strong>{{ s.fullName }}</strong>
                  <span>{{ s.role }}</span>
                </div>
                <div class="staff-bar-track">
                  <div class="staff-bar-fill" [style.width.%]="getStaffPct(s.completedBookings, staffData.staff)"></div>
                </div>
                <span class="staff-bar-val">{{ s.completedBookings }}/{{ s.totalBookings }}</span>
              </div>
            </div>
          </div>

          <div class="panel" *ngIf="clientActivity">
            <h2>Client Activity</h2>
            <div class="client-stats">
              <div class="client-stat"><span>Total</span><b>{{ clientActivity.summary.totalClients }}</b></div>
              <div class="client-stat"><span>New</span><b class="green">+{{ clientActivity.summary.newClients }}</b></div>
              <div class="client-stat"><span>Returning</span><b>{{ clientActivity.summary.returningClients }}</b></div>
              <div class="client-stat"><span>Avg Visits</span><b>{{ clientActivity.summary.avgVisitsPerClient | number:'1.1-1' }}</b></div>
            </div>
            <h3>Visit Distribution</h3>
            <div class="dist-bars">
              <div class="dist-row" *ngFor="let d of clientActivity.visitDistribution">
                <span class="dist-label">{{ d.range }}</span>
                <div class="dist-track">
                  <div class="dist-fill" [style.width.%]="getDistPct(d.count, clientActivity.visitDistribution)"></div>
                </div>
                <span class="dist-val">{{ d.count }}</span>
              </div>
            </div>
            <h3>Top Clients</h3>
            <div class="top-client-list">
              <div class="top-client-row" *ngFor="let c of clientActivity.topClients.slice(0, 5)">
                <strong>{{ c.fullName }}</strong>
                <span>{{ c.totalVisits }} visits &middot; {{ c.totalSpend | currency:'USD':'symbol':'1.0-0' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="empty" *ngIf="!overview && !revenue && !operations && !staffData && !clientActivity && !loading">
          <p>No analytics data available. Ensure the backend is running.</p>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .refresh-btn{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .refresh-btn:disabled{opacity:.5;cursor:default}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card .label{display:block;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
    .kpi-card strong{font-size:28px;display:block}
    .kpi-card small{display:block;margin-top:4px;font-size:12px;font-weight:700}.green{color:#16a34a}.red{color:#dc2626}.amber{color:#d97706}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel h2{margin:0 0 18px;font-size:20px}
    .panel h3{margin:20px 0 12px;font-size:16px;color:#374151}
    .revenue-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
    .revenue-stat span{display:block;color:#6b7280;font-size:12px;margin-bottom:4px}
    .revenue-stat strong{font-size:20px}
    .status-bars{display:grid;gap:8px;margin-bottom:16px}
    .status-bar-row{display:grid;grid-template-columns:140px 1fr 140px;align-items:center;gap:12px;font-size:13px}
    .status-label{font-weight:600;text-transform:capitalize}
    .bar-track{background:#f3f4f6;border-radius:6px;height:8px;overflow:hidden}
    .bar-fill{height:100%;background:#0b0b0b;border-radius:6px;transition:width .3s}
    .status-amount{text-align:right;color:#6b7280}
    .services-list{display:grid;gap:8px}
    .service-row{display:flex;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:10px}
    .service-row strong{font-size:14px}.service-row span{font-size:13px;color:#6b7280}
    .daily-chart{display:flex;gap:8px;align-items:flex-end;height:160px;padding-top:20px;border-bottom:1px solid #e5e7eb}
    .daily-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}
    .daily-bar{width:100%;max-width:50px;background:#0b0b0b;border-radius:6px 6px 0 0;min-height:4px;position:relative;transition:height .3s}
    .daily-val{position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:11px;color:#6b7280;white-space:nowrap}
    .daily-label{font-size:11px;color:#6b7280;margin-top:6px;font-weight:600}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .ops-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .ops-item{display:flex;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:10px}
    .ops-item span{font-size:13px;color:#6b7280}.ops-item b{font-size:16px}
    .rate-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:8px}
    .rate-card{text-align:center}
    .rate-card span{display:block;margin-top:8px;font-size:13px;color:#6b7280}
    .rate-circle{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:16px;font-weight:900;background:#f8fafc;border:4px solid #e5e7eb}
    .rate-circle.good{border-color:#16a34a;color:#16a34a}
    .rate-circle.moderate{border-color:#f59e0b;color:#d97706}
    .rate-circle.poor{border-color:#dc2626;color:#dc2626}
    .staff-summary{display:flex;gap:20px;margin-bottom:16px;font-size:13px;color:#6b7280}
    .staff-summary b{font-size:16px;color:#0b0b0b;margin-left:4px}
    .staff-bar-list{display:grid;gap:10px}
    .staff-bar-row{display:grid;grid-template-columns:1fr 1fr 80px;align-items:center;gap:12px}
    .staff-bar-info strong{display:block;font-size:13px}.staff-bar-info span{font-size:11px;color:#6b7280}
    .staff-bar-track{background:#f3f4f6;border-radius:6px;height:8px;overflow:hidden}
    .staff-bar-fill{height:100%;background:#3b82f6;border-radius:6px;transition:width .3s}
    .staff-bar-val{font-size:12px;color:#6b7280;text-align:right}
    .client-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
    .client-stat{display:flex;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:10px}
    .client-stat span{font-size:13px;color:#6b7280}.client-stat b{font-size:16px}
    .dist-bars{display:grid;gap:8px;margin-bottom:16px}
    .dist-row{display:grid;grid-template-columns:100px 1fr 50px;align-items:center;gap:12px;font-size:13px}
    .dist-label{font-size:12px;color:#6b7280}
    .dist-track{background:#f3f4f6;border-radius:6px;height:8px;overflow:hidden}
    .dist-fill{height:100%;background:#8b5cf6;border-radius:6px;transition:width .3s}
    .dist-val{text-align:right;font-weight:700;font-size:13px}
    .top-client-list{display:grid;gap:8px}
    .top-client-row{display:flex;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:10px}
    .top-client-row strong{font-size:14px}.top-client-row span{font-size:12px;color:#6b7280}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    @media(max-width:1200px){.kpis{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.grid-2{grid-template-columns:1fr}.revenue-summary{grid-template-columns:1fr}.status-bar-row{grid-template-columns:100px 1fr 100px}}
    @media(max-width:600px){.kpis{grid-template-columns:1fr}.head{flex-direction:column;align-items:flex-start;gap:12px}.rate-cards{grid-template-columns:1fr}.staff-bar-row{grid-template-columns:1fr}.ops-grid{grid-template-columns:1fr}}
  `]
})
export class DashboardAnalyticsComponent {
  private api = inject(DashboardAnalyticsService);

  overview: DashboardOverview | null = null;
  revenue: RevenueAnalytics | null = null;
  operations: OperationsAnalytics | null = null;
  staffData: StaffAnalytics | null = null;
  clientActivity: ClientActivity | null = null;
  loading = true;
  error = '';

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.error = '';
    this.api.getOverview().subscribe({ next: (d) => { this.overview = d; this.loading = false; }, error: () => { this.error = 'Overview data unavailable.'; this.loading = false; } });
    this.api.getRevenue().subscribe({ next: (d) => this.revenue = d, error: () => {} });
    this.api.getOperations().subscribe({ next: (d) => this.operations = d, error: () => {} });
    this.api.getStaff().subscribe({ next: (d) => this.staffData = d, error: () => {} });
    this.api.getClientActivity().subscribe({ next: (d) => this.clientActivity = d, error: () => {} });
  }

  getStatusPct(amount: number, total: number): number {
    return total > 0 ? (amount / total) * 100 : 0;
  }

  getDailyPct(revenue: number, daily: { revenue: number }[]): number {
    const max = Math.max(...daily.map(d => d.revenue), 1);
    return (revenue / max) * 100;
  }

  getStaffPct(completed: number, staff: { completedBookings: number }[]): number {
    const max = Math.max(...staff.map(s => s.completedBookings), 1);
    return (completed / max) * 100;
  }

  getDistPct(count: number, dist: { count: number }[]): number {
    const max = Math.max(...dist.map(d => d.count), 1);
    return (count / max) * 100;
  }

  getRateClass(rate: number): string {
    if (rate >= 80) return 'good';
    if (rate >= 50) return 'moderate';
    return 'poor';
  }
}
