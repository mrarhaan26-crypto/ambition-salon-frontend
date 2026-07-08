import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CouponsService } from './coupons.service';
import { Coupon } from './coupons.models';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Coupons</h1><p>Discount codes and promotions.</p></div><button class="primary" (click)="openForm()">+ New Coupon</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="toolbar">
          <label><input type="checkbox" [(ngModel)]="showInactive" (change)="load()"> Show inactive</label>
        </div>
        <div class="empty" *ngIf="items.length===0"><p>No coupons yet.</p></div>
        <div class="coupon-grid" *ngIf="items.length>0">
          <div class="coupon-card" *ngFor="let c of items" [class.inactive]="!c.isActive">
            <div class="coupon-code">{{ c.code }}</div>
            <div class="coupon-desc">{{ c.description }}</div>
            <div class="coupon-value">{{ c.discountType === 'PERCENTAGE' ? c.discountValue + '%' : (c.discountValue | currency) }} off</div>
            <div class="coupon-meta" *ngIf="c.minPurchase">Min: {{ c.minPurchase | currency }}</div>
            <div class="coupon-meta">Used: {{ c.usedCount }}{{ c.maxUses ? ' / ' + c.maxUses : '' }}</div>
            <div class="coupon-meta" *ngIf="c.expiresAt">Expires: {{ c.expiresAt | date:'MMM dd, yyyy' }}</div>
            <div class="coupon-actions"><button (click)="editItem(c)">Edit</button><button class="btn-remove" (click)="confirmDelete(c)">Delete</button></div>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>{{ editingId ? 'Edit Coupon' : 'New Coupon' }}</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Code</label><input [(ngModel)]="form.code" placeholder="e.g. SUMMER20"></div>
          <div class="form-group"><label>Description</label><textarea [(ngModel)]="form.description" placeholder="Coupon description"></textarea></div>
          <div class="form-group"><label>Discount Type</label><select [(ngModel)]="form.discountType"><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed Amount</option></select></div>
          <div class="form-group"><label>Discount Value</label><input [(ngModel)]="form.discountValue" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Min Purchase ($)</label><input [(ngModel)]="form.minPurchase" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Max Uses (leave empty for unlimited)</label><input [(ngModel)]="form.maxUses" type="number" min="0"></div>
          <div class="form-group"><label>Expires At</label><input [(ngModel)]="form.expiresAt" type="date"></div>
          <div class="form-group" *ngIf="editingId"><label><input type="checkbox" [(ngModel)]="form.isActive"> Active</label></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Saving...' : (editingId ? 'Update' : 'Create') }}</button></div>
        </div>
      </div>
    </div>

    <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete=false">
      <div class="confirm-panel" (click)="$event.stopPropagation()">
        <h3>Confirm Delete</h3><p>{{ deleteMsg }}</p>
        <div class="confirm-actions"><button (click)="showDelete=false">Cancel</button><button class="btn-danger" (click)="doDelete()">Delete</button></div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .btn-remove{background:#fee2e2!important;color:#991b1b!important}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .toolbar{display:flex;gap:12px;align-items:center;font-size:13px}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .coupon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
    .coupon-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:20px;display:grid;gap:6px;box-shadow:0 8px 25px rgba(15,23,42,.04)}
    .coupon-card.inactive{opacity:.55}
    .coupon-code{font-family:monospace;font-size:20px;font-weight:900;letter-spacing:1px;color:#0b0b0b}
    .coupon-desc{font-size:13px;color:#6b7280}
    .coupon-value{font-size:18px;font-weight:800;color:#16a34a}
    .coupon-meta{font-size:12px;color:#6b7280}
    .coupon-actions{display:flex;gap:6px;margin-top:6px}
    .coupon-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    @media(max-width:900px){.coupon-grid{grid-template-columns:1fr 1fr}}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{font-size:28px;cursor:pointer;color:#6b7280;border:0;background:transparent}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-group textarea{min-height:60px;resize:vertical}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-primary{background:#0b0b0b;color:white}
    .msg{padding:12px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;text-align:center}
    .confirm-panel{background:white;border-radius:24px;padding:28px;width:min(420px,90%)}
    .confirm-panel h3{margin:0 0 8px}
    .confirm-actions{display:flex;gap:10px;margin-top:12px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-danger{background:#fee2e2;color:#991b1b}
    @media(max-width:900px){.drawer-panel{width:100%}}
  `]
})
export class CouponsComponent {
  private api = inject(CouponsService);
  items: Coupon[] = [];
  loading = true; error = '';
  showInactive = false;
  showForm = false; editingId = '';
  form: any = { code: '', description: '', discountType: 'PERCENTAGE', discountValue: 0, minPurchase: 0, maxUses: null, expiresAt: '', isActive: true };
  formMsg = ''; formBusy = false;
  showDelete = false; deleteMsg = ''; deleteAction: (() => void) | null = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getAll({ isActive: this.showInactive ? undefined : true }).subscribe({
      next: d => { this.items = d; this.loading = false; },
      error: () => { this.error = 'Coupons unavailable.'; this.loading = false; },
    });
  }
  openForm() { this.editingId = ''; this.form = { code: '', description: '', discountType: 'PERCENTAGE', discountValue: 0, minPurchase: 0, maxUses: null, expiresAt: '', isActive: true }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  editItem(c: Coupon) {
    this.editingId = c.id;
    this.form = { code: c.code, description: c.description, discountType: c.discountType, discountValue: c.discountValue, minPurchase: c.minPurchase, maxUses: c.maxUses, expiresAt: c.expiresAt ? c.expiresAt.slice(0,10) : '', isActive: c.isActive };
    this.showForm = true;
  }
  save() {
    this.formBusy = true; this.formMsg = '';
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.formBusy = false; this.load(); }, error: () => { this.formMsg = 'Failed to save coupon.'; this.formBusy = false; } });
  }
  confirmDelete(c: Coupon) { this.deleteMsg = `Delete coupon "${c.code}"?`; this.deleteAction = () => { this.api.remove(c.id).subscribe({ next: () => { this.showDelete = false; this.load(); } }); }; this.showDelete = true; }
  doDelete() { if (this.deleteAction) this.deleteAction(); }
}
