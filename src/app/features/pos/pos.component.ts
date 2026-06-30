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
          <p>Fast salon checkout with client, services, discount, tax, receipt, and recent sales.</p>
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
            <span>Grand Total</span>
            <strong>{{ grandTotal() | currency:'USD':'symbol':'1.0-0' }}</strong>
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

              <div class="totals-grid">
                <label>
                  <span>Discount amount</span>
                  <input [(ngModel)]="checkoutForm.discountAmount" type="number" min="0" step="0.01" placeholder="0">
                </label>
                <label>
                  <span>Tax rate %</span>
                  <input [(ngModel)]="checkoutForm.taxRate" type="number" min="0" step="0.01" placeholder="0">
                </label>
              </div>

              <div class="summary-box">
                <div><span>Subtotal</span><strong>{{ cartTotal() | currency:'USD':'symbol':'1.0-0' }}</strong></div>
                <div><span>Discount</span><strong>-{{ discountAmount() | currency:'USD':'symbol':'1.0-0' }}</strong></div>
                <div><span>Tax</span><strong>{{ taxAmount() | currency:'USD':'symbol':'1.0-0' }}</strong></div>
                <div><span>Payment</span><strong>{{ checkoutForm.paymentMethod }}</strong></div>
                <div class="grand"><span>Total</span><strong>{{ grandTotal() | currency:'USD':'symbol':'1.0-0' }}</strong></div>
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

        <div class="panel closing-panel" *ngIf="closingSummary() as summary">
          <div class="panel-title">
            <div>
              <h2>Daily Closing Summary</h2>
              <p>Based on currently loaded sales history.</p>
            </div>
          </div>

          <div class="closing-grid">
            <div class="closing-stat">
              <span>Total Completed</span>
              <strong>{{ summary.completedAmount | currency:'USD':'symbol':'1.0-0' }}</strong>
            </div>
            <div class="closing-stat">
              <span>Total Refunded</span>
              <strong>{{ summary.refundedAmount | currency:'USD':'symbol':'1.0-0' }}</strong>
            </div>
            <div class="closing-stat net">
              <span>Net Sales</span>
              <strong>{{ summary.netSales | currency:'USD':'symbol':'1.0-0' }}</strong>
            </div>
            <div class="closing-stat">
              <span>Completed Count</span>
              <strong>{{ summary.completedCount }}</strong>
            </div>
            <div class="closing-stat">
              <span>Refunded Count</span>
              <strong>{{ summary.refundedCount }}</strong>
            </div>
          </div>

          <div class="payment-summary">
            <div class="payment-total" *ngFor="let method of closingPaymentMethods">
              <span>{{ method.name }}</span>
              <strong>{{ paymentTotal(summary, method.id) | currency:'USD':'symbol':'1.0-0' }}</strong>
            </div>
          </div>
        </div>

        <div class="panel sales-history-panel">
          <div class="panel-title">
            <div>
              <h2>Sales History</h2>
              <p>Filter all POS sales by date, status, and payment method.</p>
            </div>
            <div class="panel-actions">
              <button class="refresh-btn" (click)="loadSalesHistory()">Load Sales</button>
              <button class="export-btn" (click)="exportSalesCsv()" [disabled]="salesHistory.length === 0">Export CSV</button>
            </div>
          </div>

          <div class="history-filters">
            <label>
              <span>From</span>
              <input type="date" [(ngModel)]="salesFilters.from">
            </label>
            <label>
              <span>To</span>
              <input type="date" [(ngModel)]="salesFilters.to">
            </label>
            <label>
              <span>Status</span>
              <select [(ngModel)]="salesFilters.status">
                <option value="">All</option>
                <option value="COMPLETED">Completed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </label>
            <label>
              <span>Payment</span>
              <select [(ngModel)]="salesFilters.paymentMethod">
                <option value="">All</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="WALLET">Wallet</option>
              </select>
            </label>
            <button class="checkout-btn" (click)="loadSalesHistory()">Apply</button>
            <button class="add-btn" (click)="clearSalesFilters()">Clear</button>
          </div>

          <div class="loading mini-loading" *ngIf="salesLoading">
            <div class="spinner"></div>
            <span>Loading sales...</span>
          </div>

          <div class="checkout-error" *ngIf="salesError">{{ salesError }}</div>

          <div class="empty" *ngIf="!salesLoading && salesHistory.length === 0">
            <p>No sales found for selected filters.</p>
          </div>

          <div class="history-list" *ngIf="!salesLoading && salesHistory.length > 0">
            <div class="history-row" *ngFor="let sale of salesHistory">
              <div>
                <strong>{{ sale.client?.fullName || 'Walk-in' }}</strong>
                <span>{{ sale.createdAt | date:'MMM dd, yyyy h:mm a' }}</span>
              </div>
              <div>
                <b>{{ sale.totalAmount | currency:'USD':'symbol':'1.0-0' }}</b>
                <small>{{ sale.paymentMethod || 'CASH' }}</small>
              </div>
              <span class="sale-status" [class.refunded]="sale.status === 'REFUNDED'">{{ sale.status }}</span>
              <button class="receipt-link" (click)="viewReceipt(sale)">Receipt</button>
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
    .totals-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
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
    .panel-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
    .export-btn{border:1px solid #0b0b0b;background:#0b0b0b;color:white;border-radius:12px;padding:10px 16px;font-weight:900;cursor:pointer}
    .export-btn:disabled{opacity:.45;cursor:not-allowed}
    .closing-panel,.sales-history-panel{margin-top:18px}
    .closing-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
    .closing-stat{display:grid;gap:8px;background:#fbfdff;border:1px solid #eef2f7;border-radius:16px;padding:14px;min-width:0}
    .closing-stat span,.payment-total span{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
    .closing-stat strong{font-size:20px;line-height:1.1;word-break:break-word}
    .closing-stat.net{background:#0b0b0b;border-color:#0b0b0b;color:white}
    .closing-stat.net span{color:#d1d5db}
    .payment-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px}
    .payment-total{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#f8fafc;border:1px dashed #d1d5db;border-radius:14px;padding:12px 14px;min-width:0}
    .payment-total strong{font-size:15px;text-align:right;word-break:break-word}
    .history-filters{display:grid;grid-template-columns:repeat(4,1fr) auto auto;gap:10px;align-items:end;margin-bottom:16px}
    .mini-loading{padding:18px}
    .history-list{display:grid;gap:10px}
    .history-row{display:grid;grid-template-columns:1fr 120px 95px 80px;gap:12px;align-items:center;padding:13px;border:1px solid #eef2f7;border-radius:16px;background:#fbfdff}
    .history-row strong{display:block;font-size:14px}
    .history-row span{font-size:12px;color:#6b7280}
    .history-row b{display:block;text-align:right}
    .history-row small{display:block;text-align:right;color:#6b7280;font-size:11px}
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
    @media print{
      @page{size:80mm 297mm;margin:0}
      ::ng-deep app-layout .sidebar,
      ::ng-deep app-layout .topbar,
      ::ng-deep app-layout .mobile-toggle{display:none!important}
      ::ng-deep app-layout .app-shell,
      ::ng-deep app-layout .main,
      ::ng-deep app-layout .content{display:block!important;min-height:0!important;margin:0!important;padding:0!important;background:white!important;overflow:visible!important}
      :host{display:block!important;background:white!important;color:#000!important;width:80mm!important;margin:0!important;padding:0!important}
      .page{display:block!important;width:80mm!important;margin:0!important;padding:0!important;background:white!important;color:#000!important}
      .head,
      .loading,
      .error,
      .kpis,
      .grid-2,
      .closing-panel,
      .sales-history-panel,
      .drawer-backdrop,
      .drawer-head,
      .drawer-actions,
      .receipt-loading,
      .checkout-error,
      .success-msg{display:none!important}
      .receipt-drawer{position:static!important;display:block!important;width:80mm!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;background:white!important;box-shadow:none!important;overflow:visible!important;z-index:auto!important}
      .receipt-card{display:block!important;width:80mm!important;max-width:80mm!important;margin:0!important;padding:5mm!important;box-sizing:border-box!important;background:white!important;color:#000!important;border:0!important;border-radius:0!important;box-shadow:none!important;font-family:'Courier New',Courier,monospace!important;font-size:10px!important;line-height:1.35!important}
      .receipt-brand{border-bottom:1px dashed #000!important;padding:0 0 3mm!important;margin:0 0 3mm!important;text-align:center!important}
      .receipt-brand h3{margin:0 0 1mm!important;font-size:14px!important;line-height:1.2!important;color:#000!important;text-transform:uppercase!important}
      .receipt-brand span{display:block!important;font-size:9px!important;color:#000!important;letter-spacing:0!important}
      .receipt-meta{display:grid!important;grid-template-columns:1fr 1fr!important;gap:1.5mm 3mm!important;margin:0 0 3mm!important;padding-bottom:3mm!important;border-bottom:1px dashed #000!important}
      .receipt-meta div{background:white!important;border-radius:0!important;padding:0!important;color:#000!important}
      .receipt-meta span{display:block!important;font-size:8px!important;color:#000!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:0!important}
      .receipt-meta strong{display:block!important;font-size:9px!important;color:#000!important;font-weight:700!important;word-break:break-word!important}
      .receipt-items{display:grid!important;gap:1.5mm!important;margin:0!important;padding:0 0 3mm!important;border-bottom:1px dashed #000!important}
      .receipt-item{display:grid!important;grid-template-columns:1fr 9mm 16mm 18mm!important;gap:1.5mm!important;align-items:start!important;font-size:9px!important;color:#000!important;break-inside:avoid!important}
      .receipt-item span:first-child{word-break:break-word!important}
      .receipt-item span:not(:first-child),
      .receipt-item strong{text-align:right!important;color:#000!important;font-size:9px!important;font-weight:700!important}
      .head-row{border-bottom:1px dashed #000!important;padding:0 0 1.5mm!important;color:#000!important;font-size:8px!important;font-weight:700!important;text-transform:uppercase!important}
      .receipt-total{display:flex!important;justify-content:space-between!important;align-items:flex-end!important;margin:3mm 0 0!important;padding:3mm 0 0!important;border-top:1px dashed #000!important;color:#000!important}
      .receipt-total span{font-size:11px!important;font-weight:900!important;text-transform:uppercase!important;color:#000!important}
      .receipt-total strong{font-size:16px!important;font-weight:900!important;color:#000!important}
      .thankyou{margin:4mm 0 0!important;text-align:center!important;font-size:9px!important;color:#000!important}
    }
    @media(max-width:1050px){.grid-2{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}.closing-grid{grid-template-columns:repeat(2,1fr)}.payment-summary{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.history-filters{grid-template-columns:1fr 1fr}.history-row{grid-template-columns:1fr 100px}.history-row .receipt-link{justify-self:start}}
    @media(max-width:640px){.head{align-items:flex-start;flex-direction:column}.kpis{grid-template-columns:1fr}.cart-row{grid-template-columns:1fr 62px 88px}.line-total{grid-column:1/3;text-align:left}.remove-btn{grid-column:3}.service-add{grid-template-columns:1fr}.service-add button{height:44px}.receipt-meta{grid-template-columns:1fr}.receipt-item{grid-template-columns:1fr 36px 58px 64px}.drawer-actions{grid-template-columns:1fr}.totals-grid,.closing-grid,.payment-summary{grid-template-columns:1fr}.panel-actions{justify-content:stretch}.panel-actions button{flex:1}}
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
  closingPaymentMethods: any[] = [
    { id: 'CASH', name: 'Cash' },
    { id: 'CARD', name: 'Card' },
    { id: 'UPI', name: 'UPI' },
    { id: 'WALLET', name: 'Wallet' },
  ];

  loading = true;
  error = '';

  cart: any[] = [];
  selectedServiceId = '';
  checkoutForm: any = { clientId: '', paymentMethod: 'CASH', discountAmount: 0, taxRate: 0 };
  checkoutBusy = false;
  checkoutSuccess = false;
  checkoutError = '';

  salesHistory: any[] = [];
  salesLoading = false;
  salesError = '';
  salesFilters: any = { from: '', to: '', status: '', paymentMethod: '' };

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

  discountAmount(): number {
    const discount = Number(this.checkoutForm.discountAmount) || 0;
    return Math.max(0, Math.min(discount, this.cartTotal()));
  }

  taxableAmount(): number {
    return Math.max(0, this.cartTotal() - this.discountAmount());
  }

  taxAmount(): number {
    const rate = Number(this.checkoutForm.taxRate) || 0;
    return this.taxableAmount() * Math.max(0, rate) / 100;
  }

  grandTotal(): number {
    return this.taxableAmount() + this.taxAmount();
  }

  loadSalesHistory() {
    this.salesLoading = true;
    this.salesError = '';

    const query: any = {};
    if (this.salesFilters.from) query.from = this.salesFilters.from;
    if (this.salesFilters.to) query.to = this.salesFilters.to;
    if (this.salesFilters.status) query.status = this.salesFilters.status;

    this.api.getSales(query).subscribe({
      next: (sales) => {
        const payment = this.salesFilters.paymentMethod;
        this.salesHistory = payment ? (sales || []).filter((sale: any) => sale.paymentMethod === payment) : (sales || []);
        this.salesLoading = false;
      },
      error: (err) => {
        this.salesError = err?.error?.message || 'Sales history could not be loaded.';
        this.salesLoading = false;
      },
    });
  }

  clearSalesFilters() {
    this.salesFilters = { from: '', to: '', status: '', paymentMethod: '' };
    this.loadSalesHistory();
  }

  closingSummary(): any {
    const paymentTotals: Record<string, number> = { CASH: 0, CARD: 0, UPI: 0, WALLET: 0 };
    const summary = {
      completedAmount: 0,
      refundedAmount: 0,
      netSales: 0,
      completedCount: 0,
      refundedCount: 0,
      paymentTotals,
    };

    for (const sale of this.salesHistory || []) {
      const amount = Number(sale.totalAmount) || 0;
      const status = String(sale.status || '').toUpperCase();

      if (status === 'COMPLETED') {
        summary.completedAmount += amount;
        summary.completedCount += 1;

        const paymentMethod = String(sale.paymentMethod || 'CASH').toUpperCase();
        if (paymentMethod in paymentTotals) paymentTotals[paymentMethod] += amount;
      }

      if (status === 'REFUNDED') {
        summary.refundedAmount += amount;
        summary.refundedCount += 1;
      }
    }

    summary.netSales = summary.completedAmount - summary.refundedAmount;
    return summary;
  }

  paymentTotal(summary: any, method: string): number {
    return Number(summary?.paymentTotals?.[method]) || 0;
  }

  exportSalesCsv() {
    if (!this.salesHistory.length) return;

    const rows = [
      ['Sale ID', 'Date', 'Client name', 'Payment method', 'Status', 'Total amount', 'Item names'],
      ...this.salesHistory.map((sale) => [
        sale.id,
        this.formatCsvDate(sale.createdAt),
        sale.client?.fullName || 'Walk-in',
        sale.paymentMethod || 'CASH',
        sale.status || '',
        (Number(sale.totalAmount) || 0).toFixed(2),
        this.saleItemNames(sale),
      ]),
    ];

    const csv = rows.map((row) => row.map((value) => this.csvValue(value)).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `pos-sales-${this.fileDate(new Date())}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private saleItemNames(sale: any): string {
    return (sale.items || [])
      .map((item: any) => String(item.name || '').trim())
      .filter(Boolean)
      .join(', ');
  }

  private csvValue(value: any): string {
    const text = value === null || value === undefined ? '' : String(value);
    const escaped = text.replace(/"/g, '""');
    return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  private formatCsvDate(value: any): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '');
    return `${this.fileDate(date)} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private fileDate(date: Date): string {
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
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

    const discount = this.discountAmount();
    const tax = this.taxAmount();

    if (discount > 0) {
      items.push({ serviceId: null, name: 'Discount', quantity: 1, unitPrice: -discount });
    }

    if (tax > 0) {
      items.push({ serviceId: null, name: 'Tax', quantity: 1, unitPrice: tax });
    }

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
        this.checkoutForm = { clientId: '', paymentMethod: 'CASH', discountAmount: 0, taxRate: 0 };
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

