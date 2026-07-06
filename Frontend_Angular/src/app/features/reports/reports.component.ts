import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportsService } from './reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Reports & BI</h1>
          <p>Business intelligence, revenue, bookings, clients, staff, and inventory reports.</p>
        </div>
        <div class="date-range">
          <input type="date" [(ngModel)]="dateFrom">
          <input type="date" [(ngModel)]="dateTo">
          <button (click)="loadAll()">Apply</button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading reports...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load reports.</strong>
        <p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <!-- Dashboard KPIs -->
        <div class="kpis" *ngIf="dashboard">
          <div class="kpi-card">
            <span>Total Revenue</span>
            <strong>{{ dashboard.kpis.totalRevenue | currency:'USD':'symbol':'1.0-0' }}</strong>
          </div>
          <div class="kpi-card">
            <span>Total Bookings</span>
            <strong>{{ dashboard.kpis.totalBookings }}</strong>
          </div>
          <div class="kpi-card">
            <span>New Clients</span>
            <strong>{{ dashboard.kpis.newClients }}</strong>
          </div>
          <div class="kpi-card">
            <span>Low Stock Items</span>
            <strong class="red" *ngIf="dashboard.kpis.lowStockItems > 0">{{ dashboard.kpis.lowStockItems }}</strong>
            <strong *ngIf="dashboard.kpis.lowStockItems === 0">0</strong>
          </div>
        </div>

        <!-- Revenue Report -->
        <div class="panel" *ngIf="revenue">
          <h2>Revenue Report</h2>
          <div class="revenue-summary">
            <div class="rev-stat"><span>Total</span><b>{{ revenue.summary.totalRevenue | currency:'USD':'symbol':'1.2-2' }}</b></div>
            <div class="rev-stat"><span>Sales Count</span><b>{{ revenue.summary.totalSales }}</b></div>
            <div class="rev-stat"><span>Avg per Sale</span><b>{{ revenue.summary.averagePerSale | currency:'USD':'symbol':'1.2-2' }}</b></div>
          </div>
          <div class="daily-chart" *ngIf="revenue.daily.length > 0">
            <div class="daily-bar-wrap" *ngFor="let d of revenue.daily">
              <div class="daily-bar" [style.height.%]="getDailyPct(d.revenue, revenue.daily)">
                <span class="daily-val">{{ d.revenue | currency:'USD':'symbol':'1.0-0' }}</span>
              </div>
              <span class="daily-label">{{ d.date | date:'MMM dd' }}</span>
            </div>
          </div>
        </div>

        <!-- Bookings Report -->
        <div class="grid-2">
          <div class="panel" *ngIf="bookings">
            <h2>Bookings Report</h2>
            <div class="status-grid">
              <div class="status-item"><span>Total</span><b>{{ bookings.summary.totalBookings }}</b></div>
              <div class="status-item"><span>Completed</span><b class="green">{{ bookings.summary.COMPLETED }}</b></div>
              <div class="status-item"><span>Confirmed</span><b>{{ bookings.summary.CONFIRMED }}</b></div>
              <div class="status-item"><span>Pending</span><b class="amber">{{ bookings.summary.PENDING }}</b></div>
              <div class="status-item"><span>Cancelled</span><b class="red">{{ bookings.summary.CANCELLED }}</b></div>
              <div class="status-item"><span>No-show</span><b class="red">{{ bookings.summary.NO_SHOW }}</b></div>
            </div>
          </div>

          <div class="panel" *ngIf="clientsReport">
            <h2>Clients Report</h2>
            <div class="client-stats">
              <div class="client-stat"><span>Total Clients</span><b>{{ clientsReport.summary.totalClients }}</b></div>
              <div class="client-stat"><span>New (period)</span><b class="green">+{{ clientsReport.summary.newClients }}</b></div>
              <div class="client-stat"><span>Returning (period)</span><b>{{ clientsReport.summary.returningClients }}</b></div>
            </div>
          </div>
        </div>

        <!-- Staff Report -->
        <div class="panel" *ngIf="staffReport">
          <h2>Staff Performance</h2>
          <div class="tab-scroll">
            <table>
              <thead>
                <tr><th>Name</th><th>Role</th><th>Active</th><th>Bookings</th><th>Completed</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of staffReport.staff">
                  <td><strong>{{ s.fullName }}</strong></td>
                  <td>{{ s.role }}</td>
                  <td><span class="status-badge" [class.active]="s.isActive">{{ s.isActive ? 'Active' : 'Inactive' }}</span></td>
                  <td>{{ s.totalBookings }}</td>
                  <td>{{ s.completedBookings }}</td>
                  <td>{{ s.revenue | currency:'USD':'symbol':'1.0-0' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Inventory Report -->
        <div class="panel" *ngIf="inventoryReport">
          <h2>Inventory Summary</h2>
          <div class="inv-summary">
            <div class="inv-stat"><span>Total Products</span><b>{{ inventoryReport.summary.totalProducts }}</b></div>
            <div class="inv-stat"><span>Low Stock</span><b class="red">{{ inventoryReport.summary.lowStockCount }}</b></div>
          </div>
          <div class="low-stock-list" *ngIf="inventoryReport.lowStock.length > 0">
            <h3>Low Stock Items</h3>
            <div class="low-item" *ngFor="let item of inventoryReport.lowStock">
              <strong>{{ item.name }}</strong>
              <span>{{ item.quantity }} {{ item.unit }} (min: {{ item.minStockLevel }})</span>
            </div>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .date-range{display:flex;gap:8px;align-items:center}
    .date-range input{padding:10px;border:1px solid #e5e7eb;border-radius:12px}
    .date-range button{border:0;border-radius:12px;padding:10px 16px;background:#0b0b0b;color:white;font-weight:700;cursor:pointer}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    .red{color:#dc2626}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel h2{margin:0 0 18px;font-size:20px}
    .panel h3{margin:16px 0 10px;font-size:15px;color:#374151}
    .revenue-summary,.inv-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
    .rev-stat,.inv-stat{text-align:center;padding:14px;background:#f8fafc;border-radius:14px}
    .rev-stat span,.inv-stat span{display:block;color:#6b7280;font-size:12px;margin-bottom:4px}
    .rev-stat b,.inv-stat b{font-size:20px}
    .daily-chart{display:flex;gap:8px;align-items:flex-end;height:160px;padding-top:20px;border-bottom:1px solid #e5e7eb;overflow-x:auto}
    .daily-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;min-width:50px}
    .daily-bar{width:100%;max-width:50px;background:#0b0b0b;border-radius:6px 6px 0 0;min-height:4px;position:relative;transition:height .3s}
    .daily-val{position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:11px;color:#6b7280;white-space:nowrap}
    .daily-label{font-size:11px;color:#6b7280;margin-top:6px;font-weight:600}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .status-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .status-item{display:flex;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:10px}
    .status-item span{font-size:13px;color:#6b7280}.status-item b{font-size:16px}.green{color:#16a34a}.amber{color:#d97706}
    .client-stats{display:grid;grid-template-columns:1fr;gap:10px}
    .client-stat{display:flex;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:10px}
    .client-stat span{font-size:13px;color:#6b7280}.client-stat b{font-size:16px}
    .tab-scroll{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th,td{padding:12px 14px;text-align:left;border-bottom:1px solid #f1f5f9}
    th{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
    .status-badge{font-size:11px;padding:3px 10px;border-radius:20px;background:#f3f4f6;font-weight:600}
    .status-badge.active{background:#f0fdf4;color:#16a34a}
    .low-stock-list{display:grid;gap:8px}
    .low-item{display:flex;justify-content:space-between;padding:10px 12px;background:#fef2f2;border-radius:10px}
    .low-item strong{font-size:14px}.low-item span{font-size:13px;color:#dc2626}
    @media(max-width:1200px){.kpis{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.grid-2,.revenue-summary{grid-template-columns:1fr}.kpis{grid-template-columns:1fr}.head{flex-direction:column;align-items:stretch}}
  `]
})
export class ReportsComponent {
  private api = inject(ReportsService);

  loading = true;
  error = '';
  dateFrom = '';
  dateTo = '';
  dashboard: any = null;
  revenue: any = null;
  bookings: any = null;
  clientsReport: any = null;
  staffReport: any = null;
  inventoryReport: any = null;

  ngOnInit() {
    const d = new Date();
    this.dateTo = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - 30);
    this.dateFrom = d.toISOString().slice(0, 10);
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.error = '';
    const params: any = {};
    if (this.dateFrom) params.from = this.dateFrom;
    if (this.dateTo) params.to = this.dateTo;

    this.api.getDashboard(params).subscribe({
      next: (d) => { this.dashboard = d; this.loading = false; },
      error: () => { this.error = 'Report data unavailable.'; this.loading = false; },
    });
    this.api.getRevenue(params).subscribe({ next: (d) => this.revenue = d });
    this.api.getBookings(params).subscribe({ next: (d) => this.bookings = d });
    this.api.getClients(params).subscribe({ next: (d) => this.clientsReport = d });
    this.api.getStaff(params).subscribe({ next: (d) => this.staffReport = d });
    this.api.getInventory(params).subscribe({ next: (d) => this.inventoryReport = d });
  }

  getDailyPct(revenue: number, daily: { revenue: number }[]): number {
    const max = Math.max(...daily.map(d => d.revenue), 1);
    return (revenue / max) * 100;
  }
}
