import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CrmIntelligenceService } from './crm-intelligence.service';

@Component({
  selector: 'app-crm-intelligence',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>CRM Intelligence</h1>
          <p>Client retention, segments &amp; insights.</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading CRM data...</span>
      </div>
      <div class="error" *ngIf="error">
        <strong>Failed to load CRM data.</strong><p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error && dashboard">
        <div class="kpi-row">
          <div class="kpi-card"><span class="kpi-val">{{ dashboard.total }}</span><span class="kpi-lbl">Total Clients</span></div>
          <div class="kpi-card green"><span class="kpi-val">{{ dashboard.vipCount }}</span><span class="kpi-lbl">VIPs</span></div>
          <div class="kpi-card warn"><span class="kpi-val">{{ dashboard.inactiveCount }}</span><span class="kpi-lbl">Inactive</span></div>
          <div class="kpi-card"><span class="kpi-val">{{ dashboard.birthdayCount }}</span><span class="kpi-lbl">Birthdays This Month</span></div>
        </div>

        <h2>Client Segments</h2>
        <div class="segments-grid" *ngIf="segments?.segments">
          <div class="segment-card" *ngFor="let s of segments.segments" [style.border-left-color]="s.color">
            <strong>{{ s.name }}</strong>
            <span class="seg-count">{{ s.count }}</span>
          </div>
        </div>

        <h2>VIP Clients</h2>
        <div class="empty" *ngIf="vips.length === 0"><p>No VIP clients yet.</p></div>
        <div class="data-table-wrap" *ngIf="vips.length > 0">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Total Spend</th><th>Visits</th></tr></thead>
            <tbody>
              <tr *ngFor="let c of vips">
                <td><strong>{{ c.fullName }}</strong></td>
                <td>{{ c.phone || '—' }}</td>
                <td>{{ c.totalSpend | currency }}</td>
                <td>{{ c.totalVisits }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Inactive Clients</h2>
        <div class="empty" *ngIf="inactive.length === 0"><p>No inactive clients.</p></div>
        <div class="data-table-wrap" *ngIf="inactive.length > 0">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Last Visit</th></tr></thead>
            <tbody>
              <tr *ngFor="let c of inactive">
                <td><strong>{{ c.fullName }}</strong></td>
                <td>{{ c.phone || '—' }}</td>
                <td>{{ c.lastVisitAt | date:'MMM dd, yyyy' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Birthdays This Month</h2>
        <div class="empty" *ngIf="birthdays.length === 0"><p>No birthdays this month.</p></div>
        <div class="data-table-wrap" *ngIf="birthdays.length > 0">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Birthday</th></tr></thead>
            <tbody>
              <tr *ngFor="let c of birthdays">
                <td><strong>{{ c.fullName }}</strong></td>
                <td>{{ c.phone || '—' }}</td>
                <td>{{ c.dateOfBirth | date:'MMM dd' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Recommendations</h2>
        <div class="recommendations-grid">
          <div class="rec-card" *ngFor="let r of recommendations">
            <strong>{{ r.type }}</strong>
            <p>{{ r.message }}</p>
            <span>{{ r.count }} clients</span>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}h2{font-size:20px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:20px;display:grid;gap:4px;box-shadow:0 8px 25px rgba(15,23,42,.05)}
    .kpi-val{font-size:28px;font-weight:800;line-height:1}.kpi-lbl{font-size:12px;color:#6b7280;font-weight:600}
    .kpi-card.green .kpi-val{color:#16a34a}.kpi-card.warn .kpi-val{color:#dc2626}
    .segments-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
    .segment-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;border-left:5px solid;display:grid;gap:6px}
    .segment-card strong{font-size:15px}.seg-count{font-size:28px;font-weight:800}
    .data-table-wrap{background:white;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden}
    .data-table{width:100%;border-collapse:collapse}
    .data-table th{text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:14px 18px;background:#f9fafb;border-bottom:1px solid #e5e7eb}
    .data-table td{padding:12px 18px;border-bottom:1px solid #f3f4f6;font-size:14px}
    .data-table tr:last-child td{border-bottom:0}
    .recommendations-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
    .rec-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;display:grid;gap:6px}
    .rec-card strong{text-transform:capitalize;color:#2563eb}.rec-card p{font-size:14px;color:#374151;margin:0}.rec-card span{font-size:12px;color:#6b7280}
    @media(max-width:600px){.kpi-row,.segments-grid{grid-template-columns:1fr}.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class CrmIntelligenceComponent {
  private api = inject(CrmIntelligenceService);
  dashboard: any = null;
  segments: any = null;
  vips: any[] = [];
  inactive: any[] = [];
  birthdays: any[] = [];
  recommendations: any[] = [];
  loading = true;
  error = '';
  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getDashboard().subscribe({ next: d => { this.dashboard = d; this.loading = false; }, error: () => { this.error = 'CRM data unavailable.'; this.loading = false; } });
    this.api.getSegments().subscribe({ next: d => this.segments = d });
    this.api.getVips().subscribe({ next: d => this.vips = d });
    this.api.getInactive().subscribe({ next: d => this.inactive = d });
    this.api.getBirthdays().subscribe({ next: d => this.birthdays = d });
    this.api.getRecommendations().subscribe({ next: d => this.recommendations = d });
  }
}
