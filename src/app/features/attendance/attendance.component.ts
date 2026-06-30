import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from './attendance.service';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Staff Attendance</h1>
          <p>Track staff clock-in/clock-out.</p>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-value">{{ summary?.totalToday || 0 }}</span>
          <span class="kpi-label">Total Today</span>
        </div>
        <div class="kpi-card green">
          <span class="kpi-value">{{ summary?.clockedIn || 0 }}</span>
          <span class="kpi-label">Clocked In</span>
        </div>
        <div class="kpi-card gray">
          <span class="kpi-value">{{ summary?.clockedOut || 0 }}</span>
          <span class="kpi-label">Clocked Out</span>
        </div>
      </div>

      <div class="clock-actions">
        <div class="clock-in-section">
          <div class="clock-input-row" *ngIf="!clockingIn">
            <input [(ngModel)]="clockInStaffId" placeholder="Staff ID" class="staff-id-input">
            <button class="clock-in-btn" (click)="doClockIn()">Clock In</button>
          </div>
          <div class="clock-busy" *ngIf="clockingIn"><div class="spinner"></div><span>Recording...</span></div>
          <div class="clock-error" *ngIf="clockError">{{ clockError }}</div>
          <div class="clock-success" *ngIf="clockSuccess">{{ clockSuccess }}</div>
        </div>
        <div class="clock-out-section">
          <select [(ngModel)]="clockOutId" class="staff-select">
            <option value="">Select staff to clock out...</option>
            <option *ngFor="let r of clockedInRecords" [value]="r.id">{{ r.staffName || r.staffId }} ({{ r.clockIn | date:'h:mm a' }})</option>
          </select>
          <button class="clock-out-btn" (click)="doClockOut()" [disabled]="!clockOutId">Clock Out</button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading attendance...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load attendance.</strong>
        <p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && records.length === 0">
        <p>No attendance records yet. Clock in to get started.</p>
      </div>

      <div class="attendance-table-wrap" *ngIf="!loading && !error && records.length > 0">
        <table class="attendance-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of records">
              <td><strong>{{ r.staffName || r.staffId }}</strong></td>
              <td>{{ r.date || (r.clockIn | date:'MMM dd, yyyy') }}</td>
              <td>{{ r.clockIn | date:'h:mm a' }}</td>
              <td>{{ r.clockOut ? (r.clockOut | date:'h:mm a') : '—' }}</td>
              <td>
                <span *ngIf="r.clockOut">{{ getDuration(r.clockIn, r.clockOut) }}</span>
                <span *ngIf="!r.clockOut" class="live-badge">Active</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="summary-section" *ngIf="summaryByStaff.length > 0">
        <h2>Staff Summary</h2>
        <div class="summary-cards">
          <div class="summary-card" *ngFor="let s of summaryByStaff">
            <strong>{{ s.staffName || s.staffId }}</strong>
            <span>{{ s.totalHours || 0 }} hours</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    h2{font-size:20px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:24px;display:grid;gap:6px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-value{font-size:38px;font-weight:800;line-height:1}
    .kpi-label{font-size:13px;color:#6b7280;font-weight:600}
    .kpi-card.green .kpi-value{color:#16a34a}
    .kpi-card.gray .kpi-value{color:#6b7280}
    .clock-actions{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .clock-in-section,.clock-out-section{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:24px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    .clock-input-row{display:flex;gap:10px;flex:1;flex-wrap:wrap}
    .staff-id-input{flex:1;min-width:130px;padding:14px;border:1px solid #e5e7eb;border-radius:14px;font-size:15px}
    .clock-in-btn{border:0;border-radius:14px;padding:14px 28px;font-weight:800;cursor:pointer;background:#16a34a;color:white;font-size:15px;white-space:nowrap}
    .clock-out-btn{border:0;border-radius:14px;padding:14px 24px;font-weight:800;cursor:pointer;background:#dc2626;color:white;font-size:15px;white-space:nowrap}
    .clock-out-btn:disabled{opacity:.5;cursor:not-allowed}
    .staff-select{flex:1;min-width:180px;padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:white;font-size:14px}
    .clock-busy{display:flex;align-items:center;gap:10px;color:#6b7280;font-size:13px}
    .clock-error{background:#fef2f2;color:#991b1b;padding:10px 14px;border-radius:12px;font-size:13px;width:100%}
    .clock-success{background:#f0fdf4;color:#16a34a;padding:10px 14px;border-radius:12px;font-size:13px;width:100%}
    .spinner{width:20px;height:20px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .attendance-table-wrap{background:white;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden}
    .attendance-table{width:100%;border-collapse:collapse}
    .attendance-table th{text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:16px 20px;background:#f9fafb;border-bottom:1px solid #e5e7eb;letter-spacing:.04em}
    .attendance-table td{padding:14px 20px;border-bottom:1px solid #f3f4f6;font-size:14px}
    .attendance-table tr:last-child td{border-bottom:0}
    .live-badge{font-size:11px;font-weight:700;background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:20px}
    .summary-section{display:grid;gap:16px}
    .summary-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
    .summary-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:18px;display:grid;gap:6px;box-shadow:0 8px 25px rgba(15,23,42,.05)}
    .summary-card strong{font-size:15px}.summary-card span{font-size:22px;font-weight:800;color:#16a34a}
    @media(max-width:900px){.kpi-row{grid-template-columns:1fr}.clock-actions{grid-template-columns:1fr}}
    @media(max-width:600px){.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class AttendanceComponent {
  private api = inject(AttendanceService);

  records: any[] = [];
  clockedInRecords: any[] = [];
  summary: any = {};
  summaryByStaff: any[] = [];
  loading = true;
  error = '';

  clockInStaffId = '';
  clockOutId = '';
  clockingIn = false;
  clockError = '';
  clockSuccess = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    this.api.getAll().subscribe({
      next: (d) => {
        this.records = d;
        this.clockedInRecords = d.filter((r: any) => !r.clockOut);
        this.loading = false;
      },
      error: () => { this.error = 'Attendance data unavailable.'; this.loading = false; },
    });
    this.api.getSummary().subscribe({
      next: (d) => {
        this.summary = d;
        this.summaryByStaff = d.byStaff || [];
      },
    });
  }

  doClockIn() {
    if (!this.clockInStaffId.trim()) return;
    this.clockingIn = true;
    this.clockError = '';
    this.clockSuccess = '';
    this.api.clockIn({ staffId: this.clockInStaffId }).subscribe({
      next: () => {
        this.clockingIn = false;
        this.clockSuccess = 'Clocked in successfully.';
        this.clockInStaffId = '';
        this.load();
      },
      error: (e) => {
        this.clockingIn = false;
        this.clockError = e.error?.message || 'Clock in failed.';
      },
    });
  }

  doClockOut() {
    if (!this.clockOutId) return;
    this.api.clockOut(this.clockOutId).subscribe({
      next: () => {
        this.clockOutId = '';
        this.load();
      },
    });
  }

  getDuration(clockIn: string, clockOut: string): string {
    if (!clockIn || !clockOut) return '';
    const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
}
