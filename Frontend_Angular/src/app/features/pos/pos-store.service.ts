import { Injectable, computed, signal } from '@angular/core';
import { CartItem, PosClientInfo, ClientWalletData, ClientLoyaltyData, ClientMembership, ClientPackage, GiftCardInfo, SplitPayment, DailySummary, PaymentMethod, AIRecommendation } from './pos.models';
import { InventoryProduct } from '../inventory/inventory.models';
import { SalonService } from '../services/services.models';

@Injectable({ providedIn: 'root' })
export class PosStore {
  cart = signal<CartItem[]>([]);
  client = signal<PosClientInfo | null>(null);
  staffId = signal<string>('');
  staffName = signal<string>('');

  services = signal<SalonService[]>([]);
  products = signal<InventoryProduct[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);

  clientWallet = signal<ClientWalletData | null>(null);
  clientLoyalty = signal<ClientLoyaltyData | null>(null);
  clientMemberships = signal<ClientMembership[]>([]);
  clientPackages = signal<ClientPackage[]>([]);
  clientGiftCards = signal<GiftCardInfo[]>([]);

  discountType = signal<'percent' | 'flat'>('flat');
  discountValue = signal<number>(0);
  taxRate = signal<number>(0);
  tip = signal<number>(0);
  note = signal<string>('');
  depositAmount = signal<number>(0);

  splitPayments = signal<SplitPayment>({ cash: 0, card: 0, upi: 0, wallet: 0, giftCard: 0, giftCardCode: '', loyalty: 0, membership: 0, package: 0 });

  recentSales = signal<any[]>([]);
  salesHistory = signal<any[]>([]);
  aiRecommendations = signal<AIRecommendation[]>([]);

  loading = signal<boolean>(false);
  checkoutBusy = signal<boolean>(false);
  error = signal<string>('');
  success = signal<string>('');

  filteredServices = computed(() => {
    const term = this.serviceSearch().toLowerCase();
    if (!term) return this.services();
    return this.services().filter(s => s.name.toLowerCase().includes(term) || s.category?.name?.toLowerCase().includes(term));
  });

  filteredProducts = computed(() => {
    const term = this.productSearch().toLowerCase();
    if (!term) return this.products();
    return this.products().filter(p => p.name.toLowerCase().includes(term) || (p.sku && p.sku.toLowerCase().includes(term)));
  });

  serviceSearch = signal<string>('');
  productSearch = signal<string>('');
  clientSearch = signal<string>('');
  barcodeInput = signal<string>('');

