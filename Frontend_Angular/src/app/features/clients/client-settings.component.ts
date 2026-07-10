import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cst-container" role="region" aria-label="Client Settings">
      <div class="cst-header"><h3>Client Settings</h3><span class="cst-badge">Integration Ready</span></div>
      <div class="cst-card">
        <h4 class="cst-card-title">Account Status</h4>
        <div class="cst-row"><span>Status</span><span class="cst-value">Active</span></div>
        <div class="cst-row"><span>Member since</span><span class="cst-value">{{ createdAt() | date:'mediumDate' }}</span></div>
      </div>
      <div class="cst-card">
        <h4 class="cst-card-title">Visibility & Permissions</h4>
        <p class="cst-hint">Client-level settings for visibility, communication permissions, and data access will be available in a future update.</p>
        <div class="cst-placeholder-rows">
          <div class="cst-row disabled"><span>Visible in client portal</span><span class="cst-value">—</span></div>
          <div class="cst-row disabled"><span>Allow online booking</span><span class="cst-value">—</span></div>
          <div class="cst-row disabled"><span>SMS reminders</span><span class="cst-value">—</span></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cst-container{padding:0 4px;max-width:960px}
    .cst-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .cst-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cst-badge{padding:3px 10px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700}
    .cst-card{padding:16px 18px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin-bottom:12px}
    .cst-card-title{margin:0 0 12px;font-size:14px;font-weight:800;color:var(--text-strong,#111827);padding-bottom:8px;border-bottom:1px solid var(--border-subtle,#f1f5f9)}
    .cst-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;gap:8px}
    .cst-row span{color:var(--text-soft,#64748b)}
    .cst-row.disabled span{color:var(--text-soft,#cbd5e1)}
    .cst-value{color:var(--text-strong,#111827);font-weight:500}
    .cst-hint{font-size:13px;color:var(--text-soft,#94a3b8);margin:0 0 10px}
  `]
})
export class ClientSettingsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();
  readonly createdAt = signal('');

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
