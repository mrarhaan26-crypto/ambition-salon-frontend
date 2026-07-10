import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, RouterOutlet } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { RouteTab } from '../../shared/components/route-tabs/route-tabs.component';
import { Breadcrumb } from '../../shared/theme/module-theme.config';
import { InventoryDetailStateService } from './inventory-detail-state.service';

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, EnterpriseFeaturePageComponent],
  template: `
    <app-enterprise-feature-page
      themeKey="inventory"
      [title]="title()"
      [subtitle]="subtitle()"
      icon="📦"
      [breadcrumbs]="breadcrumbs"
      backLink="/app/inventory"
      [tabs]="tabs"
      [basePath]="basePath">
    </app-enterprise-feature-page>
    <router-outlet></router-outlet>
  `,
})
export class InventoryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private state = inject(InventoryDetailStateService);
  productId = this.route.snapshot.paramMap.get('id') || '';

  readonly title = computed(() => {
    const name = this.state.productName();
    return name !== 'Unknown Product' ? name : 'Product #' + this.productId;
  });

  readonly subtitle = computed(() => {
    const p = this.state.product();
    if (!p) return 'Inventory item detail, stock movements, and management.';
    const parts: string[] = [];
    if (p.category) parts.push(p.category);
    if (p.sku) parts.push('SKU: ' + p.sku);
    if (p.branchName) parts.push(p.branchName);
    parts.push(this.state.stockStatus());
    return parts.join(' · ') || 'Inventory item management.';
  });

  get basePath(): string {
    return '/app/inventory/' + this.productId;
  }

  breadcrumbs: Breadcrumb[] = [{ label: 'Inventory', link: '/app/inventory' }];

  tabs: RouteTab[] = [
    { path: 'overview', label: 'Overview', icon: '📋' },
    { path: 'transactions', label: 'Transactions', icon: '🔄' },
    { path: 'stock-ledger', label: 'Stock Ledger', icon: '📒' },
    { path: 'analytics', label: 'Analytics', icon: '📊' },
    { path: 'warehouses', label: 'Warehouses', icon: '🏭' },
    { path: 'suppliers', label: 'Suppliers', icon: '🏢' },
    { path: 'purchase-orders', label: 'Purchase Orders', icon: '📋' },
    { path: 'batches', label: 'Batches', icon: '🏷️' },
    { path: 'stock-counts', label: 'Stock Counts', icon: '✅' },
    { path: 'settings', label: 'Settings', icon: '🔧' },
    { path: 'history', label: 'History', icon: '🕘' },
    { path: 'ai', label: 'AI', icon: '✨' },
  ];

  ngOnInit(): void {
    if (this.productId) {
      this.state.load(this.productId);
    }
  }
}
