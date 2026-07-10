import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';

@Component({
  selector: 'app-inventory-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="iset-container">
      <div class="iset-section">
        <h3>Product Settings</h3>
        <div class="iset-card">
          <div class="iset-row"><span>Product ID</span><span class="iset-code">{{ productId }}</span></div>
          <div class="iset-row"><span>Status</span><span [class]="state.productIsActive() ? 'iset-active' : 'iset-inactive'">{{ state.productIsActive() ? 'Active' : 'Archived' }}</span></div>
          <div class="iset-row"><span>Created</span><span>{{ (state.product()?.createdAt | date:'medium') || '—' }}</span></div>
          <div class="iset-row"><span>Updated</span><span>{{ (state.product()?.updatedAt | date:'medium') || '—' }}</span></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .iset-container{padding:0 4px;max-width:960px}
    .iset-section h3{margin:0 0 12px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .iset-card{background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;padding:16px}
    .iset-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-subtle,#e5e7eb);font-size:13px}
    .iset-row:last-child{border-bottom:0}
    .iset-row span:first-child{color:var(--text-soft,#64748b);font-weight:600}
    .iset-code{font-family:monospace;background:var(--surface-muted,#f1f5f9);padding:2px 8px;border-radius:4px;font-size:12px}
    .iset-active{color:#84cc16;font-weight:700}
    .iset-inactive{color:var(--text-soft,#64748b)}
  `]
})
export class InventorySettingsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(InventoryDetailStateService);
  productId = '';

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (this.productId) this.state.load(this.productId);
  }
}
