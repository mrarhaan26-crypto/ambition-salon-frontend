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
          <p>Manage products, stock levels, and retail readiness.</p>
        </div>
        <div class="head-actions">
          <button class="refresh-btn" type="button" (click)="load()" [disabled]="loading">Refresh</button>
          <button class="primary" type="button" (click)="openForm()">+ Add Product</button>
        </div>
      </div>

      <div class="kpis" *ngIf="!loading || products.length > 0">
        <div class="kpi-card">
          <span>Total Products</span>
          <strong>{{ activeProducts().length }}</strong>
        </div>
        <div class="kpi-card warn">
          <span>Low Stock</span>
          <strong>{{ lowStockProducts().length }}</strong>
        </div>
        <div class="kpi-card danger">
          <span>Out of Stock</span>
          <strong>{{ outOfStockProducts().length }}</strong>
        </div>
        <div class="kpi-card value">
          <span>Inventory Value</span>
          <strong>{{ inventoryValue() | currency:'USD':'symbol':'1.0-0' }}</strong>
        </div>
      </div>

      <div class="toolbar">
        <label>
          <span>Search</span>
          <input [(ngModel)]="search" placeholder="Name, SKU, or category">
        </label>
        <label>
          <span>Category</span>
          <select [(ngModel)]="categoryFilter">
            <option value="">All categories</option>
            <option *ngFor="let cat of categoryOptions()" [value]="cat">{{ cat }}</option>
          </select>
        </label>
        <label>
          <span>Status</span>
          <select [(ngModel)]="statusFilter">
            <option value="ACTIVE">Active stock</option>
            <option value="LOW">Low stock</option>
            <option value="OUT">Out of stock</option>
            <option value="ARCHIVED">Archived</option>
            <option value="ALL">All products</option>
          </select>
        </label>
        <button class="ghost-btn" type="button" (click)="clearFilters()" [disabled]="!hasFilters()">Clear</button>
      </div>

      <div class="stock-watch" *ngIf="!loading && !error">
        <div>
          <strong>Stock Watch</strong>
          <p *ngIf="lowStockProducts().length > 0">{{ lowStockProducts().length }} product(s) need attention.</p>
          <p *ngIf="lowStockProducts().length === 0">No low-stock products in the current inventory.</p>
        </div>
        <span class="watch-chip" [class.clean]="lowStockProducts().length === 0">
          {{ lowStockProducts().length === 0 ? 'Healthy' : 'Review stock' }}
        </span>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading inventory...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load inventory.</strong>
        <p>{{ error }}</p>
        <button type="button" (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && products.length === 0">
        <strong>No products yet.</strong>
        <p>Add your first retail product to start tracking quantity, value, and stock movements.</p>
        <button class="primary" type="button" (click)="openForm()">Add Product</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && products.length > 0 && filteredProducts().length === 0">
        <strong>No matching products.</strong>
        <p>Adjust search, category, or status filters to widen the list.</p>
        <button class="ghost-btn" type="button" (click)="clearFilters()">Clear Filters</button>
      </div>

      <div class="table-panel" *ngIf="!loading && !error && filteredProducts().length > 0">
        <div class="table-head">
          <div>
            <h2>Products</h2>
            <p>{{ filteredProducts().length }} shown of {{ products.length }} loaded.</p>
          </div>
        </div>

        <div class="inventory-table">
          <div class="table-row table-row-head">
            <span>Product</span>
            <span>SKU</span>
            <span>Category</span>
            <span>Quantity</span>
            <span>Min</span>
            <span>Price</span>
            <span>Stock Value</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div class="table-row" *ngFor="let p of filteredProducts()" [class.archived]="!p.isActive">
            <div class="product-cell">
              <strong>{{ p.name }}</strong>
              <small *ngIf="p.description">{{ p.description }}</small>
            </div>
            <span>{{ p.sku || '-' }}</span>
            <span>{{ p.category || 'Uncategorized' }}</span>
            <strong>{{ p.quantity }} {{ p.unit }}</strong>
            <span>{{ p.minStockLevel }}</span>
            <span>{{ p.price | currency:'USD':'symbol':'1.0-0' }}</span>
            <strong>{{ stockValue(p) | currency:'USD':'symbol':'1.0-0' }}</strong>
            <span class="status-badge" [ngClass]="stockStatusClass(p)">{{ stockStatus(p) }}</span>
            <div class="row-actions">
              <button type="button" (click)="edit(p)">Edit</button>
              <button type="button" (click)="openAdjust(p)" [disabled]="!p.isActive">Adjust</button>
              <button type="button" (click)="openHistory(p)">History</button>
              <button type="button" class="danger" (click)="toggleActive(p)">
                {{ p.isActive ? 'Archive' : 'Activate' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <form (ngSubmit)="save()">
            <div class="drawer-title">
              <h2>{{ editingId ? 'Edit Product' : 'Add Product' }}</h2>
              <button type="button" class="icon-btn" (click)="closeForm()">x</button>
            </div>
            <label><span>Product name</span><input name="name" [(ngModel)]="form.name" required></label>
            <label><span>SKU</span><input name="sku" [(ngModel)]="form.sku"></label>
            <label><span>Category</span><input name="category" [(ngModel)]="form.category"></label>
            <div class="form-grid">
              <label><span>Quantity</span><input name="quantity" [(ngModel)]="form.quantity" type="number" min="0"></label>
              <label><span>Unit</span><input name="unit" [(ngModel)]="form.unit"></label>
              <label><span>Min stock</span><input name="minStockLevel" [(ngModel)]="form.minStockLevel" type="number" min="0"></label>
              <label><span>Price</span><input name="price" [(ngModel)]="form.price" type="number" min="0" step="0.01"></label>
            </div>
            <label><span>Description</span><textarea name="description" [(ngModel)]="form.description"></textarea></label>
            <div class="checkout-error" *ngIf="formError">{{ formError }}</div>
            <div class="form-actions">
              <button type="button" (click)="closeForm()">Cancel</button>
              <button type="submit" [disabled]="saving">{{ saving ? 'Saving...' : editingId ? 'Update Product' : 'Save Product' }}</button>
            </div>
          </form>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showAdjust" (click)="closeAdjust()">
        <div class="drawer-panel drawer-wide" (click)="$event.stopPropagation()">
          <div class="drawer-title">
            <div>
              <h2>Adjust Stock</h2>
              <p>{{ adjustProduct?.name }}</p>
            </div>
            <button type="button" class="icon-btn" (click)="closeAdjust()">x</button>
          </div>

          <div class="adjust-current" *ngIf="adjustProduct">
            <span>Current</span>
            <strong>{{ adjustProduct.quantity }} {{ adjustProduct.unit }}</strong>
            <span>Projected</span>
            <strong>{{ projectedQuantity() }} {{ adjustProduct.unit }}</strong>
          </div>

          <div class="adjust-form">
            <label>
              <span>Adjustment type</span>
              <select [(ngModel)]="adjustForm.type">
                <option value="IN">IN - Add stock</option>
                <option value="OUT">OUT - Remove stock</option>
                <option value="ADJUSTMENT">ADJUSTMENT - Set quantity</option>
              </select>
            </label>
            <label>
              <span>Quantity</span>
              <input [(ngModel)]="adjustForm.quantity" type="number" min="1" placeholder="Quantity">
            </label>
            <label>
              <span>Notes</span>
              <input [(ngModel)]="adjustForm.notes" placeholder="Reason or supplier note">
            </label>
            <div class="checkout-error" *ngIf="adjustError">{{ adjustError }}</div>
            <div class="form-actions">
              <button type="button" (click)="closeAdjust()">Cancel</button>
              <button type="button" (click)="doAdjust()" [disabled]="adjustBusy">{{ adjustBusy ? 'Applying...' : 'Apply Adjustment' }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="historyProduct" (click)="closeHistory()">
        <div class="drawer-panel drawer-wide" (click)="$event.stopPropagation()">
          <div class="drawer-title">
            <div>
              <h2>Stock Movement History</h2>
              <p>{{ historyProduct.name }}</p>
            </div>
            <button type="button" class="icon-btn" (click)="closeHistory()">x</button>
          </div>

          <div class="loading mini-loading" *ngIf="historyLoading">
            <div class="spinner"></div>
            <span>Loading movement history...</span>
          </div>

          <div class="checkout-error" *ngIf="historyError">{{ historyError }}</div>

          <div class="empty compact" *ngIf="!historyLoading && !historyError && !(historyProduct.transactions || []).length">
            <strong>No stock movements yet.</strong>
            <p>Adjust stock to create the first inventory transaction.</p>
          </div>

          <div class="history-list" *ngIf="!historyLoading && (historyProduct.transactions || []).length > 0">
            <div class="history-row" *ngFor="let tx of historyProduct.transactions">
              <span class="movement-type" [ngClass]="tx.type.toLowerCase()">{{ tx.type }}</span>
              <strong>{{ tx.quantity }}</strong>
              <span>{{ tx.createdAt | date:'MMM dd, yyyy h:mm a' }}</span>
              <p>{{ tx.notes || 'No notes' }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center;gap:16px}
    h1{font-size:34px;margin:0}
    h2{margin:0;font-size:20px}
    p{color:#6b7280;margin:6px 0 0}
    .head-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .primary,.refresh-btn,.ghost-btn{border:0;border-radius:14px;padding:12px 18px;font-weight:900;cursor:pointer}
    .primary{background:#0b0b0b;color:white}
    .refresh-btn,.ghost-btn{background:white;border:1px solid #e5e7eb;color:#111827}
    button:disabled{opacity:.5;cursor:not-allowed}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:12px;text-transform:uppercase;font-weight:900;letter-spacing:.04em;margin-bottom:8px}
    .kpi-card strong{font-size:26px}.kpi-card.warn strong{color:#b45309}.kpi-card.danger strong{color:#991b1b}.kpi-card.value strong{color:#065f46}
    .toolbar{display:grid;grid-template-columns:1.4fr 1fr 1fr auto;gap:12px;align-items:end;background:white;border:1px solid #e5e7eb;border-radius:22px;padding:16px;box-shadow:0 12px 35px rgba(15,23,42,.05)}
    label{display:grid;gap:7px}label span{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
    input,select,textarea{padding:13px 14px;border:1px solid #e5e7eb;border-radius:14px;background:white;min-width:0}
    textarea{min-height:80px;resize:vertical}
    .stock-watch{display:flex;align-items:center;justify-content:space-between;gap:16px;background:white;border:1px solid #e5e7eb;border-radius:18px;padding:16px 18px}
    .stock-watch strong{font-size:15px}.stock-watch p{font-size:13px}.watch-chip{background:#fef2f2;color:#991b1b;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:900}.watch-chip.clean{background:#ecfdf5;color:#047857}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}.mini-loading{padding:24px}
    
    .error,.checkout-error{background:#fef2f2;border:1px solid #fecaca;border-radius:18px;padding:16px;color:#7f1d1d}.error{text-align:center;padding:24px}.error strong{color:#991b1b}.error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:900;cursor:pointer}
    .empty{display:grid;gap:8px;padding:42px;text-align:center;color:#6b7280;background:white;border-radius:22px;border:1px solid #e5e7eb}.empty strong{color:#111827}.empty button{justify-self:center}.empty.compact{padding:24px}
    .table-panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:22px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .table-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:16px}.table-head p{font-size:13px}
    .inventory-table{display:grid;overflow-x:auto}.table-row{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(100px,.7fr) minmax(120px,.75fr) minmax(95px,.65fr) 70px 90px 110px 120px minmax(240px,1.4fr);gap:12px;align-items:center;min-width:1120px;padding:13px 0;border-bottom:1px solid #f1f5f9}.table-row:last-child{border-bottom:0}.table-row-head{color:#6b7280;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.table-row.archived{opacity:.62}.product-cell{display:grid;gap:3px}.product-cell small{color:#6b7280;line-height:1.35}
    .status-badge{justify-self:start;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900}.status-badge.in{background:#ecfdf5;color:#047857}.status-badge.low{background:#fffbeb;color:#92400e}.status-badge.out{background:#fef2f2;color:#991b1b}.status-badge.archived{background:#f3f4f6;color:#4b5563}
    .row-actions{display:flex;gap:7px;flex-wrap:wrap}.row-actions button{border:0;border-radius:10px;background:#f3f4f6;padding:8px 10px;font-size:12px;font-weight:800;cursor:pointer}.row-actions .danger{background:#fee2e2;color:#991b1b}
    .drawer-overlay{position:fixed;inset:0;background:rgba(15,23,42,.38);display:flex;justify-content:flex-end;align-items:stretch;z-index:50}.drawer-panel{background:white;width:min(520px,100%);max-height:100vh;overflow-y:auto;padding:26px;box-shadow:-18px 0 55px rgba(15,23,42,.18)}.drawer-panel.drawer-wide{width:min(620px,100%)}
    .drawer-title{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:18px}.drawer-title p{font-size:13px}.icon-btn{width:36px;height:36px;border:1px solid #e5e7eb;background:white;border-radius:12px;font-weight:900;cursor:pointer}
    form{display:grid;gap:14px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-actions{display:flex;gap:12px;justify-content:flex-end;margin-top:4px}.form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:900;cursor:pointer}.form-actions button:first-child{background:#f3f4f6}.form-actions button:last-child{background:#0b0b0b;color:white}
    .adjust-current{display:grid;grid-template-columns:1fr auto;gap:8px;background:#f8fafc;border:1px solid #eef2f7;border-radius:16px;padding:16px;margin-bottom:16px}.adjust-current span{color:#6b7280;font-size:12px;font-weight:900;text-transform:uppercase}.adjust-form{display:grid;gap:14px}.history-list{display:grid;gap:10px}.history-row{display:grid;grid-template-columns:auto auto 1fr;gap:10px;align-items:center;border:1px solid #eef2f7;border-radius:14px;padding:12px}.history-row p{grid-column:1/4;margin:0;font-size:13px}.movement-type{border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900}.movement-type.in{background:#ecfdf5;color:#047857}.movement-type.out{background:#fef2f2;color:#991b1b}.movement-type.adjustment{background:#eff6ff;color:#1d4ed8}
    @media(max-width:1100px){.kpis{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr 1fr}.toolbar button{min-height:44px}.head{align-items:flex-start}}
    @media(max-width:700px){.head{flex-direction:column}.head-actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.kpis,.toolbar,.form-grid{grid-template-columns:1fr}.table-panel{padding:16px}.drawer-panel,.drawer-panel.drawer-wide{width:100%;padding:20px}.form-actions{display:grid;grid-template-columns:1fr}.stock-watch{align-items:flex-start;flex-direction:column}.inventory-table{margin:0 -4px}.empty{padding:28px 18px}}
  `]
})
export class InventoryComponent {
  private api = inject(InventoryService);

  products: InventoryProduct[] = [];
  lowStock: InventoryProduct[] = [];
  search = '';
  categoryFilter = '';
  statusFilter = 'ACTIVE';
  loading = true;
  error = '';

  showForm = false;
  editingId = '';
  form: any = this.defaultForm();
  formError = '';
  saving = false;

  showAdjust = false;
  adjustProduct: InventoryProduct | null = null;
  adjustForm: any = { type: 'IN', quantity: 1, notes: '' };
  adjustError = '';
  adjustBusy = false;

  historyProduct: InventoryProduct | null = null;
  historyLoading = false;
  historyError = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';

    this.api.getAll().subscribe({
      next: (products) => {
        this.products = products || [];
        this.loading = false;
      },
      error: (err) => {
        this.products = [];
        this.error = err?.error?.message || 'Inventory data unavailable.';
        this.loading = false;
      },
    });

    this.api.getLowStock().subscribe({
      next: (products) => { this.lowStock = products || []; },
      error: () => { this.lowStock = []; },
    });
  }

  private defaultForm(): any {
    return { name: '', sku: '', category: '', quantity: 0, unit: 'piece', minStockLevel: 5, price: 0, description: '' };
  }

  activeProducts(): InventoryProduct[] {
    return this.products.filter((product) => product.isActive);
  }

  lowStockProducts(): InventoryProduct[] {
    return this.activeProducts().filter((product) => Number(product.quantity) > 0 && Number(product.quantity) <= Number(product.minStockLevel));
  }

  outOfStockProducts(): InventoryProduct[] {
    return this.activeProducts().filter((product) => Number(product.quantity) <= 0);
  }

  inventoryValue(): number {
    return this.activeProducts().reduce((sum, product) => sum + this.stockValue(product), 0);
  }

  stockValue(product: InventoryProduct): number {
    return Math.max(0, Number(product.quantity) || 0) * Math.max(0, Number(product.price) || 0);
  }

  categoryOptions(): string[] {
    return Array.from(new Set(this.products.map((product) => String(product.category || '').trim()).filter(Boolean))).sort();
  }

  hasFilters(): boolean {
    return !!this.search || !!this.categoryFilter || this.statusFilter !== 'ACTIVE';
  }

  clearFilters() {
    this.search = '';
    this.categoryFilter = '';
    this.statusFilter = 'ACTIVE';
  }

  filteredProducts(): InventoryProduct[] {
    const term = this.search.trim().toLowerCase();
    return this.products.filter((product) => {
      const matchesSearch = !term || [product.name, product.sku, product.category]
        .some((value) => String(value || '').toLowerCase().includes(term));
      const matchesCategory = !this.categoryFilter || product.category === this.categoryFilter;
      const matchesStatus = this.matchesStatus(product);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  private matchesStatus(product: InventoryProduct): boolean {
    if (this.statusFilter === 'ALL') return true;
    if (this.statusFilter === 'ARCHIVED') return !product.isActive;
    if (!product.isActive) return false;
    if (this.statusFilter === 'LOW') return Number(product.quantity) > 0 && Number(product.quantity) <= Number(product.minStockLevel);
    if (this.statusFilter === 'OUT') return Number(product.quantity) <= 0;
    return true;
  }

  stockStatus(product: InventoryProduct): string {
    if (!product.isActive) return 'Archived';
    if (Number(product.quantity) <= 0) return 'Out of Stock';
    if (Number(product.quantity) <= Number(product.minStockLevel)) return 'Low Stock';
    return 'In Stock';
  }

  stockStatusClass(product: InventoryProduct): string {
    if (!product.isActive) return 'archived';
    if (Number(product.quantity) <= 0) return 'out';
    if (Number(product.quantity) <= Number(product.minStockLevel)) return 'low';
    return 'in';
  }

  openForm() {
    this.editingId = '';
    this.form = this.defaultForm();
    this.formError = '';
    this.showForm = true;
  }

  closeForm() {
    if (this.saving) return;
    this.showForm = false;
    this.formError = '';
  }

  edit(product: InventoryProduct) {
    this.editingId = product.id;
    this.form = {
      name: product.name,
      sku: product.sku || '',
      category: product.category || '',
      quantity: product.quantity,
      unit: product.unit,
      minStockLevel: product.minStockLevel,
      price: product.price,
      description: product.description || '',
    };
    this.formError = '';
    this.showForm = true;
  }

  save() {
    this.formError = '';
    const name = String(this.form.name || '').trim();
    const quantity = Number(this.form.quantity);
    const minStockLevel = Number(this.form.minStockLevel);
    const price = Number(this.form.price);

    if (!name) {
      this.formError = 'Product name is required.';
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(minStockLevel) || minStockLevel < 0 || !Number.isFinite(price) || price < 0) {
      this.formError = 'Quantity, min stock, and price must be zero or greater.';
      return;
    }

    const body = {
      ...this.form,
      name,
      sku: String(this.form.sku || '').trim(),
      category: String(this.form.category || '').trim(),
      unit: String(this.form.unit || 'piece').trim() || 'piece',
      description: String(this.form.description || '').trim(),
      quantity,
      minStockLevel,
      price,
    };

    this.saving = true;
    const request = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.formError = err?.error?.message || 'Product could not be saved.';
      },
    });
  }

  toggleActive(product: InventoryProduct) {
    this.api.update(product.id, { isActive: !product.isActive }).subscribe({
      next: () => this.load(),
      error: () => { this.error = 'Product status could not be updated.'; },
    });
  }

  openAdjust(product: InventoryProduct) {
    this.adjustProduct = product;
    this.adjustForm = { type: 'IN', quantity: 1, notes: '' };
    this.adjustError = '';
    this.showAdjust = true;
  }

  closeAdjust() {
    if (this.adjustBusy) return;
    this.showAdjust = false;
    this.adjustError = '';
  }

  projectedQuantity(): number {
    if (!this.adjustProduct) return 0;
    const current = Number(this.adjustProduct.quantity) || 0;
    const quantity = Number(this.adjustForm.quantity) || 0;
    if (this.adjustForm.type === 'IN') return current + quantity;
    if (this.adjustForm.type === 'OUT') return Math.max(0, current - quantity);
    return quantity;
  }

  doAdjust() {
    if (!this.adjustProduct) return;
    this.adjustError = '';
    const quantity = Number(this.adjustForm.quantity);
    const type = String(this.adjustForm.type || '');

    if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      this.adjustError = 'Choose a valid stock movement type.';
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.adjustError = 'Quantity must be greater than zero.';
      return;
    }

    this.adjustBusy = true;
    this.api.adjustStock(this.adjustProduct.id, {
      type,
      quantity,
      notes: String(this.adjustForm.notes || '').trim(),
    }).subscribe({
      next: () => {
        this.adjustBusy = false;
        this.closeAdjust();
        this.load();
      },
      error: (err) => {
        this.adjustBusy = false;
        this.adjustError = err?.error?.message || 'Stock adjustment could not be applied.';
      },
    });
  }

  openHistory(product: InventoryProduct) {
    this.historyProduct = product;
    this.historyLoading = true;
    this.historyError = '';

    this.api.getById(product.id).subscribe({
      next: (detail) => {
        this.historyProduct = detail;
        this.historyLoading = false;
      },
      error: (err) => {
        this.historyError = err?.error?.message || 'Movement history could not be loaded.';
        this.historyLoading = false;
      },
    });
  }

  closeHistory() {
    this.historyProduct = null;
    this.historyLoading = false;
    this.historyError = '';
  }
}