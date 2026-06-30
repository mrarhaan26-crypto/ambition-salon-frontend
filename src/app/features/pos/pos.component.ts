import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PosService } from './pos.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>POS / Billing</h1>
          <p>Fast salon checkout with client, services, payment, receipt, and recent sales.</p>
        </div>
        <button class="refresh-btn" (click)="load()">Refresh</button>
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
          <div class="kpi-card">
            <span>Cart Items</span>
            <strong>{{ cart.length }}</strong>
          </div>
          <div class="kpi-card">
            <span>Cart Total</span>
            <strong>{{ cartTotal() | currency:'USD':'symbol':'1.0-0' }}</strong>
          </div>
        </div>

        <div class="grid-2">
          <div class="panel checkout-panel">
            <div class="panel-title">
              <div>
                <h2>New Checkout</h2>
                <p>Select client and add services/items to cart.</p>
              </div>
              <span class="mode-chip">{{ checkoutForm.clientId ? 'Client sale' : 'Walk-in sale' }}</span>
            </div>

            <div class="checkout-form">
              <label>
                <span>Client</span>
                <select [(ngModel)]="checkoutForm.clientId">
                  <option value="">Walk-in customer</option>
                  <option *ngFor="let client of clients" [value]="client.id">{{ client.fullName }}</option>
                </select>
              </label>

              <label>
                <span>Add service</span>
                <div class="service-add">
                  <select [(ngModel)]="selectedServiceId">
                    <option value="">Choose service</option>
                    <option *ngFor="let service of services" [value]="service.id">
                      {{ service.name }} - {{ service.price | currency:'USD':'symbol':'1.0-0' }}
                    </option>
                  </select>
                  <button type="button" (click)="addSelectedService()" [disabled]="!selectedServiceId">Add</button>
                </div>
              </label>

              <div class="cart-box">
                <div class="cart-head">
                  <strong>Cart</strong>
                  <button type="button" class="add-btn" (click)="addCartItem()">+ Manual item</button>
                </div>

                <div class="empty" *ngIf="cart.length === 0">
                  <p>No items added yet. Add a service or manual item.</p>
                </div>

                <div class="cart-items" *ngIf="cart.length > 0">
                  <div class="cart-row" *ngFor="let item of cart; let i = index">
                    <input [(ngModel)]="item.name" placeholder="Item name" class="item-name">
                    <input [(ngModel)]="item.quantity" type="number" min="1" placeholder="Qty" class="qty">
                    <input [(ngModel)]="item.unitPrice" type="number" min="0" step="0.01" placeholder="Price" class="price">
                    <strong class="line-total">{{ lineTotal(item) | currency:'USD':'symbol':'1.0-0' }}</strong>
                    <button class="remove-btn" (click)="removeCartItem(i)">x</button>
                  </div>
                </div>
              </div>

              <div class="summary-box">
                <div><span>Subtotal</span><strong>{{ cartTotal() | currency:'USD':'symbol':'1.0-0' }}</strong></div>
                <div><span>Payment</span><strong>{{ checkoutForm.paymentMethod }}</strong></div>
                <div class="grand"><span>Total</span><strong>{{ cartTotal() | currency:'USD':'symbol':'1.0-0' }}</strong></div>
              </div>

              <label>
                <span>Payment method</span>
                <select [(ngModel)]="checkoutForm.paymentMethod">
                  <option *ngFor="let method of paymentMethods" [value]="method.id">{{ method.name }}</option>
                </select>
              </label>

              <div class="checkout-error" *ngIf="checkoutError">{{ checkoutError }}</div>
              <div class="success-msg" *ngIf="checkoutSuccess">Checkout completed successfully!</div>

              <button class="checkout-btn" (click)="doCheckout()" [disabled]="cart.length === 0 || checkoutBusy">
                {{ checkoutBusy ? 'Processing...' : 'Complete Checkout' }}
              </button>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">
              <div>
                <h2>Recent Sales</h2>
                <p>Latest completed POS transactions.</p>
              </div>
            </div>

            <div class="empty" *ngIf="(!dashboard?.recentSales || dashboard.recentSales.length === 0)">
              <p>No sales yet.</p>
            </div>

            <div class="sale-row" *ngFor="let sale of dashboard?.recentSales">
              <div class="sale-info">
                <strong>{{ sale.client?.fullName || 'Walk-in' }}</strong>
                <span>{{ sale.createdAt | date:'MMM dd, yyyy h:mm a' }}</span>
              </div>
              <div class="sale-right">
                <b>{{ sale.totalAmount | currency:'USD':'symbol':'1.0-0' }}</b>
                <span class="sale-method">{{ sale.paymentMethod || 'CASH' }}</span>
                <span class="sale-status" [class.refunded]="sale.status === 'REFUNDED'">{{ sale.status }}</span>
                <button class="receipt-link" (click)="viewReceipt(sale)">Receipt</button>
              </div>
            </div>
          </div>
        </div>

        <div class="drawer-backdrop" *ngIf="selectedSale" (click)="closeReceipt()"></div>

        <aside class="receipt-drawer" *ngIf="selectedSale">
          <div class="drawer-head">
            <div>
              <h2>Receipt</h2>
              <p>{{ selectedSale.id }}</p>
            </div>
            <button class="icon-btn" (click)="closeReceipt()">x</button>
          </div>

          <div class="receipt-loading" *ngIf="saleDetailLoading">
            <div class="spinner"></div>
            <span>Loading receipt...</span>
          </div>

          <div class="checkout-error" *ngIf="saleDetailError">{{ saleDetailError }}</div>

          <div class="receipt-card" id="pos-receipt" *ngIf="!saleDetailLoading">
            <div class="receipt-brand">
              <h3>Ambition Unisex Salon</h3>
              <span>POS Receipt</span>
            </div>

            <div class="receipt-meta">
              <div><span>Client</span><strong>{{ selectedSale.client?.fullName || 'Walk-in' }}</strong></div>
              <div><span>Date</span><strong>{{ selectedSale.createdAt | date:'MMM dd, yyyy h:mm a' }}</strong></div>
              <div><span>Payment</span><strong>{{ selectedSale.paymentMethod || 'CASH' }}</strong></div>
              <div><span>Status</span><strong>{{ selectedSale.status }}</strong></div>
            </div>

            <div class="receipt-items">
              <div class="receipt-item head-row">
                <span>Item</span><span>Qty</span><span>Price</span><span>Total</span>
              </div>
              <div class="receipt-item" *ngFor="let item of selectedSale.items || []">
                <span>{{ item.name }}</span>
                <span>{{ item.quantity }}</span>
                <span>{{ item.unitPrice | currency:'USD':'symbol':'1.0-0' }}</span>
                <strong>{{ item.totalPrice | currency:'USD':'symbol':'1.0-0' }}</strong>
              </div>
            </div>

            <div class="receipt-total">
              <span>Total Paid</span>
              <strong>{{ selectedSale.totalAmount | currency:'USD':'symbol':'1.0-0' }}</strong>
            </div>

            <p class="thankyou">Thank you for visiting.</p>
          </div>

          <div class="drawer-actions">
            <button class="print-btn" (click)="printReceipt()">Print Receipt</button>
            <button class="refund-btn" (click)="refundSale()" [disabled]="selectedSale.status === 'REFUNDED' || refundBusy">
              {{ refundBusy ? 'Refunding...' : selectedSale.status === 'REFUNDED' ? 'Already Refunded' : 'Refund Sale' }}
            </button>
          </div>
        </aside>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center;gap:16px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .refresh-btn{border:1px solid #e5e7eb;background:white;border-radius:12px;padding:10px 16px;font-weight:800;cursor:pointer}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:26px}
    .grid-2{display:grid;grid-template-columns:1.15fr .85fr;gap:18px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}
    .panel h2{margin:0;font-size:20px}
    .panel-title p{font-size:13px}
    .mode-chip{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800;color:#374151;white-space:nowrap}
    .checkout-form{display:grid;gap:14px}
    label{display:grid;gap:7px}
    label span{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
    input,select{padding:13px 14px;border:1px solid #e5e7eb;border-radius:14px;background:white;min-width:0}
    .service-add{display:grid;grid-template-columns:1fr auto;gap:10px}
    .service-add button{border:0;border-radius:14px;padding:0 18px;background:#0b0b0b;color:white;font-weight:900;cursor:pointer}
    .service-add button:disabled{opacity:.45}
    .cart-box{border:1px solid #eef2f7;border-radius:18px;padding:14px;background:#fbfdff}
    .cart-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .cart-items{display:grid;gap:8px}
    .cart-row{display:grid;grid-template-columns:1fr 70px 100px 90px 34px;gap:8px;align-items:center}
    .cart-row input{padding:10px;border-radius:10px}
    .line-total{text-align:right;font-size:13px}
    .remove-btn{border:0;background:#fee2e2;color:#991b1b;border-radius:8px;width:32px;height:32px;font-weight:900;cursor:pointer}
    .add-btn{border:1px dashed #d1d5db;border-radius:12px;padding:9px 12px;background:white;cursor:pointer;font-weight:800}
    .summary-box{display:grid;gap:8px;background:#0b0b0b;color:white;border-radius:18px;padding:16px}
    .summary-box div{display:flex;justify-content:space-between;align-items:center}
    .summary-box span{color:#d1d5db;font-size:13px}
    .summary-box .grand{border-top:1px solid rgba(255,255,255,.16);padding-top:10px;margin-top:4px}
    .summary-box .grand strong{font-size:22px}
    .checkout-btn{border:0;border-radius:14px;padding:15px;background:#0b0b0b;color:white;font-weight:900;cursor:pointer}
    .checkout-btn:disabled{opacity:.5}
    .checkout-error{padding:12px;background:#fef2f2;color:#991b1b;border-radius:12px;font-weight:700}
    .success-msg{padding:14px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;text-align:center}
    .sale-row{display:flex;justify-content:space-between;gap:14px;padding:14px 0;border-bottom:1px solid #f1f5f9}
    .sale-row:last-child{border-bottom:0}
    .sale-info strong{display:block;font-size:14px}
    .sale-info span{font-size:12px;color:#6b7280}
    .sale-right{text-align:right;display:grid;justify-items:end;gap:3px}
    .sale-right b{display:block;font-size:16px}
    .sale-method{font-size:11px;color:#6b7280;display:block}
    .sale-status{font-size:11px;font-weight:800;color:#16a34a}
    .sale-status.refunded{color:#dc2626}
    .receipt-link{border:1px solid #e5e7eb;background:white;border-radius:8px;padding:5px 9px;font-size:11px;font-weight:800;cursor:pointer}
    .empty{padding:22px;text-align:center;color:#6b7280;background:#f8fafc;border-radius:16px}
    .drawer-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.32);z-index:50}
    .receipt-drawer{position:fixed;top:0;right:0;width:min(460px,100vw);height:100vh;background:#f8fafc;z-index:60;box-shadow:-20px 0 40px rgba(15,23,42,.2);padding:22px;overflow:auto;display:grid;gap:16px;align-content:start}
    .drawer-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .drawer-head h2{margin:0;font-size:26px}.drawer-head p{font-size:12px;word-break:break-all}
    .icon-btn{border:0;background:#111827;color:white;width:34px;height:34px;border-radius:10px;font-weight:900;cursor:pointer}
    .receipt-loading{display:flex;align-items:center;gap:12px;justify-content:center;padding:32px;color:#6b7280}
    .receipt-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:22px;box-shadow:0 12px 30px rgba(15,23,42,.06)}
    .receipt-brand{text-align:center;border-bottom:1px dashed #d1d5db;padding-bottom:14px;margin-bottom:14px}
    .receipt-brand h3{margin:0;font-size:22px}.receipt-brand span{font-size:12px;color:#6b7280}
    .receipt-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
    .receipt-meta div{background:#f8fafc;border-radius:12px;padding:10px}
    .receipt-meta span{display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:800}
    .receipt-meta strong{font-size:13px;word-break:break-word}
    .receipt-items{display:grid;gap:8px}
    .receipt-item{display:grid;grid-template-columns:1fr 42px 70px 75px;gap:8px;align-items:center;font-size:13px}
    .head-row{font-weight:900;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:8px}
    .receipt-total{display:flex;justify-content:space-between;align-items:center;border-top:1px dashed #d1d5db;margin-top:16px;padding-top:16px}
    .receipt-total span{font-weight:900}.receipt-total strong{font-size:26px}
    .thankyou{text-align:center;font-size:12px}
    .drawer-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .print-btn,.refund-btn{border:0;border-radius:14px;padding:13px;font-weight:900;cursor:pointer}
    .print-btn{background:#0b0b0b;color:white}.refund-btn{background:#fee2e2;color:#991b1b}
    .refund-btn:disabled{opacity:.55;cursor:not-allowed}
    @media(max-width:1050px){.grid-2{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:640px){.head{align-items:flex-start;flex-direction:column}.kpis{grid-template-columns:1fr}.cart-row{grid-template-columns:1fr 62px 88px}.line-total{grid-column:1/3;text-align:left}.remove-btn{grid-column:3}.service-add{grid-template-columns:1fr}.service-add button{height:44px}.receipt-meta{grid-template-columns:1fr}.receipt-item{grid-template-columns:1fr 36px 58px 64px}.drawer-actions{grid-template-columns:1fr}}
  `]
})
export class PosComponent {
  private api = inject(PosService);
  private clientsApi = inject(ClientsService);
  private servicesApi = inject(ServicesService);

  dashboard: any = null;
  clients: any[] = [];
  services: any[] = [];
  paymentMethods: any[] = [
    { id: 'CASH', name: 'Cash' },
    { id: 'CARD', name: 'Card' },
    { id: 'UPI', name: 'UPI' },
    { id: 'WALLET', name: 'Wallet' },
  ];

  loading = true;
  error = '';

  cart: any[] = [];
  selectedServiceId = '';
  checkoutForm: any = { clientId: '', paymentMethod: 'CASH' };
  checkoutBusy = false;
  checkoutSuccess = false;
  checkoutError = '';

  selectedSale: any = null;
  saleDetailLoading = false;
  saleDetailError = '';
  refundBusy = false;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.checkoutError = '';

    this.api.getDashboard().subscribe({
      next: (d) => { this.dashboard = d; this.loading = false; },
      error: (err) => {
        this.error = err?.status === 401 ? 'Your session has expired. Please log in again.' : 'POS data unavailable.';
        this.loading = false;
      },
    });

    this.clientsApi.getClients({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }).subscribe({
      next: (res) => { this.clients = res.items || []; },
      error: () => { this.clients = []; },
    });

    this.servicesApi.getAll({ isActive: true }).subscribe({
      next: (services) => { this.services = services || []; },
      error: () => { this.services = []; },
    });

    this.api.getPaymentMethods().subscribe({
      next: (methods) => { this.paymentMethods = methods?.length ? methods : this.paymentMethods; },
      error: () => {},
    });
  }

  addSelectedService() {
    const service = this.services.find((item) => item.id === this.selectedServiceId);
    if (!service) return;

    this.cart.push({
      serviceId: service.id,
      name: service.name,
      quantity: 1,
      unitPrice: Number(service.price) || 0,
    });

    this.selectedServiceId = '';
  }

  addCartItem() {
    this.cart.push({ serviceId: null, name: '', quantity: 1, unitPrice: 0 });
  }

  removeCartItem(i: number) {
    this.cart.splice(i, 1);
  }

  lineTotal(item: any): number {
    return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }

  cartTotal(): number {
    return this.cart.reduce((sum, item) => sum + this.lineTotal(item), 0);
  }

  viewReceipt(sale: any) {
    this.selectedSale = sale;
    this.saleDetailLoading = true;
    this.saleDetailError = '';

    this.api.getSale(sale.id).subscribe({
      next: (detail) => {
        this.selectedSale = detail;
        this.saleDetailLoading = false;
      },
      error: (err) => {
        this.saleDetailError = err?.error?.message || 'Receipt could not be loaded.';
        this.saleDetailLoading = false;
      },
    });
  }

  closeReceipt() {
    this.selectedSale = null;
    this.saleDetailError = '';
    this.saleDetailLoading = false;
    this.refundBusy = false;
  }

  printReceipt() {
    window.print();
  }

  refundSale() {
    if (!this.selectedSale || this.selectedSale.status === 'REFUNDED') return;
    if (!confirm('Refund this POS sale?')) return;

    this.refundBusy = true;
    this.saleDetailError = '';

    this.api.refund(this.selectedSale.id, {}).subscribe({
      next: (sale) => {
        this.selectedSale = sale;
        this.refundBusy = false;
        this.load();
      },
      error: (err) => {
        this.refundBusy = false;
        this.saleDetailError = err?.error?.message || 'Refund failed. Please try again.';
      },
    });
  }

  doCheckout() {
    this.checkoutError = '';
    this.checkoutSuccess = false;

    if (this.cart.length === 0) {
      this.checkoutError = 'Add at least one item to checkout.';
      return;
    }

    const invalidItem = this.cart.find((item) => !String(item.name || '').trim());
    if (invalidItem) {
      this.checkoutError = 'Every cart item needs a name.';
      return;
    }

    this.checkoutBusy = true;

    const items = this.cart.map((item) => ({
      serviceId: item.serviceId || null,
      name: String(item.name || 'Item').trim(),
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
    }));

    this.api.checkout({
      clientId: this.checkoutForm.clientId || null,
      items,
      paymentMethod: this.checkoutForm.paymentMethod || 'CASH',
    }).subscribe({
      next: (sale) => {
        this.checkoutBusy = false;
        this.checkoutSuccess = true;
        this.cart = [];
        this.selectedServiceId = '';
        this.checkoutForm = { clientId: '', paymentMethod: 'CASH' };
        this.load();
        this.viewReceipt(sale);
        setTimeout(() => this.checkoutSuccess = false, 3000);
      },
      error: (err) => {
        this.checkoutBusy = false;
        this.checkoutError = err?.error?.message || 'Checkout failed. Please try again.';
      },
    });
  }
}
