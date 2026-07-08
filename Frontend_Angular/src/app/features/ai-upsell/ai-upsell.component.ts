import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiUpsellService } from './ai-upsell.service';

@Component({
  selector: 'app-ai-upsell',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>AI Upsell</h1>
          <p>AI-driven product and service recommendations to increase average order value.</p>
        </div>
        <button class="refresh-btn" (click)="loadAll()" [disabled]="loading">Refresh</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Analyzing upsell opportunities...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="loadAll()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="stats">
          <div class="kpi-card"><span>Potential Revenue</span><strong>{{ stats.potentialRevenue | currency }}</strong></div>
          <div class="kpi-card success"><span>Avg Upsell Rate</span><strong>{{ stats.avgUpsellRate }}%</strong></div>
          <div class="kpi-card"><span>Active Recommendations</span><strong>{{ stats.activeRecommendations || 0 }}</strong></div>
        </div>

        <div class="panel">
          <h2>Service Upsell Recommendations</h2>
          <div class="empty" *ngIf="!recommendations?.length"><p>No recommendations yet.</p></div>
          <div class="rec-grid" *ngIf="recommendations?.length">
            <div class="rec-card" *ngFor="let r of recommendations">
              <div class="rec-icon">⭐</div>
              <div class="rec-info">
                <strong>{{ r.serviceName || r.name }}</strong>
                <span class="rec-match">Match: {{ r.matchScore || r.confidence }}%</span>
                <span class="rec-price" *ngIf="r.price">{{ r.price | currency }}</span>
                <p class="rec-reason">{{ r.reason || 'Recommended based on client history.' }}</p>
              </div>
              <div class="rec-target" *ngIf="r.targetClient">
                <small>Target: {{ r.targetClient }}</small>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Package Suggestions</h2>
          <div class="empty" *ngIf="!packages?.length"><p>No package suggestions available.</p></div>
          <div class="pkg-grid" *ngIf="packages?.length">
            <div class="pkg-card" *ngFor="let p of packages">
              <div class="pkg-head">
                <strong>{{ p.name }}</strong>
                <span class="pkg-price">{{ p.price | currency }}</span>
              </div>
              <div class="pkg-services">
                <span class="svc-tag" *ngFor="let s of p.services || []">{{ s }}</span>
              </div>
              <p class="pkg-desc">{{ p.description || 'Curated package combination.' }}</p>
              <div class="pkg-meta">
                <span>Savings: {{ p.savings | currency }}</span>
                <span>Confidence: {{ p.confidence || 85 }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Retail Product Suggestions</h2>
          <div class="empty" *ngIf="!products?.length"><p>No product suggestions available.</p></div>
          <div class="prod-grid" *ngIf="products?.length">
            <div class="prod-card" *ngFor="let p of products">
              <strong>{{ p.name }}</strong>
              <span class="prod-price">{{ p.price | currency }}</span>
              <p>{{ p.reason }}</p>
              <span class="prod-match">Client match: {{ p.matchScore || 80 }}%</span>
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
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
    .kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:20px;box-shadow:var(--card-shadow)}
    .kpi-card span{display:block;color:var(--muted);font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    .kpi-card.success strong{color:#059669}
    .panel{background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:24px;box-shadow:var(--card-shadow);margin-bottom:18px}
    .panel h2{margin:0 0 16px;font-size:18px}
    .empty{padding:24px;text-align:center;color:var(--muted)}
    .rec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
    .rec-card{display:flex;gap:12px;background:var(--soft);border-radius:16px;padding:16px;align-items:flex-start}
    .rec-icon{font-size:20px;flex-shrink:0}
    .rec-info{flex:1}
    .rec-info strong{display:block;font-size:14px}
    .rec-match{font-size:11px;color:var(--muted);display:inline-block;margin-right:8px}
    .rec-price{font-size:13px;font-weight:700}
    .rec-reason{margin:6px 0 0;font-size:12px;color:var(--muted)}
    .rec-target small{font-size:11px;color:var(--muted);display:block;margin-top:4px}
    .pkg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
    .pkg-card{background:var(--soft);border-radius:16px;padding:16px}
    .pkg-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .pkg-head strong{font-size:15px}
    .pkg-price{font-size:16px;font-weight:800}
    .pkg-services{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
    .svc-tag{font-size:10px;padding:2px 8px;border-radius:8px;background:var(--surface);color:var(--muted)}
    .pkg-desc{margin:0 0 8px;font-size:12px;color:var(--muted)}
    .pkg-meta{display:flex;gap:12px;font-size:12px;color:var(--muted)}
    .prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
    .prod-card{background:var(--soft);border-radius:16px;padding:16px}
    .prod-card strong{display:block;font-size:14px}
    .prod-price{font-size:15px;font-weight:700;display:block;margin:4px 0}
    .prod-card p{margin:4px 0;font-size:12px;color:var(--muted)}
    .prod-match{font-size:11px;color:var(--muted)}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:var(--muted)}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:var(--black);color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
  `]
})
export class AiUpsellComponent {
  private api = inject(AiUpsellService);
  loading = true; error = '';
  stats: any = null;
  recommendations: any[] = [];
  packages: any[] = [];
  products: any[] = [];

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    let c = 0;
    const done = () => { if (++c >= 4) this.loading = false; };
    this.api.getStats().subscribe({ next: (d) => { this.stats = d; done(); }, error: () => done() });
    this.api.getRecommendations().subscribe({ next: (d) => { this.recommendations = d.data || d || []; done(); }, error: () => done() });
    this.api.getPackages().subscribe({ next: (d) => { this.packages = d.data || d || []; done(); }, error: () => done() });
    this.api.getProductSuggestions().subscribe({ next: (d) => { this.products = d.data || d || []; done(); }, error: () => done() });
  }
}
