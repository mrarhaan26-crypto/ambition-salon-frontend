import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WalletService } from './wallet.service';
import { ClientsService } from '../clients/clients.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Wallet</h1>
          <p>Client wallet balances and transactions.</p>
        </div>
      </div>

      <div class="client-context" *ngIf="filterClientName">
        <div class="cc-avatar">{{ filterClientName.charAt(0).toUpperCase() }}</div>
        <div class="cc-info">
          <strong>{{ filterClientName }}</strong>
          <span>Wallet context</span>
        </div>
        <a [routerLink]="'/app/clients'" class="cc-back">Back to Clients</a>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading wallet data...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card"><span>Clients with Balance</span><strong>{{ data?.totalClients || 0 }}</strong></div>
          <div class="kpi-card"><span>Total Wallet Balance</span><strong>{{ (data?.totalBalance || 0) | currency }}</strong></div>
        </div>

        <div class="panel">
          <h2>Client Wallets</h2>
          <div class="empty" *ngIf="!data?.clients?.length"><p>No wallets with balance found.</p></div>
          <div class="table" *ngIf="data?.clients?.length">
            <div class="table-row header">
              <span>Client</span><span>Balance</span><span>Actions</span>
            </div>
            <div class="table-row" *ngFor="let c of data.clients">
              <span>{{ c.fullName }}</span>
              <span class="balance">{{ c.walletBalance | currency }}</span>
              <span class="actions">
                <button (click)="selectedClient = c; creditForm = { clientId: c.id, amount: 0, notes: '' }">Credit</button>
                <button (click)="selectedClient = c; debitForm = { clientId: c.id, amount: 0, notes: '' }">Debit</button>
              </span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer" *ngIf="creditForm">
        <div class="drawer-panel">
          <h2>Credit Wallet — {{ selectedClient?.fullName }}</h2>
          <div class="form">
            <input [(ngModel)]="creditForm.amount" type="number" step="0.01" placeholder="Amount">
            <input [(ngModel)]="creditForm.notes" placeholder="Notes (optional)">
            <div class="form-actions">
              <button type="button" (click)="creditForm = null">Cancel</button>
              <button (click)="doCredit()">Credit</button>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer" *ngIf="debitForm">
        <div class="drawer-panel">
          <h2>Debit Wallet — {{ selectedClient?.fullName }}</h2>
          <div class="form">
            <input [(ngModel)]="debitForm.amount" type="number" step="0.01" placeholder="Amount">
            <input [(ngModel)]="debitForm.notes" placeholder="Notes (optional)">
            <div class="form-actions">
              <button type="button" (click)="debitForm = null">Cancel</button>
              <button (click)="doDebit()">Debit</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .client-context{display:flex;align-items:center;gap:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:14px 18px}
    .cc-avatar{width:40px;height:40px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0}
    .cc-info{flex:1}
    .cc-info strong{display:block;font-size:15px}
    .cc-info span{font-size:12px;color:#6b7280}
    .cc-back{border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;color:#374151;text-decoration:none;transition:all .2s}
    .cc-back:hover{background:#f3f4f6}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:24px}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .table{display:grid;gap:2px}
    .table-row{display:grid;grid-template-columns:2fr 1fr 1fr;padding:12px 16px;background:#f8fafc;border-radius:8px;align-items:center}
    .table-row.header{font-weight:700;font-size:12px;color:#6b7280;background:transparent}
    .balance{font-weight:700}
    .actions{display:flex;gap:6px}
    .actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(440px,90%)}
    .drawer-panel h2{margin:0 0 20px}
    .form{display:grid;gap:12px}
    .form input{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    @media(max-width:900px){.kpis{grid-template-columns:1fr}}
  `]
})
export class WalletComponent {
  private api = inject(WalletService);
  private route = inject(ActivatedRoute);
  private clientsApi = inject(ClientsService);
  data: any = null;
  loading = true;
  error = '';
  selectedClient: any = null;
  creditForm: any = null;
  debitForm: any = null;
  filterClientId = '';
  filterClientName = '';

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const clientId = params['clientId'];
      if (clientId) {
        this.filterClientId = clientId;
        this.clientsApi.getClient(clientId).subscribe({
          next: (c) => { this.filterClientName = c.fullName; },
        });
      }
    });
    this.loadAll();
  }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getWallets().subscribe({ next: (d) => { this.data = d; this.loading = false; }, error: () => { this.error = 'Wallet data unavailable.'; this.loading = false; } });
  }

  doCredit() {
    this.api.credit(this.creditForm).subscribe({ next: () => { this.creditForm = null; this.loadAll(); } });
  }

  doDebit() {
    this.api.debit(this.debitForm).subscribe({ next: () => { this.debitForm = null; this.loadAll(); } });
  }
}
