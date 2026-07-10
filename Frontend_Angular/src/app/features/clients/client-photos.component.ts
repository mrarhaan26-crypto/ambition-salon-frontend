import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-photos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cph-container" role="region" aria-label="Photos">
      <div class="cph-header"><h3>Before / After Gallery</h3><span class="cph-badge">Integration Ready</span></div>
      <div class="cph-empty">
        <div class="cph-icon">🖼️</div>
        <p>Photo gallery module is not yet connected to a backend storage service.</p>
        <p class="cph-hint">Once integrated, you will be able to upload and manage before/after photos, create albums, and compare images.</p>
        <div class="cph-placeholder-grid">
          <div class="cph-placeholder" *ngFor="let i of [1,2,3,4,5,6]; trackBy: trackByFn">Photo {{ i }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cph-container{padding:0 4px;max-width:960px}
    .cph-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .cph-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cph-badge{padding:3px 10px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700}
    .cph-empty{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px dashed var(--border-subtle,#d1d5db);border-radius:14px}
    .cph-icon{font-size:48px;margin-bottom:12px}
    .cph-empty p{font-size:14px;color:var(--text-soft,#64748b);margin:0 0 6px}
    .cph-hint{font-size:12px;color:var(--text-soft,#94a3b8)!important}
    .cph-placeholder-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:20px}
    .cph-placeholder{aspect-ratio:1;background:var(--surface-muted,#f1f5f9);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-soft,#94a3b8)}
  `]
})
export class ClientPhotosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  trackByFn(_i: number, n: number): number { return n; }
  ngOnInit(): void {}
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
