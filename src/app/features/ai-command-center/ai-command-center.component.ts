import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AiCommandCenterService } from './ai-command-center.service';
import { CommandCenterDashboard, CapacityForecast, StaffPerformance, RecommendationsResponse } from './ai-command-center.models';

@Component({
  selector: 'app-ai-command-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>AI Command Center</h1>
          <p>Enterprise intelligence dashboard with real-time insights.</p>
        </div>
        <button class="refresh-btn" (click)="loadAll()" [disabled]="loading">Refresh</button>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading AI Command Center data...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load AI Command Center data.</strong>
        <p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="dashboard">
          <div class="kpi-card">
            <span class="label">Total Bookings</span>
            <strong class="value">{{ dashboard.summary.totalBookings }}</strong>
          </div>
          <div class="kpi-card">
            <span class="label">Revenue</span>
            <strong class="value">{{ dashboard.summary.revenue | currency:'USD':'symbol':'1.0-0' }}</strong>
          </div>
          <div class="kpi-card">
            <span class="label">Walk-ins</span>
            <strong class="value">{{ dashboard.summary.activeWalkIns }}</strong>
            <small>{{ dashboard.summary.walkInCount }} total</small>
          </div>
          <div class="kpi-card">
            <span class="label">Waitlist</span>
            <strong class="value">{{ dashboard.summary.pendingWaitlist }}</strong>
            <small>{{ dashboard.summary.waitlistCount }} total</small>
          </div>
          <div class="kpi-card alerts-card">
            <span class="label">Alerts</span>
            <strong class="value">{{ dashboard.alerts.length }}</strong>
            <small *ngIf="dashboard.alerts.length">{{ dashboard.alerts[0].message }}</small>
          </div>
          <div class="kpi-card">
            <span class="label">AI Suggestions</span>
            <strong class="value">{{ dashboard.aiSuggestions.length }}</strong>
          </div>
        </div>

        <div class="grid-2" *ngIf="!loading">
          <div class="panel" *ngIf="dashboard">
            <h2>Today's Overview</h2>
            <div class="overview-grid">
              <div class="stat"><span>Avg Booking Value</span><b>{{ dashboard.summary.avgBookingValue | currency:'USD':'symbol':'1.2-2' }}</b></div>
              <div class="stat"><span>Waitlist Count</span><b>{{ dashboard.summary.waitlistCount }}</b></div>
              <div class="stat"><span>Walk-in Count</span><b>{{ dashboard.summary.walkInCount }}</b></div>
              <div class="stat"><span>Pending Waitlist</span><b>{{ dashboard.summary.pendingWaitlist }}</b></div>
            </div>
            <div class="alerts-section" *ngIf="dashboard.alerts.length">
              <h3>Active Alerts</h3>
              <div class="alert-row" *ngFor="let alert of dashboard.alerts" [class]="'severity-' + alert.severity.toLowerCase()">
                <span class="badge">{{ alert.severity }}</span>
                <span>{{ alert.message }}</span>
              </div>
            </div>
            <div class="suggestions-section" *ngIf="dashboard.aiSuggestions.length">
              <h3>AI Suggestions</h3>
              <div class="suggestion-row" *ngFor="let s of dashboard.aiSuggestions">
                <strong>{{ s.type }}</strong>
                <p>{{ s.description }}</p>
              </div>
            </div>
          </div>

          <div class="panel" *ngIf="capacity">
            <h2>Capacity Forecast ({{ capacity.forecastDays }} days)</h2>
            <div class="capacity-stats">
              <div class="stat"><span>Avg Utilization</span><b>{{ capacity.avgUtilization }}%</b></div>
              <div class="stat"><span>Critical Days</span><b>{{ capacity.criticalDays }}</b></div>
              <div class="stat"><span>Recommendation</span><b class="rec">{{ capacity.recommendations }}</b></div>
            </div>
            <div class="forecast-list">
              <div class="forecast-row" *ngFor="let day of capacity.dailyForecast">
                <div class="forecast-info">
                  <strong>{{ day.dayName }}</strong>
                  <span>{{ day.date }}</span>
                </div>
                <div class="bar-wrap">
                  <div class="bar" [style.width.%]="day.utilizationPct" [class]="'status-' + day.capacityStatus.toLowerCase()"></div>
                </div>
                <span class="pct">{{ day.utilizationPct }}%</span>
              </div>
            </div>
          </div>

          <div class="panel" *ngIf="staffPerf">
            <h2>Staff Performance</h2>
            <div class="staff-list">
              <div class="staff-row" *ngFor="let s of staffPerf.staff">
                <div class="staff-info">
                  <strong>{{ s.staffName }}</strong>
                  <span>{{ s.role }}</span>
                </div>
                <div class="staff-metrics">
                  <span>Rate: {{ s.completionRate }}%</span>
                  <span>Eff: {{ s.efficiencyScore }}</span>
                  <span>{{ s.revenue | currency:'USD':'symbol':'1.0-0' }}</span>
                </div>
              </div>
            </div>
            <div class="top-performer" *ngIf="staffPerf.topPerformer">
              <span class="badge top">Top Performer</span>
              <strong>{{ staffPerf.topPerformer.staffName }}</strong>
              <span>{{ staffPerf.topPerformer.role }} - {{ staffPerf.topPerformer.efficiencyScore }}% efficiency</span>
            </div>
          </div>

          <div class="panel" *ngIf="recommendations">
            <h2>Recommendations</h2>
            <div class="rec-summary">
              <span class="rec-stat"><b>{{ recommendations.summary.critical }}</b> Critical</span>
              <span class="rec-stat"><b>{{ recommendations.summary.high }}</b> High</span>
              <span class="rec-stat"><b>{{ recommendations.summary.medium }}</b> Medium</span>
              <span class="rec-stat"><b>{{ recommendations.summary.low }}</b> Low</span>
            </div>
            <div class="rec-list">
              <div class="rec-item" *ngFor="let r of recommendations.recommendations" [class]="'priority-' + r.priority.toLowerCase()">
                <span class="badge">{{ r.priority }}</span>
                <div>
                  <strong>{{ r.title }}</strong>
                  <p>{{ r.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="empty" *ngIf="!dashboard && !capacity && !staffPerf && !recommendations && !loading">
          <p>No data available from AI Command Center. Ensure backend is running.</p>
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
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card .label{display:block;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
    .kpi-card .value{font-size:28px;display:block;font-weight:900}
    .kpi-card small{display:block;color:#6b7280;margin-top:4px;font-size:12px}
    .alerts-card .value{color:#dc2626}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel h2{margin:0 0 18px;font-size:20px}
    .panel h3{margin:16px 0 10px;font-size:16px;color:#374151}
    .overview-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .stat span{display:block;color:#6b7280;font-size:12px;margin-bottom:4px}
    .stat b{font-size:18px}
    .alerts-section,.suggestions-section{margin-top:16px}
    .alert-row,.suggestion-row{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;margin-bottom:8px;background:#f8fafc}
    .suggestion-row{display:block}
    .suggestion-row strong{display:block;font-size:13px;text-transform:capitalize}
    .suggestion-row p{margin:4px 0 0;font-size:13px;color:#6b7280}
    .severity-high{border-left:3px solid #dc2626}
    .severity-medium{border-left:3px solid #f59e0b}
    .severity-low{border-left:3px solid #6b7280}
    .badge{font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px;text-transform:uppercase}
    .severity-high .badge{background:#fef2f2;color:#dc2626}
    .severity-medium .badge{background:#fffbeb;color:#d97706}
    .severity-low .badge{background:#f3f4f6;color:#6b7280}
    .capacity-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
    .rec{font-size:13px!important;color:#6b7280;font-weight:600!important}
    .forecast-list{display:grid;gap:8px}
    .forecast-row{display:grid;grid-template-columns:120px 1fr 50px;align-items:center;gap:12px;padding:8px 0}
    .forecast-info strong{display:block;font-size:13px}
    .forecast-info span{font-size:11px;color:#6b7280}
    .bar-wrap{background:#f3f4f6;border-radius:8px;height:10px;overflow:hidden}
    .bar{height:100%;border-radius:8px;transition:width .3s}
    .status-critical{background:#dc2626}
    .status-high{background:#f59e0b}
    .status-moderate{background:#3b82f6}
    .status-low{background:#22c55e}
    .pct{font-size:13px;font-weight:700;text-align:right}
    .staff-list{display:grid;gap:8px}
    .staff-row{display:flex;justify-content:space-between;align-items:center;padding:12px;background:#f8fafc;border-radius:12px}
    .staff-info strong{display:block;font-size:14px}
    .staff-info span{font-size:12px;color:#6b7280}
    .staff-metrics{display:flex;gap:12px;font-size:12px;color:#6b7280}
    .staff-metrics span{background:white;padding:4px 10px;border-radius:8px;border:1px solid #e5e7eb}
    .top-performer{display:flex;align-items:center;gap:10px;margin-top:16px;padding:14px;background:#f0fdf4;border-radius:14px;border:1px solid #bbf7d0}
    .top-performer .badge{background:#22c55e;color:white}
    .top-performer strong{font-size:15px}
    .top-performer span{font-size:12px;color:#6b7280}
    .rec-summary{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap}
    .rec-stat{font-size:13px;color:#6b7280}
    .rec-stat b{font-size:18px;color:#0b0b0b;margin-right:4px}
    .rec-list{display:grid;gap:10px}
    .rec-item{display:flex;gap:12px;padding:14px;border-radius:14px;background:#f8fafc;align-items:flex-start}
    .rec-item strong{display:block;font-size:14px;margin-bottom:4px}
    .rec-item p{margin:0;font-size:13px;color:#6b7280}
    .priority-critical{border-left:3px solid #dc2626}
    .priority-high{border-left:3px solid #f59e0b}
    .priority-medium{border-left:3px solid #3b82f6}
    .priority-low{border-left:3px solid #6b7280}
    .priority-critical .badge{background:#fef2f2;color:#dc2626}
    .priority-high .badge{background:#fffbeb;color:#d97706}
    .priority-medium .badge{background:#eff6ff;color:#2563eb}
    .priority-low .badge{background:#f3f4f6;color:#6b7280}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    @media(max-width:1200px){.kpis{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.grid-2{grid-template-columns:1fr}}
    @media(max-width:600px){.kpis{grid-template-columns:1fr}.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class AiCommandCenterComponent {
  private api = inject(AiCommandCenterService);

  dashboard: CommandCenterDashboard | null = null;
  capacity: CapacityForecast | null = null;
  staffPerf: StaffPerformance | null = null;
  recommendations: RecommendationsResponse | null = null;
  loading = true;
  error = '';

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.error = '';
    let pending = 4;
    let errorCount = 0;
    const done = () => {
      pending--;
      if (pending <= 0) {
        this.loading = false;
        if (errorCount >= 4) this.error = 'AI Command Center data unavailable. Please try again.';
      }
    };
    this.api.getDashboard().subscribe({
      next: (d) => { this.dashboard = d; done(); },
      error: () => { errorCount++; done(); }
    });
    this.api.getCapacityForecast().subscribe({
      next: (c) => { this.capacity = c; done(); },
      error: () => { errorCount++; done(); }
    });
    this.api.getStaffPerformance().subscribe({
      next: (s) => { this.staffPerf = s; done(); },
      error: () => { errorCount++; done(); }
    });
    this.api.getRecommendations().subscribe({
      next: (r) => { this.recommendations = r; done(); },
      error: () => { errorCount++; done(); }
    });
  }
}
