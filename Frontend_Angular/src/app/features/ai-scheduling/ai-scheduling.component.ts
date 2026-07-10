import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiSchedulingService } from './ai-scheduling.service';

@Component({
  selector: 'app-ai-scheduling',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>AI Scheduling</h1>
          <p>AI-powered schedule optimization, peak analysis, and staff allocation.</p>
        </div>
        <button class="refresh-btn" (click)="loadAll()" [disabled]="loading">Refresh</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Analyzing schedules...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="loadAll()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card" *ngIf="optimization"><span>Optimization Score</span><strong>{{ optimization.score || 0 }}%</strong><small>{{ optimization.summary }}</small></div>
          <div class="kpi-card" *ngIf="optimization"><span>Potential Revenue Gain</span><strong>{{ optimization.potentialGain | currency }}</strong></div>
          <div class="kpi-card" *ngIf="peakTimes"><span>Peak Hours Today</span><strong>{{ peakTimes.peakHours?.length || 0 }}</strong></div>
        </div>

        <div class="grid-2">
          <div class="panel">
            <h2>Optimization Suggestions</h2>
            <div class="empty" *ngIf="!optimization?.suggestions?.length"><p>No suggestions yet.</p></div>
            <div class="suggestion-list">
              <div class="suggestion-item" *ngFor="let s of optimization?.suggestions || []">
                <div class="sug-head">
                  <strong>{{ s.title }}</strong>
                  <span class="impact-badge" [class.high]="s.impact === 'high'" [class.medium]="s.impact === 'medium'">{{ s.impact }}</span>
                </div>
                <p>{{ s.description }}</p>
                <div class="sug-meta" *ngIf="s.expectedImprovement"><span>Expected: {{ s.expectedImprovement }}</span></div>
              </div>
            </div>
          </div>

          <div class="panel">
            <h2>Peak Time Analysis</h2>
            <div class="empty" *ngIf="!peakTimes?.peakHours?.length"><p>No peak time data available.</p></div>
            <div class="peak-list" *ngIf="peakTimes?.peakHours?.length">
              <div class="peak-row" *ngFor="let p of peakTimes.peakHours">
                <strong>{{ p.day }}</strong>
                <span class="peak-time">{{ p.hour }}</span>
                <div class="bar-wrap"><div class="bar" [style.width.%]="p.demand" [class]="demandClass(p.demand)"></div></div>
                <span class="demand-pct">{{ p.demand }}%</span>
              </div>
            </div>
            <div class="peak-insight" *ngIf="peakTimes?.insight">
              <strong>AI Insight:</strong>
              <p>{{ peakTimes.insight }}</p>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Staff Allocation Recommendations</h2>
          <div class="empty" *ngIf="!staffAlloc?.length"><p>No allocation data available.</p></div>
          <div class="alloc-list" *ngIf="staffAlloc?.length">
            <div class="alloc-row" *ngFor="let a of staffAlloc">
              <div class="alloc-info">
                <strong>{{ a.staffName }}</strong>
                <span>{{ a.role }}</span>
              </div>
              <div class="alloc-metrics">
                <span>Current: {{ a.currentHours }}h</span>
                <span>Optimal: {{ a.optimalHours }}h</span>
                <span class="diff" [class.pos]="a.diff > 0" [class.neg]="a.diff < 0">{{ a.diff > 0 ? '+' : '' }}{{ a.diff }}h</span>
              </div>
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
    .kpi-card small{display:block;color:var(--muted);font-size:12px;margin-top:4px}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
    .panel{background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:24px;box-shadow:var(--card-shadow)}
    .panel h2{margin:0 0 16px;font-size:18px}
    .empty{padding:24px;text-align:center;color:var(--muted)}
    .suggestion-list{display:grid;gap:10px}
    .suggestion-item{background:var(--soft);border-radius:14px;padding:14px}
    .sug-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px}
    .sug-head strong{font-size:14px}
    .impact-badge{font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700;text-transform:uppercase;background:#f3f4f6;color:var(--muted)}
    .impact-badge.high{background:#fee2e2;color:#dc2626}
    .impact-badge.medium{background:#fef3c7;color:#d97706}
    .suggestion-item p{margin:4px 0 0;font-size:13px;color:var(--muted)}
    .sug-meta span{font-size:12px;background:var(--surface);padding:4px 10px;border-radius:8px;margin-top:8px;display:inline-block}
    .peak-list{display:grid;gap:8px}
    .peak-row{display:grid;grid-template-columns:80px 80px 1fr 50px;align-items:center;gap:12px;padding:8px 0;font-size:13px}
    .peak-time{font-family:monospace;font-size:12px;color:var(--muted)}
    .bar-wrap{background:var(--soft);border-radius:8px;height:10px;overflow:hidden}
    .bar{height:100%;border-radius:8px;transition:width .3s}
    .bar.high{background:#dc2626}
    .bar.medium{background:#f59e0b}
    .bar.low{background:#22c55e}
    .demand-pct{font-weight:700;text-align:right;font-size:12px}
    .peak-insight{background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:14px;margin-top:14px}
    .peak-insight strong{font-size:13px;display:block;margin-bottom:4px;color:#1d4ed8}
    .peak-insight p{margin:0;font-size:13px;color:var(--muted)}
    .alloc-list{display:grid;gap:8px}
    .alloc-row{display:flex;justify-content:space-between;align-items:center;padding:14px;background:var(--soft);border-radius:14px}
    .alloc-info strong{display:block;font-size:14px}
    .alloc-info span{font-size:12px;color:var(--muted)}
    .alloc-metrics{display:flex;gap:12px;font-size:12px}
    .alloc-metrics span{padding:4px 10px;border-radius:8px;background:var(--surface)}
    .diff{font-weight:700}
    .diff.pos{color:#059669}
    .diff.neg{color:#dc2626}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:var(--muted)}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin .7s linear infinite}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:var(--black);color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    @media(max-width:900px){.kpis{grid-template-columns:1fr}.grid-2{grid-template-columns:1fr}}
  `]
})
export class AiSchedulingComponent {
  private api = inject(AiSchedulingService);
  loading = true; error = '';
  optimization: any = null;
  peakTimes: any = null;
  staffAlloc: any[] = [];

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    let c = 0;
    const done = () => { if (++c >= 3) this.loading = false; };
    this.api.getOptimization().subscribe({ next: (d) => { this.optimization = d; done(); }, error: () => done() });
    this.api.getPeakTimes().subscribe({ next: (d) => { this.peakTimes = d; done(); }, error: () => done() });
    this.api.getStaffAllocation().subscribe({ next: (d) => { this.staffAlloc = d.data || d || []; done(); }, error: () => done() });
  }

  demandClass(v: number): string { if (v >= 80) return 'high'; if (v >= 50) return 'medium'; return 'low'; }
}
