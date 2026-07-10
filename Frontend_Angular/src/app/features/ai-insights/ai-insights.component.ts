import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AiInsightsService } from './ai-insights.service';
import { AiInsightsResponse, AiInsightItem } from './ai-insights.models';

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>AI Insights</h1>
          <p>Business health, risk alerts, and growth opportunities powered by AI.</p>
        </div>
        <button class="refresh-btn" (click)="loadAll()" [disabled]="loading">Refresh</button>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Analyzing business data...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load insights.</strong>
        <p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error && data">
        <div class="summary-bar">
          <div class="summary-card health">
            <span>Health Score</span>
            <strong [class]="healthClass">{{ data.summary.healthScore }}/100</strong>
            <small>{{ data.summary.healthLabel }}</small>
          </div>
          <div class="summary-card">
            <span>Active Risks</span>
            <strong class="risk">{{ data.summary.activeRisks }}</strong>
          </div>
          <div class="summary-card">
            <span>Opportunities</span>
            <strong class="opp">{{ data.summary.opportunities }}</strong>
          </div>
        </div>

        <h2 class="section-title">Business Health</h2>
        <div class="insights-grid">
          <div class="insight-card health-card" *ngFor="let item of businessHealthItems">
            <div class="card-header">
              <span class="category-badge health">Business Health</span>
              <span class="priority-badge" *ngIf="item.priority">P{{ item.priority }}</span>
            </div>
            <strong>{{ item.label || item.title }}</strong>
            <p>{{ item.message || item.label }}</p>
            <div class="factors" *ngIf="item.factors?.length">
              <span class="factor" *ngFor="let f of item.factors">{{ f }}</span>
            </div>
          </div>
          <div class="insight-card empty-insight" *ngIf="businessHealthItems.length === 0">
            <p>No health data available.</p>
          </div>
        </div>

        <h2 class="section-title">Risk Alerts</h2>
        <div class="insights-grid">
          <div class="insight-card risk-card" *ngFor="let item of riskItems">
            <div class="card-header">
              <span class="category-badge risk">{{ item.severity || 'Risk' }}</span>
              <span class="priority-badge" *ngIf="item.priority">P{{ item.priority }}</span>
            </div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.message }}</p>
            <div class="suggested" *ngIf="item.suggestedAction">
              <small>Suggested: {{ item.suggestedAction }}</small>
            </div>
          </div>
          <div class="insight-card empty-insight" *ngIf="riskItems.length === 0">
            <p>No risk alerts. Everything looks good.</p>
          </div>
        </div>

        <h2 class="section-title">Growth Opportunities</h2>
        <div class="insights-grid">
          <div class="insight-card opp-card" *ngFor="let item of oppItems">
            <div class="card-header">
              <span class="category-badge opp">{{ item.type || 'Opportunity' }}</span>
              <span class="priority-badge" *ngIf="item.priority">P{{ item.priority }}</span>
            </div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.message }}</p>
          </div>
          <div class="insight-card empty-insight" *ngIf="oppItems.length === 0">
            <p>No opportunities identified yet.</p>
          </div>
        </div>
      </ng-container>

      <div class="empty" *ngIf="!loading && !error && !data">
        <p>No insights data available. Ensure the backend is running.</p>
      </div>
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
    .summary-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .summary-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:22px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .summary-card span{display:block;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
    .summary-card strong{font-size:32px;display:block}
    .summary-card small{display:block;color:#6b7280;margin-top:4px;font-size:13px}
    .summary-card .risk{color:#dc2626}
    .summary-card .opp{color:#16a34a}
    .health strong{color:#0b0b0b}
    .section-title{font-size:22px;margin:8px 0 0;padding-top:8px;border-top:2px solid #f1f5f9}
    .insights-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .insight-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:20px;box-shadow:0 8px 25px rgba(15,23,42,.04)}
    .card-header{display:flex;gap:8px;align-items:center;margin-bottom:12px}
    .category-badge{font-size:11px;font-weight:800;padding:3px 9px;border-radius:6px;text-transform:uppercase}
    .category-badge.health{background:#f0fdf4;color:#16a34a}
    .category-badge.risk{background:#fef2f2;color:#dc2626}
    .category-badge.opp{background:#eff6ff;color:#2563eb}
    .priority-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#f3f4f6;color:#6b7280;margin-left:auto}
    .insight-card strong{display:block;font-size:16px;margin-bottom:6px}
    .insight-card p{margin:0;font-size:13px;color:#6b7280}
    .factors{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
    .factor{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:3px 10px;font-size:11px;color:#6b7280}
    .suggested{background:#f8fafc;border-radius:10px;padding:10px;margin-top:12px}
    .suggested small{font-size:12px;color:#6b7280}
    .risk-card{border-left:3px solid #fecaca}
    .opp-card{border-left:3px solid #bfdbfe}
    .health-card{border-left:3px solid #bbf7d0}
    .empty-insight p{text-align:center;color:#9ca3af;padding:24px}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    @media(max-width:1000px){.summary-bar,.insights-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:600px){.summary-bar,.insights-grid{grid-template-columns:1fr}.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class AiInsightsComponent {
  private api = inject(AiInsightsService);

  data: AiInsightsResponse | null = null;
  loading = true;
  error = '';

  get healthClass(): string {
    const s = this.data?.summary.healthScore ?? 0;
    if (s >= 80) return 'excellent';
    if (s >= 60) return 'good';
    if (s >= 40) return 'fair';
    return 'poor';
  }

  get businessHealthItems(): AiInsightItem[] {
    return this.data?.insights.filter(i => i.category === 'business_health') ?? [];
  }

  get riskItems(): AiInsightItem[] {
    return this.data?.insights.filter(i => i.category === 'risk') ?? [];
  }

  get oppItems(): AiInsightItem[] {
    return this.data?.insights.filter(i => i.category === 'opportunity') ?? [];
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.error = '';
    this.api.getAll().subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load AI insights.';
        this.loading = false;
      }
    });
  }
}
