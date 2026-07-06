import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdjustmentsService } from './adjustments.service';

@Component({
  selector: 'app-adjustments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Adjustments</h1>
          <p>Refunds, cancellations, and manual adjustments.</p>
        </div>
        <button class="primary" (click)="showForm = true">+ New Adjustment</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card"><span>Adjustments</span><strong>{{ adjustments.length }}</strong></div>
          <div class="kpi-card"><span>Refunds</span><strong>{{ refunds.length }}</strong></div>
          <div class="kpi-card"><span>Cancellations</span><strong>{{ cancellations.length }}</strong></div>
        </div>

        <div class="panel">
          <h2>Adjustments</h2>
          <div class="empty" *ngIf="adjustments.length === 0"><p>No adjustments recorded.</p></div>
          <div class="table" *ngIf="adjustments.length > 0">
            <div class="th"><span>Type</span><span>Client</span><span>Amount</span><span>Reason</span><span>Date</span></div>
            <div class="tr" *ngFor="let a of adjustments">
              <span><span class="badge" [class]="'t-'+a.type.toLowerCase()">{{ a.type }}</span></span>
              <span>{{ a.client?.fullName || 'N/A' }}</span>
              <span>{{ a.amount | currency }}</span>
              <span>{{ a.reason || '-' }}</span>
              <span>{{ a.createdAt | date:'MMM dd' }}</span>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h2>Refunds</h2><button (click)="showRefundForm = true">+ Record Refund</button></div>
          <div class="empty" *ngIf="refunds.length === 0"><p>No refunds recorded.</p></div>
          <div class="table" *ngIf="refunds.length > 0">
            <div class="th"><span>Client</span><span>Amount</span><span>Reason</span><span>Date</span></div>
            <div class="tr" *ngFor="let r of refunds">
              <span>{{ r.client?.fullName || 'N/A' }}</span><span>{{ r.amount | currency }}</span><span>{{ r.reason || '-' }}</span><span>{{ r.createdAt | date:'MMM dd' }}</span>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Cancellations</h2>
          <div class="empty" *ngIf="cancellations.length === 0"><p>No cancellations recorded.</p></div>
          <div class="table" *ngIf="cancellations.length > 0">
            <div class="th"><span>Client</span><span>Amount</span><span>Reason</span><span>Date</span></div>
            <div class="tr" *ngFor="let c of cancellations">
              <span>{{ c.client?.fullName || 'N/A' }}</span><span>{{ c.amount | currency }}</span><span>{{ c.reason }}</span><span>{{ c.createdAt | date:'MMM dd' }}</span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer" *ngIf="showForm">
        <div class="drawer-panel">
          <h2>New Adjustment</h2>
          <div class="form">
            <select [(ngModel)]="adjForm.type">
              <option value="MANUAL_CREDIT">Manual Credit</option>
              <option value="MANUAL_DEBIT">Manual Debit</option>
              <option value="REFUND">Refund</option>
              <option value="CANCELLATION_FEE">Cancellation Fee</option>
            </select>
            <input [(ngModel)]="adjForm.amount" type="number" step="0.01" placeholder="Amount">
            <input [(ngModel)]="adjForm.clientId" placeholder="Client ID">
            <input [(ngModel)]="adjForm.reason" placeholder="Reason">
            <div class="form-actions">
              <button type="button" (click)="showForm = false">Cancel</button>
              <button (click)="createAdjustment()">Create</button>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer" *ngIf="showRefundForm">
        <div class="drawer-panel">
          <h2>Record Refund</h2>
          <div class="form">
            <input [(ngModel)]="refundForm.amount" type="number" step="0.01" placeholder="Amount">
            <input [(ngModel)]="refundForm.reason" placeholder="Reason">
            <input [(ngModel)]="refundForm.clientId" placeholder="Client ID">
            <div class="form-actions">
              <button type="button" (click)="showRefundForm = false">Cancel</button>
              <button (click)="createRefund()">Record</button>
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
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:24px}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .panel-head h2{margin:0}
    .panel-head button{border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;background:white}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .table{display:grid;gap:2px;font-size:13px}
    .th,.tr{display:grid;grid-template-columns:1.5fr 1.5fr 1fr 1.5fr 1fr;padding:10px 12px;align-items:center;gap:8px}
    .th{font-weight:700;color:#6b7280}
    .tr{background:#f8fafc;border-radius:8px}
    .badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .t-refund{background:#fef3c7;color:#a16207}
    .t-cancellation_fee{background:#fee2e2;color:#991b1b}
    .t-manual_credit{background:#f0fdf4;color:#16a34a}
    .t-manual_debit{background:#dbeafe;color:#1d4ed8}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(440px,90%)}
    .drawer-panel h2{margin:0 0 20px}
    .form{display:grid;gap:12px}
    .form input,select{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
  `]
})
export class AdjustmentsComponent {
  private api = inject(AdjustmentsService);
  adjustments: any[] = [];
  refunds: any[] = [];
  cancellations: any[] = [];
  loading = true;
  error = '';
  showForm = false;
  showRefundForm = false;
  adjForm: any = { type: 'MANUAL_CREDIT', amount: 0, clientId: '', reason: '' };
  refundForm: any = { amount: 0, reason: '', clientId: '' };

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getAdjustments().subscribe({ next: (d) => { this.adjustments = d; this.loading = false; }, error: () => { this.error = 'Failed to load.'; this.loading = false; } });
    this.api.getRefunds().subscribe({ next: (d) => this.refunds = d });
    this.api.getCancellations().subscribe({ next: (d) => this.cancellations = d });
  }

  createAdjustment() { this.api.createAdjustment(this.adjForm).subscribe({ next: () => { this.showForm = false; this.loadAll(); } }); }
  createRefund() { this.api.createRefund(this.refundForm).subscribe({ next: () => { this.showRefundForm = false; this.loadAll(); } }); }
}
