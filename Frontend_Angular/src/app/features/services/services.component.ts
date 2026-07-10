import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServicesService } from './services.service';
import { SalonService, ServiceCategory } from './services.models';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Services & Catalog</h1>
          <p>Manage salon services, categories, pricing, and duration.</p>
        </div>
        <div class="head-actions">
          <button (click)="openCategoryForm()">+ Category</button>
          <button class="primary" (click)="openForm()">+ Add Service</button>
        </div>
      </div>

      <div class="toolbar">
        <input [(ngModel)]="search" (input)="load()" placeholder="Search services...">
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading services...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load services.</strong>
        <p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && services.length === 0">
        <p>No services found. Add your first service to get started.</p>
      </div>

      <ng-container *ngIf="!loading && !error && services.length > 0">
        <div class="category-filter">
          <button [class.active]="!filterCategory" (click)="filterAll()">All</button>
          <button *ngFor="let cat of categories" [class.active]="filterCategory === cat.id" (click)="filterByCategory(cat.id)">{{ cat.name }} ({{ cat._count?.services || 0 }})</button>
        </div>

        <div class="services-grid">
          <div class="service-card" *ngFor="let svc of services" [class.inactive]="!svc.isActive">
            <div class="card-top">
              <strong>{{ svc.name }}</strong>
              <span class="tag">{{ svc.category?.name || 'Uncategorized' }}</span>
            </div>
            <div class="card-meta">
              <span>{{ svc.durationMin }} min</span>
              <b>{{ svc.price | currency }}</b>
            </div>
            <p class="desc">{{ svc.description || 'No description' }}</p>
            <div class="card-actions">
              <button (click)="edit(svc)">Edit</button>
              <button class="danger" (click)="toggleActive(svc)">
                {{ svc.isActive ? 'Archive' : 'Activate' }}
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <form (ngSubmit)="save()">
            <h2>{{ editingId ? 'Edit Service' : 'Add Service' }}</h2>
            <input name="name" [(ngModel)]="form.name" placeholder="Service name" required>
            <select name="categoryId" [(ngModel)]="form.categoryId">
              <option value="">No category</option>
              <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
            </select>
            <input name="durationMin" [(ngModel)]="form.durationMin" placeholder="Duration in minutes" type="number" required>
            <input name="price" [(ngModel)]="form.price" placeholder="Price" type="number" step="0.01" required>
            <textarea name="description" [(ngModel)]="form.description" placeholder="Description"></textarea>
            <div class="form-actions">
              <button type="button" (click)="closeForm()">Cancel</button>
              <button type="submit">{{ editingId ? 'Update' : 'Save Service' }}</button>
            </div>
          </form>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showCategoryForm" (click)="closeCategoryForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <form (ngSubmit)="saveCategory()">
            <h2>{{ editingCatId ? 'Edit Category' : 'Add Category' }}</h2>
            <input name="catName" [(ngModel)]="catForm.name" placeholder="Category name" required>
            <textarea name="catDesc" [(ngModel)]="catForm.description" placeholder="Description"></textarea>
            <div class="form-actions">
              <button type="button" (click)="closeCategoryForm()">Cancel</button>
              <button type="submit">{{ editingCatId ? 'Update' : 'Save Category' }}</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .head-actions{display:flex;gap:10px}
    .primary,.head-actions button{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer}
    .primary{background:#0b0b0b;color:white}
    .head-actions button:first-child{background:#f3f4f6}
    .toolbar input{width:100%;padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .category-filter{display:flex;gap:8px;flex-wrap:wrap}
    .category-filter button{border:1px solid #e5e7eb;border-radius:20px;padding:8px 16px;font-weight:600;cursor:pointer;background:white;font-size:13px}
    .category-filter button.active{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .service-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .service-card.inactive{opacity:.6}
    .card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .card-top strong{font-size:18px}
    .tag{font-size:11px;background:#f3f4f6;padding:4px 10px;border-radius:20px;font-weight:600;color:#374151}
    .card-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .card-meta span{color:#6b7280;font-size:14px}
    .card-meta b{font-size:20px}
    .desc{font-size:13px;color:#6b7280;margin:0 0 14px}
    .card-actions{display:flex;gap:8px}
    .card-actions button{border:0;border-radius:10px;padding:9px 14px;font-weight:700;cursor:pointer;font-size:12px;background:#f3f4f6;flex:1}
    .card-actions .danger{background:#fee2e2;color:#991b1b}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;width:min(460px,90%);max-height:90vh;overflow-y:auto;padding:28px}
    .drawer-panel h2{margin:0 0 18px}
    form{display:grid;gap:14px}
    form input,select,textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    textarea{min-height:80px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    @media(max-width:1200px){.services-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.services-grid{grid-template-columns:1fr}.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class ServicesComponent {
  private api = inject(ServicesService);

  services: SalonService[] = [];
  categories: ServiceCategory[] = [];
  search = '';
  filterCategory = '';
  loading = true;
  error = '';

  showForm = false;
  editingId = '';
  form: any = { name: '', categoryId: '', durationMin: 30, price: 0, description: '' };

  showCategoryForm = false;
  editingCatId = '';
  catForm: any = { name: '', description: '' };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    const params: any = {};
    if (this.search) params.search = this.search;
    if (this.filterCategory) params.categoryId = this.filterCategory;
    this.api.getAll(params).subscribe({
      next: (d) => { this.services = d; this.loading = false; },
      error: () => { this.error = 'Services data unavailable.'; this.loading = false; },
    });
    this.api.getCategories().subscribe({
      next: (d) => this.categories = d,
      error: () => {},
    });
  }

  filterAll() { this.filterCategory = ''; this.load(); }

  filterByCategory(id: string) { this.filterCategory = id; this.load(); }

  openForm() {
    this.editingId = '';
    this.form = { name: '', categoryId: '', durationMin: 30, price: 0, description: '' };
    this.showForm = true;
  }

  closeForm() { this.showForm = false; }

  edit(svc: SalonService) {
    this.editingId = svc.id;
    this.form = { name: svc.name, categoryId: svc.categoryId || '', durationMin: svc.durationMin, price: svc.price, description: svc.description };
    this.showForm = true;
  }

  save() {
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.load(); } });
  }

  toggleActive(svc: SalonService) {
    this.api.update(svc.id, { isActive: !svc.isActive }).subscribe({ next: () => this.load() });
  }

  closeCategoryForm() { this.showCategoryForm = false; }

  openCategoryForm() {
    this.editingCatId = '';
    this.catForm = { name: '', description: '' };
    this.showCategoryForm = true;
  }

  saveCategory() {
    const obs = this.editingCatId ? this.api.updateCategory(this.editingCatId, this.catForm) : this.api.createCategory(this.catForm);
    obs.subscribe({ next: () => { this.showCategoryForm = false; this.load(); } });
  }
}
