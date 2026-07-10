import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';

@Component({
  selector: 'app-inventory-purchase-orders',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ipo-container">
      <div class="ipo-card">
        <span class="ipo-icon">📋</span>
        <h3>Purchase Orders</h3>
        <p>Purchase order management integration ready. Orders will appear once the purchase module is connected.</p>
        <div class="ipo-preview">
          <div class="ipo-preview-item">
            <span class="ipo-preview-id">PO-001</span>
            <span class="ipo-preview-status">Draft</span>
          </div>
          <div class="ipo-preview-item">
            <span class="ipo-preview-id">PO-002</span>
            <span class="ipo-preview-status">Pending</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ipo-container{padding:0 4px;max-width:960px}
    .ipo-card{padding:32px 24px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px}
    .ipo-icon{font-size:40px;display:block;margin-bottom:12px}
    h3{margin:0 0 8px;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    p{margin:0 0 24px;color:var(--text-soft,#64748b);max-width:480px;margin-left:auto;margin-right:auto;line-height:1.5}
    .ipo-preview{display:grid;gap:10px;max-width:400px;margin:0 auto}
    .ipo-preview-item{display:flex;justify-content:space-between;padding:12px 16px;background:var(--surface-muted,#f8fafc);border-radius:10px;font-size:13px}
    .ipo-preview-id{font-weight:600;color:var(--text-strong,#111827)}
    .ipo-preview-status{color:var(--text-soft,#64748b);font-weight:600}
  `]
})
export class InventoryPurchaseOrdersComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(InventoryDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
