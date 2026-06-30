import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PosService } from './pos.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>POS / Billing</h1>
          <p>Point of sale, checkout, and recent sales.</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading POS...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load POS data.</strong>
        <p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="dashboard">
          <div class="kpi-card">
            <span>Total Sales</span>
            <strong>{{ dashboard.summary.totalSales }}</strong>
          </div>
          <div class="kpi-card">
            <span>Revenue</span>
            <strong>{{ dashboard.summary.completedRevenue | currency:'USD':'symbol':'1.0-0' }}</strong>
          </div>
        </div>

        <div class="grid-2">
          <div class="panel">
            <h2>New Checkout</h2>
            <div class="checkout-form">
              <input [(ngModel)]="checkoutForm.clientName" placeholder="Client name (optional)">
              <div class="cart-items">
                <div class="cart-row" *ngFor="let item of cart; let i = index">
                  <input [(ngModel)]="item.name" placeholder="Item name" style="flex:1">
                  <input [(ngModel)]="item.quantity" type="number" min="1" placeholder="Qty" style="width:60px">
                  <input [(ngModel)]="item.unitPrice" type="number" min="0" step="0.01" placeholder="Price" style="width:90px">
                  <button class="remove-btn" (click)="removeCartItem(i)">x</button>
                </div>
              </div>
              <button class="add-btn" (click)="addCartItem()">+ Add Item</button>
              <div class="cart-total">
                <strong>Total: {{ '$' + cartTotal() }}</strong>
              </div>
              <select [(ngModel)]="checkoutForm.paymentMethod">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="WALLET">Wallet</option>
              </select>
              <button class="checkout-btn" (click)="doCheckout()" [disabled]="cart.length === 0 || checkoutBusy">
                {{ checkoutBusy ? 'Processing...' : 'Complete Checkout' }}
              </button>
              <div class="success-msg" *ngIf="checkoutSuccess">Checkout completed successfully!</div>
            </div>
          </div>

          <div class="panel">
            <h2>Recent Sales</h2>
            <div class="empty" *ngIf="(!dashboard?.recentSales || dashboard.recentSales.length === 0)">
              <p>No sales yet.</p>
            </div>
            <div class="sale-row" *ngFor="let sale of dashboard?.recentSales">
              <div class="sale-info">
                <strong>{{ sale.client?.fullName || 'Walk-in' }}</strong>
                <span>{{ sale.createdAt | date:'short' }}</span>
              </div>
              <div class="sale-right">
                <b>{{ sale.totalAmount | currency:'USD':'symbol':'1.0-0' }}</b>
                <span class="sale-method">{{ sale.paymentMethod }}</span>
                <span class="sale-status" [class.refunded]="sale.status === 'REFUNDED'">{{ sale.status }}</span>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel h2{margin:0 0 18px;font-size:20px}
    .checkout-form{display:grid;gap:12px}
    .checkout-form input,select{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .cart-items{display:grid;gap:8px}
    .cart-row{display:flex;gap:8px;align-items:center}
    .cart-row input{padding:10px;border:1px solid #e5e7eb;border-radius:10px}
    .remove-btn{border:0;background:#fee2e2;color:#991b1b;border-radius:8px;width:32px;height:32px;font-weight:900;cursor:pointer}
    .add-btn{border:1px dashed #e5e7eb;border-radius:12px;padding:12px;background:transparent;cursor:pointer;font-weight:600}
    .cart-total{text-align:right;font-size:18px}
    .checkout-btn{border:0;border-radius:14px;padding:14px;background:#0b0b0b;color:white;font-weight:900;cursor:pointer}
    .checkout-btn:disabled{opacity:.5}
    .success-msg{padding:14px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;text-align:center}
    .sale-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f1f5f9}
    .sale-row:last-child{border-bottom:0}
    .sale-info strong{display:block;font-size:14px}
    .sale-info span{font-size:12px;color:#6b7280}
    .sale-right{text-align:right}
    .sale-right b{display:block;font-size:16px}
    .sale-method{font-size:11px;color:#6b7280;display:block}
    .sale-status{font-size:11px;font-weight:700;color:#16a34a}
    .sale-status.refunded{color:#dc2626}
    .empty{padding:24px;text-align:center;color:#6b7280}
    @media(max-width:900px){.grid-2{grid-template-columns:1fr}.kpis{grid-template-columns:1fr}}
  `]
})
export class PosComponent {
  private api = inject(PosService);

  dashboard: any = null;
  loading = true;
  error = '';

  cart: any[] = [];
  checkoutForm: any = { clientName: '', paymentMethod: 'CASH' };
  checkoutBusy = false;
  checkoutSuccess = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    this.api.getDashboard().subscribe({
      next: (d) => { this.dashboard = d; this.loading = false; },
      error: () => { this.error = 'POS data unavailable.'; this.loading = false; },
    });
  }

  addCartItem() {
    this.cart.push({ name: '', quantity: 1, unitPrice: 0 });
  }

  removeCartItem(i: number) {
    this.cart.splice(i, 1);
  }

  cartTotal(): number {
    return this.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  }

  doCheckout() {
    if (this.cart.length === 0) return;
    this.checkoutBusy = true;
    this.checkoutSuccess = false;
    const items = this.cart.map(i => ({
      name: i.name || 'Item',
      quantity: Number(i.quantity) || 1,
      unitPrice: Number(i.unitPrice) || 0,
    }));
    this.api.checkout({ items, paymentMethod: this.checkoutForm.paymentMethod }).subscribe({
      next: () => {
        this.checkoutBusy = false;
        this.checkoutSuccess = true;
        this.cart = [];
        this.load();
        setTimeout(() => this.checkoutSuccess = false, 3000);
      },
      error: () => { this.checkoutBusy = false; },
    });
  }
}
