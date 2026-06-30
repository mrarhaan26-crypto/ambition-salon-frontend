import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentsService } from './payments.service';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Payments</h1>
          <p>Manage payments and transactions.</p>
        </div>
        <button class="primary" (click)="showCreate = true">+ New Payment</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading payments...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card"><span>Total</span><strong>{{ items.length }}</strong></div>
          <div class="kpi-card"><span>Completed</span><strong class="green">{{ countByStatus('COMPLETED') }}</strong></div>
          <div class="kpi-card"><span>Pending</span><strong class="amber">{{ countByStatus('PENDING') }}</strong></div>
          <div class="kpi-card"><span>Failed</span><strong class="red">{{ countByStatus('FAILED') }}</strong></div>
        </div>

        <div class="panel">
          <h2>All Payments</h2>
          <div class="empty" *ngIf="items.length === 0"><p>No payments yet.</p></div>
          <div class="table" *ngIf="items.length > 0">
            <div class="th"><span>ID</span><span>Client</span><span>Amount</span><span>Method</span><span>Status</span><span>Date</span><span>Actions</span></div>
            <div class="tr" *ngFor="let p of items">
              <span class="mono">{{ p.id.slice(0,8) }}</span>
              <span>{{ p.client?.fullName || 'N/A' }}</span>
              <span>{{ p.amount | currency }}</span>
              <span>{{ p.method }}</span>
              <span><span class="badge" [class.green]="p.status==='COMPLETED'" [class.amber]="p.status==='PENDING'" [class.red]="p.status==='FAILED'">{{ p.status }}</span></span>
              <span>{{ p.createdAt | date:'MMM dd' }}</span>
              <span class="actions">
                <button *ngIf="p.status === 'PENDING'" (click)="markPaid(p)">Paid</button>
                <button *ngIf="p.status === 'PENDING'" class="danger" (click)="markFailed(p)">Fail</button>
                <button *ngIf="p.status === 'COMPLETED'" (click)="refundPayment(p)">Refund</button>
              </span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer" *ngIf="showCreate">
        <div class="drawer-panel">
          <h2>New Payment</h2>
          <div class="form">
            <input [(ngModel)]="createForm.amount" type="number" step="0.01" placeholder="Amount">
            <select [(ngModel)]="createForm.method">
              <option value="CASH">Cash</option>
              <option value="UPI_AT_VENUE">UPI at Venue</option>
              <option value="CARD_AT_VENUE">Card at Venue</option>
              <option value="RAZORPAY_PLACEHOLDER">Razorpay (Placeholder)</option>
            </select>
            <input [(ngModel)]="createForm.clientId" placeholder="Client ID (optional)">
            <div class="form-actions">
              <button type="button" (click)="showCreate = false">Cancel</button>
              <button (click)="createPayment()">Create</button>
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
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:24px}
    .green{color:#16a34a}.amber{color:#d97706}.red{color:#dc2626}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .table{display:grid;gap:2px;font-size:13px}
    .th,.tr{display:grid;grid-template-columns:1fr 1.5fr 1fr 1fr 1fr 1fr 1.5fr;padding:10px 12px;align-items:center;gap:8px}
    .th{font-weight:700;color:#6b7280;background:transparent}
    .tr{background:#f8fafc;border-radius:8px}
    .mono{font-family:monospace}
    .badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .badge.green{background:#f0fdf4;color:#16a34a}
    .badge.amber{background:#fef3c7;color:#d97706}
    .badge.red{background:#fee2e2;color:#dc2626}
    .actions{display:flex;gap:4px}
    .actions button{border:1px solid #e5e7eb;border-radius:6px;padding:4px 10px;font-weight:600;cursor:pointer;background:white;font-size:10px}
    .actions .danger{background:#fee2e2;color:#991b1b}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(440px,90%)}
    .drawer-panel h2{margin:0 0 20px}
    .form{display:grid;gap:12px}
    .form input,select{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    @media(max-width:1000px){.kpis{grid-template-columns:repeat(2,1fr)}.th,.tr{grid-template-columns:1fr 1fr 1fr;gap:4px}}
  `]
})
export class PaymentsComponent {
  private api = inject(PaymentsService);
  items: any[] = [];
  loading = true;
  error = '';
  showCreate = false;
  createForm: any = { amount: 0, method: 'CASH', clientId: '' };

  ngOnInit() { this.loadAll(); }

  countByStatus(s: string) { return this.items.filter(p => p.status === s).length; }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({ next: (d) => { this.items = d; this.loading = false; }, error: () => { this.error = 'Failed to load payments.'; this.loading = false; } });
  }

  createPayment() {
    this.api.createIntent(this.createForm).subscribe({ next: () => { this.showCreate = false; this.loadAll(); } });
  }

  markPaid(p: any) { this.api.markPaid(p.id, p.method).subscribe({ next: () => this.loadAll() }); }
  markFailed(p: any) { this.api.markFailed(p.id).subscribe({ next: () => this.loadAll() }); }
  refundPayment(p: any) { if (confirm('Refund this payment?')) this.api.refund(p.id).subscribe({ next: () => this.loadAll() }); }
}
