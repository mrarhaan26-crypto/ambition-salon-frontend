import { Injectable, signal, computed } from '@angular/core';
import { InventoryService } from './inventory.service';
import { inject } from '@angular/core';
import { InventoryProduct } from './inventory.models';
import { catchError, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InventoryDetailStateService {
  private api = inject(InventoryService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly product = signal<InventoryProduct | null>(null);
  readonly productId = signal('');

  readonly productName = computed(() => this.product()?.name || 'Unknown Product');
  readonly productSku = computed(() => this.product()?.sku || '');
  readonly productCategory = computed(() => this.product()?.category || 'Uncategorized');
  readonly productQuantity = computed(() => this.product()?.quantity ?? 0);
  readonly productMinStock = computed(() => this.product()?.minStockLevel ?? 0);
  readonly productPrice = computed(() => this.product()?.price ?? 0);
  readonly productIsActive = computed(() => this.product()?.isActive ?? true);
  readonly productUnit = computed(() => this.product()?.unit || 'piece');

  readonly stockStatus = computed(() => {
    const p = this.product();
    if (!p) return '';
    if (!p.isActive) return 'Archived';
    if (Number(p.quantity) <= 0) return 'Out of Stock';
    if (Number(p.quantity) <= Number(p.minStockLevel)) return 'Low Stock';
    return 'In Stock';
  });

  load(id: string): void {
    if (!id) return;
    this.productId.set(id);
    this.loading.set(true);
    this.error.set('');
    this.api.getById(id).pipe(catchError(err => {
      this.error.set(err?.error?.message || 'Product could not be loaded.');
      this.loading.set(false);
      return of(null);
    })).subscribe(p => {
      if (p) {
        this.product.set(p);
      }
      this.loading.set(false);
    });
  }

  refresh(): void {
    if (this.productId()) {
      this.load(this.productId());
    }
  }

  clear(): void {
    this.product.set(null);
    this.productId.set('');
    this.loading.set(true);
    this.error.set('');
  }
}
