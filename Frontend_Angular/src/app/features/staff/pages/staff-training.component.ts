import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-training',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="str-container" role="region" aria-label="Staff Training">
      <div *ngIf="state.loading()" class="str-state loading" role="status">
        <div class="spinner"></div><p>Loading training records…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="str-card">
          <h3>{{ state.staffName() }}'s Training</h3>
          <p class="str-hint">Courses, videos, assessments, and certifications.</p>
          <div class="str-badge">Integration Ready</div>
          <p class="str-desc">Training records, course progress, assessment scores, certificates, and renewal tracking will appear here once the Training/LMS backend module is implemented.</p>
          <div class="str-info">
            <span>Specialization: {{ state.staffSpecialization() || 'Not set' }}</span>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .str-container{padding:0 4px;max-width:960px}
    .str-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .str-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .str-card{padding:24px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;text-align:center}
    .str-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .str-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 14px}
    .str-badge{display:inline-block;padding:4px 12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;margin-bottom:12px}
    .str-desc{color:var(--text-soft,#64748b);font-size:13px;max-width:480px;margin:0 auto 16px}
    .str-info{font-size:13px;color:var(--text-soft,#64748b)}
  `]
})
export class StaffTrainingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
