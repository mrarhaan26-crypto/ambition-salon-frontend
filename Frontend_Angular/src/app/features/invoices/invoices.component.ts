import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoicesService } from './invoices.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Invoices</h1>
          <p>Create and manage invoices and receipts.</p>
        </div>
        <button class="primary" (click)="openCreate()">+ New Invoice</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading invoices...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card"><span>Total</span><strong>{{ items.length }}</strong></div>
          <div class="kpi-card"><span>Draft</span><strong>{{ countByStatus('DRAFT') }}</strong></div>
          <div class="kpi-card"><span>Issued</span><strong class="amber">{{ countByStatus('ISSUED') }}</strong></div>
          <div class="kpi-card"><span>Paid</span><strong class="green">{{ countByStatus('PAID') }}</strong></div>
          <div class="kpi-card"><span>Void</span><strong class="red">{{ countByStatus('VOID') }}</strong></div>
        </div>

        <div class="panel">
          <h2>All Invoices</h2>
          <div class="empty" *ngIf="items.length === 0"><p>No invoices yet.</p></div>
          <div class="table" *ngIf="items.length > 0">
            <div class="th"><span>#</span><span>Client</span><span>Amount</span><span>Status</span><span>Date</span><span>Actions</span></div>
            <div class="tr" *ngFor="let inv of items">
              <span class="mono">{{ inv.invoiceNumber }}</span>
              <span>{{ inv.client?.fullName || 'N/A' }}</span>
              <span>{{ inv.total | currency }}</span>
              <span><span class="badge" [class]="'st-'+inv.status.toLowerCase()">{{ inv.status }}</span></span>
              <span>{{ inv.createdAt | date:'MMM dd' }}</span>
              <span class="actions">
                <button (click)="selected = inv">{{ inv.status === 'DRAFT' ? 'Edit' : 'View' }}</button>
                <button *ngIf="inv.status === 'DRAFT'" (click)="issueInvoice(inv)">Issue</button>
                <button *ngIf="inv.status !== 'VOID'" class="danger" (click)="voidInvoice(inv)">Void</button>
              </span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer" *ngIf="showCreate">
        <div class="drawer-panel wide">
          <h2>New Invoice</h2>
          <div class="form">
            <input [(ngModel)]="form.clientId" placeholder="Client ID (optional)">
            <input [(ngModel)]="form.taxRate" type="number" step="0.1" placeholder="Tax rate %">
            <input [(ngModel)]="form.discountPercent" type="number" step="0.1" placeholder="Discount %">
            <textarea [(ngModel)]="form.notes" placeholder="Notes"></textarea>
            <h3>Items</h3>
            <div class="item-row" *ngFor="let item of form.items; let i = index">
              <input [(ngModel)]="item.description" placeholder="Description">
              <input [(ngModel)]="item.quantity" type="number" placeholder="Qty" class="sm">
              <input [(ngModel)]="item.unitPrice" type="number" step="0.01" placeholder="Price" class="sm">
              <button class="danger sm-btn" (click)="form.items.splice(i,1)">x</button>
            </div>
            <button (click)="form.items.push({description:'', quantity:1, unitPrice:0})">+ Add Item</button>
            <div class="form-actions">
              <button type="button" (click)="showCreate = false">Cancel</button>
              <button (click)="createInvoice()">Create Invoice</button>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer" *ngIf="selected">
        <div class="drawer-panel wide">
          <h2>Invoice {{ selected.invoiceNumber }}</h2>
          <div class="detail">
            <p><strong>Client:</strong> {{ selected.client?.fullName || 'N/A' }}</p>
            <p><strong>Status:</strong> {{ selected.status }}</p>
            <p><strong>Subtotal:</strong> {{ selected.subtotal | currency }}</p>
            <p><strong>Discount:</strong> {{ selected.discount | currency }}</p>
            <p><strong>Tax:</strong> {{ selected.tax | currency }}</p>
            <p><strong>Total:</strong> {{ selected.total | currency }}</p>
            <p *ngIf="selected.notes"><strong>Notes:</strong> {{ selected.notes }}</p>
          </div>
          <div class="items" *ngIf="selected.items?.length">
            <h3>Items</h3>
            <div class="item-line" *ngFor="let i of selected.items">
              <span>{{ i.description }}</span><span>x{{ i.quantity }}</span><span>{{ i.unitPrice | currency }}</span><span>{{ i.totalPrice | currency }}</span>
            </div>
          </div>
          <button (click)="selected = null">Close</button>
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
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:24px}
    .green{color:#16a34a}.amber{color:#d97706}.red{color:#dc2626}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .table{display:grid;gap:2px;font-size:13px}
    .th,.tr{display:grid;grid-template-columns:1fr 1.5fr 1fr 1fr 1fr 1.5fr;padding:10px 12px;align-items:center;gap:8px}
    .th{font-weight:700;color:#6b7280}
    .tr{background:#f8fafc;border-radius:8px}
    .mono{font-family:monospace;font-weight:700}
    .badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .st-draft{background:#f3f4f6;color:#6b7280}
    .st-issued{background:#dbeafe;color:#1d4ed8}
    .st-paid{background:#f0fdf4;color:#16a34a}
    .st-void{background:#fee2e2;color:#991b1b}
    .actions{display:flex;gap:4px}
    .actions button{border:1px solid #e5e7eb;border-radius:6px;padding:4px 10px;font-weight:600;cursor:pointer;background:white;font-size:10px}
    .actions .danger{background:#fee2e2;color:#991b1b}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(440px,90%);max-height:90vh;overflow-y:auto}
    .drawer-panel.wide{width:min(640px,95%)}
    .drawer-panel h2{margin:0 0 20px}
    .form{display:grid;gap:12px}
    .form input,textarea,select{padding:12px;border:1px solid #e5e7eb;border-radius:12px;font-family:inherit}
    textarea{min-height:60px}
    h3{font-size:16px;margin:8px 0 4px}
    .item-row{display:flex;gap:8px;align-items:center}
    .item-row input{flex:1}
    .item-row .sm{max-width:80px}
    .sm-btn{border:0;border-radius:6px;padding:8px 12px;font-weight:700;cursor:pointer}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    .detail p{margin:6px 0}
    .items h3{margin:12px 0 8px}
    .item-line{display:grid;grid-template-columns:2fr 0.5fr 1fr 1fr;padding:6px 0;font-size:13px;gap:8px}
    @media(max-width:1000px){.kpis{grid-template-columns:repeat(3,1fr)}}
  `]
})
export class InvoicesComponent {
  private api = inject(InvoicesService);
  items: any[] = [];
  loading = true;
  error = '';
  showCreate = false;
  selected: any = null;
  form: any = { clientId: '', taxRate: 0, discountPercent: 0, notes: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] };

  ngOnInit() { this.loadAll(); }

  countByStatus(s: string) { return this.items.filter(i => i.status === s).length; }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({ next: (d) => { this.items = d; this.loading = false; }, error: () => { this.error = 'Failed to load invoices.'; this.loading = false; } });
  }

  openCreate() { this.showCreate = true; this.form = { clientId: '', taxRate: 0, discountPercent: 0, notes: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] }; }

  createInvoice() {
    this.api.create(this.form).subscribe({ next: () => { this.showCreate = false; this.loadAll(); } });
  }

  issueInvoice(inv: any) { this.api.issue(inv.id).subscribe({ next: () => this.loadAll() }); }
  voidInvoice(inv: any) { if (confirm('Void this invoice?')) this.api.voidInvoice(inv.id).subscribe({ next: () => this.loadAll() }); }
}
