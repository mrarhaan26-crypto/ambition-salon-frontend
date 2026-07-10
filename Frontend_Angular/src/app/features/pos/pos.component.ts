import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PosService } from './pos.service';
import { PosStore } from './pos-store.service';
import { PosLeftPanelComponent } from './pos-left-panel.component';
import { PosCartPanelComponent } from './pos-cart-panel.component';
import { PosPaymentPanelComponent } from './pos-payment-panel.component';
import { ServicesService } from '../services/services.service';
import { InventoryService } from '../inventory/inventory.service';
import { StaffService } from '../staff/staff.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, PosLeftPanelComponent, PosCartPanelComponent, PosPaymentPanelComponent],
  template: `
    <div class="pos-enterprise">
      <header class="pos-topbar">
        <div class="topbar-left">
          <h1>Enterprise POS</h1>
          <div class="topbar-stats">
            <span class="stat">Sales: {{ dashboard().summary?.totalSales || 0 }}</span>
            <span class="stat">Revenue: {{ (dashboard().summary?.completedRevenue || 0) | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
        </div>
        <div class="topbar-right">
          <div class="topbar-search">
            <input [(ngModel)]="globalSearch" (keydown.enter)="handleGlobalSearch()" placeholder="Search sale / scan barcode..." class="global-search-input">
          </div>
          <button class="topbar-btn" (click)="loadDashboard()" title="Refresh">&#8635;</button>
          <button class="topbar-btn" (click)="toggleCashDrawer()" title="Cash Drawer">&#128184;</button>
          <button class="topbar-btn" (click)="toggleReports()" title="Reports">&#128202;</button>
          <button class="topbar-btn" (click)="toggleHistory()">{{ showHistory() ? 'Close' : 'History' }}</button>
          <span class="shift-badge">{{ shiftLabel() }}</span>
        </div>
      </header>

      <div class="pos-loading" *ngIf="store.loading()">
        <div class="spinner"></div>
        <span>Loading POS...</span>
      </div>

      <div class="pos-error" *ngIf="store.error() && !store.loading()">
        <strong>Failed to load POS data.</strong>
        <p>{{ store.error() }}</p>
        <button (click)="loadDashboard()">Retry</button>
      </div>

      <div class="pos-body" *ngIf="!store.loading() && !store.error()">
        <aside class="pos-left">
          <app-pos-left-panel></app-pos-left-panel>
        </aside>
        <main class="pos-center">
          <app-pos-cart-panel></app-pos-cart-panel>
        </main>
        <aside class="pos-right">
          <app-pos-payment-panel (onCheckout)="doCheckout()"></app-pos-payment-panel>
        </aside>
      </div>

      <div class="receipt-overlay" *ngIf="selectedSale()" (click)="closeReceipt()"></div>
      <aside class="receipt-drawer" *ngIf="selectedSale()">
        <div class="drawer-head">
          <div>
            <h2>Receipt</h2>
            <p>{{ receiptNumber(selectedSale()) }}</p>
          </div>
          <button class="icon-btn" (click)="closeReceipt()">x</button>
        </div>
        <div class="receipt-card" id="pos-receipt">
          <div class="receipt-brand">
            <h3>Ambition Unisex Salon</h3>
            <span>Receipt #{{ receiptNumber(selectedSale()) }}</span>
          </div>
          <div class="receipt-meta">
            <div><span>Receipt #</span><strong>{{ receiptNumber(selectedSale()) }}</strong></div>
            <div><span>Client</span><strong>{{ selectedSale()?.client?.fullName || 'Walk-in' }}</strong></div>
            <div><span>Date</span><strong>{{ (selectedSale()?.createdAt | date:'MMM dd, yyyy h:mm a') || '' }}</strong></div>
            <div><span>Payment</span><strong>{{ selectedSale()?.payment?.method || selectedSale()?.paymentMethod || 'CASH' }}</strong></div>
            <div><span>Status</span><strong>{{ selectedSale()?.status }}</strong></div>
            <div><span>Items</span><strong>{{ receiptItemCount(selectedSale()) }}</strong></div>
          </div>
          <div class="receipt-items">
            <div class="receipt-item head-row">
              <span>Item</span><span>Qty</span><span>Price</span><span>Total</span>
            </div>
            <div class="receipt-item" *ngFor="let item of (selectedSale()?.items || [])">
              <span>{{ item.name }}</span>
              <span>{{ item.quantity }}</span>
              <span>{{ (item.unitPrice || 0) | currency:'USD':'symbol':'1.2-2' }}</span>
              <strong>{{ (item.totalPrice || 0) | currency:'USD':'symbol':'1.2-2' }}</strong>
            </div>
          </div>
          <div class="receipt-total">
            <span>Total Paid</span>
            <strong>{{ (selectedSale()?.totalAmount || 0) | currency:'USD':'symbol':'1.2-2' }}</strong>
          </div>
          <p class="thankyou">Thank you for visiting.</p>
        </div>
        <div class="drawer-actions">
          <button class="print-btn" (click)="printReceipt()">Print Receipt</button>
          <button class="whatsapp-btn" (click)="shareWhatsApp()" *ngIf="selectedSale()?.client?.phone">WhatsApp</button>
          <button class="refund-btn" (click)="refundSale()" [disabled]="selectedSale()?.status === 'REFUNDED' || refundBusy()">
            {{ refundBusy() ? 'Refunding...' : selectedSale()?.status === 'REFUNDED' ? 'Already Refunded' : 'Refund Sale' }}
          </button>
        </div>
      </aside>

      <div class="history-overlay" *ngIf="showHistory()" (click)="toggleHistory()"></div>
      <aside class="history-drawer" *ngIf="showHistory()">
        <div class="drawer-head">
          <h2>Sales History</h2>
          <button class="icon-btn" (click)="toggleHistory()">x</button>
        </div>
        <div class="history-filters">
          <input type="date" [(ngModel)]="historyFilters.from" placeholder="From">
          <input type="date" [(ngModel)]="historyFilters.to" placeholder="To">
          <select [(ngModel)]="historyFilters.status">
            <option value="">All</option>
            <option value="COMPLETED">Completed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <button class="filter-btn" (click)="loadSalesHistory()">Apply</button>
        </div>
        <div class="history-list">
          <div class="history-item" *ngFor="let sale of store.salesHistory()" (click)="viewReceipt(sale)">
            <div class="history-info">
              <strong>{{ sale.client?.fullName || 'Walk-in' }}</strong>
              <span>{{ sale.createdAt | date:'MMM dd, h:mm a' }}</span>
            </div>
            <div class="history-right">
              <b>{{ (sale.totalAmount || 0) | currency:'USD':'symbol':'1.2-2' }}</b>
              <span class="sale-status" [class.refunded]="sale.status === 'REFUNDED'">{{ sale.status }}</span>
            </div>
          </div>
        </div>
      </aside>

      <div class="drawer-overlay" *ngIf="showCashDrawer()" (click)="toggleCashDrawer()"></div>
      <aside class="cash-drawer-panel" *ngIf="showCashDrawer()">
        <div class="drawer-head">
          <h2>Cash Drawer</h2>
          <button class="icon-btn" (click)="toggleCashDrawer()">x</button>
        </div>
        <div class="cash-drawer-status" *ngIf="cashDrawerSession()">
          <div class="status-badge open">SESSION OPEN</div>
          <div class="cd-field"><span>Opened At</span><strong>{{ cashDrawerSession()?.openedAt | date:'MMM dd, h:mm a' }}</strong></div>
          <div class="cd-field"><span>Opening Balance</span><strong>{{ cashDrawerSession()?.openingBalance | currency:'USD':'symbol':'1.2-2' }}</strong></div>
          <div class="cd-field"><span>Cash In</span><strong>{{ cashDrawerSession()?.cashIn | currency:'USD':'symbol':'1.2-2' }}</strong></div>
          <div class="cd-field"><span>Cash Out</span><strong>{{ cashDrawerSession()?.cashOut | currency:'USD':'symbol':'1.2-2' }}</strong></div>
          <div class="cd-actions">
            <input [(ngModel)]="cashMoveAmount" type="number" min="0" step="0.01" placeholder="Amount" class="cd-input">
            <button class="cd-btn in" (click)="cashIn()" [disabled]="!cashMoveAmount()">Cash In</button>
            <button class="cd-btn out" (click)="cashOut()" [disabled]="!cashMoveAmount()">Cash Out</button>
          </div>
          <button class="cd-btn close-session" (click)="closeCashDrawer()">Close Session</button>
        </div>
        <div class="cash-drawer-status" *ngIf="!cashDrawerSession()">
          <div class="status-badge closed">NO OPEN SESSION</div>
          <p class="cd-hint">Cash drawer backend API required. This UI is integration-ready and will display live data when the backend endpoint is available.</p>
          <div class="cd-open-form">
            <label>Opening Balance</label>
            <input [(ngModel)]="openingBalance" type="number" min="0" step="0.01" placeholder="0.00" class="cd-input">
            <button class="cd-btn open-session" (click)="openCashDrawer()" [disabled]="!openingBalance()">Open Register</button>
          </div>
        </div>
      </aside>

      <div class="reports-overlay" *ngIf="showReports()" (click)="toggleReports()"></div>
      <aside class="reports-panel" *ngIf="showReports()">
        <div class="drawer-head">
          <h2>Daily Summary</h2>
          <button class="icon-btn" (click)="toggleReports()">x</button>
        </div>
        <div class="report-summary">
          <div class="report-card green"><span>Completed</span><strong>{{ dailySummary().completedCount }}</strong><b>{{ dailySummary().completedAmount | currency:'USD':'symbol':'1.2-2' }}</b></div>
          <div class="report-card red"><span>Refunded</span><strong>{{ dailySummary().refundedCount }}</strong><b>{{ dailySummary().refundedAmount | currency:'USD':'symbol':'1.2-2' }}</b></div>
          <div class="report-card blue"><span>Net Sales</span><strong>-</strong><b>{{ dailySummary().netSales | currency:'USD':'symbol':'1.2-2' }}</b></div>
        </div>
        <h3 class="report-section-title">Payment Methods</h3>
        <div class="report-payments">
          <div class="pay-row" *ngFor="let pm of paymentMethodKeys">
            <span>{{ pm }}</span>
            <strong>{{ dailySummary().paymentTotals[pm] | currency:'USD':'symbol':'1.2-2' }}</strong>
          </div>
        </div>
        <div class="report-footer">
          <span>Cash Variance</span>
          <strong [class.neg]="dailySummary().cashDrawerVariance && dailySummary().cashDrawerVariance! < 0">
            {{ dailySummary().cashDrawerVariance !== null ? (dailySummary().cashDrawerVariance! | currency:'USD':'symbol':'1.2-2') : 'N/A' }}
          </strong>
        </div>
      </aside>

      <div class="success-toast" *ngIf="successMessage()">{{ successMessage() }}</div>
    </div>
  `,
  styles: [`
    .pos-enterprise{display:flex;flex-direction:column;height:calc(100vh - 64px);overflow:hidden;background:#f3f4f6}
    .pos-topbar{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:white;border-bottom:1px solid #e5e7eb;flex-shrink:0}
    .topbar-left{display:flex;align-items:center;gap:20px}
    .topbar-left h1{margin:0;font-size:22px}
    .topbar-stats{display:flex;gap:12px}
    .stat{font-size:12px;color:#6b7280;font-weight:700}
    .topbar-right{display:flex;align-items:center;gap:8px}
    .global-search-input{padding:8px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;width:200px}
    .topbar-btn{border:1px solid #e5e7eb;background:white;border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer;font-size:12px;white-space:nowrap}
    .shift-badge{background:#fef3c7;color:#92400e;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:800}
    .pos-loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .pos-error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;margin:24px;text-align:center}
    .pos-error strong{color:#991b1b}.pos-error p{color:#7f1d1d}
    .pos-error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .pos-body{display:grid;grid-template-columns:280px 1fr 340px;gap:0;flex:1;overflow:hidden;height:100%}
    .pos-left{background:#f9fafb;border-right:1px solid #e5e7eb;overflow-y:auto}
    .pos-center{background:white;overflow-y:auto}
    .pos-right{background:#f9fafb;border-left:1px solid #e5e7eb;overflow-y:auto}
    .receipt-overlay,.history-overlay,.drawer-overlay,.reports-overlay{position:fixed;inset:0;background:rgba(15,23,42,.32);z-index:50}
    .receipt-drawer{position:fixed;top:0;right:0;width:min(420px,100vw);height:100vh;background:#f8fafc;z-index:60;box-shadow:-20px 0 40px rgba(15,23,42,.2);padding:20px;overflow:auto;display:flex;flex-direction:column;gap:12px}
    .drawer-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .drawer-head h2{margin:0;font-size:22px}.drawer-head p{font-size:12px;color:#6b7280}
    .icon-btn{border:0;background:#111827;color:white;width:32px;height:32px;border-radius:8px;font-weight:900;cursor:pointer}
    .receipt-card{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px}
    .receipt-brand{text-align:center;border-bottom:1px dashed #d1d5db;padding-bottom:12px;margin-bottom:12px}
    .receipt-brand h3{margin:0;font-size:18px}.receipt-brand span{font-size:11px;color:#6b7280}
    .receipt-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
    .receipt-meta div{background:#f8fafc;border-radius:10px;padding:8px}
    .receipt-meta span{display:block;font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:800}
    .receipt-meta strong{font-size:12px;word-break:break-word}
    .receipt-items{display:grid;gap:8px}
    .receipt-item{display:grid;grid-template-columns:1fr 36px 60px 65px;gap:6px;align-items:center;font-size:12px}
    .head-row{font-weight:900;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
    .receipt-total{display:flex;justify-content:space-between;align-items:center;border-top:1px dashed #d1d5db;margin-top:12px;padding-top:12px}
    .receipt-total span{font-weight:900}.receipt-total strong{font-size:22px}
    .thankyou{text-align:center;font-size:11px;color:#6b7280}
    .drawer-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .print-btn,.refund-btn,.whatsapp-btn{border:0;border-radius:12px;padding:12px;font-weight:900;cursor:pointer}
    .print-btn{background:#0b0b0b;color:white}.refund-btn{background:#fee2e2;color:#991b1b}
    .whatsapp-btn{background:#25D366;color:white}
    .refund-btn:disabled{opacity:.55;cursor:not-allowed}
    .history-drawer{position:fixed;top:0;right:0;width:min(380px,100vw);height:100vh;background:#f8fafc;z-index:60;box-shadow:-20px 0 40px rgba(15,23,42,.2);padding:20px;overflow:auto;display:flex;flex-direction:column;gap:12px}
    .history-filters{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px}
    .history-filters input,.history-filters select{padding:6px 8px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px}
    .filter-btn{border:0;background:#0b0b0b;color:white;border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer;font-size:12px}
    .history-list{display:flex;flex-direction:column;gap:6px;overflow-y:auto;flex:1}
    .history-item{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:white;border:1px solid #eef2f7;border-radius:10px;cursor:pointer}
    .history-item:hover{border-color:#d1d5db}
    .history-info strong{display:block;font-size:13px}.history-info span{font-size:11px;color:#6b7280}
    .history-right{text-align:right}.history-right b{display:block;font-size:14px}
    .sale-status{font-size:10px;font-weight:800;color:#16a34a}
    .sale-status.refunded{color:#dc2626}
    .cash-drawer-panel{position:fixed;top:0;right:0;width:min(380px,100vw);height:100vh;background:#f8fafc;z-index:60;box-shadow:-20px 0 40px rgba(15,23,42,.2);padding:20px;overflow:auto;display:flex;flex-direction:column;gap:16px}
    .cash-drawer-status{display:flex;flex-direction:column;gap:12px}
    .status-badge{text-align:center;padding:8px;border-radius:8px;font-weight:900;font-size:12px;letter-spacing:.08em}
    .status-badge.open{background:#d1fae5;color:#065f46}
    .status-badge.closed{background:#fef3c7;color:#92400e}
    .cd-field{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
    .cd-field span{color:#6b7280;font-weight:700}
    .cd-field strong{font-weight:800}
    .cd-actions{display:flex;gap:6px;flex-wrap:wrap}
    .cd-input{flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;min-width:80px}
    .cd-btn{border:0;border-radius:8px;padding:8px 14px;font-weight:800;cursor:pointer;font-size:12px}
    .cd-btn.in{background:#d1fae5;color:#065f46}
    .cd-btn.out{background:#fee2e2;color:#991b1b}
    .cd-btn.close-session{background:#0b0b0b;color:white;width:100%;padding:12px}
    .cd-btn.open-session{background:#059669;color:white;width:100%;padding:12px}
    .cd-btn:disabled{opacity:.5;cursor:not-allowed}
    .cd-hint{font-size:12px;color:#6b7280;text-align:center;padding:12px;background:#fef3c7;border-radius:8px}
    .cd-open-form{display:flex;flex-direction:column;gap:8px;padding:12px;background:white;border:1px solid #e5e7eb;border-radius:12px}
    .cd-open-form label{font-size:12px;font-weight:800;color:#6b7280}
    .reports-panel{position:fixed;top:0;right:0;width:min(380px,100vw);height:100vh;background:#f8fafc;z-index:60;box-shadow:-20px 0 40px rgba(15,23,42,.2);padding:20px;overflow:auto;display:flex;flex-direction:column;gap:12px}
    .report-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .report-card{background:white;border-radius:12px;padding:12px;text-align:center;border:1px solid #eef2f7}
    .report-card span{display:block;font-size:10px;font-weight:800;color:#6b7280;text-transform:uppercase}
    .report-card strong{display:block;font-size:20px;font-weight:900;margin:4px 0}
    .report-card b{display:block;font-size:13px}
    .report-card.green strong{color:#059669}.report-card.red strong{color:#dc2626}.report-card.blue strong{color:#2563eb}
    .report-section-title{font-size:12px;font-weight:900;text-transform:uppercase;color:#6b7280;margin:8px 0 4px}
    .report-payments{display:flex;flex-direction:column;gap:6px}
    .pay-row{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:white;border-radius:8px;font-size:13px;font-weight:800}
    .pay-row span{color:#6b7280}
    .report-footer{display:flex;justify-content:space-between;align-items:center;padding:12px;background:white;border-radius:12px;font-size:14px;font-weight:900;border:1px solid #e5e7eb}
    .report-footer .neg{color:#dc2626}
    .success-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#059669;color:white;padding:12px 24px;border-radius:12px;font-weight:800;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,.2)}
    @media(max-width:1200px){.pos-body{grid-template-columns:240px 1fr 300px}}
    @media(max-width:1024px){.pos-body{grid-template-columns:1fr;grid-template-rows:auto 1fr auto;overflow-y:auto}
      .pos-left{max-height:40vh;border-right:0;border-bottom:1px solid #e5e7eb}
      .pos-center{max-height:60vh}
      .pos-right{border-left:0;border-top:1px solid #e5e7eb;padding-bottom:env(safe-area-inset-bottom,80px)}
      .topbar-stats{display:none}}
    @media(max-width:640px){.pos-topbar{padding:8px 12px;flex-wrap:wrap;gap:6px}
      .topbar-left h1{font-size:16px}
      .global-search-input{width:140px;font-size:12px}
      .topbar-btn{font-size:11px;padding:4px 8px}}
    @media print{
      @page{size:80mm 297mm;margin:0}
      .pos-topbar,.pos-left,.pos-center,.pos-right,.receipt-overlay,.drawer-head,.drawer-actions,.thankyou,.history-overlay,.history-drawer,.cash-drawer-panel,.reports-panel,.success-toast{display:none!important}
      .receipt-drawer{position:static!important;display:block!important;width:80mm!important;height:auto!important;padding:0!important;background:white!important;box-shadow:none!important;overflow:visible!important}
      .receipt-card{width:80mm!important;padding:5mm!important;border:0!important;border-radius:0!important;box-shadow:none!important;font-family:'Courier New',monospace!important}
    }
  `]
})
export class PosComponent {
  private api = inject(PosService);
  private servicesApi = inject(ServicesService);
  private inventoryApi = inject(InventoryService);
  private staffApi = inject(StaffService);
  store = inject(PosStore);

