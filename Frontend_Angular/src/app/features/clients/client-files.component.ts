import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-files',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cfi-container" role="region" aria-label="Files">
      <div class="cfi-header"><h3>Documents & Files</h3><span class="cfi-badge">Integration Ready</span></div>
      <div class="cfi-empty">
        <div class="cfi-icon">📁</div>
        <p>File/document storage module is not yet connected to a backend service.</p>
        <p class="cfi-hint">Once integrated, you will be able to upload receipts, consultation forms, and client documents with preview and download.</p>
      </div>
    </div>
  `,
  styles: [`
    .cfi-container{padding:0 4px;max-width:960px}
    .cfi-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .cfi-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cfi-badge{padding:3px 10px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700}
    .cfi-empty{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px dashed var(--border-subtle,#d1d5db);border-radius:14px}
    .cfi-icon{font-size:48px;margin-bottom:12px}
    .cfi-empty p{font-size:14px;color:var(--text-soft,#64748b);margin:0 0 6px}
    .cfi-hint{font-size:12px;color:var(--text-soft,#94a3b8)!important}
  `]
})
export class ClientFilesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  ngOnInit(): void {}
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