  cartTotal = computed(() => this.cart().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0));

  itemCount = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));

  cartDiscountAmount = computed(() => {
    if (this.discountType() === 'flat') return Math.min(this.discountValue(), this.cartTotal());
    return this.cartTotal() * (Math.min(this.discountValue(), 100) / 100);
  });

  taxableAmount = computed(() => Math.max(0, this.cartTotal() - this.cartDiscountAmount()));

  taxAmount = computed(() => this.taxableAmount() * (Math.max(0, this.taxRate()) / 100));

  grandTotal = computed(() => this.taxableAmount() + this.taxAmount() + this.tip());

  splitTotal = computed(() => {
    const s = this.splitPayments();
    return s.cash + s.card + s.upi + s.wallet + s.giftCard + s.loyalty + s.membership + s.package;
  });

  splitMatches = computed(() => {
    const total = this.splitTotal();
    return total === 0 || Math.abs(total - this.grandTotal()) < 0.01;
  });

  canCheckout = computed(() => this.cart().length > 0 && !this.checkoutBusy() && this.splitMatches());

  selectedClientName = computed(() => this.client()?.fullName || 'Walk-in');
  selectedClientPhone = computed(() => this.client()?.phone || '');

  hasWalletBalance = computed(() => (this.clientWallet()?.balance || 0) > 0);
  hasLoyaltyPoints = computed(() => (this.clientLoyalty()?.points || 0) > 0);
  hasActiveMemberships = computed(() => this.clientMemberships().some(m => m.isActive));
  hasActivePackages = computed(() => this.clientPackages().some(p => p.isActive));
  hasGiftCards = computed(() => this.clientGiftCards().some(g => g.status === 'ACTIVE' && g.balance > 0));

  private readonly heldSaleKey = 'ambition-pos-held-sale-v2';

  addToCart(item: CartItem) {
    this.cart.update(c => [...c, { ...item, id: crypto.randomUUID() }]);
  }

  removeFromCart(id: string) {
    this.cart.update(c => c.filter(i => i.id !== id));
  }

  updateQuantity(id: string, quantity: number) {
    const q = Math.max(1, Math.floor(Number(quantity)) || 1);
    this.cart.update(c => c.map(i => i.id === id ? { ...i, quantity: q } : i));
  }

  updateCartItem(id: string, changes: Partial<CartItem>) {
    this.cart.update(c => c.map(i => i.id === id ? { ...i, ...changes } : i));
  }

  clearCart() {
    this.cart.set([]);
    this.discountType.set('flat');
    this.discountValue.set(0);
    this.taxRate.set(0);
    this.tip.set(0);
    this.note.set('');
    this.depositAmount.set(0);
    this.splitPayments.set({ cash: 0, card: 0, upi: 0, wallet: 0, giftCard: 0, giftCardCode: '', loyalty: 0, membership: 0, package: 0 });
  }

  clearClient() {
    this.client.set(null);
    this.clientWallet.set(null);
    this.clientLoyalty.set(null);
    this.clientMemberships.set([]);
    this.clientPackages.set([]);
    this.clientGiftCards.set([]);
    this.aiRecommendations.set([]);
  }

  holdSale() {
    const state = {
      cart: this.cart(),
      client: this.client(),
      staffId: this.staffId(),
      staffName: this.staffName(),
      discountType: this.discountType(),
      discountValue: this.discountValue(),
      taxRate: this.taxRate(),
      tip: this.tip(),
      note: this.note(),
      depositAmount: this.depositAmount(),
      splitPayments: this.splitPayments(),
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(this.heldSaleKey, JSON.stringify(state));
      this.clearCart();
      this.clearClient();
      this.staffId.set('');
      this.staffName.set('');
      return true;
    } catch {
      return false;
    }
  }

  restoreHeldSale(): boolean {
    const raw = localStorage.getItem(this.heldSaleKey);
    if (!raw) return false;
    try {
      const state = JSON.parse(raw);
      this.cart.set(state.cart || []);
      this.client.set(state.client || null);
      this.staffId.set(state.staffId || '');
      this.staffName.set(state.staffName || '');
      this.discountType.set(state.discountType || 'flat');
      this.discountValue.set(state.discountValue || 0);
      this.taxRate.set(state.taxRate || 0);
      this.tip.set(state.tip || 0);
      this.note.set(state.note || '');
      this.depositAmount.set(state.depositAmount || 0);
      this.splitPayments.set(state.splitPayments || { cash: 0, card: 0, upi: 0, wallet: 0, giftCard: 0, giftCardCode: '', loyalty: 0, membership: 0, package: 0 });
      return true;
    } catch {
      return false;
    }
  }

  heldSaleExists(): boolean {
    return !!localStorage.getItem(this.heldSaleKey);
  }

  clearHeldSale() {
    localStorage.removeItem(this.heldSaleKey);
  }

  dailySummary(): DailySummary {
    const paymentTotals: Record<string, number> = { CASH: 0, CARD: 0, UPI: 0, WALLET: 0, GIFT_CARD: 0, LOYALTY: 0 };
    const summary: DailySummary = { completedAmount: 0, refundedAmount: 0, netSales: 0, completedCount: 0, refundedCount: 0, paymentTotals, cashDrawerVariance: null };
    for (const sale of this.salesHistory()) {
      const amount = Number(sale.totalAmount) || 0;
      const status = String(sale.status || '').toUpperCase();
      if (status === 'COMPLETED') {
        summary.completedAmount += amount;
        summary.completedCount += 1;
        const method = String(sale?.payment?.method || sale?.paymentMethod || 'CASH').toUpperCase();
        if (method in paymentTotals) paymentTotals[method] += amount;
      }
      if (status === 'REFUNDED') { summary.refundedAmount += amount; summary.refundedCount += 1; }
    }
    summary.netSales = summary.completedAmount - summary.refundedAmount;
    return summary;
  }

  getCartItemsForCheckout() {
    return this.cart().map(item => ({
      serviceId: item.serviceId || null,
      productId: item.productId || null,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  }

  loadInitialData(services: any[], products: any[], methods: any[], staffList: any[]) {
    this.services.set(services || []);
    this.products.set(products || []);
    this.paymentMethods.set(methods || []);
    this.staffList.set(staffList || []);
  }

  staffList = signal<any[]>([]);

  setBarcodeInput(value: string) {
    this.barcodeInput.set(value);
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    const match = this.products().find(p =>
      p.sku && p.sku.toLowerCase() === trimmed.toLowerCase()
    );
    if (match) {
      this.addToCart({
        id: '',
        type: 'product',
        productId: match.id,
        name: match.name,
        quantity: 1,
        unitPrice: match.price,
        discount: 0,
        discountType: 'none',
        taxRate: 0,
        notes: '',
        sku: match.sku,
        category: match.category,
        stockAvailable: match.quantity,
      });
      this.barcodeInput.set('');
    }
  }
}
