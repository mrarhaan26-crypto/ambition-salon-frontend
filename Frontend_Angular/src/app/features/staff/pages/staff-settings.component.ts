import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sset-container" role="region" aria-label="Staff Settings">
      <div *ngIf="state.loading()" class="sset-state loading" role="status">
        <div class="spinner"></div><p>Loading settings…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="sset-card">
          <h3>{{ state.staffName() }}'s Settings</h3>
          <p class="sset-hint">Notifications, permissions, privacy, and account configuration.</p>
          <div class="sset-section">
            <h4>Account Status</h4>
            <div class="sset-row">
              <span>Currently</span>
              <span class="sset-status" [class.active]="state.staffIsActive()" [class.inactive]="!state.staffIsActive()">
                {{ state.staffIsActive() ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
          <div class="sset-section">
            <h4>Role & Access</h4>
            <div class="sset-row"><span>Role</span><span>{{ state.staffRole() }}</span></div>
            <div class="sset-row"><span>Email</span><span>{{ state.staffEmail() }}</span></div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .sset-container{padding:0 4px;max-width:960px}
    .sset-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sset-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .sset-card{padding:20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;max-width:640px}
    .sset-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .sset-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 16px}
    .sset-section{margin-bottom:16px}
    .sset-section h4{margin:0 0 8px;font-size:13px;font-weight:800;color:var(--text-strong,#111827);padding-bottom:6px;border-bottom:1px solid var(--border-subtle,#f1f5f9)}
    .sset-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
    .sset-row span:first-child{color:var(--text-soft,#64748b)}
    .sset-row span:last-child{color:var(--text-strong,#111827);font-weight:500}
    .sset-status{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .sset-status.active{background:#dcfce7;color:#166534}
    .sset-status.inactive{background:#fef2f2;color:#991b1b}
  `]
})
export class StaffSettingsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
