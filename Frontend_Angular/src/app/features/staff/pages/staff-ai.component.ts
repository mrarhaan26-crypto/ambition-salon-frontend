import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-ai',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sai-container" role="region" aria-label="Staff AI Insights">
      <div *ngIf="state.loading()" class="sai-state loading" role="status">
        <div class="spinner"></div><p>Loading AI insights…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="sai-card">
          <h3>AI Insights for {{ state.staffName() }}</h3>
          <p class="sai-hint">AI-powered recommendations for schedule optimization, skill development, and performance coaching.</p>
          <div class="sai-badge">Integration Ready</div>
          <p class="sai-desc">Personalized AI recommendations including best schedule optimization, workload balance, skill gap analysis, training recommendations, performance coaching, and target improvement suggestions will appear here once the Staff AI module is implemented.</p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .sai-container{padding:0 4px;max-width:960px}
    .sai-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sai-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .sai-card{padding:24px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;text-align:center}
    .sai-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .sai-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 14px}
    .sai-badge{display:inline-block;padding:4px 12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;margin-bottom:12px}
    .sai-desc{color:var(--text-soft,#64748b);font-size:13px;max-width:480px;margin:0 auto}
  `]
})
export class StaffAiComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
