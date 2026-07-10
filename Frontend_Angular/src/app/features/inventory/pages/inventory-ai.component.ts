import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';

@Component({
  selector: 'app-inventory-ai',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="iai-container">
      <div class="iai-card">
        <span class="iai-icon">✨</span>
        <h3>AI Inventory Assistant</h3>
        <p>AI-powered inventory insights integration ready. Predictive analytics, demand forecasting, and smart restocking recommendations will appear here once the AI module is connected.</p>
        <div class="iai-suggestions">
          <div class="iai-chip">Demand Forecast</div>
          <div class="iai-chip">Restock Alert</div>
          <div class="iai-chip">Price Optimization</div>
          <div class="iai-chip">Seasonal Trends</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .iai-container{padding:0 4px;max-width:960px}
    .iai-card{padding:32px 24px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px}
    .iai-icon{font-size:40px;display:block;margin-bottom:12px}
    h3{margin:0 0 8px;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    p{margin:0 0 24px;color:var(--text-soft,#64748b);max-width:480px;margin-left:auto;margin-right:auto;line-height:1.5}
    .iai-suggestions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
    .iai-chip{padding:8px 16px;border-radius:999px;background:linear-gradient(135deg,#84cc16,#22c55e);color:#fff;font-size:12px;font-weight:700;opacity:.7}
  `]
})
export class InventoryAiComponent implements OnInit {
  private route = inject(ActivatedRoute);
  state = inject(InventoryDetailStateService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
}
