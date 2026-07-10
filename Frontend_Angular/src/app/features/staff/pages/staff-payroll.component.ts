import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-payroll',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sp-container" role="region" aria-label="Staff Payroll">
      <div *ngIf="state.loading()" class="sp-state loading" role="status">
        <div class="spinner"></div><p>Loading payroll data…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="sp-card">
          <h3>{{ state.staffName() }}'s Payroll</h3>
          <p class="sp-hint">Salary structure, payslips, and payment history.</p>
          <div class="sp-badge">Integration Ready</div>
          <p class="sp-desc">Payroll records, salary structure, payslips, deductions, and net pay calculations will appear here once the Payroll backend module is implemented.</p>
          <div class="sp-info">
            <div class="sp-row"><span>Role</span><span>{{ state.staffRole() }}</span></div>
            <div class="sp-row"><span>Status</span><span>{{ state.staffIsActive() ? 'Active' : 'Inactive' }}</span></div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .sp-container{padding:0 4px;max-width:960px}
    .sp-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sp-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .sp-card{padding:24px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;text-align:center}
    .sp-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .sp-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 14px}
    .sp-badge{display:inline-block;padding:4px 12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;margin-bottom:12px}
    .sp-desc{color:var(--text-soft,#64748b);font-size:13px;max-width:480px;margin:0 auto 16px}
    .sp-info{max-width:360px;margin:0 auto;text-align:left}
    .sp-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border-subtle,#f1f5f9)}
    .sp-row span:first-child{color:var(--text-soft,#64748b)}
    .sp-row span:last-child{color:var(--text-strong,#111827);font-weight:600}
  `]
})
export class StaffPayrollComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
