import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventoryService } from './inventory.service';
import { InventoryProduct } from './inventory.models';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="if-container">
      <div class="if-head">
        <a class="if-back" routerLink="/app/inventory">&larr; Inventory</a>
        <h1>{{ editingId() ? 'Edit Product' : 'New Product' }}</h1>
        <p>{{ editingId() ? 'Update product details and stock info.' : 'Add a new product to inventory.' }}</p>
      </div>

      <div *ngIf="loading()" class="if-state loading"><div class="spinner"></div><p>Loading product…</p></div>

      <div *ngIf="error()" class="if-state error" role="alert"><span class="state-icon">⚠️</span><p>{{ error() }}</p></div>

      <form class="if-form" *ngIf="!loading()" (ngSubmit)="save()">
        <div class="if-card">
          <h2>Basic Information</h2>
          <div class="if-field"><label>Name *</label><input name="name" [(ngModel)]="form.name" required placeholder="Product name"></div>
          <div class="if-field"><label>SKU</label><input name="sku" [(ngModel)]="form.sku" placeholder="Stock keeping unit"></div>
          <div class="if-field"><label>Category</label><input name="category" [(ngModel)]="form.category" placeholder="e.g. Haircare, Styling"></div>
          <div class="if-field"><label>Description</label><textarea name="description" [(ngModel)]="form.description" placeholder="Product description"></textarea></div>
        </div>

        <div class="if-card">
          <h2>Stock & Pricing</h2>
          <div class="if-grid2">
            <div class="if-field"><label>Quantity</label><input name="quantity" [(ngModel)]="form.quantity" type="number" min="0"></div>
            <div class="if-field"><label>Unit</label><input name="unit" [(ngModel)]="form.unit" placeholder="piece, ml, g"></div>
          </div>
          <div class="if-grid2">
            <div class="if-field"><label>Min Stock Level</label><input name="minStockLevel" [(ngModel)]="form.minStockLevel" type="number" min="0"></div>
            <div class="if-field"><label>Price ($)</label><input name="price" [(ngModel)]="form.price" type="number" min="0" step="0.01"></div>
          </div>
        </div>

        <div class="if-error" *ngIf="saveError()">{{ saveError() }}</div>

        <div class="if-actions">
          <a class="if-btn if-btn-ghost" routerLink="/app/inventory">Cancel</a>
          <button type="submit" class="if-btn if-btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : editingId() ? 'Update Product' : 'Save Product' }}</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .if-container{max-width:680px;padding:0 4px}
    .if-head{margin-bottom:24px}
    .if-back{display:inline-flex;align-items:center;font-size:13px;font-weight:600;color:var(--text-soft,#64748b);text-decoration:none;padding:6px 12px;border-radius:10px;border:1px solid var(--border-subtle,#e5e7eb);margin-bottom:12px}
    .if-head h1{font-size:28px;margin:0 0 6px;color:var(--text-strong,#111827)}
    .if-head p{color:var(--text-soft,#64748b);margin:0}
    .if-state{text-align:center;padding:40px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .if-state.loading{display:flex;align-items:center;justify-content:center;gap:12px;color:var(--text-soft,#64748b)}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:#6366f1;border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .if-form{display:grid;gap:20px}
    .if-card{background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px;padding:20px}
    .if-card h2{margin:0 0 16px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .if-field{display:grid;gap:6px;margin-bottom:14px}
    .if-field:last-child{margin-bottom:0}
    .if-field label{font-size:12px;font-weight:700;color:var(--text-soft,#64748b);text-transform:uppercase;letter-spacing:.03em}
    .if-field input,.if-field textarea{padding:11px 13px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;background:var(--surface-app,#f8fafc);font-size:14px;min-width:0}
    .if-field textarea{min-height:80px;resize:vertical}
    .if-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .if-error{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 16px;color:#991b1b;font-size:13px;font-weight:600}
    .if-actions{display:flex;gap:12px;justify-content:flex-end;padding:4px 0 40px}
    .if-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;cursor:pointer;border:0;transition:all .15s}
    .if-btn-primary{background:linear-gradient(135deg,#84cc16,#22c55e);color:#fff}
    .if-btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .if-btn-ghost{background:var(--surface-muted,#f1f5f9);color:var(--text-strong,#111827)}
    @media(max-width:600px){.if-grid2{grid-template-columns:1fr}}
  `]
})
export class InventoryFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(InventoryService);

  editingId = signal('');
  loading = signal(false);
  error = signal('');
  saving = signal(false);
  saveError = signal('');

  form: any = this.defaultForm();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      this.loading.set(true);
      this.api.getById(id).pipe(catchError(err => {
        this.error.set(err?.error?.message || 'Product could not be loaded.');
        this.loading.set(false);
        return of(null);
      })).subscribe(p => {
        if (p) {
          this.form = {
            name: p.name,
            sku: p.sku || '',
            category: p.category || '',
            description: p.description || '',
            quantity: p.quantity,
            unit: p.unit,
            minStockLevel: p.minStockLevel,
            price: p.price,
          };
        }
        this.loading.set(false);
      });
    }
  }

  private defaultForm(): any {
    return { name: '', sku: '', category: '', description: '', quantity: 0, unit: 'piece', minStockLevel: 5, price: 0 };
  }

  save() {
    this.saveError.set('');
    const name = String(this.form.name || '').trim();
    if (!name) { this.saveError.set('Product name is required.'); return; }

    const body = {
      ...this.form,
      name,
      sku: String(this.form.sku || '').trim(),
      category: String(this.form.category || '').trim(),
      description: String(this.form.description || '').trim(),
      quantity: Number(this.form.quantity) || 0,
      unit: String(this.form.unit || 'piece').trim() || 'piece',
      minStockLevel: Number(this.form.minStockLevel) || 0,
      price: Number(this.form.price) || 0,
    };

    this.saving.set(true);
    const request = this.editingId() ? this.api.update(this.editingId(), body) : this.api.create(body);
    request.subscribe({
      next: () => this.router.navigate(['/app/inventory']),
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message || 'Product could not be saved.');
      },
    });
  }
}
