import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-services',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ss-container" role="region" aria-label="Staff Services">
      <div *ngIf="state.loading()" class="ss-state loading" role="status">
        <div class="spinner"></div><p>Loading services…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="ss-card">
          <h3>{{ state.staffName() }}'s Services</h3>
          <p class="ss-hint">Services assigned to this staff member. Manage service assignments and skill levels.</p>
          <div class="ss-actions">
            <a class="ss-btn" routerLink="../skills">View Skills & Certifications</a>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .ss-container{padding:0 4px;max-width:960px}
    .ss-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .ss-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .ss-card{padding:20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .ss-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .ss-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 14px}
    .ss-actions{display:flex;gap:10px;flex-wrap:wrap}
    .ss-btn{display:inline-flex;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
  `]
})
export class StaffServicesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
