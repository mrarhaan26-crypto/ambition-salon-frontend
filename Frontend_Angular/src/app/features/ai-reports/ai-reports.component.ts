import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiReportsService } from './ai-reports.service';

@Component({
  selector: 'app-ai-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>AI Reports</h1>
          <p>AI-generated performance reports, trend analysis, predictions, and anomaly detection.</p>
        </div>
        <button class="refresh-btn" (click)="loadAll()" [disabled]="loading">Refresh</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Generating AI reports...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="loadAll()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="perfReport">
          <div class="kpi-card"><span>Revenue (MTD)</span><strong>{{ perfReport.revenue | currency }}</strong></div>
          <div class="kpi-card success"><span>Growth</span><strong>{{ perfReport.growth || 0 }}%</strong></div>
          <div class="kpi-card"><span>Bookings (MTD)</span><strong>{{ perfReport.bookings || 0 }}</strong></div>
          <div class="kpi-card warn"><span>Anomalies</span><strong class="red">{{ perfReport.anomalyCount || 0 }}</strong></div>
        </div>

        <div class="grid-2">
          <div class="panel">
            <h2>Trend Analysis</h2>
            <div class="empty" *ngIf="!trends?.length"><p>No trend data available.</p></div>
            <div class="trend-list" *ngIf="trends?.length">
              <div class="trend-item" *ngFor="let t of trends">
                <div class="trend-head">
                  <strong>{{ t.metric }}</strong>
                  <span class="trend-dir" [class.up]="t.direction === 'up'" [class.down]="t.direction === 'down'">
                    {{ t.direction === 'up' ? '↑' : '↓' }} {{ t.change }}%
                  </span>
                </div>
                <p>{{ t.insight }}</p>
                <div class="trend-period">{{ t.period }}</div>
              </div>
            </div>
          </div>

          <div class="panel">
            <h2>Predictions</h2>
            <div class="empty" *ngIf="!predictions?.length"><p>No predictions available.</p></div>
            <div class="pred-list" *ngIf="predictions?.length">
              <div class="pred-card" *ngFor="let p of predictions">
                <div class="pred-head">
                  <strong>{{ p.metric }}</strong>
                  <span class="pred-date">{{ p.period || p.date }}</span>
                </div>
                <div class="pred-value">
                  <span>Predicted: <b>{{ p.predictedValue | number }}</b></span>
                  <span>Range: {{ p.rangeLow | number }} - {{ p.rangeHigh | number }}</span>
                </div>
                <div class="pred-confidence">Confidence: {{ p.confidence || 85 }}%</div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Anomaly Detection</h2>
          <div class="empty" *ngIf="!anomalies?.length"><p>No anomalies detected. Everything looks normal.</p></div>
          <div class="anomaly-list" *ngIf="anomalies?.length">
            <div class="anomaly-item" *ngFor="let a of anomalies" [class]="'sev-'+a.severity.toLowerCase()">
              <span class="sev-badge" [class]="a.severity.toLowerCase()">{{ a.severity }}</span>
              <div class="anomaly-info">
                <strong>{{ a.metric || a.title }}</strong>
                <p>{{ a.description || a.message }}</p>
                <span class="anomaly-date">{{ a.date || a.timestamp }}</span>
              </div>
              <span class="anomaly-value" *ngIf="a.expected !== undefined">
                Expected: {{ a.expected }}<br>
                Actual: <strong class="actual">{{ a.actual }}</strong>
              </span>
            </div>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:var(--muted);margin:6px 0 0}
    .refresh-btn{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:var(--black);color:var(--white)}
    .refresh-btn:disabled{opacity:.5}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}
    .kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:20px;box-shadow:var(--card-shadow)}
    .kpi-card span{display:block;color:var(--muted);font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    .kpi-card.success strong{color:#059669}
    .kpi-card.warn strong.red{color:#dc2626}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
    .panel{background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:24px;box-shadow:var(--card-shadow);margin-bottom:18px}
    .panel h2{margin:0 0 16px;font-size:18px}
    .empty{padding:24px;text-align:center;color:var(--muted)}
    .trend-list,.pred-list{display:grid;gap:10px}
    .trend-item{background:var(--soft);border-radius:14px;padding:14px}
    .trend-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
    .trend-head strong{font-size:14px}
    .trend-dir{font-size:13px;font-weight:700}
    .trend-dir.up{color:#059669}
    .trend-dir.down{color:#dc2626}
    .trend-item p{margin:4px 0;font-size:13px;color:var(--muted)}
    .trend-period{font-size:11px;color:var(--muted)}
    .pred-card{background:var(--soft);border-radius:14px;padding:14px;border-left:4px solid var(--gold)}
    .pred-head{display:flex;justify-content:space-between;margin-bottom:6px}
    .pred-head strong{font-size:14px}
    .pred-date{font-size:11px;color:var(--muted)}
    .pred-value{display:flex;gap:12px;font-size:13px;color:var(--muted);margin-bottom:6px}
    .pred-value b{color:var(--text)}
    .pred-confidence{font-size:12px;font-weight:600;color:#059669}
    .anomaly-list{display:grid;gap:10px}
    .anomaly-item{display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:14px;background:var(--soft)}
    .anomaly-item.sev-critical{border-left:4px solid #dc2626;background:#fef2f2}
    .anomaly-item.sev-high{border-left:4px solid #f59e0b;background:#fffbeb}
    .anomaly-item.sev-medium{border-left:4px solid #3b82f6;background:#eff6ff}
    .anomaly-item.sev-low{border-left:4px solid #6b7280}
    .sev-badge{font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700;text-transform:uppercase;flex-shrink:0;background:#f3f4f6}
    .sev-badge.critical{background:#fee2e2;color:#dc2626}
    .sev-badge.high{background:#fef3c7;color:#d97706}
    .sev-badge.medium{background:#dbeafe;color:#1d4ed8}
    .sev-badge.low{background:#f3f4f6;color:var(--muted)}
    .anomaly-info{flex:1}
    .anomaly-info strong{display:block;font-size:14px;margin-bottom:2px}
    .anomaly-info p{margin:0 0 4px;font-size:13px;color:var(--muted)}
    .anomaly-date{font-size:11px;color:var(--muted)}
    .anomaly-value{font-size:12px;text-align:right;flex-shrink:0}
    .anomaly-value .actual{color:#dc2626}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:var(--muted)}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:var(--black);color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    @media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.grid-2{grid-template-columns:1fr}}
  `]
})
export class AiReportsComponent {
  private api = inject(AiReportsService);
  loading = true; error = '';
  perfReport: any = null;
  trends: any[] = [];
  predictions: any[] = [];
  anomalies: any[] = [];

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    let c = 0;
    const done = () => { if (++c >= 4) this.loading = false; };
    this.api.getPerformanceReport().subscribe({ next: (d) => { this.perfReport = d; done(); }, error: () => done() });
    this.api.getTrends().subscribe({ next: (d) => { this.trends = d.data || d || []; done(); }, error: () => done() });
    this.api.getPredictions().subscribe({ next: (d) => { this.predictions = d.data || d || []; done(); }, error: () => done() });
    this.api.getAnomalies().subscribe({ next: (d) => { this.anomalies = d.data || d || []; done(); }, error: () => done() });
  }
}
