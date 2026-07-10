import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';

@Component({
  selector: 'app-inventory-suppliers',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="isup-container">
      <div class="isup-card">
        <span class="isup-icon">🏢</span>
        <h3>Suppliers</h3>
        <p>Supplier management integration ready. Supplier data will appear once the supplier module is connected.</p>
        <div class="isup-preview">
          <div class="isup-preview-item"><span>Preferred Supplier</span><span>Not Connected</span></div>
          <div class="isup-preview-item"><span>Alternate Supplier</span><span>Not Connected</span></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .isup-container{padding:0 4px;max-width:960px}
    .isup-card{padding:32px 24px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px}
    .isup-icon{font-size:40px;display:block;margin-bottom:12px}
    h3{margin:0 0 8px;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    p{margin:0 0 24px;color:var(--text-soft,#64748b);max-width:480px;margin-left:auto;margin-right:auto;line-height:1.5}
    .isup-preview{display:grid;gap:10px;max-width:400px;margin:0 auto}
    .isup-preview-item{display:flex;justify-content:space-between;padding:12px 16px;background:var(--surface-muted,#f8fafc);border-radius:10px;font-size:13px}
    .isup-preview-item span:first-child{font-weight:600;color:var(--text-strong,#111827)}
    .isup-preview-item span:last-child{color:var(--text-soft,#64748b);font-weight:600}
  `]
})
export class InventorySuppliersComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(InventoryDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
