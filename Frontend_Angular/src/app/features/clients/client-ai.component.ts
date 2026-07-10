import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-client-ai',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cai-container" role="region" aria-label="AI Insights">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading AI insights…</p></div>
      <ng-container *ngIf="!loading()">
        <div class="cai-header"><h3>AI-Powered Client Insights</h3></div>
        <div *ngIf="insights().length === 0" class="empty-state">No AI insights available yet</div>
        <div class="cai-card" *ngFor="let i of insights(); trackBy: trackById">
          <div class="cai-type" [class]="'cait-' + (i.type || 'info').toLowerCase()">{{ i.type || 'Insight' }}</div>
          <div class="cai-title">{{ i.title || i.message || '' }}</div>
          <div class="cai-desc" *ngIf="i.description">{{ i.description }}</div>
          <div class="cai-score" *ngIf="i.score !== undefined || i.confidence !== undefined">
            Confidence: {{ (i.confidence ?? i.score) * 100 | number:'1.0-0' }}%
          </div>
        </div>
        <div class="cai-links">
          <a routerLink="/app/crm-intelligence" class="cai-link">CRM Intelligence Dashboard →</a>
          <a routerLink="/app/ai-insights" class="cai-link">AI Insights →</a>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cai-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .cai-header{margin-bottom:16px}
    .cai-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cai-card{padding:14px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px;margin-bottom:8px}
    .cai-type{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;margin-bottom:6px}
    .cait-upsell{background:#fef3c7;color:#92400e}
    .cait-retention{background:#dbeafe;color:#1e40af}
    .cait-churn{background:#fef2f2;color:#991b1b}
    .cait-recommendation{background:#f0fdf4;color:#166534}
    .cai-title{font-size:14px;font-weight:600;color:var(--text-strong,#111827);margin-bottom:4px}
    .cai-desc{font-size:12px;color:var(--text-soft,#64748b);margin-bottom:4px}
    .cai-score{font-size:12px;color:var(--accent,#6366f1);font-weight:600}
    .cai-links{display:flex;gap:16px;margin-top:16px;flex-wrap:wrap}
    .cai-link{font-size:13px;color:var(--accent,#6366f1);text-decoration:none;font-weight:600}
    .cai-link:hover{text-decoration:underline}
  `]
})
export class ClientAiComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();
  readonly insights = signal<any[]>([]);
  readonly loading = signal(true);
  trackById(_i: number, item: any): string { return item.id || Math.random().toString(); }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    const apiUrl = environment.apiUrl;
    const crmRecs$ = this.http.get(`${apiUrl}/crm-intelligence/recommendations?clientId=${clientId}`).pipe(catchError(() => of(null)));
    const aiInsights$ = this.http.get(`${apiUrl}/ai-insights?clientId=${clientId}`).pipe(catchError(() => of(null)));
    crmRecs$.pipe(takeUntil(this.destroy$)).subscribe((recs: any) => {
      const crmItems = Array.isArray(recs?.recommendations) ? recs.recommendations : Array.isArray(recs) ? recs : [];
      aiInsights$.pipe(takeUntil(this.destroy$)).subscribe((ins: any) => {
        const aiItems = Array.isArray(ins?.insights) ? ins.insights : Array.isArray(ins) ? ins : [];
        this.insights.set([...crmItems, ...aiItems].map((x: any) => ({
          ...x, id: x.id || Math.random().toString()
        })));
        this.loading.set(false);
      });
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
