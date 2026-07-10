import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';
import { StaffService } from '../staff.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-staff-availability',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sa-container" role="region" aria-label="Staff Availability">
      <div *ngIf="state.loading()" class="sa-state loading" role="status">
        <div class="spinner"></div><p>Loading availability…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="sa-card">
          <h3>Availability Schedule</h3>
          <p class="sa-hint">Working hours and available time slots for {{ state.staffName() }}.</p>
          <div class="sa-table" *ngIf="schedule().length > 0">
            <div class="sa-row" *ngFor="let slot of schedule()">
              <span class="sa-day">{{ dayName(slot.dayOfWeek) }}</span>
              <span class="sa-time">{{ slot.startTime }} - {{ slot.endTime }}</span>
              <span class="sa-avail" [class.available]="slot.isAvailable">{{ slot.isAvailable ? 'Available' : 'Unavailable' }}</span>
            </div>
          </div>
          <div class="sa-empty" *ngIf="schedule().length === 0">
            <p>No availability schedule configured. Use the Working Hours tab or Shifts planner.</p>
            <div class="sa-actions">
              <a class="sa-btn" routerLink="../working-hours">Set Working Hours</a>
              <a class="sa-btn sa-btn-secondary" routerLink="/app/shifts">Shift Planner</a>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .sa-container{padding:0 4px;max-width:960px}
    .sa-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sa-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .sa-card{padding:20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sa-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .sa-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 16px}
    .sa-table{display:grid;gap:6px}
    .sa-row{display:flex;align-items:center;gap:16px;padding:10px 12px;background:var(--surface-app,#f8fafc);border-radius:8px}
    .sa-day{font-weight:700;font-size:13px;color:var(--text-strong,#111827);width:100px}
    .sa-time{font-size:13px;color:var(--text-strong,#111827);flex:1}
    .sa-avail{font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px}
    .sa-avail.available{background:#dcfce7;color:#166534}
    .sa-avail:not(.available){background:#fef2f2;color:#991b1b}
    .sa-empty{padding:20px;text-align:center;color:var(--text-soft,#64748b)}
    .sa-empty p{margin:0 0 12px}
    .sa-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .sa-btn{display:inline-flex;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
    .sa-btn-secondary{background:var(--surface-muted,#f1f5f9);color:var(--text-strong,#111827)}
  `]
})
export class StaffAvailabilityComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(StaffService);
  state = inject(StaffDetailStateService);
  schedule = signal<any[]>([]);

  private dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  dayName(d: number): string { return this.dayNames[d] || ''; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.api.getSchedule(id).pipe(catchError(() => of([]))).subscribe(d => this.schedule.set(Array.isArray(d) ? d : []));
    }
  }
}
