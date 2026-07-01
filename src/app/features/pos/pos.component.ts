import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PosService } from './pos.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryProduct } from '../inventory/inventory.models';
import { StaffService } from '../staff/staff.service';
import { Staff } from '../staff/staff.models';

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
              <label class="client-picker">
                <span>Client</span>
                <input class="search-input" [(ngModel)]="clientSearch" placeholder="Search loaded clients...">
                <select [(ngModel)]="checkoutForm.clientId">
                  <option value="">Walk-in customer</option>
                  <option *ngFor="let client of filteredClients()" [value]="client.id">{{ client.fullName }}</option>
                </select>
                <small class="picker-count" *ngIf="clientSearch">Showing {{ filteredClients().length }} of {{ clients.length }} clients</small>
              </label>

              <label class="staff-picker">
                <span>Staff / Cashier</span>
                <input class="search-input" [(ngModel)]="staffSearch" placeholder="Search active staff...">
                <select [(ngModel)]="checkoutForm.staffId" [disabled]="staffLoading || staffMembers.length === 0">
                  <option value="">No staff selected</option>
                  <option *ngFor="let staff of filteredStaff()" [value]="staff.id">{{ staff.fullName }} - {{ staff.role }}</option>
                </select>
                <small class="picker-count" *ngIf="!staffLoading && staffMembers.length > 0">{{ filteredStaff().length }} active staff available</small>
                <small class="product-hint" *ngIf="!staffLoading && staffMembers.length === 0">No active staff available for POS selection.</small>
              </label>

              <div class="checkout-error" *ngIf="staffError">{{ staffError }}</div>

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

              <label class="product-picker">
                <span>Add product</span>
                <div class="picker-tools" *ngIf="products.length > 0">
                  <input class="search-input" [(ngModel)]="productSearch" (keydown.enter)="addExactProductFromSearch($event)" placeholder="Search or scan SKU/barcode...">
                  <small class="picker-count">{{ filteredProducts().length }} of {{ products.length }} active products</small>
                </div>
                <div class="service-add">
                  <select [(ngModel)]="selectedProductId" [disabled]="productsLoading || filteredProducts().length === 0">
                    <option value="">{{ productsLoading ? 'Loading products...' : 'Choose product' }}</option>
                    <option *ngFor="let product of filteredProducts()" [value]="product.id">
                      {{ product.name }} - {{ product.price | currency:'USD':'symbol':'1.0-0' }}{{ productStockLabel(product) }}
                    </option>
                  </select>
                  <button type="button" (click)="addSelectedProduct()" [disabled]="!selectedProductId">Add</button>
                </div>
                <div class="product-flags" *ngIf="!productsLoading && products.length > 0">
                  <small class="product-hint">Products are added as POS line items. Stock is not deducted automatically yet.</small>
                  <span class="stock-chip" *ngIf="lowStockProducts().length > 0">{{ lowStockProducts().length }} low stock</span>
                </div>
                <div class="empty product-empty" *ngIf="!productsLoading && products.length === 0">
                  <p>No active products available. Add or activate products in Inventory to sell retail items here.</p>
                </div>
                <div class="empty product-empty" *ngIf="!productsLoading && products.length > 0 && filteredProducts().length === 0">
                  <p>No products match the current search.</p>
                </div>
              </label>

              <div class="checkout-error" *ngIf="productsError">{{ productsError }}</div>

              <div class="cart-box">
                <div class="cart-head">
                  <strong>Cart</strong>
                  <div class="cart-actions">
                    <button type="button" class="add-btn" (click)="addCartItem()">+ Manual item</button>
                    <button type="button" class="ghost-btn" (click)="holdSale()" [disabled]="cart.length === 0">Hold Sale</button>
                    <button type="button" class="ghost-btn" (click)="restoreHeldSale()" [disabled]="!heldSaleExists">Restore Held</button>
                    <button type="button" class="ghost-btn" (click)="clearHeldSale()" [disabled]="!heldSaleExists">Clear Held</button>
                    <button type="button" class="danger-outline" (click)="clearCart()" [disabled]="cart.length === 0">Clear Cart</button>
                  </div>
                </div>

                <div class="empty" *ngIf="cart.length === 0">
                  <p>No items added yet. Add a service, product, manual item, or restore a held sale.</p>
                </div>

                <div class="cart-items" *ngIf="cart.length > 0">
                  <div class="cart-row" *ngFor="let item of cart; let i = index">
                    <input [(ngModel)]="item.name" placeholder="Item name" class="item-name">
                    <div class="qty-control">
                      <button type="button" (click)="decreaseQuantity(item)">-</button>
                      <input [ngModel]="item.quantity" (ngModelChange)="setCartQuantity(item, $event)" type="number" min="1" placeholder="Qty" class="qty">
                      <button type="button" (click)="increaseQuantity(item)">+</button>
                    </div>
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

              <div class="split-box">
                <div class="split-head">
                  <strong>Split payment draft</strong>
                  <span>{{ splitPaymentTotal() | currency:'USD':'symbol':'1.0-0' }} / {{ grandTotal() | currency:'USD':'symbol':'1.0-0' }}</span>
                </div>
                <div class="split-grid">
                  <label><span>Cash</span><input [(ngModel)]="splitPayments.cash" type="number" min="0" step="0.01" placeholder="0"></label>
                  <label><span>Card</span><input [(ngModel)]="splitPayments.card" type="number" min="0" step="0.01" placeholder="0"></label>
                  <label><span>UPI</span><input [(ngModel)]="splitPayments.upi" type="number" min="0" step="0.01" placeholder="0"></label>
                  <label><span>Wallet</span><input [(ngModel)]="splitPayments.wallet" type="number" min="0" step="0.01" placeholder="0"></label>
                </div>
                <small class="product-hint">Split payment record is UI-only until backend payment split is enabled. Checkout still submits the primary payment method.</small>
                <div class="split-warning" *ngIf="hasSplitPayment() && !splitPaymentMatchesTotal()">
                  Split total must equal the current grand total before checkout.
                </div>
              </div>

              <div class="wallet-hook" *ngIf="checkoutForm.paymentMethod === 'WALLET' || splitAmount('wallet') > 0">
                <strong>Wallet payment hook</strong>
                <span>Wallet debit API exists, but POS wallet deduction is disabled until checkout and wallet debit can run transactionally together.</span>
                <button type="button" disabled>Wallet debit coming soon</button>
              </div>

              <label>
                <span>Checkout note</span>
                <textarea [(ngModel)]="checkoutNote" placeholder="UI-only note for held sale handoff"></textarea>
                <small class="product-hint">Notes are kept with held sales in this browser only until POS sale note persistence is enabled.</small>
              </label>

              <div class="checkout-error" *ngIf="checkoutError">{{ checkoutError }}</div>
              <div class="success-msg" *ngIf="checkoutSuccess">Checkout completed successfully!</div>

              <button class="checkout-btn" (click)="doCheckout()" [disabled]="!canCheckout()">
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
                <span class="sale-method">{{ paymentLabel(sale) }}</span>
                <span class="sale-method" *ngIf="paymentStatus(sale) && paymentStatus(sale) !== sale.status">{{ paymentStatus(sale) }}</span>
                <span class="sale-method" *ngIf="staffLabel(sale)">{{ staffLabel(sale) }}</span>
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
              <span class="history-meta">{{ salesHistory.length }} loaded - {{ salesFilterLabel() }}</span>
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
            <span>Loading sales history...</span>
          </div>

          <div class="checkout-error" *ngIf="salesError">{{ salesError }}</div>

          <div class="empty" *ngIf="!salesLoading && salesHistory.length === 0">
            <p>No sales found for {{ salesFilterLabel() }}.</p>
          </div>

          <div class="history-list" *ngIf="!salesLoading && salesHistory.length > 0">
            <div class="history-row" *ngFor="let sale of salesHistory">
              <div>
                <strong>{{ sale.client?.fullName || 'Walk-in' }}</strong>
                <span>{{ sale.createdAt | date:'MMM dd, yyyy h:mm a' }}</span>
              </div>
              <div>
                <b>{{ sale.totalAmount | currency:'USD':'symbol':'1.0-0' }}</b>
                <small>{{ paymentLabel(sale) }}</small>
                <small *ngIf="paymentStatus(sale) && paymentStatus(sale) !== sale.status">{{ paymentStatus(sale) }}</small>
                <small *ngIf="staffLabel(sale)">{{ staffLabel(sale) }}</small>
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
              <p>{{ receiptNumber(selectedSale) }}</p>
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
              <span>Receipt #{{ receiptNumber(selectedSale) }}</span>
            </div>

            <div class="receipt-meta">
              <div><span>Receipt #</span><strong>{{ receiptNumber(selectedSale) }}</strong></div>
              <div><span>Client</span><strong>{{ selectedSale.client?.fullName || 'Walk-in' }}</strong></div>
              <div><span>Date</span><strong>{{ selectedSale.createdAt | date:'MMM dd, yyyy h:mm a' }}</strong></div>
              <div><span>Payment</span><strong>{{ paymentLabel(selectedSale) }}</strong></div>
              <div *ngIf="paymentStatus(selectedSale)"><span>Payment status</span><strong>{{ paymentStatus(selectedSale) }}</strong></div>
              <div><span>Status</span><strong>{{ selectedSale.status }}</strong></div>
              <div><span>Items</span><strong>{{ receiptItemCount(selectedSale) }}</strong></div>
              <div *ngIf="staffLabel(selectedSale)"><span>Cashier</span><strong>{{ staffLabel(selectedSale) }}</strong></div>
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

          <p class="refund-note" *ngIf="selectedSale.status === 'REFUNDED'">This sale has already been refunded.</p>

          <div class="drawer-actions">
            <button class="print-btn" (click)="printReceipt()">Print Receipt</button>
            <button class="refund-btn" (click)="refundSale()" [disabled]="selectedSale.status === 'REFUNDED' || refundBusy">
              {{ refundBusy ? 'Refunding...' : selectedSale.status === 'REFUNDED' ? 'Already Refunded' : 'Refund Sale' }}
            </button>
            <button class="return-btn" type="button" disabled title="Return and exchange workflow requires a backend returns endpoint.">Return / Exchange Soon</button>
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
    .history-meta{display:block;margin-top:4px;color:#6b7280;font-size:12px;font-weight:700}
    .checkout-form{display:grid;gap:14px}
    label{display:grid;gap:7px}
    label span{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
    input,select{padding:13px 14px;border:1px solid #e5e7eb;border-radius:14px;background:white;min-width:0}
    .service-add{display:grid;grid-template-columns:1fr auto;gap:10px}
    .service-add button{border:0;border-radius:14px;padding:0 18px;background:#0b0b0b;color:white;font-weight:900;cursor:pointer}
    .service-add button:disabled{opacity:.45}
    .search-input{height:auto;padding:11px 12px;border-radius:12px;font-size:13px}
    .picker-tools{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
    .picker-count{font-size:12px;color:#6b7280;font-weight:700;white-space:nowrap}
    .product-flags{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .product-hint{font-size:12px;color:#6b7280;line-height:1.4}
    .stock-chip{display:inline-flex;align-items:center;border-radius:999px;background:#fef2f2;color:#991b1b;padding:4px 9px;font-size:11px;font-weight:900}
    .product-empty{padding:14px;text-align:left;border-radius:14px}
    .product-empty p{margin:0;font-size:13px}
    .cart-box{border:1px solid #eef2f7;border-radius:18px;padding:14px;background:#fbfdff}
    .cart-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
    .cart-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .cart-items{display:grid;gap:8px}
    .cart-row{display:grid;grid-template-columns:1fr 122px 100px 90px 34px;gap:8px;align-items:center}
    .cart-row input{padding:10px;border-radius:10px}
    .qty-control{display:grid;grid-template-columns:32px 1fr 32px;gap:5px;align-items:center}
    .qty-control button{border:1px solid #e5e7eb;background:white;border-radius:9px;height:34px;font-weight:900;cursor:pointer}
    .qty-control input{text-align:center;padding:8px 4px}
    .line-total{text-align:right;font-size:13px}
    .remove-btn{border:0;background:#fee2e2;color:#991b1b;border-radius:8px;width:32px;height:32px;font-weight:900;cursor:pointer}
    .add-btn,.ghost-btn,.danger-outline{border:1px dashed #d1d5db;border-radius:12px;padding:9px 12px;background:white;cursor:pointer;font-weight:800}
    .ghost-btn{border-style:solid;color:#374151}
    .danger-outline{border-style:solid;border-color:#fecaca;color:#991b1b;background:#fff7f7}
    .ghost-btn:disabled,.danger-outline:disabled{opacity:.45;cursor:not-allowed}
    .totals-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .summary-box{display:grid;gap:8px;background:#0b0b0b;color:white;border-radius:18px;padding:16px}
    .summary-box div{display:flex;justify-content:space-between;align-items:center}
    .summary-box span{color:#d1d5db;font-size:13px}
    .summary-box .grand{border-top:1px solid rgba(255,255,255,.16);padding-top:10px;margin-top:4px}
    .summary-box .grand strong{font-size:22px}
    .split-box,.wallet-hook{display:grid;gap:10px;background:#fbfdff;border:1px solid #eef2f7;border-radius:16px;padding:14px}
    .split-head{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13px}
    .split-head span{font-weight:900;color:#374151}
    .split-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .split-warning{padding:10px;border-radius:12px;background:#fef2f2;color:#991b1b;font-size:12px;font-weight:800}
    .wallet-hook strong{font-size:13px}.wallet-hook span{font-size:12px;color:#6b7280}.wallet-hook button{border:0;border-radius:12px;padding:10px;background:#e5e7eb;color:#6b7280;font-weight:900;cursor:not-allowed}
    textarea{padding:13px 14px;border:1px solid #e5e7eb;border-radius:14px;background:white;min-width:0;min-height:82px;font:inherit}
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
    .receipt-items{display:grid;gap:10px}
    .receipt-item{display:grid;grid-template-columns:1fr 42px 70px 75px;gap:8px;align-items:center;font-size:13px}
    .head-row{font-weight:900;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:8px}
    .receipt-total{display:flex;justify-content:space-between;align-items:center;border-top:1px dashed #d1d5db;margin-top:16px;padding-top:16px}
    .receipt-total span{font-weight:900}.receipt-total strong{font-size:26px}
    .thankyou{text-align:center;font-size:12px}
    .refund-note{margin:0;padding:12px;border-radius:12px;background:#fef2f2;color:#991b1b;font-size:12px;font-weight:800;text-align:center}
    .drawer-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
    .print-btn,.refund-btn,.return-btn{border:0;border-radius:14px;padding:13px;font-weight:900;cursor:pointer}
    .print-btn{background:#0b0b0b;color:white}.refund-btn{background:#fee2e2;color:#991b1b}.return-btn{background:#e5e7eb;color:#6b7280;cursor:not-allowed}
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
      .refund-note,
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
    @media(max-width:1050px){.grid-2{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}.closing-grid{grid-template-columns:repeat(2,1fr)}.payment-summary{grid-template-columns:repeat(2,1fr)}.split-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.history-filters{grid-template-columns:1fr 1fr}.history-row{grid-template-columns:1fr 100px}.history-row .receipt-link{justify-self:start}.cart-head{flex-direction:column}.cart-actions{justify-content:flex-start}.picker-tools{grid-template-columns:1fr}}
    @media(max-width:640px){.head{align-items:flex-start;flex-direction:column}.kpis{grid-template-columns:1fr}.cart-row{grid-template-columns:1fr 1fr 34px}.cart-row .item-name{grid-column:1/4}.qty-control{grid-column:1}.price{grid-column:2}.line-total{grid-column:1/3;text-align:left}.remove-btn{grid-column:3;grid-row:2/4}.cart-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}.cart-actions button{min-height:40px}.service-add{grid-template-columns:1fr}.service-add button{height:44px}.receipt-drawer{width:100vw;padding:16px}.receipt-meta{grid-template-columns:1fr}.receipt-item{grid-template-columns:1fr 36px 58px 64px}.drawer-actions{grid-template-columns:1fr}.history-filters,.history-row{grid-template-columns:1fr}.history-row b,.history-row small{text-align:left}.totals-grid,.closing-grid,.payment-summary,.split-grid{grid-template-columns:1fr}.split-head{align-items:flex-start;flex-direction:column}.panel-actions{justify-content:stretch}.panel-actions button{flex:1}}
  `]
})
export class PosComponent {
  private api = inject(PosService);
  private clientsApi = inject(ClientsService);
  private servicesApi = inject(ServicesService);
  private inventoryApi = inject(InventoryService);
  private staffApi = inject(StaffService);

  dashboard: any = null;
  clients: any[] = [];
  services: any[] = [];
  products: InventoryProduct[] = [];
  staffMembers: Staff[] = [];
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
  selectedProductId = '';
  clientSearch = '';
  staffSearch = '';
  productSearch = '';
  checkoutForm: any = this.defaultCheckoutForm();
  checkoutBusy = false;
  checkoutSuccess = false;
  checkoutError = '';
  productsLoading = false;
  productsError = '';
  staffLoading = false;
  staffError = '';
  heldSaleExists = false;
  splitPayments: any = { cash: 0, card: 0, upi: 0, wallet: 0 };
  checkoutNote = '';

  salesHistory: any[] = [];
  salesLoading = false;
  salesError = '';
  salesFilters: any = { from: '', to: '', status: '', paymentMethod: '' };

  selectedSale: any = null;
  saleDetailLoading = false;
  saleDetailError = '';
  refundBusy = false;
  private readonly heldSaleKey = 'ambition-pos-held-sale';

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (event.defaultPrevented) return;

    if (event.key === 'Escape' && this.selectedSale) {
      event.preventDefault();
      this.closeReceipt();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && this.canCheckout()) {
      event.preventDefault();
      this.doCheckout();
    }
  }

  ngOnInit() {
    this.refreshHeldSaleState();
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

    this.loadStaff();
    this.loadProducts();

    this.api.getPaymentMethods().subscribe({
      next: (methods) => { this.paymentMethods = methods?.length ? methods : this.paymentMethods; },
      error: () => {},
    });
  }

  private defaultCheckoutForm(): any {
    return { clientId: '', staffId: '', paymentMethod: 'CASH', discountAmount: 0, taxRate: 0 };
  }

  loadStaff() {
    this.staffLoading = true;
    this.staffError = '';

    this.staffApi.getAll({ isActive: true }).subscribe({
      next: (staff) => {
        this.staffMembers = staff || [];
        this.staffLoading = false;
      },
      error: () => {
        this.staffMembers = [];
        this.staffError = 'Staff could not be loaded for POS.';
        this.staffLoading = false;
      },
    });
  }

  loadProducts() {
    this.productsLoading = true;
    this.productsError = '';

    this.inventoryApi.getAll({ isActive: true }).subscribe({
      next: (products) => {
        this.products = products || [];
        this.productsLoading = false;
      },
      error: () => {
        this.products = [];
        this.productsError = 'Products could not be loaded for POS.';
        this.productsLoading = false;
      },
    });
  }

  filteredClients(): any[] {
    const term = this.clientSearch.trim().toLowerCase();
    if (!term) return this.clients;
    return this.clients.filter((client) => String(client.fullName || '').toLowerCase().includes(term));
  }

  filteredStaff(): Staff[] {
    const term = this.staffSearch.trim().toLowerCase();
    if (!term) return this.staffMembers;
    return this.staffMembers.filter((staff) => [staff.fullName, staff.email, staff.role]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }

  filteredProducts(): InventoryProduct[] {
    const term = this.productSearch.trim().toLowerCase();
    if (!term) return this.products;
    return this.products.filter((product) => [product.name, product.sku, product.category, (product as any).barcode]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }

  lowStockProducts(): InventoryProduct[] {
    return this.products.filter((product) => Number(product.quantity) <= Number(product.minStockLevel));
  }

  productStockLabel(product: InventoryProduct): string {
    if (product.quantity === undefined || product.quantity === null) return '';
    const stock = ` - ${product.quantity} ${product.unit || 'in stock'}`;
    return Number(product.quantity) <= Number(product.minStockLevel) ? `${stock} - LOW` : stock;
  }

  addExactProductFromSearch(event: Event) {
    event.preventDefault();
    const term = this.productSearch.trim().toLowerCase();
    if (!term) return;

    const exactMatches = this.products.filter((product) => [product.sku, (product as any).barcode, product.name]
      .some((value) => String(value || '').toLowerCase() === term));

    if (exactMatches.length === 1) {
      this.selectedProductId = exactMatches[0].id;
      this.addSelectedProduct();
      this.productSearch = '';
    }
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

  addSelectedProduct() {
    const product = this.products.find((item) => item.id === this.selectedProductId);
    if (!product) return;

    // TODO: Deduct stock only after POS sale items support inventory-linked product sales transactionally.
    this.cart.push({
      serviceId: null,
      productId: product.id,
      name: product.sku ? `${product.name} (SKU: ${product.sku})` : product.name,
      quantity: 1,
      unitPrice: Number(product.price) || 0,
    });

    this.selectedProductId = '';
  }

  addCartItem() {
    this.cart.push({ serviceId: null, name: '', quantity: 1, unitPrice: 0 });
  }

  removeCartItem(i: number) {
    this.cart.splice(i, 1);
  }

  increaseQuantity(item: any) {
    item.quantity = this.safeQuantity(item.quantity) + 1;
  }

  decreaseQuantity(item: any) {
    item.quantity = Math.max(1, this.safeQuantity(item.quantity) - 1);
  }

  setCartQuantity(item: any, value: any) {
    item.quantity = this.safeQuantity(value);
  }

  clearCart() {
    if (this.cart.length === 0) return;
    if (!confirm('Clear all cart items? Client and payment method will stay selected.')) return;
    this.cart = [];
    this.selectedServiceId = '';
    this.selectedProductId = '';
    this.checkoutForm.discountAmount = 0;
    this.checkoutForm.taxRate = 0;
  }

  holdSale() {
    if (this.cart.length === 0) return;
    if (!confirm('Hold this sale and clear the checkout? Client, payment, discount, and tax will be saved.')) return;

    try {
      const heldSale = {
        cart: this.cart.map((item) => ({ ...item, quantity: this.safeQuantity(item.quantity) })),
        checkoutForm: { ...this.checkoutForm },
        splitPayments: { ...this.splitPayments },
        checkoutNote: this.checkoutNote,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.heldSaleKey, JSON.stringify(heldSale));
      this.heldSaleExists = true;
      this.cart = [];
      this.selectedServiceId = '';
      this.selectedProductId = '';
      this.checkoutForm = this.defaultCheckoutForm();
      this.splitPayments = { cash: 0, card: 0, upi: 0, wallet: 0 };
      this.checkoutNote = '';
    } catch {
      this.checkoutError = 'Held sale could not be saved in this browser.';
    }
  }

  restoreHeldSale() {
    const raw = localStorage.getItem(this.heldSaleKey);
    if (!raw) {
      this.refreshHeldSaleState();
      return;
    }

    if (this.cart.length > 0 && !confirm('Replace the current cart with the held sale?')) return;

    try {
      const heldSale = JSON.parse(raw);
      this.cart = (heldSale.cart || []).map((item: any) => ({ ...item, quantity: this.safeQuantity(item.quantity) }));
      this.checkoutForm = { ...this.defaultCheckoutForm(), ...(heldSale.checkoutForm || {}) };
      this.splitPayments = { cash: 0, card: 0, upi: 0, wallet: 0, ...(heldSale.splitPayments || {}) };
      this.checkoutNote = heldSale.checkoutNote || '';
      this.selectedServiceId = '';
      this.selectedProductId = '';
    } catch {
      this.checkoutError = 'Held sale could not be restored.';
    }
  }

  clearHeldSale() {
    if (!this.heldSaleExists) return;
    if (!confirm('Clear the held sale from this browser?')) return;
    localStorage.removeItem(this.heldSaleKey);
    this.refreshHeldSaleState();
  }

  private refreshHeldSaleState() {
    this.heldSaleExists = !!localStorage.getItem(this.heldSaleKey);
  }

  private safeQuantity(value: any): number {
    const quantity = Math.floor(Number(value));
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  }

  splitAmount(method: string): number {
    return Math.max(0, Number(this.splitPayments?.[method]) || 0);
  }

  splitPaymentTotal(): number {
    return this.splitAmount('cash') + this.splitAmount('card') + this.splitAmount('upi') + this.splitAmount('wallet');
  }

  hasSplitPayment(): boolean {
    return this.splitPaymentTotal() > 0;
  }

  splitPaymentMatchesTotal(): boolean {
    if (!this.hasSplitPayment()) return true;
    return Math.abs(this.splitPaymentTotal() - this.grandTotal()) < 0.01;
  }

  lineTotal(item: any): number {
    return this.safeQuantity(item.quantity) * (Number(item.unitPrice) || 0);
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
        this.salesHistory = payment ? (sales || []).filter((sale: any) => this.paymentLabel(sale).toUpperCase() === payment) : (sales || []);
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

  salesFilterLabel(): string {
    const parts: string[] = [];
    if (this.salesFilters.from || this.salesFilters.to) {
      parts.push(`${this.salesFilters.from || 'start'} to ${this.salesFilters.to || 'today'}`);
    }
    if (this.salesFilters.status) parts.push(this.salesFilters.status.toLowerCase());
    if (this.salesFilters.paymentMethod) parts.push(this.salesFilters.paymentMethod);
    return parts.length ? parts.join(' - ') : 'all loaded sales';
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

        const paymentMethod = this.paymentLabel(sale).toUpperCase();
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

    const summary = this.closingSummary();
    const rows: any[][] = [
      ['Sale ID', 'Receipt number', 'Date', 'Client name', 'Payment method', 'Payment status', 'Staff/cashier', 'Status', 'Total amount', 'Item names'],
      ...this.salesHistory.map((sale) => [
        sale.id,
        this.receiptNumber(sale),
        this.formatCsvDate(sale.createdAt),
        sale.client?.fullName || 'Walk-in',
        this.paymentLabel(sale),
        this.paymentStatus(sale),
        this.staffLabel(sale),
        sale.status || '',
        (Number(sale.totalAmount) || 0).toFixed(2),
        this.saleItemNames(sale),
      ]),
      [],
      ['', '', '', '', '', '', '', 'Completed total', summary.completedAmount.toFixed(2), ''],
      ['', '', '', '', '', '', '', 'Refunded total', summary.refundedAmount.toFixed(2), ''],
      ['', '', '', '', '', '', '', 'Net sales', summary.netSales.toFixed(2), ''],
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

  receiptNumber(sale: any): string {
    const receiptNo = sale?.receipt?.receiptNumber || sale?.receiptNumber;
    if (receiptNo) return String(receiptNo);

    const id = String(sale?.id || '');
    return id ? id.slice(-8).toUpperCase() : 'PENDING';
  }

  paymentLabel(sale: any): string {
    return String(sale?.payment?.method || sale?.paymentMethod || 'CASH').toUpperCase();
  }

  paymentStatus(sale: any): string {
    const status = sale?.payment?.status || sale?.paymentStatus || '';
    return status ? String(status).toUpperCase() : '';
  }
  staffLabel(sale: any): string {
    if (sale?.staff?.fullName) return sale.staff.fullName;
    const staffId = sale?.staffId || (sale?.id === this.selectedSale?.id ? this.selectedSale?.staffId : '');
    if (!staffId) return '';
    return this.staffMembers.find((staff) => staff.id === staffId)?.fullName || '';
  }

  receiptItemCount(sale: any): number {
    return (sale?.items || [])
      .filter((item: any) => !['discount', 'tax'].includes(String(item.name || '').trim().toLowerCase()))
      .reduce((sum: number, item: any) => sum + this.safeQuantity(item.quantity), 0);
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
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(this.selectedSale.totalAmount) || 0);
    if (!confirm(`Refund sale ${this.selectedSale.id} for ${amount}? This will mark the sale as refunded.`)) return;

    this.refundBusy = true;
    this.saleDetailError = '';

    this.api.refund(this.selectedSale.id, {}).subscribe({
      next: (sale) => {
        this.selectedSale = sale;
        this.refundBusy = false;
        this.load();
        this.loadSalesHistory();
      },
      error: (err) => {
        this.refundBusy = false;
        this.saleDetailError = err?.error?.message || 'Refund failed. Please try again.';
      },
    });
  }

  canCheckout(): boolean {
    return this.cart.length > 0 && !this.checkoutBusy && this.splitPaymentMatchesTotal();
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
      productId: item.productId || null,
      name: String(item.name || 'Item').trim(),
      quantity: this.safeQuantity(item.quantity),
      unitPrice: Number(item.unitPrice) || 0,
    }));

    const discount = this.discountAmount();
    const tax = this.taxAmount();

    if (discount > 0) {
      items.push({ serviceId: null, productId: null, name: 'Discount', quantity: 1, unitPrice: -discount });
    }

    if (tax > 0) {
      items.push({ serviceId: null, productId: null, name: 'Tax', quantity: 1, unitPrice: tax });
    }

    this.api.checkout({
      clientId: this.checkoutForm.clientId || null,
      items,
      staffId: this.checkoutForm.staffId || null,
      paymentMethod: this.checkoutForm.paymentMethod || 'CASH',
    }).subscribe({
      next: (sale) => {
        this.checkoutBusy = false;
        this.checkoutSuccess = true;
        this.cart = [];
        this.selectedServiceId = '';
        this.selectedProductId = '';
        this.checkoutForm = this.defaultCheckoutForm();
        this.splitPayments = { cash: 0, card: 0, upi: 0, wallet: 0 };
        this.checkoutNote = '';
        this.load();
        this.loadSalesHistory();
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

