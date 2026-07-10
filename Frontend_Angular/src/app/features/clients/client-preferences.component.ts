import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-preferences',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cprf-container" role="region" aria-label="Preferences & Privacy">
      <div class="cprf-header"><h3>Communication & Privacy Preferences</h3><span class="cprf-badge">Integration Ready</span></div>
      <div class="cprf-card">
        <h4 class="cprf-card-title">Communication Permissions</h4>
        <div class="cprf-row"><span>SMS notifications</span><span class="cprf-value">Not configured</span></div>
        <div class="cprf-row"><span>WhatsApp notifications</span><span class="cprf-value">Not configured</span></div>
        <div class="cprf-row"><span>Email notifications</span><span class="cprf-value">Not configured</span></div>
      </div>
      <div class="cprf-card">
        <h4 class="cprf-card-title">Privacy & Consent</h4>
        <div class="cprf-row"><span>Data consent</span><span class="cprf-value">Not configured</span></div>
        <div class="cprf-row"><span>Marketing opt-in</span><span class="cprf-value">Not configured</span></div>
      </div>
      <p class="cprf-hint">Privacy and communication preference management will be available in a future update.</p>
    </div>
  `,
  styles: [`
    .cprf-container{padding:0 4px;max-width:960px}
    .cprf-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .cprf-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cprf-badge{padding:3px 10px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700}
    .cprf-card{padding:16px 18px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin-bottom:12px}
    .cprf-card-title{margin:0 0 12px;font-size:14px;font-weight:800;color:var(--text-strong,#111827);padding-bottom:8px;border-bottom:1px solid var(--border-subtle,#f1f5f9)}
    .cprf-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;gap:8px}
    .cprf-row span{color:var(--text-soft,#64748b)}
    .cprf-value{color:var(--text-strong,#111827);font-weight:500}
    .cprf-hint{font-size:13px;color:var(--text-soft,#94a3b8);text-align:center;margin-top:16px}
  `]
})
export class ClientPreferencesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  ngOnInit(): void {}
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
