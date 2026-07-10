import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';
import { AttendanceService } from '../../attendance/attendance.service';
import { catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-staff-attendance',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sa-container" role="region" aria-label="Staff Attendance">
      <div *ngIf="loading()" class="sa-state loading" role="status">
        <div class="spinner"></div><p>Loading attendance records…</p>
      </div>
      <div *ngIf="error()" class="sa-state error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="sa-actions-bar">
          <button class="sa-btn" (click)="clockIn()" [disabled]="hasOpenSession()">Clock In</button>
          <button class="sa-btn sa-btn-secondary" (click)="clockOut()" [disabled]="!hasOpenSession()">Clock Out</button>
        </div>

        <div class="sa-summary" *ngIf="summary()">
          <div class="sa-stat"><span>Present</span><strong>{{ summary()?.present ?? 0 }}</strong></div>
          <div class="sa-stat"><span>Late</span><strong>{{ summary()?.late ?? 0 }}</strong></div>
          <div class="sa-stat"><span>Absent</span><strong>{{ summary()?.absent ?? 0 }}</strong></div>
        </div>

        <div class="sa-empty" *ngIf="records().length === 0">
          <p>No attendance records found.</p>
        </div>

        <div class="sa-list" *ngIf="records().length > 0">
          <div class="sa-item" *ngFor="let r of records()">
            <div class="sa-item-head">
              <strong>{{ r.date | date:'mediumDate' }}</strong>
              <span class="sa-status" [class]="r.status?.toLowerCase()">{{ r.status }}</span>
            </div>
            <div class="sa-item-body">
              <span *ngIf="r.clockIn">In: {{ r.clockIn | date:'shortTime' }}</span>
              <span *ngIf="r.clockOut">Out: {{ r.clockOut | date:'shortTime' }}</span>
              <span *ngIf="r.isLate" class="sa-warn">Late</span>
              <span *ngIf="r.isEarlyDeparture" class="sa-warn">Early Departure</span>
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
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .sa-actions-bar{display:flex;gap:10px;margin-bottom:16px}
    .sa-btn{display:inline-flex;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;border:0;cursor:pointer;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
    .sa-btn-secondary{background:var(--surface-muted,#f1f5f9);color:var(--text-strong,#111827)}
    .sa-btn:disabled{opacity:.5;cursor:not-allowed}
    .sa-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
    .sa-stat{text-align:center;padding:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px}
    .sa-stat span{display:block;font-size:12px;color:var(--text-soft,#64748b);margin-bottom:4px}
    .sa-stat strong{font-size:22px;color:var(--text-strong,#111827)}
    .sa-empty{padding:40px 20px;text-align:center;color:var(--text-soft,#64748b);background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sa-list{display:grid;gap:8px}
    .sa-item{padding:12px 14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px}
    .sa-item-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
    .sa-item-head strong{color:var(--text-strong,#111827);font-size:13px}
    .sa-status{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .sa-status.present{background:#dcfce7;color:#166534}
    .sa-status.late{background:#fef3c7;color:#92400e}
    .sa-status.absent{background:#fef2f2;color:#991b1b}
    .sa-status.half_day{background:#fff7ed;color:#9a3412}
    .sa-item-body{font-size:12px;color:var(--text-soft,#64748b);display:flex;gap:8px;flex-wrap:wrap}
    .sa-warn{color:#d97706;font-weight:600}
  `]
})
export class StaffAttendanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private attendanceApi = inject(AttendanceService);
  state = inject(StaffDetailStateService);
  loading = signal(true);
  error = signal('');
  records = signal<any[]>([]);
  summary = signal<any>(null);
  hasOpenSession = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.loadRecords(id);
    }
  }

  private loadRecords(id: string) {
    this.attendanceApi.getByStaff(id).pipe(catchError(() => { this.error.set('Attendance data unavailable'); this.loading.set(false); return of([]); }))
      .subscribe(d => {
        const list = Array.isArray(d) ? d : [];
        this.records.set(list);
        this.hasOpenSession.set(list.some((r: any) => r.status === 'PRESENT' && !r.clockOut));
        this.loading.set(false);
      });
    this.attendanceApi.getSummary({ staffId: id }).pipe(catchError(() => of(null)))
      .subscribe(d => this.summary.set(d));
  }

  clockIn() {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    this.attendanceApi.clockIn({ staffId: id }).subscribe(() => this.loadRecords(id));
  }

  clockOut() {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    this.attendanceApi.clockOut({ staffId: id }).subscribe(() => this.loadRecords(id));
  }
}
