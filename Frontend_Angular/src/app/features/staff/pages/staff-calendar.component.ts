import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sc-container" role="region" aria-label="Staff Calendar">
      <div *ngIf="state.loading()" class="sc-state loading" role="status">
        <div class="spinner"></div><p>Loading calendar…</p>
      </div>

      <ng-container *ngIf="!state.loading()">
        <div class="sc-card">
          <h3>{{ state.staffName() }}'s Calendar</h3>
          <p class="sc-hint">View the full enterprise calendar with staff-specific filtering.</p>
          <div class="sc-actions">
            <a class="sc-btn" routerLink="/app/calendar">Open Enterprise Calendar</a>
            <a class="sc-btn sc-btn-secondary" [routerLink]="'../appointments'">View Appointments</a>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .sc-container{padding:0 4px;max-width:960px}
    .sc-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sc-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .sc-card{padding:20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;text-align:center}
    .sc-card h3{margin:0 0 8px;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    .sc-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 16px}
    .sc-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .sc-btn{display:inline-flex;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
    .sc-btn-secondary{background:var(--surface-muted,#f1f5f9);color:var(--text-strong,#111827)}
  `]
})
export class StaffCalendarComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
