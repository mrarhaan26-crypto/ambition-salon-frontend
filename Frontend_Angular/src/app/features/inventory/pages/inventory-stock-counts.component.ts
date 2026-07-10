import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';

@Component({
  selector: 'app-inventory-stock-counts',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="isc-container">
      <div class="isc-card">
        <span class="isc-icon">✅</span>
        <h3>Stock Counts</h3>
        <p>Stock count and reconciliation integration ready. Count data will appear once the stock count module is connected.</p>
        <div class="isc-preview">
          <div class="isc-preview-item">
            <span>Last Count</span>
            <span>Jul 5, 2026</span>
            <span class="isc-preview-ok">Matched</span>
          </div>
          <div class="isc-preview-item">
            <span>Pending Count</span>
            <span>Not Scheduled</span>
            <span class="isc-preview-warn">—</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .isc-container{padding:0 4px;max-width:960px}
    .isc-card{padding:32px 24px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px}
    .isc-icon{font-size:40px;display:block;margin-bottom:12px}
    h3{margin:0 0 8px;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    p{margin:0 0 24px;color:var(--text-soft,#64748b);max-width:480px;margin-left:auto;margin-right:auto;line-height:1.5}
    .isc-preview{display:grid;gap:10px;max-width:400px;margin:0 auto}
    .isc-preview-item{display:flex;justify-content:space-between;padding:12px 16px;background:var(--surface-muted,#f8fafc);border-radius:10px;font-size:13px}
    .isc-preview-ok{color:#84cc16;font-weight:700}
    .isc-preview-warn{color:var(--text-soft,#64748b)}
  `]
})
export class InventoryStockCountsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(InventoryDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
