import { Component, computed, inject, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosStore } from './pos-store.service';

@Component({
  selector: 'app-pos-cart-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cart-panel">
      <div class="cart-header">
        <div class="cart-header-left">
          <h2>Shopping Cart</h2>
          <span class="cart-badge">{{ store.itemCount() }} items</span>
        </div>
        <div class="cart-header-actions">
          <button class="btn-icon" (click)="store.holdSale()" [disabled]="store.cart().length === 0" title="Hold Sale">
            <span class="icon">&#9201;</span>
          </button>
          <button class="btn-icon" (click)="store.restoreHeldSale()" [disabled]="!store.heldSaleExists()" title="Restore Held">
            <span class="icon">&#8635;</span>
          </button>
          <button class="btn-icon danger" (click)="clearCart()" [disabled]="store.cart().length === 0" title="Clear Cart">
            <span class="icon">&#10005;</span>
          </button>
        </div>
      </div>

      <div class="client-summary" *ngIf="store.client() as c">
        <div class="client-avatar">{{ c.fullName.charAt(0).toUpperCase() }}</div>
        <div class="client-details">
          <strong>{{ c.fullName }}</strong>
          <span>{{ c.phone || 'No phone' }} &middot; {{ c.totalVisits }} visits &middot; {{ (c.totalSpend || 0) | currency:'USD':'symbol':'1.0-0' }}</span>
        </div>
        <button class="btn-icon" (click)="store.clearClient()" title="Change client">&#9998;</button>
      </div>

      <div class="cart-items" *ngIf="store.cart().length > 0; else emptyCart">
        <div class="cart-item-group" *ngFor="let group of groupedItems()">
          <div class="group-header" *ngIf="group.label">
            <span>{{ group.label }}</span>
            <span class="group-count">{{ group.items.length }} items - {{ groupTotal(group.items) | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="cart-item" *ngFor="let item of group.items; trackBy: trackById">
            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-meta" *ngIf="item.sku">SKU: {{ item.sku }}</span>
              <span class="item-meta" *ngIf="item.staffName">Staff: {{ item.staffName }}</span>
              <span class="item-meta" *ngIf="item.durationMin">{{ item.durationMin }} min</span>
            </div>
            <div class="item-qty">
              <button class="qty-btn" (click)="store.updateQuantity(item.id, item.quantity - 1); $event.stopPropagation()">-</button>
              <input [ngModel]="item.quantity" (ngModelChange)="store.updateQuantity(item.id, $event); $event.stopPropagation()"
                type="number" min="1" class="qty-input" (click)="$event.stopPropagation()">
              <button class="qty-btn" (click)="store.updateQuantity(item.id, item.quantity + 1); $event.stopPropagation()">+</button>
            </div>
            <div class="item-price">
              <span class="unit-price">{{ item.unitPrice | currency:'USD':'symbol':'1.2-2' }}</span>
              <span class="line-total">{{ (item.quantity * item.unitPrice) | currency:'USD':'symbol':'1.2-2' }}</span>
            </div>
            <button class="item-remove" (click)="store.removeFromCart(item.id); $event.stopPropagation()">&#10005;</button>
          </div>
        </div>
      </div>

      <ng-template #emptyCart>
        <div class="empty-cart">
          <div class="empty-icon">&#128722;</div>
          <h3>Cart is empty</h3>
          <p>Add services or products from the left panel to get started.</p>
        </div>
      </ng-template>

      <div class="cart-footer" *ngIf="store.cart().length > 0">
        <div class="footer-row">
          <span>Subtotal</span>
          <strong>{{ store.cartTotal() | currency:'USD':'symbol':'1.2-2' }}</strong>
        </div>
        <div class="footer-row discount-row" *ngIf="store.cartDiscountAmount() > 0">
          <span>Discount</span>
          <strong>-{{ store.cartDiscountAmount() | currency:'USD':'symbol':'1.2-2' }}</strong>
        </div>
        <div class="footer-row" *ngIf="store.taxRate() > 0">
          <span>Tax ({{ store.taxRate() }}%)</span>
          <strong>{{ store.taxAmount() | currency:'USD':'symbol':'1.2-2' }}</strong>
        </div>
        <div class="footer-row" *ngIf="store.tip() > 0">
          <span>Tip</span>
          <strong>{{ store.tip() | currency:'USD':'symbol':'1.2-2' }}</strong>
        </div>
        <div class="footer-row grand-total">
          <span>Total</span>
          <strong>{{ store.grandTotal() | currency:'USD':'symbol':'1.2-2' }}</strong>
        </div>
      </div>

      <div class="ai-section" *ngIf="store.aiRecommendations().length > 0">
        <div class="ai-section-header">
          <span class="ai-icon">&#9889;</span>
          <span>AI Recommendations</span>
        </div>
        <div class="ai-cards">
          <div class="ai-card" *ngFor="let rec of store.aiRecommendations()">
            <div class="ai-card-header">
              <span class="ai-type-badge" [class.upsell]="rec.type==='upsell'" [class.cross-sell]="rec.type==='cross-sell'" [class.membership]="rec.type==='membership'" [class.package]="rec.type==='package'">{{ rec.type }}</span>
              <span class="ai-confidence" *ngIf="rec.confidence">{{ rec.confidence }}%</span>
            </div>
            <strong class="ai-title">{{ rec.title }}</strong>
            <p class="ai-desc">{{ rec.description }}</p>
            <div class="ai-price" *ngIf="rec.itemPrice">{{ rec.itemPrice | currency:'USD':'symbol':'1.2-2' }}</div>
            <button class="ai-add-btn" (click)="addRecommendation(rec)">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cart-panel{display:grid;grid-template-rows:auto auto 1fr auto;height:100%;overflow:hidden;gap:12px;padding:16px}
    .cart-header{display:flex;justify-content:space-between;align-items:center}
    .cart-header-left{display:flex;align-items:center;gap:10px}
    .cart-header-left h2{margin:0;font-size:20px}
    .cart-badge{background:#f3f4f6;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:800;color:#6b7280}
    .cart-header-actions{display:flex;gap:6px}
    .btn-icon{border:1px solid #e5e7eb;background:white;border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px}
    .btn-icon.danger{color:#dc2626;border-color:#fecaca}
    .btn-icon:disabled{opacity:.4;cursor:not-allowed}
    .client-summary{display:flex;align-items:center;gap:12px;padding:12px;background:#f9fafb;border:1px solid #eef2f7;border-radius:14px}
    .client-avatar{width:40px;height:40px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px}
    .client-details{flex:1;min-width:0}
    .client-details strong{display:block;font-size:14px}
    .client-details span{font-size:12px;color:#6b7280;display:block;margin-top:2px}
    .cart-items{overflow-y:auto;display:flex;flex-direction:column;gap:8px}
    .cart-item-group{display:flex;flex-direction:column;gap:4px}
    .group-header{display:flex;justify-content:space-between;align-items:center;padding:4px 8px;font-size:11px;font-weight:800;text-transform:uppercase;color:#6b7280;letter-spacing:.04em}
    .cart-item{display:grid;grid-template-columns:1fr 100px 100px 32px;gap:8px;align-items:center;padding:10px 12px;background:white;border:1px solid #eef2f7;border-radius:12px;transition:box-shadow .15s;cursor:default}
    .cart-item:hover{border-color:#d1d5db;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .item-info{min-width:0}
    .item-name{display:block;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .item-meta{display:block;font-size:11px;color:#6b7280;margin-top:2px}
    .item-qty{display:flex;align-items:center;gap:4px;justify-content:center}
    .qty-btn{border:1px solid #e5e7eb;background:white;border-radius:6px;width:28px;height:28px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .qty-input{width:40px;text-align:center;padding:4px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;font-weight:700}
    .item-price{text-align:right}
    .unit-price{display:block;font-size:12px;color:#6b7280}
    .line-total{display:block;font-size:14px;font-weight:800}
    .item-remove{border:0;background:#fee2e2;color:#dc2626;border-radius:6px;width:28px;height:28px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px}
    .empty-cart{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#9ca3af;text-align:center;padding:40px;gap:8px}
    .empty-icon{font-size:48px}
    .empty-cart h3{margin:0;font-size:18px;color:#6b7280}
    .empty-cart p{margin:0;font-size:13px;max-width:260px}
    .cart-footer{background:#f9fafb;border:1px solid #eef2f7;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px}
    .footer-row{display:flex;justify-content:space-between;align-items:center;font-size:14px}
    .footer-row strong{font-weight:800}
    .footer-row.grand-total{border-top:2px solid #e5e7eb;padding-top:8px;font-size:18px}
    .footer-row.grand-total strong{font-size:24px}
    .discount-row{color:#059669}
    .ai-section{display:flex;flex-direction:column;gap:8px;padding:12px;background:linear-gradient(135deg,#fdf4ff,#f3e8ff);border:1px solid #e9d5ff;border-radius:14px}
    .ai-section-header{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:900;text-transform:uppercase;color:#7c3aed;letter-spacing:.04em}
    .ai-icon{font-size:16px}
    .ai-cards{display:flex;flex-direction:column;gap:6px}
    .ai-card{background:white;border:1px solid #e9d5ff;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:4px}
    .ai-card-header{display:flex;justify-content:space-between;align-items:center}
    .ai-type-badge{font-size:9px;font-weight:900;text-transform:uppercase;padding:2px 6px;border-radius:4px;background:#f3e8ff;color:#7c3aed}
    .ai-type-badge.upsell{background:#dbeafe;color:#1d4ed8}
    .ai-type-badge.cross-sell{background:#d1fae5;color:#065f46}
    .ai-type-badge.membership{background:#fef3c7;color:#92400e}
    .ai-type-badge.package{background:#fce7f3;color:#9d174d}
    .ai-confidence{font-size:10px;font-weight:800;color:#7c3aed}
    .ai-title{font-size:13px}
    .ai-desc{font-size:11px;color:#6b7280;margin:0}
    .ai-price{font-size:13px;font-weight:800;color:#059669}
    .ai-add-btn{border:0;background:#7c3aed;color:white;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;align-self:flex-start}
    .ai-add-btn:hover{background:#6d28d9}
  `]
})
export class PosCartPanelComponent {
  store = inject(PosStore);

  groupedItems = computed(() => {
    const items = this.store.cart();
    if (!items.length) return [];
    const groups: { label: string; items: typeof items }[] = [];
    const services = items.filter(i => i.type === 'service');
    const products = items.filter(i => i.type === 'product');
    const manual = items.filter(i => i.type === 'manual');
    if (services.length) groups.push({ label: 'Services', items: services });
    if (products.length) groups.push({ label: 'Products', items: products });
    if (manual.length) groups.push({ label: 'Other', items: manual });
    return groups;
  });

  trackById(_index: number, item: any): string { return item.id; }

  groupTotal(items: any[]): number {
    return items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  }

  clearCart() {
    if (this.store.cart().length === 0) return;
    if (!confirm('Clear all cart items?')) return;
    this.store.clearCart();
  }

  addRecommendation(rec: any) {
    if (rec.type === 'membership' || rec.type === 'package') return;
    this.store.addToCart({
      id: '',
      type: rec.type === 'retail' ? 'product' : 'service',
      name: rec.itemName || rec.title,
      quantity: 1,
      unitPrice: rec.itemPrice || 0,
      discount: 0,
      discountType: 'none',
      taxRate: 0,
      notes: '',
    });
  }
}
