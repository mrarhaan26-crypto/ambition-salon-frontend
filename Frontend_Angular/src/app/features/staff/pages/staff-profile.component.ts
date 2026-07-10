import { Component, inject, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sp-container" role="region" aria-label="Staff Profile">
      <div *ngIf="state.loading()" class="sp-state loading" role="status">
        <div class="spinner"></div><p>Loading profile…</p>
      </div>
      <div *ngIf="state.error()" class="sp-state error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ state.error() }}</p>
      </div>

      <ng-container *ngIf="!state.loading() && !state.error() && state.staff()">
        <div class="sp-cards">
          <div class="sp-card">
            <h3>Personal Information</h3>
            <div class="sp-row"><span>Full Name</span><span>{{ state.staffName() }}</span></div>
            <div class="sp-row"><span>Role</span><span>{{ state.staffRole() }}</span></div>
            <div class="sp-row"><span>Specialization</span><span>{{ state.staffSpecialization() || '—' }}</span></div>
            <div class="sp-row"><span>Branch</span><span>{{ state.staffBranch() || '—' }}</span></div>
            <div class="sp-row"><span>Status</span><span [class.active]="state.staffIsActive()" [class.inactive]="!state.staffIsActive()">{{ state.staffIsActive() ? 'Active' : 'Inactive' }}</span></div>
          </div>
          <div class="sp-card">
            <h3>Contact Details</h3>
            <div class="sp-row"><span>Email</span><span>{{ state.staffEmail() || '—' }}</span></div>
            <div class="sp-row"><span>Phone</span><span>{{ state.staffPhone() || '—' }}</span></div>
          </div>
          <div class="sp-card">
            <h3>Additional Info</h3>
            <div class="sp-row"><span>Staff ID</span><span>{{ state.staffId() }}</span></div>
            <div class="sp-row"><span>Bio</span><span>{{ state.staff()?.bio || '—' }}</span></div>
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
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .sp-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
    .sp-card{padding:16px 18px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sp-card h3{margin:0 0 12px;font-size:14px;font-weight:800;color:var(--text-strong,#111827);padding-bottom:8px;border-bottom:1px solid var(--border-subtle,#f1f5f9)}
    .sp-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;gap:8px}
    .sp-row span:first-child{color:var(--text-soft,#64748b);flex-shrink:0}
    .sp-row span:last-child{color:var(--text-strong,#111827);text-align:right;font-weight:500}
    .sp-row .active{color:#166534;font-weight:700}
    .sp-row .inactive{color:#991b1b;font-weight:700}
    @media(max-width:600px){.sp-cards{grid-template-columns:1fr}}
  `]
})
export class StaffProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
