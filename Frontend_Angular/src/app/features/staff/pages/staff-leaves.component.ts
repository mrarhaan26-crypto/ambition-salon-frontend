import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';
import { LeavesService } from '../../leaves/leaves.service';
import { catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-staff-leaves',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sl-container" role="region" aria-label="Staff Leaves">
      <div *ngIf="loading()" class="sl-state loading" role="status">
        <div class="spinner"></div><p>Loading leave records…</p>
      </div>
      <div *ngIf="error()" class="sl-state error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="sl-actions-bar">
          <button class="sl-btn" (click)="showForm.set(true)">+ Apply Leave</button>
          <a class="sl-btn sl-btn-secondary" routerLink="/app/staff/leaves">Leave Approval Workspace</a>
        </div>

        <div class="sl-summary" *ngIf="summary()">
          <div class="sl-stat"><span>Total</span><strong>{{ summary()?.total ?? 0 }}</strong></div>
          <div class="sl-stat"><span>Approved</span><strong class="green">{{ summary()?.approved ?? 0 }}</strong></div>
          <div class="sl-stat"><span>Pending</span><strong class="amber">{{ summary()?.pending ?? 0 }}</strong></div>
          <div class="sl-stat"><span>Rejected</span><strong class="red">{{ summary()?.rejected ?? 0 }}</strong></div>
        </div>

        <div class="sl-empty" *ngIf="leaves().length === 0">
          <p>No leave records found.</p>
        </div>

        <div class="sl-list" *ngIf="leaves().length > 0">
          <div class="sl-item" *ngFor="let l of leaves()">
            <div class="sl-item-head">
              <strong>{{ l.leaveType }}</strong>
              <span class="sl-status" [class]="l.status?.toLowerCase()">{{ l.status }}</span>
            </div>
            <div class="sl-item-body">
              <span>{{ l.startDate | date:'mediumDate' }} - {{ l.endDate | date:'mediumDate' }}</span>
              <span *ngIf="l.reason">· {{ l.reason }}</span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="sl-drawer-overlay" *ngIf="showForm()" (click)="showForm.set(false)" role="dialog" aria-modal="true">
        <div class="sl-drawer" (click)="$event.stopPropagation()">
          <h3>Apply Leave</h3>
          <div class="sl-form-group">
            <label>Leave Type</label>
            <select [(ngModel)]="leaveForm.type">
              <option value="CASUAL">Casual</option>
              <option value="SICK">Sick</option>
              <option value="VACATION">Vacation</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
          <div class="sl-form-group">
            <label>Start Date</label>
            <input type="date" [(ngModel)]="leaveForm.startDate">
          </div>
          <div class="sl-form-group">
            <label>End Date</label>
            <input type="date" [(ngModel)]="leaveForm.endDate">
          </div>
          <div class="sl-form-group">
            <label>Reason</label>
            <textarea [(ngModel)]="leaveForm.reason" placeholder="Optional reason"></textarea>
          </div>
          <div class="sl-form-actions">
            <button class="sl-btn" (click)="submitLeave()">Submit</button>
            <button class="sl-btn sl-btn-secondary" (click)="showForm.set(false)">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sl-container{padding:0 4px;max-width:960px}
    .sl-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sl-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .sl-actions-bar{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
    .sl-btn{display:inline-flex;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;border:0;cursor:pointer;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none}
    .sl-btn-secondary{background:var(--surface-muted,#f1f5f9);color:var(--text-strong,#111827)}
    .sl-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
    .sl-stat{text-align:center;padding:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px}
    .sl-stat span{display:block;font-size:12px;color:var(--text-soft,#64748b);margin-bottom:4px}
    .sl-stat strong{font-size:20px;color:var(--text-strong,#111827)}.green{color:#166534}.amber{color:#d97706}.red{color:#dc2626}
    .sl-empty{padding:40px 20px;text-align:center;color:var(--text-soft,#64748b);background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sl-list{display:grid;gap:8px}
    .sl-item{padding:12px 14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px}
    .sl-item-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
    .sl-item-head strong{color:var(--text-strong,#111827);font-size:13px}
    .sl-status{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .sl-status.approved{background:#dcfce7;color:#166534}
    .sl-status.pending{background:#fef3c7;color:#92400e}
    .sl-status.rejected{background:#fef2f2;color:#991b1b}
    .sl-status.cancelled{background:#f3f4f6;color:#6b7280}
    .sl-item-body{font-size:12px;color:var(--text-soft,#64748b)}
    .sl-drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .sl-drawer{background:var(--surface-card,#fff);border-radius:16px;padding:24px;width:min(400px,90%);max-height:90vh;overflow-y:auto}
    .sl-drawer h3{margin:0 0 16px;color:var(--text-strong,#111827)}
    .sl-form-group{display:grid;gap:4px;margin-bottom:12px}
    .sl-form-group label{font-size:12px;font-weight:700;color:var(--text-soft,#64748b)}
    .sl-form-group input,.sl-form-group select,.sl-form-group textarea{padding:10px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:8px}
    .sl-form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}
  `]
})
export class StaffLeavesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private leavesApi = inject(LeavesService);
  state = inject(StaffDetailStateService);
  loading = signal(true);
  error = signal('');
  leaves = signal<any[]>([]);
  summary = signal<any>(null);
  showForm = signal(false);
  leaveForm: any = { type: 'CASUAL', startDate: '', endDate: '', reason: '' };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.loadLeaves(id);
    }
  }

  private loadLeaves(id: string) {
    this.leavesApi.getAll({ staffId: id }).pipe(catchError(() => { this.error.set('Leave data unavailable'); this.loading.set(false); return of([]); }))
      .subscribe(d => { this.leaves.set(Array.isArray(d) ? d : []); this.loading.set(false); });
    this.leavesApi.getSummary().pipe(catchError(() => of(null)))
      .subscribe(d => this.summary.set(d));
  }

  submitLeave() {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    this.leavesApi.create({ staffId: id, leaveType: this.leaveForm.type, startDate: this.leaveForm.startDate, endDate: this.leaveForm.endDate, reason: this.leaveForm.reason } as any)
      .subscribe(() => { this.showForm.set(false); this.loadLeaves(id); });
  }
}
