import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-working-hours',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="swh-container" role="region" aria-label="Working Hours">
      <div *ngIf="state.loading()" class="swh-state loading" role="status">
        <div class="spinner"></div><p>Loading working hours…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="swh-card">
          <h3>Working Hours</h3>
          <p class="swh-hint">Manage weekly schedule, shifts, and breaks for {{ state.staffName() }}.</p>
          <div class="swh-actions">
            <a class="swh-btn" routerLink="../availability">View Availability</a>
            <a class="swh-btn" routerLink="/app/shifts">Open Shift Planner</a>
          </div>
        </div>
        <div class="swh-card" style="margin-top:12px">
          <h3>Shift Templates</h3>
          <p class="swh-hint">Assign shift templates and manage recurring schedules from the Shift Planner.</p>
          <a class="swh-btn" routerLink="/app/shifts">Manage Shifts</a>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .swh-container{padding:0 4px;max-width:960px}
    .swh-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .swh-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .swh-card{padding:20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .swh-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .swh-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 14px}
    .swh-actions{display:flex;gap:10px;flex-wrap:wrap}
    .swh-btn{display:inline-flex;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
  `]
})
export class StaffWorkingHoursComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
