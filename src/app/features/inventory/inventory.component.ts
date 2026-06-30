import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from './inventory.service';
import { InventoryProduct } from './inventory.models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Inventory</h1>
          <p>Manage products, stock levels, and reorder items.</p>
        </div>
        <button class="primary" (click)="openForm()">+ Add Product</button>
      </div>

      <div class="toolbar">
        <input [(ngModel)]="search" (input)="load()" placeholder="Search products...">
        <select [(ngModel)]="categoryFilter" (change)="load()">
          <option value="">All Categories</option>
          <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
        </select>
      </div>

      <div class="low-stock-banner" *ngIf="lowStock.length > 0">
        <strong>{{ lowStock.length }} product(s) low on stock.</strong>
        <span>Reorder soon to avoid stockouts.</span>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading inventory...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load inventory.</strong>
        <p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && products.length === 0">
        <p>No products found. Add your first inventory item.</p>
      </div>

      <div class="inventory-grid" *ngIf="!loading && !error && products.length > 0">
        <div class="product-card" *ngFor="let p of products" [class.low]="p.quantity <= p.minStockLevel" [class.inactive]="!p.isActive">
          <div class="card-top">
            <strong>{{ p.name }}</strong>
            <span class="stock-badge" [class.low]="p.quantity <= p.minStockLevel">
              {{ p.quantity }} {{ p.unit }}
            </span>
          </div>
          <div class="card-meta">
            <span *ngIf="p.sku">SKU: {{ p.sku }}</span>
            <span *ngIf="p.category">{{ p.category }}</span>
          </div>
          <div class="stock-bar">
            <div class="stock-fill" [style.width.%]="getStockPct(p)"></div>
          </div>
          <div class="card-actions">
            <button (click)="edit(p)">Edit</button>
            <button (click)="openAdjust(p)">Adjust</button>
            <button class="danger" (click)="toggleActive(p)">
              {{ p.isActive ? 'Archive' : 'Activate' }}
            </button>
          </div>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <form (ngSubmit)="save()">
            <h2>{{ editingId ? 'Edit Product' : 'Add Product' }}</h2>
            <input name="name" [(ngModel)]="form.name" placeholder="Product name" required>
            <input name="sku" [(ngModel)]="form.sku" placeholder="SKU">
            <input name="category" [(ngModel)]="form.category" placeholder="Category">
            <input name="quantity" [(ngModel)]="form.quantity" type="number" placeholder="Quantity">
            <input name="unit" [(ngModel)]="form.unit" placeholder="Unit (piece, bottle, etc)">
            <input name="minStockLevel" [(ngModel)]="form.minStockLevel" type="number" placeholder="Min stock level">
            <input name="price" [(ngModel)]="form.price" type="number" step="0.01" placeholder="Price">
            <textarea name="description" [(ngModel)]="form.description" placeholder="Description"></textarea>
            <div class="form-actions">
              <button type="button" (click)="closeForm()">Cancel</button>
              <button type="submit">{{ editingId ? 'Update' : 'Save Product' }}</button>
            </div>
          </form>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showAdjust" (click)="closeAdjust()">
        <div class="drawer-panel drawer-wide" (click)="$event.stopPropagation()">
          <h2>Adjust Stock: {{ adjustProduct?.name }}</h2>
          <p>Current: <strong>{{ adjustProduct?.quantity }} {{ adjustProduct?.unit }}</strong></p>
          <div class="adjust-form">
            <select [(ngModel)]="adjustForm.type">
              <option value="IN">Add Stock (IN)</option>
              <option value="OUT">Remove Stock (OUT)</option>
              <option value="ADJUSTMENT">Set Quantity (ADJUSTMENT)</option>
            </select>
            <input [(ngModel)]="adjustForm.quantity" type="number" min="1" placeholder="Quantity">
            <input [(ngModel)]="adjustForm.notes" placeholder="Notes (optional)">
            <div class="form-actions">
              <button type="button" (click)="closeAdjust()">Cancel</button>
              <button (click)="doAdjust()">Apply</button>
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
    .toolbar{display:flex;gap:12px;flex-wrap:wrap}
    .toolbar input{flex:1;min-width:200px;padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .toolbar select{padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .low-stock-banner{display:flex;gap:12px;align-items:center;background:#fef2f2;border:1px solid #fecaca;border-radius:16px;padding:16px 20px}
    .low-stock-banner strong{color:#991b1b}
    .low-stock-banner span{color:#7f1d1d;font-size:13px}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .inventory-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .product-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .product-card.low{border-color:#fecaca}
    .product-card.inactive{opacity:.6}
    .card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .card-top strong{font-size:16px}
    .stock-badge{font-size:12px;font-weight:700;background:#f0fdf4;padding:4px 12px;border-radius:20px;color:#16a34a}
    .stock-badge.low{background:#fef2f2;color:#dc2626}
    .card-meta{display:flex;gap:12px;font-size:12px;color:#6b7280;margin-bottom:12px}
    .stock-bar{background:#f3f4f6;border-radius:6px;height:6px;overflow:hidden;margin-bottom:14px}
    .stock-fill{height:100%;background:#16a34a;border-radius:6px;transition:width .3s}
    .product-card.low .stock-fill{background:#dc2626}
    .card-actions{display:flex;gap:8px}
    .card-actions button{border:0;border-radius:10px;padding:9px 14px;font-weight:700;cursor:pointer;font-size:12px;background:#f3f4f6;flex:1}
    .card-actions .danger{background:#fee2e2;color:#991b1b}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;width:min(460px,90%);max-height:90vh;overflow-y:auto;padding:28px}
    .drawer-panel.drawer-wide{width:min(540px,90%)}
    .drawer-panel h2{margin:0 0 18px}
    form{display:grid;gap:14px}
    form input,select,textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    textarea{min-height:80px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child,.drawer-panel .form-actions button:last-child{background:#0b0b0b;color:white}
    .adjust-form{display:grid;gap:12px;margin-top:16px}
    .adjust-form select,input{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    @media(max-width:1200px){.inventory-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.inventory-grid{grid-template-columns:1fr}.toolbar{flex-direction:column}}
    @media(max-width:600px){.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class InventoryComponent {
  private api = inject(InventoryService);

  products: InventoryProduct[] = [];
  lowStock: InventoryProduct[] = [];
  categories: string[] = [];
  search = '';
  categoryFilter = '';
  loading = true;
  error = '';

  showForm = false;
  editingId = '';
  form: any = { name: '', sku: '', category: '', quantity: 0, unit: 'piece', minStockLevel: 5, price: 0, description: '' };

  showAdjust = false;
  adjustProduct: InventoryProduct | null = null;
  adjustForm: any = { type: 'IN', quantity: 1, notes: '' };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    const params: any = {};
    if (this.search) params.search = this.search;
    if (this.categoryFilter) params.category = this.categoryFilter;
    this.api.getAll(params).subscribe({
      next: (d) => {
        this.products = d;
        this.categories = [...new Set(d.filter(p => p.category).map(p => p.category as string))];
        this.loading = false;
      },
      error: () => { this.error = 'Inventory data unavailable.'; this.loading = false; },
    });
    this.api.getLowStock().subscribe({ next: (d) => this.lowStock = d, error: () => {} });
  }

  getStockPct(p: InventoryProduct): number {
    const max = Math.max(p.quantity, p.minStockLevel) * 2;
    return Math.min(100, (p.quantity / max) * 100);
  }

  openForm() {
    this.editingId = '';
    this.form = { name: '', sku: '', category: '', quantity: 0, unit: 'piece', minStockLevel: 5, price: 0, description: '' };
    this.showForm = true;
  }

  closeForm() { this.showForm = false; }

  edit(p: InventoryProduct) {
    this.editingId = p.id;
    this.form = { name: p.name, sku: p.sku, category: p.category, quantity: p.quantity, unit: p.unit, minStockLevel: p.minStockLevel, price: p.price, description: p.description };
    this.showForm = true;
  }

  save() {
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.load(); } });
  }

  toggleActive(p: InventoryProduct) {
    this.api.update(p.id, { isActive: !p.isActive }).subscribe({ next: () => this.load() });
  }

  closeAdjust() { this.showAdjust = false; }

  openAdjust(p: InventoryProduct) {
    this.adjustProduct = p;
    this.adjustForm = { type: 'IN', quantity: 1, notes: '' };
    this.showAdjust = true;
  }

  doAdjust() {
    if (!this.adjustProduct) return;
    this.api.adjustStock(this.adjustProduct.id, this.adjustForm).subscribe({
      next: () => { this.showAdjust = false; this.load(); },
    });
  }
}
