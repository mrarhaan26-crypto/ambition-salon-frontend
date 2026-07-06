import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BillingRulesService } from './billing-rules.service';

@Component({
  selector: 'app-billing-rules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Billing Rules</h1>
          <p>Tax rates, discounts, and billing settings.</p>
        </div>
        <button class="primary" (click)="saveRules()">Save Settings</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="panel">
          <h2>Billing Settings</h2>
          <div class="form-grid">
            <label>Default Currency</label>
            <input [(ngModel)]="rules.currency" placeholder="USD">
            <label>Default Tax Rate (%)</label>
            <input [(ngModel)]="rules.defaultTaxRate" type="number" step="0.1">
            <label>Invoice Prefix</label>
            <input [(ngModel)]="rules.invoicePrefix" placeholder="INV-">
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h2>Tax Rules</h2>
            <button (click)="showTaxForm = true; taxForm = { name: '', rate: 0 }">+ Add Tax</button>
          </div>
          <div class="empty" *ngIf="taxes.length === 0"><p>No tax rules defined.</p></div>
          <div class="table" *ngIf="taxes.length > 0">
            <div class="th"><span>Name</span><span>Rate</span><span>Active</span><span>Actions</span></div>
            <div class="tr" *ngFor="let t of taxes">
              <span>{{ t.name }}</span><span>{{ t.rate }}%</span>
              <span><span class="badge" [class.active]="t.isActive">{{ t.isActive ? 'Active' : 'Inactive' }}</span></span>
              <span class="actions">
                <button (click)="toggleTax(t)">{{ t.isActive ? 'Deactivate' : 'Activate' }}</button>
                <button class="danger" (click)="deleteTax(t)">Delete</button>
              </span>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h2>Discount Rules</h2>
            <button (click)="showDiscountForm = true; discountForm = { name: '', type: 'PERCENTAGE', value: 0 }">+ Add Discount</button>
          </div>
          <div class="empty" *ngIf="discounts.length === 0"><p>No discount rules defined.</p></div>
          <div class="table" *ngIf="discounts.length > 0">
            <div class="th"><span>Name</span><span>Type</span><span>Value</span><span>Active</span><span>Actions</span></div>
            <div class="tr" *ngFor="let d of discounts">
              <span>{{ d.name }}</span><span>{{ d.type }}</span><span>{{ d.type === 'PERCENTAGE' ? d.value+'%' : '$'+d.value }}</span>
              <span><span class="badge" [class.active]="d.isActive">{{ d.isActive ? 'Active' : 'Inactive' }}</span></span>
              <span class="actions">
                <button (click)="toggleDiscount(d)">{{ d.isActive ? 'Deactivate' : 'Activate' }}</button>
                <button class="danger" (click)="deleteDiscount(d)">Delete</button>
              </span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer" *ngIf="showTaxForm">
        <div class="drawer-panel">
          <h2>Add Tax</h2>
          <div class="form">
            <input [(ngModel)]="taxForm.name" placeholder="Tax name">
            <input [(ngModel)]="taxForm.rate" type="number" step="0.1" placeholder="Rate %">
            <div class="form-actions">
              <button type="button" (click)="showTaxForm = false">Cancel</button>
              <button (click)="createTax()">Add</button>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer" *ngIf="showDiscountForm">
        <div class="drawer-panel">
          <h2>Add Discount</h2>
          <div class="form">
            <input [(ngModel)]="discountForm.name" placeholder="Discount name">
            <select [(ngModel)]="discountForm.type">
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
            <input [(ngModel)]="discountForm.value" type="number" step="0.1" placeholder="Value">
            <div class="form-actions">
              <button type="button" (click)="showDiscountForm = false">Cancel</button>
              <button (click)="createDiscount()">Add</button>
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
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .panel-head h2{margin:0}
    .panel-head button{border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;background:white}
    h2{font-size:20px;margin:0 0 16px}
    .form-grid{display:grid;gap:12px;max-width:400px}
    .form-grid label{font-size:13px;font-weight:600;color:#374151;margin-bottom:-6px}
    .form-grid input{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .table{display:grid;gap:2px;font-size:13px}
    .th,.tr{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;padding:10px 12px;align-items:center;gap:8px}
    .th{font-weight:700;color:#6b7280}
    .tr{background:#f8fafc;border-radius:8px}
    .badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .badge.active{background:#f0fdf4;color:#16a34a}
    .badge:not(.active){background:#f3f4f6;color:#6b7280}
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
  `]
})
export class BillingRulesComponent {
  private api = inject(BillingRulesService);
  rules: any = { currency: 'USD', defaultTaxRate: '0', invoicePrefix: 'INV-' };
  taxes: any[] = [];
  discounts: any[] = [];
  loading = true;
  error = '';
  showTaxForm = false;
  showDiscountForm = false;
  taxForm: any = { name: '', rate: 0 };
  discountForm: any = { name: '', type: 'PERCENTAGE', value: 0 };

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getRules().subscribe({ next: (d) => { this.rules = d; this.loading = false; }, error: () => { this.error = 'Failed to load billing rules.'; this.loading = false; } });
    this.api.getTaxes().subscribe({ next: (d) => this.taxes = d, error: () => this.error = 'Failed to load taxes.' });
    this.api.getDiscounts().subscribe({ next: (d) => this.discounts = d, error: () => this.error = 'Failed to load discounts.' });
  }

  saveRules() { this.api.updateRules(this.rules).subscribe({ error: () => this.error = 'Failed to save billing rules.' }); }
  createTax() { this.api.createTax(this.taxForm).subscribe({ next: () => { this.showTaxForm = false; this.api.getTaxes().subscribe({ next: (d) => this.taxes = d }); } }); }
  toggleTax(t: any) { this.api.updateTax(t.id, { isActive: !t.isActive }).subscribe({ next: () => this.api.getTaxes().subscribe({ next: (d) => this.taxes = d }) }); }
  deleteTax(t: any) { if (confirm('Delete tax?')) this.api.removeTax(t.id).subscribe({ next: () => this.api.getTaxes().subscribe({ next: (d) => this.taxes = d }) }); }
  createDiscount() { this.api.createDiscount(this.discountForm).subscribe({ next: () => { this.showDiscountForm = false; this.api.getDiscounts().subscribe({ next: (d) => this.discounts = d }); } }); }
  toggleDiscount(d: any) { this.api.updateDiscount(d.id, { isActive: !d.isActive }).subscribe({ next: () => this.api.getDiscounts().subscribe({ next: (d) => this.discounts = d }) }); }
  deleteDiscount(d: any) { if (confirm('Delete discount?')) this.api.removeDiscount(d.id).subscribe({ next: () => this.api.getDiscounts().subscribe({ next: (d) => this.discounts = d }) }); }
}
