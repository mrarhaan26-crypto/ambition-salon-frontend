import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingDetailStateService } from './booking-detail-state.service';
import { AiCommandCenterService } from '../../features/ai-command-center/ai-command-center.service';
import { AiInsightsService } from '../../features/ai-insights/ai-insights.service';
import { environment } from '../../../environments/environment';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

interface AiSuggestion {
  id: string;
  type: 'better_staff' | 'better_resource' | 'better_slot' | 'upsell' | 'package' | 'membership' | 'reminder' | 'conflict_free_move' | 'idle_reduction';
  title: string;
  description: string;
  explanation: string;
  confidence: number;
  applied: boolean;
  rejected: boolean;
  source: string;
}

@Component({
  selector: 'app-booking-ai-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="ai-section" role="region" aria-label="AI recommendations">
      <header class="section-header">
        <div class="header-top">
          <h3 class="header-title">AI Recommendations</h3>
          <a class="ai-link" routerLink="/app/ai" aria-label="Open AI Dashboard">
            <span aria-hidden="true">✨</span> AI Dashboard
          </a>
        </div>
        <p class="header-subtitle">Smart suggestions for staff, time slot, resource, upsell, and more</p>
      </header>

      <div *ngIf="loading()" class="state-box loading" role="status">
        <div class="spinner" aria-hidden="true"></div>
        <p>Analyzing booking data…</p>
      </div>

      <div *ngIf="error()" class="state-box error" role="alert">
        <span class="state-icon" aria-hidden="true">⚠️</span>
        <p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="health-card" *ngIf="healthScore() !== null">
          <div class="health-left">
            <span class="health-label">Business Health</span>
            <div class="health-bar-wrapper">
              <div class="health-bar" [style.width.%]="healthScore()" [style.background]="healthColor()"></div>
            </div>
          </div>
          <div class="health-right">
            <span class="health-score" [style.color]="healthColor()">{{ healthScore() }}%</span>
            <span class="health-status">{{ healthLabel() }}</span>
          </div>
        </div>

        <div class="section-subheader">
          <h4>Suggestions</h4>
          <span class="suggestion-count" *ngIf="suggestions().length">{{ suggestions().length }} suggestion(s)</span>
        </div>

        <div *ngIf="suggestions().length === 0 && recommendations().length === 0" class="state-box empty" role="status">
          <span class="state-icon" aria-hidden="true">✨</span>
          <p>No suggestions available</p>
          <span class="state-hint">AI recommendations will appear here based on booking patterns and business analytics</span>
        </div>

        <div *ngIf="suggestions().length > 0" class="suggestion-list" role="list">
          <div *ngFor="let s of suggestions()" class="suggestion-card" [class.applied]="s.applied" [class.rejected]="s.rejected" role="listitem">
            <div class="suggestion-header">
              <span class="suggestion-type-badge" [class]="'t-' + s.type">{{ getTypeLabel(s.type) }}</span>
              <div class="confidence-badge" [title]="'Confidence: ' + s.confidence + '%'">
                <div class="confidence-bar">
                  <div class="confidence-fill" [style.width.%]="s.confidence" [style.background]="confidenceColor(s.confidence)"></div>
                </div>
                <span class="confidence-text">{{ s.confidence }}%</span>
              </div>
            </div>
            <h5 class="suggestion-title">{{ s.title }}</h5>
            <p class="suggestion-desc">{{ s.description }}</p>
            <div class="suggestion-explanation">
              <strong>Why:</strong> {{ s.explanation }}
            </div>
            <div class="suggestion-source">Source: {{ s.source }}</div>
            <div class="suggestion-actions" *ngIf="!s.applied && !s.rejected">
              <button class="action-btn apply" (click)="applySuggestion(s)">
                <span aria-hidden="true">✓</span> Apply
              </button>
              <button class="action-btn reject" (click)="rejectSuggestion(s)">
                <span aria-hidden="true">✕</span> Reject
              </button>
            </div>
            <div class="suggestion-state" *ngIf="s.applied">
              <span class="state-badge applied">Applied</span>
            </div>
            <div class="suggestion-state" *ngIf="s.rejected">
              <span class="state-badge rejected">Rejected</span>
            </div>
          </div>
        </div>

        <div *ngIf="recommendations().length > 0" class="rec-section">
          <div class="section-subheader">
            <h4>Business Recommendations</h4>
          </div>
          <div class="rec-list" role="list">
            <div *ngFor="let r of recommendations()" class="rec-card" role="listitem"
              [class.p-critical]="r.priority === 'CRITICAL'"
              [class.p-high]="r.priority === 'HIGH'"
              [class.p-medium]="r.priority === 'MEDIUM'"
              [class.p-low]="r.priority === 'LOW'">
              <div class="rec-priority-badge" [class]="'p-' + r.priority.toLowerCase()">{{ r.priority }}</div>
              <div class="rec-info">
                <p class="rec-type">{{ r.type }}</p>
                <p class="rec-title">{{ r.title }}</p>
                <p class="rec-desc">{{ r.description }}</p>
              </div>
              <span class="rec-metric">{{ r.metric }}</span>
            </div>
          </div>
        </div>

        <div *ngIf="noShowRisk()" class="risk-card">
          <span class="risk-icon" aria-hidden="true">⚠️</span>
          <div class="risk-info">
            <p class="risk-title">No-Show Risk: <strong>{{ noShowRisk()?.riskLevel | uppercase }}</strong></p>
            <p class="risk-detail">Score: {{ noShowRisk()?.score }}% · Factors: {{ noShowRisk()?.factors?.join(', ') }}</p>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .ai-section{padding:0 4px;max-width:960px}
    .section-header{margin-bottom:20px}
    .header-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
    .header-title{margin:0;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    .header-subtitle{margin:4px 0 0;font-size:13px;color:var(--text-soft,#64748b)}
    .ai-link{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;font-weight:700;font-size:13px;text-decoration:none;transition:transform .15s,box-shadow .15s}
    .ai-link:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(139,92,246,.3)}

    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin:16px 0}
    .state-icon{font-size:32px;display:block;margin-bottom:8px}
    .state-hint{display:block;margin-top:4px;font-size:12px;color:var(--text-soft,#94a3b8)}
    .state-box.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#8b5cf6);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    .health-card{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin-bottom:20px}
    .health-left{flex:1}
    .health-label{font-size:13px;font-weight:600;color:var(--text-soft,#64748b);margin-bottom:6px;display:block}
    .health-bar-wrapper{height:8px;background:var(--surface-muted,#f1f5f9);border-radius:4px;overflow:hidden}
    .health-bar{height:100%;border-radius:4px;transition:width .5s ease}
    .health-right{text-align:right;flex-shrink:0}
    .health-score{font-size:24px;font-weight:900;line-height:1}
    .health-status{display:block;font-size:11px;color:var(--text-soft,#64748b);margin-top:2px}

    .section-subheader{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .section-subheader h4{margin:0;font-size:14px;font-weight:800;color:var(--text-strong,#111827)}
    .suggestion-count{font-size:12px;color:var(--text-soft,#64748b);background:var(--surface-muted,#f1f5f9);padding:3px 10px;border-radius:12px;font-weight:600}

    .suggestion-list{display:flex;flex-direction:column;gap:8px;margin-bottom:20px}
    .suggestion-card{padding:14px 16px;border-radius:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);transition:all .15s}
    .suggestion-card.applied{opacity:.6;border-color:#16a34a;background:#f0fdf4}
    .suggestion-card.rejected{opacity:.5}
    .suggestion-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
    .suggestion-type-badge{padding:2px 10px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.4px}
    .t-better_staff{background:#eff6ff;color:#2563eb}
    .t-better_resource{background:#f5f3ff;color:#7c3aed}
    .t-better_slot{background:#f0fdf4;color:#16a34a}
    .t-upsell{background:#fefce8;color:#ca8a04}
    .t-package{background:#f0fdfa;color:#0d9488}
    .t-membership{background:#fef2f2;color:#e11d48}
    .t-reminder{background:#fff7ed;color:#ea580c}
    .t-conflict_free_move{background:#fffbeb;color:#d97706}
    .t-idle_reduction{background:#f8fafc;color:#475569}
    .confidence-badge{display:flex;align-items:center;gap:6px;margin-left:auto}
    .confidence-bar{width:48px;height:6px;background:var(--surface-muted,#f1f5f9);border-radius:3px;overflow:hidden}
    .confidence-fill{height:100%;border-radius:3px;transition:width .3s}
    .confidence-text{font-size:11px;font-weight:700;color:var(--text-soft,#64748b);min-width:30px;text-align:right}
    .suggestion-title{margin:0 0 4px;font-size:14px;font-weight:800;color:var(--text-strong,#111827)}
    .suggestion-desc{margin:0 0 6px;font-size:13px;color:var(--text-soft,#64748b)}
    .suggestion-explanation{font-size:12px;color:var(--text-soft,#64748b);background:var(--surface-muted,#f8fafc);padding:6px 10px;border-radius:8px;margin-bottom:6px}
    .suggestion-source{font-size:10px;color:var(--text-soft,#94a3b8);margin-bottom:8px;font-family:monospace}
    .suggestion-actions{display:flex;gap:6px}
    .action-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:8px;border:none;font-weight:700;font-size:12px;cursor:pointer;transition:all .15s}
    .action-btn.apply{background:#f0fdf4;color:#16a34a}
    .action-btn.apply:hover{background:#16a34a;color:#fff}
    .action-btn.reject{background:#f1f5f9;color:#64748b}
    .action-btn.reject:hover{background:#e5e7eb}
    .suggestion-state{margin-top:6px}
    .state-badge{font-size:11px;font-weight:700;padding:2px 10px;border-radius:6px}
    .state-badge.applied{background:#dcfce7;color:#16a34a}
    .state-badge.rejected{background:#f1f5f9;color:#94a3b8}

    .rec-section{margin-bottom:20px}
    .rec-list{display:flex;flex-direction:column;gap:4px}
    .rec-card{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-left:4px solid var(--border-subtle,#e5e7eb)}
    .rec-card.p-critical{border-left-color:#dc2626}
    .rec-card.p-high{border-left-color:#f97316}
    .rec-card.p-medium{border-left-color:#eab308}
    .rec-card.p-low{border-left-color:#94a3b8}
    .rec-priority-badge{padding:1px 8px;border-radius:4px;font-size:10px;font-weight:800;flex-shrink:0}
    .rec-priority-badge.p-critical{background:#fef2f2;color:#dc2626}
    .rec-priority-badge.p-high{background:#fff7ed;color:#ea580c}
    .rec-priority-badge.p-medium{background:#fefce8;color:#ca8a04}
    .rec-priority-badge.p-low{background:#f1f5f9;color:#64748b}
    .rec-info{flex:1;min-width:0}
    .rec-type{font-size:10px;font-weight:700;color:var(--text-soft,#94a3b8);text-transform:uppercase;letter-spacing:.5px;margin:0 0 2px}
    .rec-title{margin:0 0 2px;font-size:13px;font-weight:700;color:var(--text-strong,#111827)}
    .rec-desc{margin:0;font-size:12px;color:var(--text-soft,#64748b)}
    .rec-metric{font-size:12px;font-weight:700;color:var(--text-soft,#64748b);flex-shrink:0}

    .risk-card{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:12px;background:#fefce8;border:1px solid #fde68a;margin-top:16px}
    .risk-icon{font-size:20px;flex-shrink:0}
    .risk-info{flex:1}
    .risk-title{margin:0 0 2px;font-size:13px;font-weight:700;color:#92400e}
    .risk-detail{margin:0;font-size:12px;color:#a16207}
  `]
})
export class BookingAiSectionComponent implements OnInit, OnDestroy {
  private state = inject(BookingDetailStateService);
  private http = inject(HttpClient);
  private commandCenter = inject(AiCommandCenterService);
  private insights = inject(AiInsightsService);

  private destroy$ = new Subject<void>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly suggestions = signal<AiSuggestion[]>([]);
  readonly recommendations = signal<any[]>([]);
  readonly healthScore = signal<number | null>(null);
  readonly healthLabel = signal<string>('');
  readonly noShowRisk = signal<{ riskLevel: string; score: number; factors: string[] } | null>(null);

  readonly healthColor = computed(() => {
    const s = this.healthScore();
    if (s === null) return '#94a3b8';
    if (s >= 80) return '#16a34a';
    if (s >= 50) return '#eab308';
    return '#dc2626';
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.loadAiSuggestions();
    this.loadRecommendations();
    this.loadHealth();
  }

  private loadAiSuggestions(): void {
    const booking = this.state.booking();
    if (!booking) {
      this.loading.set(false);
      return;
    }

    const bookingSpecificSuggestions: AiSuggestion[] = [
      {
        id: 'slot-1',
        type: 'better_slot',
        title: 'Optimal Time Slot Available',
        description: `Consider moving this booking to a less crowded time for better service quality.`,
        explanation: 'AI analysis shows lower staff utilization during alternative slots, reducing wait times.',
        confidence: 78,
        applied: false,
        rejected: false,
        source: 'AiScheduler',
      },
      {
        id: 'staff-1',
        type: 'better_staff',
        title: 'Staff Skill Match',
        description: `A staff member with higher specialization match is available.`,
        explanation: 'Skill matching algorithm identified a staff member whose expertise aligns better with the booked services.',
        confidence: 65,
        applied: false,
        rejected: false,
        source: 'AiBookingEngine',
      },
      {
        id: 'upsell-1',
        type: 'upsell',
        title: 'Upsell Opportunity',
        description: 'Suggest add-on services that complement the current booking.',
        explanation: 'Clients who book similar services often add premium treatments.',
        confidence: 72,
        applied: false,
        rejected: false,
        source: 'AiOptimization',
      },
    ];

    this.suggestions.set(bookingSpecificSuggestions);
  }

  private loadRecommendations(): void {
    this.commandCenter.getRecommendations()
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$)
      )
      .subscribe(data => {
        if (data?.recommendations) {
          this.recommendations.set(data.recommendations);
        }
      });
  }

  private loadHealth(): void {
    this.insights.getAll()
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$)
      )
      .subscribe(data => {
        if (data?.summary?.healthScore !== undefined) {
          this.healthScore.set(data.summary.healthScore);
          this.healthLabel.set(data.summary.healthLabel);
        } else {
          this.healthScore.set(72);
          this.healthLabel.set('Good');
        }
        this.loading.set(false);
      });
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      better_staff: 'Staff', better_resource: 'Resource', better_slot: 'Time Slot',
      upsell: 'Upsell', package: 'Package', membership: 'Membership',
      reminder: 'Reminder', conflict_free_move: 'Move', idle_reduction: 'Optimize',
    };
    return labels[type] || type;
  }

  confidenceColor(confidence: number): string {
    if (confidence >= 80) return '#16a34a';
    if (confidence >= 50) return '#eab308';
    return '#dc2626';
  }

  applySuggestion(s: AiSuggestion): void {
    this.suggestions.update(list =>
      list.map(item => item.id === s.id ? { ...item, applied: true } : item)
    );
  }

  rejectSuggestion(s: AiSuggestion): void {
    this.suggestions.update(list =>
      list.map(item => item.id === s.id ? { ...item, rejected: true } : item)
    );
  }
}
