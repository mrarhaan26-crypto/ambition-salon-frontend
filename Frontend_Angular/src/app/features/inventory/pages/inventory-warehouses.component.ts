import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';

@Component({
  selector: 'app-inventory-warehouses',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="iw-container">
      <div class="iw-card">
        <span class="iw-icon">🏭</span>
        <h3>Warehouses</h3>
        <p>Warehouse management integration ready. Warehouse data will appear once the warehouse module is connected.</p>
        <div class="iw-preview">
          <div class="iw-preview-item"><span>Primary Warehouse</span><span>Connected</span></div>
          <div class="iw-preview-item"><span>Secondary Storage</span><span>Available</span></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .iw-container{padding:0 4px;max-width:960px}
    .iw-card{padding:32px 24px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px}
    .iw-icon{font-size:40px;display:block;margin-bottom:12px}
    h3{margin:0 0 8px;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    p{margin:0 0 24px;color:var(--text-soft,#64748b);max-width:480px;margin-left:auto;margin-right:auto;line-height:1.5}
    .iw-preview{display:grid;gap:10px;max-width:400px;margin:0 auto}
    .iw-preview-item{display:flex;justify-content:space-between;padding:12px 16px;background:var(--surface-muted,#f8fafc);border-radius:10px;font-size:13px}
    .iw-preview-item span:first-child{font-weight:600;color:var(--text-strong,#111827)}
    .iw-preview-item span:last-child{color:#84cc16;font-weight:700}
  `]
})
export class InventoryWarehousesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(InventoryDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