  dashboard = signal<any>({ summary: { totalSales: 0, completedRevenue: 0 }, recentSales: [] });
  selectedSale = signal<any>(null);
  refundBusy = signal(false);
  showHistory = signal(false);
  showCashDrawer = signal(false);
  showReports = signal(false);
  successMessage = signal('');
  globalSearch = '';
  historyFilters = { from: '', to: '', status: '' };
  cashDrawerSession = signal<any>(null);
  openingBalance = signal(0);
  cashMoveAmount = signal(0);
  paymentMethodKeys = ['CASH', 'CARD', 'UPI', 'WALLET', 'GIFT_CARD', 'LOYALTY'];

  shiftLabel = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning Shift';
    if (h < 17) return 'Afternoon Shift';
    return 'Evening Shift';
  });

  dailySummary = computed(() => this.store.dailySummary());

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.selectedSale()) { this.closeReceipt(); event.preventDefault(); return; }
      if (this.showHistory()) { this.toggleHistory(); event.preventDefault(); return; }
      if (this.showCashDrawer()) { this.toggleCashDrawer(); event.preventDefault(); return; }
      if (this.showReports()) { this.toggleReports(); event.preventDefault(); return; }
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.doCheckout();
    }
  }

  ngOnInit() {
    this.store.loading.set(true);
    this.loadDashboard();
  }

  loadDashboard() {
    this.store.loading.set(true);
    this.store.error.set('');
    this.api.getDashboard().subscribe({
      next: (d) => {
        this.dashboard.set(d);
        this.store.recentSales.set(d?.recentSales || []);
        this.loadAuxiliaryData();
      },
      error: (err) => {
        this.store.error.set(err?.status === 401 ? 'Session expired. Please log in again.' : 'POS data unavailable.');
        this.store.loading.set(false);
      },
    });
  }

  private loadAuxiliaryData() {
    this.servicesApi.getAll({ isActive: true }).subscribe({
      next: (services) => this.store.services.set(services || []),
      error: () => this.store.services.set([]),
    });
    this.inventoryApi.getAll({ isActive: true }).subscribe({
      next: (products) => this.store.products.set(products || []),
      error: () => this.store.products.set([]),
    });
    this.api.getPaymentMethods().subscribe({
      next: (methods) => this.store.paymentMethods.set(methods || []),
      error: () => this.store.paymentMethods.set([]),
    });
    this.staffApi.getAll({ isActive: true }).subscribe({
      next: (staff) => this.store.staffList.set(staff || []),
      error: () => this.store.staffList.set([]),
    });
    this.store.loading.set(false);
  }

  loadSalesHistory() {
    const query: any = {};
    if (this.historyFilters.from) query.from = this.historyFilters.from;
    if (this.historyFilters.to) query.to = this.historyFilters.to;
    if (this.historyFilters.status) query.status = this.historyFilters.status;
    this.api.getSales(query).subscribe({
      next: (sales) => this.store.salesHistory.set(sales || []),
      error: () => {},
    });
  }

  handleGlobalSearch() {
    if (!this.globalSearch.trim()) return;
    const q = this.globalSearch.trim();
    if (q.length >= 3) {
      this.store.setBarcodeInput(q);
      this.globalSearch = '';
      return;
    }
    this.api.getSales({ search: q }).subscribe({
      next: (sales) => {
        if (sales?.length === 1) {
          this.viewReceipt(sales[0]);
        } else {
          this.store.salesHistory.set(sales || []);
          this.showHistory.set(true);
        }
        this.globalSearch = '';
      },
      error: () => {},
    });
  }

  doCheckout() {
    if (!this.store.canCheckout()) return;
    if (this.store.checkoutBusy()) return;
    this.store.checkoutBusy.set(true);
    this.store.error.set('');

    const items = this.store.getCartItemsForCheckout();
    const discount = this.store.cartDiscountAmount();
    const tax = this.store.taxAmount();
    const tip = this.store.tip();
    const note = this.store.note();

    if (discount > 0) {
      items.push({ serviceId: null, productId: null, name: 'Discount', quantity: 1, unitPrice: -discount });
    }
    if (tax > 0) {
      items.push({ serviceId: null, productId: null, name: 'Tax', quantity: 1, unitPrice: tax });
    }

    const client = this.store.client();
    const splitPayments = this.store.splitPayments();
    const paymentMethod = splitPayments.cash > 0 && splitPayments.card === 0 && splitPayments.upi === 0 && splitPayments.wallet === 0 ? 'CASH' :
      splitPayments.card > 0 && splitPayments.cash === 0 && splitPayments.upi === 0 && splitPayments.wallet === 0 ? 'CARD' :
      splitPayments.upi > 0 && splitPayments.cash === 0 && splitPayments.card === 0 && splitPayments.wallet === 0 ? 'UPI' :
      splitPayments.wallet > 0 && splitPayments.cash === 0 && splitPayments.card === 0 && splitPayments.upi === 0 ? 'WALLET' :
      'SPLIT';

    this.api.checkout({
      clientId: client?.id || null,
      staffId: this.store.staffId() || null,
      items,
      paymentMethod,
      totalAmount: this.store.grandTotal(),
    }).subscribe({
      next: (sale) => {
        this.store.checkoutBusy.set(false);
        this.store.clearCart();
        this.loadDashboard();
        this.loadSalesHistory();
        this.viewReceipt(sale);
        this.successMessage.set('Checkout completed!');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.store.checkoutBusy.set(false);
        this.store.error.set(err?.error?.message || 'Checkout failed.');
      },
    });
  }

  viewReceipt(sale: any) {
    this.api.getSale(sale.id).subscribe({
      next: (detail) => { this.selectedSale.set(detail); },
      error: () => { this.selectedSale.set(sale); },
    });
  }

  closeReceipt() {
    this.selectedSale.set(null);
    this.refundBusy.set(false);
  }

  printReceipt() {
    window.print();
  }

  shareWhatsApp() {
    const sale = this.selectedSale();
    if (!sale?.client?.phone) return;
    const number = sale.client.phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Ambition Unisex Salon - Receipt ${this.receiptNumber(sale)}\nAmount: $${(sale.totalAmount || 0).toFixed(2)}\nStatus: ${sale.status}\nThank you for visiting!`
    );
    window.open(`https://wa.me/${number}?text=${msg}`, '_blank');
  }

  refundSale() {
    const sale = this.selectedSale();
    if (!sale || sale.status === 'REFUNDED') return;
    const amount = (sale.totalAmount || 0).toFixed(2);
    if (!confirm(`Refund sale for $${amount}?`)) return;
    this.refundBusy.set(true);
    this.api.refund(sale.id).subscribe({
      next: (result) => {
        this.selectedSale.set(result);
        this.refundBusy.set(false);
        this.loadDashboard();
        this.loadSalesHistory();
      },
      error: (err) => {
        this.refundBusy.set(false);
        this.store.error.set(err?.error?.message || 'Refund failed.');
      },
    });
  }

  toggleHistory() {
    this.showHistory.update(v => !v);
    if (this.showCashDrawer()) this.showCashDrawer.set(false);
    if (this.showReports()) this.showReports.set(false);
    if (this.showHistory()) this.loadSalesHistory();
  }

  toggleCashDrawer() {
    this.showCashDrawer.update(v => !v);
    if (this.showHistory()) this.showHistory.set(false);
    if (this.showReports()) this.showReports.set(false);
    if (this.showCashDrawer()) this.refreshCashDrawer();
  }

  toggleReports() {
    this.showReports.update(v => !v);
    if (this.showHistory()) this.showHistory.set(false);
    if (this.showCashDrawer()) this.showCashDrawer.set(false);
    if (this.showReports()) this.loadSalesHistory();
  }

  private refreshCashDrawer() {
    this.api.getCashDrawerOpen().subscribe({
      next: (session) => this.cashDrawerSession.set(session),
      error: () => this.cashDrawerSession.set(null),
    });
  }

  openCashDrawer() {
    const amount = Number(this.openingBalance()) || 0;
    if (amount <= 0) return;
    this.api.openCashDrawer({ openingBalance: amount }).subscribe({
      next: (session) => {
        this.cashDrawerSession.set(session);
        this.openingBalance.set(0);
        this.successMessage.set('Cash drawer opened');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.store.error.set('Cash drawer API unavailable. This is an integration-ready UI - backend endpoint required.');
      },
    });
  }

  closeCashDrawer() {
    const session = this.cashDrawerSession();
    if (!session?.id) return;
    if (!confirm('Close cash drawer session?')) return;
    this.api.closeCashDrawer(session.id, { closingBalance: Number(this.openingBalance()) || 0 }).subscribe({
      next: () => {
        this.cashDrawerSession.set(null);
        this.successMessage.set('Cash drawer closed');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.store.error.set('Close session API unavailable.');
      },
    });
  }

  cashIn() {
    const amount = Number(this.cashMoveAmount()) || 0;
    const session = this.cashDrawerSession();
    if (amount <= 0 || !session?.id) return;
    this.api.cashInOut(session.id, { type: 'IN', amount }).subscribe({
      next: (updated) => {
        this.cashDrawerSession.set(updated);
        this.cashMoveAmount.set(0);
      },
      error: () => {
        this.store.error.set('Cash in API unavailable.');
      },
    });
  }

  cashOut() {
    const amount = Number(this.cashMoveAmount()) || 0;
    const session = this.cashDrawerSession();
    if (amount <= 0 || !session?.id) return;
    this.api.cashInOut(session.id, { type: 'OUT', amount }).subscribe({
      next: (updated) => {
        this.cashDrawerSession.set(updated);
        this.cashMoveAmount.set(0);
      },
      error: () => {
        this.store.error.set('Cash out API unavailable.');
      },
    });
  }

  receiptNumber(sale: any): string {
    return sale?.receipt?.receiptNumber || `POS-${(sale?.id || '').slice(-8).toUpperCase()}`;
  }

  receiptItemCount(sale: any): number {
    return (sale?.items || []).filter((i: any) => !['discount', 'tax'].includes(String(i.name || '').toLowerCase()))
      .reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  }
}
