import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosStore } from './pos-store.service';
import { PosService } from './pos.service';
import { ClientsService } from '../clients/clients.service';

@Component({
  selector: 'app-pos-left-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="left-panel">
      <div class="panel-section client-section">
        <div class="section-header">
          <h3>Client</h3>
          <button class="walk-in-btn" (click)="selectWalkIn()" *ngIf="store.client()">
            <span>Change</span>
          </button>
        </div>

        <div class="client-selector" *ngIf="!store.client()">
          <div class="search-bar">
            <input [(ngModel)]="searchQuery" (input)="onSearch()" placeholder="Search by name, phone, or scan..." class="search-input" autofocus>
            <button class="scan-btn" (click)="focusBarcodeInput()" title="Scan barcode/QR">&#128247;</button>
          </div>
          <div class="barcode-bar" *ngIf="barcodeActive()">
            <input #barcodeRef [(ngModel)]="barcodeText" (keydown.enter)="scanBarcode()" placeholder="Scan or type barcode/SKU..." class="search-input barcode-input" autofocus>
            <button class="scan-btn" (click)="scanBarcode()" title="Lookup">&#128269;</button>
            <button class="scan-btn" (click)="barcodeActive.set(false)" title="Close">&#10005;</button>
          </div>

          <div class="quick-actions">
            <button class="action-btn" (click)="selectWalkIn()">Walk-in</button>
            <button class="action-btn" (click)="showCreateForm.set(true)">+ New Client</button>
          </div>

          <div class="recent-clients" *ngIf="searchResults().length === 0 && !showCreateForm()">
            <div class="recent-header">
              <span>Recent Clients</span>
              <span class="vip-badge" *ngIf="vipClients().length > 0">{{ vipClients().length }} VIP</span>
            </div>
            <div class="client-list">
              <div class="client-card" *ngFor="let client of recentClients()" (click)="selectClient(client)"
                [class.vip]="isVip(client)">
                <div class="client-avatar">{{ client.fullName.charAt(0).toUpperCase() }}</div>
                <div class="client-info">
                  <strong>{{ client.fullName }}</strong>
                  <span>{{ client.phone || 'No phone' }}</span>
                </div>
                <div class="client-badges">
                  <span class="badge vip-icon" *ngIf="isVip(client)" title="VIP">&#9733;</span>
                  <span class="badge membership-icon" *ngIf="hasMembership(client)" title="Member">&#9733;</span>
                </div>
              </div>
            </div>
          </div>

          <div class="search-results" *ngIf="searchResults().length > 0">
            <div class="client-card" *ngFor="let client of searchResults()" (click)="selectClient(client)">
              <div class="client-avatar">{{ client.fullName.charAt(0).toUpperCase() }}</div>
              <div class="client-info">
                <strong>{{ client.fullName }}</strong>
                <span>{{ client.phone || 'No phone' }}</span>
              </div>
              <div class="client-badges">
                <span class="badge vip-icon" *ngIf="isVip(client)">&#9733;</span>
                <span class="badge membership-icon" *ngIf="hasMembership(client)">&#9733;</span>
              </div>
            </div>
            <div class="no-results" *ngIf="searchResults().length === 0 && searchQuery().length > 0">
              No clients found. <a (click)="showCreateForm.set(true)">Create new client</a>
            </div>
          </div>
        </div>

        <div class="create-form" *ngIf="showCreateForm() && !store.client()">
          <h4>New Client</h4>
          <input [(ngModel)]="newClientName" placeholder="Full name" class="form-input">
          <input [(ngModel)]="newClientPhone" placeholder="Phone" class="form-input">
          <div class="form-actions">
            <button class="btn-primary" (click)="createClient()" [disabled]="!newClientName().trim()">Create</button>
            <button class="btn-ghost" (click)="showCreateForm.set(false)">Cancel</button>
          </div>
        </div>
      </div>

      <div class="panel-section staff-section" *ngIf="store.staffList().length > 0">
        <div class="section-header">
          <h3>Staff</h3>
        </div>
        <select [(ngModel)]="selectedStaff" (ngModelChange)="selectStaff($event)" class="staff-select">
          <option value="">Select staff (optional)</option>
          <option *ngFor="let s of store.staffList()" [value]="s.id">{{ s.fullName }}</option>
        </select>
      </div>

      <div class="panel-section">
        <div class="section-header">
          <h3>Services</h3>
          <span class="count-badge">{{ store.services().length }}</span>
        </div>
        <input [(ngModel)]="store.serviceSearch" placeholder="Search services..." class="search-input service-search">
        <div class="item-list">
          <div class="item-card" *ngFor="let service of store.filteredServices()" (click)="addService(service)">
            <div class="item-info">
              <strong>{{ service.name }}</strong>
              <span>{{ service.durationMin }} min{{ service.category?.name ? ' - ' + service.category.name : '' }}</span>
            </div>
            <div class="item-right">
              <span class="item-price">{{ service.price | currency:'USD':'symbol':'1.2-2' }}</span>
              <button class="add-btn">+</button>
            </div>
          </div>
          <div class="empty-msg" *ngIf="store.filteredServices().length === 0">No services found</div>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-header">
          <h3>Products</h3>
          <span class="count-badge">{{ store.products().length }}</span>
        </div>
        <input [(ngModel)]="store.productSearch" placeholder="Search by name or SKU..." class="search-input product-search">
        <div class="item-list">
          <div class="item-card" *ngFor="let product of store.filteredProducts()" (click)="addProduct(product)"
            [class.low-stock]="product.quantity <= product.minStockLevel">
            <div class="item-info">
              <strong>{{ product.name }}</strong>
              <span>{{ product.sku ? 'SKU: ' + product.sku : '' }} &middot; Stock: {{ product.quantity }}</span>
            </div>
            <div class="item-right">
              <span class="item-price">{{ product.price | currency:'USD':'symbol':'1.2-2' }}</span>
              <span class="stock-badge" *ngIf="product.quantity <= product.minStockLevel">Low</span>
              <button class="add-btn">+</button>
            </div>
          </div>
          <div class="empty-msg" *ngIf="store.filteredProducts().length === 0">No products found</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .left-panel{display:flex;flex-direction:column;gap:12px;height:100%;overflow:hidden;padding:16px}
    .panel-section{background:white;border:1px solid #eef2f7;border-radius:14px;padding:12px;overflow:hidden;display:flex;flex-direction:column;gap:8px}
    .section-header{display:flex;justify-content:space-between;align-items:center}
    .section-header h3{margin:0;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
    .count-badge{background:#f3f4f6;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:800;color:#6b7280}
    .client-section{flex-shrink:0}
    .search-bar{display:flex;gap:6px}
    .search-input{flex:1;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;min-width:0}
    .scan-btn{border:1px solid #e5e7eb;background:white;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px}
    .quick-actions{display:flex;gap:6px}
    .action-btn{border:1px solid #e5e7eb;background:white;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:800;cursor:pointer;flex:1}
    .action-btn:hover{background:#f9fafb}
    .recent-header{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase}
    .vip-badge{background:#fef3c7;color:#92400e;border-radius:999px;padding:2px 8px}
    .client-list,.search-results{display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto}
    .client-card{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:background .1s}
    .client-card:hover{background:#f9fafb}
    .client-card.vip{background:linear-gradient(135deg,#fffbeb,#fef3c7)}
    .client-avatar{width:32px;height:32px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;flex-shrink:0}
    .client-info{flex:1;min-width:0}
    .client-info strong{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .client-info span{font-size:11px;color:#6b7280}
    .client-badges{display:flex;gap:4px}
    .badge{font-size:14px}
    .vip-icon{color:#f59e0b}
    .membership-icon{color:#3b82f6}
    .no-results{font-size:12px;color:#6b7280;padding:12px;text-align:center}
    .no-results a{color:#0b0b0b;font-weight:800;cursor:pointer;text-decoration:underline}
    .create-form{display:flex;flex-direction:column;gap:8px;padding:12px;background:#f9fafb;border-radius:10px}
    .create-form h4{margin:0;font-size:14px}
    .form-input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px}
    .form-actions{display:flex;gap:6px}
    .btn-primary{border:0;background:#0b0b0b;color:white;border-radius:8px;padding:8px 16px;font-weight:800;cursor:pointer;flex:1}
    .btn-primary:disabled{opacity:.5}
    .btn-ghost{border:1px solid #e5e7eb;background:white;border-radius:8px;padding:8px 16px;font-weight:800;cursor:pointer}
    .item-list{display:flex;flex-direction:column;gap:4px;overflow-y:auto;flex:1;min-height:0}
    .item-card{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:background .1s}
    .item-card:hover{background:#f9fafb}
    .item-card.low-stock{border-left:3px solid #f59e0b}
    .item-info{flex:1;min-width:0}
    .item-info strong{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .item-info span{font-size:11px;color:#6b7280;display:block;margin-top:2px}
    .item-right{text-align:right;display:flex;align-items:center;gap:6px;flex-shrink:0}
    .item-price{font-weight:800;font-size:13px}
    .stock-badge{font-size:10px;background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 5px;font-weight:800}
    .add-btn{border:0;background:#059669;color:white;border-radius:6px;width:26px;height:26px;font-weight:900;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
    .empty-msg{text-align:center;padding:16px;color:#9ca3af;font-size:12px}
    .service-search,.product-search{margin:0}
    .walk-in-btn{border:0;background:#f3f4f6;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer}
    .barcode-bar{display:flex;gap:6px;margin-top:6px}
    .barcode-input{flex:1}
    .staff-section{flex-shrink:0}
    .staff-select{width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:white}
  `]
})
export class PosLeftPanelComponent {
  store = inject(PosStore);
  posService = inject(PosService);
  clientsService = inject(ClientsService);

  searchQuery = signal('');
  showCreateForm = signal(false);
  newClientName = signal('');
  newClientPhone = signal('');
  searchResults = signal<any[]>([]);
  recentClients = signal<any[]>([]);
  barcodeActive = signal(false);
  barcodeText = signal('');
  selectedStaff = signal('');

  private allClients: any[] = [];

  ngOnInit() {
    this.loadRecentClients();
  }

  vipClients = computed(() => this.recentClients().filter(c => this.isVip(c)));

  private loadRecentClients() {
    this.clientsService.getClients({ limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }).subscribe({
      next: (res) => { this.allClients = res.items || []; this.recentClients.set((res.items || []).slice(0, 10)); },
      error: () => {},
    });
  }

  onSearch() {
    const q = this.searchQuery().trim();
    if (!q || q.length < 2) { this.searchResults.set([]); return; }
    const lower = q.toLowerCase();
    const results = this.allClients.filter(c =>
      c.fullName?.toLowerCase().includes(lower) ||
      c.phone?.includes(q)
    );
    this.searchResults.set(results.slice(0, 20));
  }

  selectClient(client: any) {
    const info = {
      id: client.id,
      fullName: client.fullName,
      phone: client.phone || null,
      email: client.email || null,
      loyaltyPoints: client.loyaltyPoints || 0,
      walletBalance: client.walletBalance || 0,
      totalVisits: client.totalVisits || 0,
      totalSpend: client.totalSpend || 0,
      lastVisitAt: client.lastVisitAt || null,
    };
    this.store.client.set(info);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showCreateForm.set(false);
    this.loadClientBenefits(client.id);
  }

  selectWalkIn() {
    this.store.client.set(null);
    this.store.clearClient();
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showCreateForm.set(false);
  }

  private loadClientBenefits(clientId: string) {
    this.posService.getWallet(clientId).subscribe({
      next: (w) => this.store.clientWallet.set(w),
      error: () => this.store.clientWallet.set(null),
    });
    this.posService.getLoyalty(clientId).subscribe({
      next: (l) => this.store.clientLoyalty.set(l),
      error: () => this.store.clientLoyalty.set(null),
    });
    this.posService.getClientMemberships(clientId).subscribe({
      next: (m) => this.store.clientMemberships.set(m),
      error: () => this.store.clientMemberships.set([]),
    });
    this.posService.getClientPackages(clientId).subscribe({
      next: (p) => this.store.clientPackages.set(p),
      error: () => this.store.clientPackages.set([]),
    });
    this.posService.getClientGiftCards(clientId).subscribe({
      next: (g) => this.store.clientGiftCards.set(g),
      error: () => this.store.clientGiftCards.set([]),
    });
    this.posService.getAiRecommendations(clientId).subscribe({
      next: (r) => this.store.aiRecommendations.set(r || []),
      error: () => this.store.aiRecommendations.set([]),
    });
  }

  addService(service: any) {
    this.store.addToCart({
      id: '',
      type: 'service',
      serviceId: service.id,
      name: service.name,
      quantity: 1,
      unitPrice: service.price,
      discount: 0,
      discountType: 'none',
      taxRate: 0,
      notes: '',
      durationMin: service.durationMin,
    });
  }

  addProduct(product: any) {
    this.store.addToCart({
      id: '',
      type: 'product',
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.price,
      discount: 0,
      discountType: 'none',
      taxRate: 0,
      notes: '',
      sku: product.sku,
      category: product.category,
      stockAvailable: product.quantity,
    });
  }

  createClient() {
    const name = this.newClientName().trim();
    if (!name) return;
    this.posService.createClient({ fullName: name, phone: this.newClientPhone().trim() || undefined }).subscribe({
      next: (client) => {
        this.selectClient(client);
        this.showCreateForm.set(false);
        this.newClientName.set('');
        this.newClientPhone.set('');
      },
      error: () => {},
    });
  }

  isVip(client: any): boolean {
    return (client.totalSpend || 0) > 500 || (client.totalVisits || 0) > 20;
  }

  hasMembership(client: any): boolean {
    return false;
  }

  focusBarcodeInput() {
    this.barcodeActive.set(true);
    this.barcodeText.set('');
    setTimeout(() => {
      const el = document.querySelector('.barcode-input') as HTMLInputElement;
      if (el) el.focus();
    }, 100);
  }

  scanBarcode() {
    const code = this.barcodeText().trim();
    if (!code || code.length < 2) return;
    this.store.setBarcodeInput(code);
    this.barcodeText.set('');
    this.barcodeActive.set(false);
  }

  selectStaff(id: string) {
    this.store.staffId.set(id);
    const found = this.store.staffList().find(s => s.id === id);
    this.store.staffName.set(found?.fullName || '');
  }
}
