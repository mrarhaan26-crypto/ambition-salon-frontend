import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-tips',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="st-tips-container" role="region" aria-label="Staff Tips">
      <div *ngIf="state.loading()" class="st-tips-state loading" role="status">
        <div class="spinner"></div><p>Loading tips data…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="st-tips-card">
          <h3>{{ state.staffName() }}'s Tips</h3>
          <p class="st-tips-hint">Tip tracking and distribution records.</p>
          <div class="st-tips-badge">Integration Ready</div>
          <p class="st-tips-desc">Tip records, pool distributions, adjustments, and pay-period totals will appear here once the Tips tracking backend module is implemented. Tips are currently recorded through POS transactions.</p>
          <a class="st-tips-btn" routerLink="/app/pos">Open POS</a>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .st-tips-container{padding:0 4px;max-width:960px}
    .st-tips-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .st-tips-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .st-tips-card{padding:24px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;text-align:center}
    .st-tips-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .st-tips-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 14px}
    .st-tips-badge{display:inline-block;padding:4px 12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;margin-bottom:12px}
    .st-tips-desc{color:var(--text-soft,#64748b);font-size:13px;max-width:480px;margin:0 auto 16px}
    .st-tips-btn{display:inline-flex;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
  `]
})
export class StaffTipsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
