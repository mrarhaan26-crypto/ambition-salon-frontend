import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';

@Component({
  selector: 'app-staff-documents',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sd-container" role="region" aria-label="Staff Documents">
      <div *ngIf="state.loading()" class="sd-state loading" role="status">
        <div class="spinner"></div><p>Loading documents…</p>
      </div>

      <ng-container *ngIf="!state.loading() && state.staff()">
        <div class="sd-card">
          <h3>{{ state.staffName() }}'s Documents</h3>
          <p class="sd-hint">Identity documents, contracts, certificates, and policy acknowledgements.</p>
          <div class="sd-badge">Integration Ready</div>
          <p class="sd-desc">Document upload, preview, download, expiry alerts, and permission-based management will appear here once the Documents backend module is implemented.</p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .sd-container{padding:0 4px;max-width:960px}
    .sd-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sd-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .sd-card{padding:24px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;text-align:center}
    .sd-card h3{margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .sd-hint{color:var(--text-soft,#64748b);font-size:13px;margin:0 0 14px}
    .sd-badge{display:inline-block;padding:4px 12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;margin-bottom:12px}
    .sd-desc{color:var(--text-soft,#64748b);font-size:13px;max-width:480px;margin:0 auto}
  `]
})
export class StaffDocumentsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(StaffDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
