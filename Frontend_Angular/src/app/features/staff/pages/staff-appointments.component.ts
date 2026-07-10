import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';
import { StaffService } from '../staff.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-staff-appointments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sa-container" role="region" aria-label="Staff Appointments">
      <div *ngIf="loading()" class="sa-state loading" role="status">
        <div class="spinner"></div><p>Loading appointments…</p>
      </div>
      <div *ngIf="error()" class="sa-state error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="sa-empty" *ngIf="appointments().length === 0">
          <p>No appointments found for this staff member.</p>
        </div>

        <div class="sa-list" *ngIf="appointments().length > 0">
          <div class="sa-item" *ngFor="let a of appointments()">
            <div class="sa-item-head">
              <strong>{{ a.clientName || a.client?.fullName || 'Client' }}</strong>
              <span class="sa-status" [class]="a.status?.toLowerCase()">{{ a.status }}</span>
            </div>
            <div class="sa-item-body">
              <span>{{ a.startTime | date:'mediumDate' }} {{ a.startTime | date:'shortTime' }}</span>
              <span *ngIf="a.services?.length">· {{ a.services.length }} service(s)</span>
              <span *ngIf="a.totalAmount">· {{ a.totalAmount | currency:'USD':'symbol':'1.0-0' }}</span>
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
    .sa-empty{padding:40px 20px;text-align:center;color:var(--text-soft,#64748b);background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sa-list{display:grid;gap:10px}
    .sa-item{padding:14px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px}
    .sa-item-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .sa-item-head strong{color:var(--text-strong,#111827);font-size:14px}
    .sa-status{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .sa-status.confirmed{background:#dbeafe;color:#1e40af}
    .sa-status.completed{background:#dcfce7;color:#166534}
    .sa-status.cancelled{background:#fef2f2;color:#991b1b}
    .sa-status.no_show{background:#fef3c7;color:#92400e}
    .sa-item-body{font-size:12px;color:var(--text-soft,#64748b);display:flex;gap:6px;flex-wrap:wrap}
  `]
})
export class StaffAppointmentsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(StaffService);
  state = inject(StaffDetailStateService);
  loading = signal(true);
  error = signal('');
  appointments = signal<any[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.api.getBookings(id).pipe(catchError(() => { this.error.set('Appointment data unavailable'); this.loading.set(false); return of([]); }))
        .subscribe(d => { this.appointments.set(Array.isArray(d) ? d : d?.data || []); this.loading.set(false); });
    }
  }
}
