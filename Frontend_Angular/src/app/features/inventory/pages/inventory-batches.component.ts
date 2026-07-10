import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';

@Component({
  selector: 'app-inventory-batches',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ib-container">
      <div class="ib-card">
        <span class="ib-icon">🏷️</span>
        <h3>Batches</h3>
        <p>Batch and expiry tracking integration ready. Batch data will appear once the batch module is connected.</p>
        <div class="ib-preview">
          <div class="ib-preview-item"><span>BATCH-001</span><span>Exp: Dec 2026</span><span class="ib-preview-ok">Valid</span></div>
          <div class="ib-preview-item"><span>BATCH-002</span><span>Exp: Mar 2027</span><span class="ib-preview-ok">Valid</span></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ib-container{padding:0 4px;max-width:960px}
    .ib-card{padding:32px 24px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px}
    .ib-icon{font-size:40px;display:block;margin-bottom:12px}
    h3{margin:0 0 8px;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    p{margin:0 0 24px;color:var(--text-soft,#64748b);max-width:480px;margin-left:auto;margin-right:auto;line-height:1.5}
    .ib-preview{display:grid;gap:10px;max-width:400px;margin:0 auto}
    .ib-preview-item{display:flex;justify-content:space-between;padding:12px 16px;background:var(--surface-muted,#f8fafc);border-radius:10px;font-size:13px}
    .ib-preview-item span:first-child{font-weight:600;color:var(--text-strong,#111827)}
    .ib-preview-ok{color:#84cc16;font-weight:700}
  `]
})
export class InventoryBatchesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(InventoryDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
