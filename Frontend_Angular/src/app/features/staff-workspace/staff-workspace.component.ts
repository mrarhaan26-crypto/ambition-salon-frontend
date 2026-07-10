import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffWorkspaceService } from './staff-workspace.service';

@Component({
  selector: 'app-staff-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Staff Workspace</h1>
          <p>Your daily work overview.</p>
        </div>
      </div>

      <div class="staff-id-bar">
        <input [(ngModel)]="staffId" placeholder="Enter your Staff ID" class="staff-input">
        <button class="primary" (click)="load()">Load Dashboard</button>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading workspace...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load workspace.</strong>
        <p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && !data">
        <p>Enter your Staff ID above to load your workspace.</p>
      </div>

      <ng-container *ngIf="!loading && !error && data">
        <div class="profile-card" *ngIf="data.profile">
          <div class="profile-info">
            <strong>{{ data.profile.fullName }}</strong>
            <span>{{ data.profile.role }} | {{ data.profile.specialization || 'General' }}</span>
            <span *ngIf="data.profile.email">{{ data.profile.email }}</span>
            <span *ngIf="data.profile.phone">{{ data.profile.phone }}</span>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card"><span class="kpi-val">{{ data.bookings?.length || 0 }}</span><span class="kpi-lbl">Today's Bookings</span></div>
          <div class="kpi-card green"><span class="kpi-val">{{ data.tasks?.length || 0 }}</span><span class="kpi-lbl">Active Tasks</span></div>
          <div class="kpi-card gold"><span class="kpi-val">{{ data.commission?.pending || 0 | currency }}</span><span class="kpi-lbl">Pending Commission</span></div>
          <div class="kpi-card"><span class="kpi-val">{{ data.attendance?.today ? 'Active' : '—' }}</span><span class="kpi-lbl">Attendance</span></div>
        </div>

        <h2>Today's Schedule</h2>
        <div class="empty" *ngIf="data.bookings?.length === 0"><p>No bookings today.</p></div>
        <div class="list" *ngIf="data.bookings?.length > 0">
          <div class="list-item" *ngFor="let b of data.bookings">
            <div class="item-info">
              <strong>{{ b.client?.fullName || 'Unknown' }}</strong>
              <small>{{ b.startTime | date:'h:mm a' }} – {{ b.endTime | date:'h:mm a' }} | {{ b.title }}</small>
            </div>
            <span class="badge" [class.badge-confirmed]="b.status === 'CONFIRMED'" [class.badge-pending]="b.status === 'PENDING'" [class.badge-completed]="b.status === 'COMPLETED'">{{ b.status }}</span>
          </div>
        </div>

        <h2>Tasks</h2>
        <div class="empty" *ngIf="data.tasks?.length === 0"><p>No active tasks.</p></div>
        <div class="list" *ngIf="data.tasks?.length > 0">
          <div class="list-item" *ngFor="let t of data.tasks">
            <div class="item-info">
              <strong>{{ t.title }}</strong>
              <small *ngIf="t.dueDate">Due: {{ t.dueDate | date:'MMM dd' }} | {{ t.priority }}</small>
            </div>
            <span class="badge" [class.badge-open]="t.status==='OPEN'" [class.badge-progress]="t.status==='IN_PROGRESS'" [class.badge-completed]="t.status==='COMPLETED'">{{ t.status }}</span>
          </div>
        </div>

        <h2>Commission Summary</h2>
        <div class="empty" *ngIf="!data.commission || data.commission.total === 0"><p>No commission data.</p></div>
        <div class="kpi-row small" *ngIf="data.commission && data.commission.total > 0">
          <div class="kpi-card"><span class="kpi-val">{{ data.commission.total | currency }}</span><span class="kpi-lbl">Total</span></div>
          <div class="kpi-card gold"><span class="kpi-val">{{ data.commission.pending | currency }}</span><span class="kpi-lbl">Pending</span></div>
          <div class="kpi-card green"><span class="kpi-val">{{ data.commission.paid | currency }}</span><span class="kpi-lbl">Paid</span></div>
        </div>

        <h2>Attendance</h2>
        <div class="empty" *ngIf="!data.attendance"><p>No attendance data.</p></div>
        <div class="kpi-row small" *ngIf="data.attendance">
          <div class="kpi-card"><span class="kpi-val">{{ data.attendance.totalEntries || 0 }}</span><span class="kpi-lbl">Entries</span></div>
          <div class="kpi-card"><span class="kpi-val">{{ formatMinutes(data.attendance.totalMinutes) }}</span><span class="kpi-lbl">Total Hours</span></div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}h2{font-size:20px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .staff-id-bar{display:flex;gap:12px;max-width:500px}
    .staff-input{flex:1;padding:14px;border:1px solid #e5e7eb;border-radius:14px;font-size:15px}
    .primary{border:0;border-radius:14px;padding:12px 24px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .profile-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .profile-info{display:grid;gap:4px}
    .profile-info strong{font-size:20px}.profile-info span{color:#6b7280;font-size:14px}
    .kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px}
    .kpi-row.small{grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:24px;display:grid;gap:6px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-val{font-size:32px;font-weight:800;line-height:1}
    .kpi-lbl{font-size:13px;color:#6b7280;font-weight:600}
    .kpi-card.green .kpi-val{color:#16a34a}
    .kpi-card.gold .kpi-val{color:#d97706}
    .list{display:grid;gap:8px}
    .list-item{display:flex;align-items:center;justify-content:space-between;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:16px 20px}
    .item-info{display:grid;gap:4px}
    .item-info strong{font-size:15px}.item-info small{font-size:12px;color:#6b7280}
    .badge{font-size:11px;padding:4px 12px;border-radius:20px;font-weight:700;white-space:nowrap}
    .badge-confirmed{background:#dbeafe;color:#1d4ed8}
    .badge-pending{background:#f3f4f6;color:#6b7280}
    .badge-completed{background:#f0fdf4;color:#16a34a}
    .badge-open{background:#f3f4f6;color:#374151}
    .badge-progress{background:#dbeafe;color:#1d4ed8}
    @media(max-width:900px){.kpi-row{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:600px){.kpi-row{grid-template-columns:1fr}.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class StaffWorkspaceComponent {
  private api = inject(StaffWorkspaceService);

  staffId = '';
  data: any = null;
  loading = false;
  error = '';

  load() {
    if (!this.staffId.trim()) return;
    this.loading = true;
    this.error = '';
    this.api.getFull({ staffId: this.staffId }).subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.error = 'Failed to load workspace data.'; this.loading = false; },
    });
  }

  formatMinutes(min: number): string {
    if (!min) return '0h';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}
