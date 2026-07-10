import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';

@Component({
  selector: 'app-inventory-analytics',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ia-container">
      <div class="ia-card">
        <span class="ia-icon">📊</span>
        <h3>Inventory Analytics</h3>
        <p>Analytics dashboard integration ready. Charts and trend data will appear once the analytics module is connected.</p>
        <div class="ia-placeholder-grid">
          <div class="ia-placeholder"><span>Stock Trends</span><div class="ia-bar"></div></div>
          <div class="ia-placeholder"><span>Velocity</span><div class="ia-bar ia-bar-sm"></div></div>
          <div class="ia-placeholder"><span>Value Over Time</span><div class="ia-bar ia-bar-md"></div></div>
          <div class="ia-placeholder"><span>Forecast</span><div class="ia-bar ia-bar-lg"></div></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ia-container{padding:0 4px;max-width:960px}
    .ia-card{padding:32px 24px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px}
    .ia-icon{font-size:40px;display:block;margin-bottom:12px}
    h3{margin:0 0 8px;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    p{margin:0 0 24px;color:var(--text-soft,#64748b);max-width:480px;margin-left:auto;margin-right:auto;line-height:1.5}
    .ia-placeholder-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;max-width:500px;margin:0 auto}
    .ia-placeholder{text-align:left}
    .ia-placeholder span{display:block;font-size:12px;font-weight:700;color:var(--text-soft,#64748b);margin-bottom:6px}
    .ia-bar{height:8px;background:linear-gradient(90deg,#84cc16,#22c55e);border-radius:4px;width:75%}
    .ia-bar-sm{width:35%}.ia-bar-md{width:55%}.ia-bar-lg{width:90%}
    @media(max-width:500px){.ia-placeholder-grid{grid-template-columns:1fr}}
  `]
})
export class InventoryAnalyticsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(InventoryDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
