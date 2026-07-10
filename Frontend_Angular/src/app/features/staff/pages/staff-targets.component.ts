import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-targets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="st-container" role="region" aria-label="Staff Targets">
      <div *ngIf="state.loading()" class="st-state loading" role="status">
        <div class="spinner"></div><p>Loading targets…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="st-card">
          <h3>{{ state.staffName() }}'s Targets</h3>
          <p class="st-hint">Revenue, service, attendance, and performance targets. Target management requires backend Target module.</p>
          <div class="st-badge">Integration Ready</div>
          <p class="st-desc">Target assignment, progress tracking, and achievement reports will appear here once the Targets backend module is implemented.</p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .st-container{padding:0 4px;max-width:960px}
    .st-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .st-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .st-card{padding:24px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;text-align:center}
    .st-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .st-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 14px}
    .st-badge{display:inline-block;padding:4px 12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;margin-bottom:12px}
    .st-desc{color:var(--text-soft,#64748b);font-size:13px;max-width:480px;margin:0 auto}
  `]
})
export class StaffTargetsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
