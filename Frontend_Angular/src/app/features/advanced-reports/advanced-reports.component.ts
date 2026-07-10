import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdvancedReportsService } from './advanced-reports.service';

@Component({
  selector: 'app-advanced-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Advanced Reports</h1>
          <p>Detailed business analytics and export.</p>
        </div>
        <div class="date-range">
          <input type="date" [(ngModel)]="dateFrom">
          <input type="date" [(ngModel)]="dateTo">
          <button (click)="loadAll()">Apply</button>
          <button class="export-btn" (click)="doExport()" [disabled]="exporting">
            {{ exporting ? 'Exporting...' : 'Export CSV' }}
          </button>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading reports...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load reports.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">

        <div class="empty" *ngIf="!revenue && !bookings && !clients && !staff && !inventory && !finance">
          <p>No report data available for the selected range.</p>
        </div>

        <div class="report-grid">

          <div class="report-card" *ngIf="revenue">
            <h3>Revenue</h3>
            <div class="stat-row"><span>Total</span><b>{{ revenue.total | currency }}</b></div>
            <div class="stat-row" *ngFor="let s of revenue.byStatus">
              <span>{{ s.status }}</span><b>{{ s.amount | currency }}</b>
            </div>
          </div>

          <div class="report-card" *ngIf="bookings">
            <h3>Bookings</h3>
            <div class="stat-row"><span>Total</span><b>{{ bookings.total }}</b></div>
            <div class="stat-row" *ngFor="let s of bookings.byStatus">
              <span>{{ s.status }}</span><b>{{ s.count }}</b>
            </div>
          </div>

          <div class="report-card" *ngIf="clients">
            <h3>Clients</h3>
            <div class="stat-row"><span>Total Clients</span><b>{{ clients.total }}</b></div>
            <div class="stat-row"><span>New This Month</span><b class="green">{{ clients.newThisMonth }}</b></div>
            <div class="stat-row"><span>Active</span><b>{{ clients.active }}</b></div>
          </div>

          <div class="report-card" *ngIf="staff">
            <h3>Staff</h3>
            <div class="stat-row"><span>Staff Count</span><b>{{ staff.count }}</b></div>
            <div class="stat-row"><span>Total Bookings</span><b>{{ staff.totalBookings }}</b></div>
          </div>

          <div class="report-card" *ngIf="inventory">
            <h3>Inventory</h3>
            <div class="stat-row"><span>Total Products</span><b>{{ inventory.totalProducts }}</b></div>
            <div class="stat-row"><span>Low Stock</span><b class="red">{{ inventory.lowStock }}</b></div>
          </div>

          <div class="report-card" *ngIf="finance">
            <h3>Finance</h3>
            <div class="stat-row"><span>Payments</span><b>{{ finance.payments | currency }}</b></div>
            <div class="stat-row"><span>Invoices</span><b>{{ finance.invoices }}</b></div>
            <div class="stat-row"><span>Pending</span><b class="amber">{{ finance.pending | currency }}</b></div>
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
    .date-range{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .date-range input{padding:10px;border:1px solid #e5e7eb;border-radius:12px}
    .date-range button{border:0;border-radius:12px;padding:10px 16px;background:#0b0b0b;color:white;font-weight:700;cursor:pointer}
    .export-btn{background:#2563eb!important}
    .export-btn:disabled{opacity:.5;cursor:default}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .report-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .report-card{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .report-card h3{font-size:18px;margin:0 0 16px}
    .stat-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f8fafc}
    .stat-row span{font-size:13px;color:#6b7280}
    .stat-row b{font-size:15px}
    .green{color:#16a34a}.red{color:#dc2626}.amber{color:#d97706}
    @media(max-width:1200px){.report-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.report-grid{grid-template-columns:1fr}.head{flex-direction:column;align-items:stretch}.date-range{width:100%}.date-range input{flex:1}}
  `]
})
export class AdvancedReportsComponent {
  private api = inject(AdvancedReportsService);

  loading = true;
  error = '';
  exporting = false;
  dateFrom = '';
  dateTo = '';
  revenue: any = null;
  bookings: any = null;
  clients: any = null;
  staff: any = null;
  inventory: any = null;
  finance: any = null;

  ngOnInit() {
    const d = new Date();
    this.dateTo = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - 30);
    this.dateFrom = d.toISOString().slice(0, 10);
    this.loadAll();
  }

  loadAll() {
    this.loading = true; this.error = '';
    const params: any = {};
    if (this.dateFrom) params.from = this.dateFrom;
    if (this.dateTo) params.to = this.dateTo;

    this.api.getRevenue(params).subscribe({ next: (d) => this.revenue = d, error: () => {} });
    this.api.getBookings(params).subscribe({ next: (d) => this.bookings = d, error: () => {} });
    this.api.getClients(params).subscribe({ next: (d) => this.clients = d, error: () => {} });
    this.api.getStaff(params).subscribe({ next: (d) => this.staff = d, error: () => {} });
    this.api.getInventory(params).subscribe({ next: (d) => this.inventory = d, error: () => {} });
    this.api.getFinance(params).subscribe({
      next: (d) => { this.finance = d; this.loading = false; },
      error: () => { this.error = 'Report data unavailable.'; this.loading = false; },
    });
  }

  doExport() {
    this.exporting = true;
    const params: any = {};
    if (this.dateFrom) params.from = this.dateFrom;
    if (this.dateTo) params.to = this.dateTo;
    this.api.exportCsv(params).subscribe({
      next: (res: any) => {
        if (res?.csv) {
          const blob = new Blob([res.csv], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'advanced-report.csv'; a.click();
          window.URL.revokeObjectURL(url);
        }
        this.exporting = false;
      },
      error: () => { this.exporting = false; },
    });
  }
}
