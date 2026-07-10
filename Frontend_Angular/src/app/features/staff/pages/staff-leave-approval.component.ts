import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeavesService } from '../../leaves/leaves.service';
import { EnterpriseFeaturePageComponent } from '../../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-staff-leave-approval',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, EnterpriseFeaturePageComponent, StateViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-enterprise-feature-page
      themeKey="staff"
      title="Leave Approval"
      subtitle="Review and manage leave requests"
      icon="🏖️"
      [breadcrumbs]="[{ label: 'Staff', link: '/app/staff' }]"
      backLink="/app/staff">
    </app-enterprise-feature-page>

    <div class="la-filters">
      <select [(ngModel)]="statusFilter" (change)="load()" class="la-select">
        <option value="">All Status</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
    </div>

    <app-state-view *ngIf="loading()" type="loading" message="Loading leave requests..."></app-state-view>
    <app-state-view *ngIf="error()" type="error" [message]="error()"></app-state-view>
    <app-state-view *ngIf="!loading() && !error() && leaves().length === 0" type="empty" title="No leave requests" message="No leave requests match your filters."></app-state-view>

    <div class="la-list" *ngIf="!loading() && !error() && leaves().length > 0">
      <div class="la-item" *ngFor="let l of leaves()">
        <div class="la-item-head">
          <div>
            <strong>{{ l.staff?.fullName || l.staffId || 'Staff' }}</strong>
            <span class="la-type">{{ l.leaveType }}</span>
          </div>
          <span class="la-status" [class]="l.status?.toLowerCase()">{{ l.status }}</span>
        </div>
        <div class="la-item-body">
          <span>{{ l.startDate | date:'mediumDate' }} - {{ l.endDate | date:'mediumDate' }}</span>
          <span *ngIf="l.reason">· {{ l.reason }}</span>
        </div>
        <div class="la-item-actions" *ngIf="l.status === 'PENDING'">
          <button class="la-btn la-btn-approve" (click)="approve(l.id)">Approve</button>
          <button class="la-btn la-btn-reject" (click)="reject(l.id)">Reject</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .la-filters{margin-bottom:16px}
    .la-select{padding:10px 14px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;background:var(--surface-card,#fff);color:var(--text-strong,#111827)}
    .la-list{display:grid;gap:10px}
    .la-item{padding:14px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px}
    .la-item-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .la-item-head strong{color:var(--text-strong,#111827);font-size:14px}
    .la-type{padding:2px 8px;border-radius:6px;background:var(--surface-muted,#f1f5f9);color:var(--text-soft,#64748b);font-size:11px;font-weight:700;margin-left:8px}
    .la-status{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .la-status.approved{background:#dcfce7;color:#166534}
    .la-status.pending{background:#fef3c7;color:#92400e}
    .la-status.rejected{background:#fef2f2;color:#991b1b}
    .la-status.cancelled{background:#f3f4f6;color:#6b7280}
    .la-item-body{font-size:12px;color:var(--text-soft,#64748b);margin-bottom:8px}
    .la-item-actions{display:flex;gap:8px}
    .la-btn{padding:8px 16px;border-radius:8px;border:0;font-weight:700;font-size:12px;cursor:pointer}
    .la-btn-approve{background:#dcfce7;color:#166534}
    .la-btn-reject{background:#fef2f2;color:#991b1b}
  `]
})
export class StaffLeaveApprovalComponent implements OnInit {
  private leavesApi = inject(LeavesService);
  loading = signal(true);
  error = signal('');
  leaves = signal<any[]>([]);
  statusFilter = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    const params: any = {};
    if (this.statusFilter) params.status = this.statusFilter;
    this.leavesApi.getAll(params).pipe(
      catchError(() => { this.error.set('Leave data unavailable'); this.loading.set(false); return of([]); })
    ).subscribe(d => { this.leaves.set(Array.isArray(d) ? d : []); this.loading.set(false); });
  }

  approve(id: string) { this.leavesApi.approve(id).subscribe(() => this.load()); }
  reject(id: string) { this.leavesApi.reject(id).subscribe(() => this.load()); }
}
