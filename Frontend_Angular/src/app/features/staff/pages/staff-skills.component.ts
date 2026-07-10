import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-skills',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ssk-container" role="region" aria-label="Staff Skills">
      <div *ngIf="state.loading()" class="ssk-state loading" role="status">
        <div class="spinner"></div><p>Loading skills…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="ssk-card">
          <h3>{{ state.staffName() }}'s Skills & Certifications</h3>
          <p class="ssk-hint">Skills, proficiencies, and certifications for this staff member.</p>
          <div class="ssk-skill-row">
            <span class="ssk-label">Specialization</span>
            <span class="ssk-value">{{ state.staffSpecialization() || 'Not set' }}</span>
          </div>
          <div class="ssk-skill-row" *ngFor="let s of skills()">
            <span class="ssk-label">{{ s.name }}</span>
            <span class="ssk-value">{{ s.proficiency || 'Beginner' }}</span>
          </div>
          <div class="ssk-empty" *ngIf="skills().length === 0">
            <p>No skills or certifications recorded yet. Service eligibility and commission rules depend on skill profiles.</p>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .ssk-container{padding:0 4px;max-width:960px}
    .ssk-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .ssk-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .ssk-card{padding:20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .ssk-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .ssk-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 14px}
    .ssk-skill-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle,#f1f5f9)}
    .ssk-label{color:var(--text-soft,#64748b);font-weight:600;font-size:13px}
    .ssk-value{color:var(--text-strong,#111827);font-size:13px}
    .ssk-empty{padding:20px;text-align:center;color:var(--text-soft,#64748b)}
  `]
})
export class StaffSkillsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);
  skills = () => [];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
