import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OnlinePaymentService } from './online-payment.service';
import { PaymentTransaction, PaymentGatewayConfig } from './online-payment.models';

@Component({
  selector: 'app-online-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Online Payments</h1><p>Payment transactions and gateway configuration.</p></div></div>

      <div class="tabs">
        <button [class.active]="tab==='transactions'" (click)="tab='transactions';load()">Transactions</button>
        <button [class.active]="tab==='gateways'" (click)="tab='gateways';loadGateways()">Gateways</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="tab==='transactions'?load():loadGateways()">Retry</button></div>

      <ng-container *ngIf="tab==='transactions' && !loading && !error">
        <div class="kpis" *ngIf="summary">
          <div class="kpi-card"><span class="kpi-lbl">Revenue</span><span class="kpi-val">{{ summary.totalRevenue | currency }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Transactions</span><span class="kpi-val">{{ summary.totalTransactions }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Success Rate</span><span class="kpi-val good">{{ summary.successRate }}%</span></div>
        </div>
        <div class="toolbar">
          <select [(ngModel)]="statusFilter" (change)="load()"><option value="">All Status</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></select>
          <select [(ngModel)]="gatewayFilter" (change)="load()"><option value="">All Gateways</option><option value="STRIPE">Stripe</option><option value="PAYPAL">PayPal</option><option value="RAZORPAY">Razorpay</option></select>
        </div>
        <div class="empty" *ngIf="items.length===0"><p>No transactions found.</p></div>
        <div class="table-wrap" *ngIf="items.length>0">
          <div class="table">
            <div class="table-row header"><span>Date</span><span>Client</span><span>Amount</span><span>Gateway</span><span>Status</span><span>Transaction ID</span><span>Actions</span></div>
            <div class="table-row" *ngFor="let t of items">
              <span>{{ t.createdAt | date:'MMM dd, h:mm a' }}</span>
              <span>{{ t.clientName }}</span>
              <span class="amount">{{ t.amount | currency }}</span>
              <span><span class="gw-badge">{{ t.gateway }}</span></span>
              <span><span class="status-badge" [class.pending]="t.status==='PENDING'" [class.completed]="t.status==='COMPLETED'" [class.failed]="t.status==='FAILED'" [class.refunded]="t.status==='REFUNDED'">{{ t.status }}</span></span>
              <span class="tx-id">{{ t.transactionId }}</span>
              <span><button *ngIf="t.status==='COMPLETED'" (click)="refund(t)">Refund</button></span>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="tab==='gateways' && !loading && !error">
        <div class="empty" *ngIf="gateways.length===0"><p>No gateways configured.</p></div>
        <div class="gateway-list" *ngIf="gateways.length>0">
          <div class="gateway-card" *ngFor="let g of gateways" [class.disabled]="!g.isEnabled">
            <div class="gw-head"><strong>{{ g.gateway }}</strong><span class="env-badge" [class.test]="g.environment==='TEST'" [class.live]="g.environment==='LIVE'">{{ g.environment }}</span></div>
            <div class="gw-field"><label>API Key</label><input [(ngModel)]="g.apiKey" placeholder="API Key"></div>
            <div class="gw-field"><label>API Secret</label><input [(ngModel)]="g.apiSecret" type="password" placeholder="Secret"></div>
            <div class="gw-field"><label><input type="checkbox" [(ngModel)]="g.isEnabled"> Enabled</label></div>
            <button (click)="saveGateway(g)">Save</button>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .tabs{display:flex;gap:4px;background:#f3f4f6;border-radius:16px;padding:4px;width:fit-content}
    .tabs button{border:0;border-radius:12px;padding:10px 20px;font-weight:700;cursor:pointer;background:transparent}
    .tabs button.active{background:white;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;display:grid;gap:4px}
    .kpi-lbl{font-size:13px;color:#6b7280;font-weight:600}.kpi-val{font-size:28px;font-weight:800}
    .kpi-val.good{color:#16a34a}
    .toolbar{display:flex;gap:10px}
    .toolbar select{padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .table-wrap{overflow-x:auto}
    .table{display:grid;gap:2px;min-width:700px}
    .table-row{display:grid;grid-template-columns:1fr 1fr 0.8fr 0.7fr 0.7fr 1fr 0.6fr;padding:12px 16px;background:#f8fafc;border-radius:8px;align-items:center;gap:8px}
    .table-row.header{font-weight:700;font-size:12px;color:#6b7280;background:transparent;padding:8px 16px}
    .amount{font-weight:800}
    .gw-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px;background:#f3f4f6;color:#374151}
    .status-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px}
    .status-badge.pending{background:#fffbeb;color:#d97706}
    .status-badge.completed{background:#f0fdf4;color:#16a34a}
    .status-badge.failed{background:#fef2f2;color:#991b1b}
    .status-badge.refunded{background:#eff6ff;color:#2563eb}
    .tx-id{font-family:monospace;font-size:11px;color:#6b7280}
    .table-row button{border:1px solid #e5e7eb;border-radius:6px;padding:5px 10px;font-weight:600;cursor:pointer;background:white;font-size:10px}
    .gateway-list{display:grid;gap:12px}
    .gateway-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:24px;display:grid;gap:14px}
    .gateway-card.disabled{opacity:.55}
    .gw-head{display:flex;justify-content:space-between;align-items:center}
    .gw-head strong{font-size:18px}
    .env-badge{font-size:9px;font-weight:700;padding:3px 10px;border-radius:12px}
    .env-badge.test{background:#fffbeb;color:#d97706}
    .env-badge.live{background:#f0fdf4;color:#16a34a}
    .gw-field{display:grid;gap:4px}
    .gw-field label{font-size:13px;font-weight:700;color:#374151}
    .gw-field input{padding:12px;border:1px solid #e5e7eb;border-radius:12px}
    .gateway-card button{border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white;justify-self:start}
    @media(max-width:900px){.kpis{grid-template-columns:1fr}}
  `]
})
export class OnlinePaymentComponent {
  private api = inject(OnlinePaymentService);
  tab: 'transactions' | 'gateways' = 'transactions';
  items: PaymentTransaction[] = []; gateways: PaymentGatewayConfig[] = [];
  summary: any = null;
  loading = true; error = '';
  statusFilter = ''; gatewayFilter = '';

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getTransactions({ status: this.statusFilter || undefined, gateway: this.gatewayFilter || undefined }).subscribe({
      next: d => { this.items = d; this.loading = false; },
      error: () => { this.error = 'Transactions unavailable.'; this.loading = false; },
    });
    this.api.getSummary().subscribe({ next: d => this.summary = d });
  }
  loadGateways() {
    this.loading = true; this.error = '';
    this.api.getGateways().subscribe({ next: d => { this.gateways = d; this.loading = false; }, error: () => { this.error = 'Gateways unavailable.'; this.loading = false; } });
  }
  refund(t: PaymentTransaction) {
    this.api.refund(t.id).subscribe({ next: () => this.load() });
  }
  saveGateway(g: PaymentGatewayConfig) {
    this.api.updateGateway(g.id, g).subscribe();
  }
}
