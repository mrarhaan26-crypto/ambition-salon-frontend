import { Component, computed, inject, signal, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosStore } from './pos-store.service';
import { BillingRulesService } from '../billing-rules/billing-rules.service';

@Component({
  selector: 'app-pos-payment-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payment-panel">
      <div class="panel-section">
        <h3>Payment Summary</h3>
        <div class="summary-rows">
          <div class="summary-row">
            <span>Subtotal</span>
            <strong>{{ store.cartTotal() | currency:'USD':'symbol':'1.2-2' }}</strong>
          </div>
          <div class="summary-row" *ngIf="store.cartDiscountAmount() > 0">
            <span class="discount-text">Discount ({{ store.discountType() === 'percent' ? store.discountValue() + '%' : (store.discountValue() | currency:'USD':'symbol':'1.2-2') }})</span>
            <strong class="discount-text">-{{ store.cartDiscountAmount() | currency:'USD':'symbol':'1.2-2' }}</strong>
          </div>
          <div class="summary-row">
            <span>Subtotal after discount</span>
            <strong>{{ store.taxableAmount() | currency:'USD':'symbol':'1.2-2' }}</strong>
          </div>
          <div class="summary-row" *ngIf="store.taxRate() > 0">
            <span>Tax ({{ store.taxRate() }}%)</span>
            <strong>{{ store.taxAmount() | currency:'USD':'symbol':'1.2-2' }}</strong>
          </div>
          <div class="summary-row" *ngIf="store.tip() > 0">
            <span>Tip</span>
            <strong>{{ store.tip() | currency:'USD':'symbol':'1.2-2' }}</strong>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-row grand">
            <span>Grand Total</span>
            <strong>{{ store.grandTotal() | currency:'USD':'symbol':'1.2-2' }}</strong>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <h3>Discount</h3>
        <div class="discount-presets" *ngIf="presetDiscounts().length > 0">
          <button class="preset-btn" *ngFor="let d of presetDiscounts()" (click)="applyPresetDiscount(d)">{{ d.name }} ({{ d.type === 'PERCENTAGE' ? d.value + '%' : '$' + d.value }})</button>
        </div>
        <div class="discount-controls">
          <div class="discount-type">
            <button class="type-btn" [class.active]="store.discountType() === 'flat'" (click)="store.discountType.set('flat')">$</button>
            <button class="type-btn" [class.active]="store.discountType() === 'percent'" (click)="store.discountType.set('percent')">%</button>
          </div>
          <input type="number" [ngModel]="store.discountValue()" (ngModelChange)="store.discountValue.set(Math.max(0, Number($event) || 0))"
            min="0" [max]="store.discountType() === 'percent' ? 100 : store.cartTotal()" step="0.01" class="discount-input"
            placeholder="0">
          <span class="discount-suffix">{{ store.discountType() === 'percent' ? '%' : '$' }}</span>
        </div>
        <div class="tax-control">
          <span>Tax Rate</span>
          <input type="number" [ngModel]="store.taxRate()" (ngModelChange)="store.taxRate.set(Math.max(0, Number($event) || 0))"
            min="0" max="100" step="0.01" class="tax-input" placeholder="0">
          <span>%</span>
        </div>
      </div>

      <div class="panel-section wallet-section" *ngIf="store.client()">
        <h3>Client Benefits</h3>
        <div class="benefit-row" *ngIf="store.hasWalletBalance()">
          <span>Wallet Balance</span>
            <strong class="wallet-amount">{{ (store.clientWallet()?.balance || 0) | currency:'USD':'symbol':'1.2-2' }}</strong>
          <button class="apply-btn" (click)="applyWallet()">Apply</button>
        </div>
        <div class="benefit-row" *ngIf="store.hasLoyaltyPoints()">
          <span>Loyalty Points</span>
          <strong class="loyalty-amount">{{ store.clientLoyalty()?.points || 0 }} pts</strong>
          <button class="apply-btn" (click)="applyLoyalty()">Redeem</button>
        </div>
        <div class="benefit-row" *ngIf="store.hasActiveMemberships()">
          <span>Membership</span>
          <span class="benefit-count">{{ activeMembershipCount() }} active</span>
        </div>
        <div class="benefit-row" *ngIf="store.hasActivePackages()">
          <span>Packages</span>
          <span class="benefit-count">{{ activePackageCount() }} active</span>
        </div>
        <div class="benefit-row" *ngIf="store.hasGiftCards()">
          <span>Gift Cards</span>
          <span class="benefit-count">{{ activeGiftCardCount() }} active</span>
        </div>
        <div class="benefit-row" *ngIf="!store.clientWallet() && !store.hasLoyaltyPoints() && !store.hasActiveMemberships() && !store.hasActivePackages() && !store.hasGiftCards()">
          <span class="no-benefits">No benefits available for this client</span>
        </div>
      </div>

      <div class="panel-section">
        <h3>Payment Method</h3>
        <div class="payment-grid">
          <button class="payment-btn" *ngFor="let method of store.paymentMethods()"
            [class.selected]="selectedMethod() === method.id"
            (click)="selectMethod(method.id)">
            <span class="payment-icon">{{ methodIcon(method.id) }}</span>
            <span class="payment-name">{{ method.name }}</span>
          </button>
        </div>
      </div>

      <div class="panel-section" *ngIf="splitVisible()">
        <h3>Split Payment</h3>
        <div class="split-grid">
          <label class="split-field">
            <span>Cash</span>
            <input type="number" [ngModel]="store.splitPayments().cash" (ngModelChange)="updateSplit('cash', $event)" min="0" step="0.01">
          </label>
          <label class="split-field">
            <span>Card</span>
            <input type="number" [ngModel]="store.splitPayments().card" (ngModelChange)="updateSplit('card', $event)" min="0" step="0.01">
          </label>
          <label class="split-field">
            <span>UPI</span>
            <input type="number" [ngModel]="store.splitPayments().upi" (ngModelChange)="updateSplit('upi', $event)" min="0" step="0.01">
          </label>
          <label class="split-field">
            <span>Wallet</span>
            <input type="number" [ngModel]="store.splitPayments().wallet" (ngModelChange)="updateSplit('wallet', $event)" min="0" step="0.01">
          </label>
        </div>
        <div class="split-total" [class.match]="store.splitMatches()" [class.mismatch]="!store.splitMatches()">
          <span>Split Total</span>
          <strong>{{ store.splitTotal() | currency:'USD':'symbol':'1.2-2' }}</strong>
        </div>
      </div>

      <div class="panel-section">
        <h3>Notes</h3>
        <textarea [(ngModel)]="noteText" (ngModelChange)="store.note.set($event)" placeholder="Add checkout note..." rows="2" class="note-input"></textarea>
      </div>

      <div class="panel-section">
        <h3>Tip</h3>
        <div class="tip-options">
          <button class="tip-btn" *ngFor="let t of tipPresets" [class.active]="store.tip() === t" (click)="store.tip.set(t)">
            {{ t | currency:'USD':'symbol':'1.2-2' }}
          </button>
          <button class="tip-btn custom" [class.active]="!tipPresets.includes(store.tip()) && store.tip() > 0">Custom</button>
        </div>
        <input type="number" [ngModel]="store.tip()" (ngModelChange)="store.tip.set(Math.max(0, Number($event) || 0))"
          min="0" step="0.01" class="tip-input" placeholder="Custom tip amount">
      </div>

      <div class="checkout-actions">
        <div class="checkout-error" *ngIf="store.error()">{{ store.error() }}</div>
        <button class="checkout-btn" [disabled]="!store.canCheckout()" (click)="doCheckout()">
          {{ store.checkoutBusy() ? 'Processing...' : 'Charge ' + (store.grandTotal() | currency:'USD':'symbol':'1.2-2') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .payment-panel{display:flex;flex-direction:column;gap:16px;height:100%;overflow-y:auto;padding:16px}
    .panel-section{background:white;border:1px solid #eef2f7;border-radius:14px;padding:14px}
    .panel-section h3{margin:0 0 10px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
    .summary-rows{display:flex;flex-direction:column;gap:6px}
    .summary-row{display:flex;justify-content:space-between;align-items:center;font-size:14px}
    .summary-row strong{font-weight:800}
    .summary-row.grand{font-size:20px;padding-top:4px}
    .summary-row.grand strong{font-size:28px;color:#059669}
    .summary-divider{height:1px;background:#e5e7eb;margin:4px 0}
    .discount-text{color:#059669}
    .discount-presets{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
    .preset-btn{border:1px solid #e5e7eb;background:white;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer;color:#6b7280}
    .preset-btn:hover{background:#f3f4f6;color:#0b0b0b}
    .discount-controls{display:flex;align-items:center;gap:8px}
    .discount-type{display:flex;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
    .type-btn{border:0;background:white;padding:6px 12px;font-weight:900;cursor:pointer;font-size:14px}
    .type-btn.active{background:#0b0b0b;color:white}
    .discount-input{flex:1;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;text-align:right;min-width:0}
    .discount-suffix{font-weight:800;color:#6b7280;font-size:14px;width:20px}
    .tax-control{display:flex;align-items:center;gap:8px;margin-top:8px}
    .tax-control span{font-size:12px;font-weight:700;color:#6b7280}
    .tax-input{flex:1;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;text-align:right}
    .benefit-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f3f4f6}
    .benefit-row:last-child{border-bottom:0}
    .benefit-row span{flex:1;font-size:13px}
    .wallet-amount{color:#059669;font-weight:800}
    .loyalty-amount{color:#f59e0b;font-weight:800}
    .benefit-count{font-size:12px;color:#6b7280;font-weight:700}
    .apply-btn{border:0;background:#0b0b0b;color:white;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer}
    .no-benefits{color:#9ca3af;font-style:italic;font-size:12px}
    .payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .payment-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;border:2px solid #e5e7eb;border-radius:12px;background:white;cursor:pointer;transition:all .1s}
    .payment-btn:hover{border-color:#d1d5db}
    .payment-btn.selected{border-color:#0b0b0b;background:#f5f5f5}
    .payment-icon{font-size:20px}
    .payment-name{font-size:11px;font-weight:800;text-transform:uppercase}
    .split-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .split-field{display:flex;flex-direction:column;gap:4px}
    .split-field span{font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase}
    .split-field input{padding:8px;border:1px solid #e5e7eb;border-radius:8px;text-align:right;font-size:13px;font-weight:700}
    .split-total{display:flex;justify-content:space-between;align-items:center;padding:8px 0;margin-top:8px}
    .split-total.match strong{color:#059669}
    .split-total.mismatch strong{color:#dc2626}
    .note-input{width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font:inherit;font-size:13px;resize:vertical;box-sizing:border-box}
    .tip-options{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
    .tip-btn{border:1px solid #e5e7eb;background:white;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:800;cursor:pointer}
    .tip-btn.active{border-color:#0b0b0b;background:#0b0b0b;color:white}
    .tip-btn.custom{border-style:dashed}
    .tip-input{width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;text-align:right;font-size:14px;font-weight:700;box-sizing:border-box}
    .checkout-actions{display:flex;flex-direction:column;gap:8px}
    .checkout-error{padding:10px;background:#fef2f2;color:#991b1b;border-radius:10px;font-size:12px;font-weight:700;text-align:center}
    .checkout-btn{border:0;border-radius:14px;padding:16px;background:#059669;color:white;font-size:18px;font-weight:900;cursor:pointer;transition:background .15s}
    .checkout-btn:hover{background:#047857}
    .checkout-btn:disabled{opacity:.5;cursor:not-allowed}
  `]
})
export class PosPaymentPanelComponent {
  store = inject(PosStore);
  private billingApi = inject(BillingRulesService);
  Math = Math;
  Number = Number;
  tipPresets = [1, 2, 3, 5, 10];
  noteText = signal('');
  presetDiscounts = signal<any[]>([]);

  selectedMethod = computed(() => this.store.splitPayments().cash > 0 ? 'SPLIT' :
    this.store.paymentMethods().length > 0 ? (this.store.paymentMethods()[0]?.id || 'CASH') : 'CASH');

  splitVisible = computed(() => this.store.grandTotal() > 0);

  @Output() onCheckout = new EventEmitter<void>();

  ngOnInit() {
    this.billingApi.getDiscounts().subscribe({
      next: (d) => this.presetDiscounts.set(d?.filter((x: any) => x.isActive) || []),
      error: () => this.presetDiscounts.set([]),
    });
  }

  activeMembershipCount(): number {
    return this.store.clientMemberships().filter(m => m.isActive).length;
  }

  activePackageCount(): number {
    return this.store.clientPackages().filter(p => p.isActive).length;
  }

  activeGiftCardCount(): number {
    return this.store.clientGiftCards().filter(g => g.status === 'ACTIVE').length;
  }

  selectMethod(id: string) {
    if (id === 'SPLIT') return;
    this.store.splitPayments.set({ cash: 0, card: 0, upi: 0, wallet: 0, giftCard: 0, giftCardCode: '', loyalty: 0, membership: 0, package: 0 });
    const sp = this.store.splitPayments();
    if (id === 'CASH') sp.cash = this.store.grandTotal();
    else if (id === 'CARD') sp.card = this.store.grandTotal();
    else if (id === 'UPI') sp.upi = this.store.grandTotal();
    else if (id === 'WALLET') { sp.wallet = this.store.grandTotal(); }
    this.store.splitPayments.set({ ...sp });
  }

  updateSplit(method: string, value: any) {
    const sp = { ...this.store.splitPayments(), [method]: Math.max(0, Number(value) || 0) };
    this.store.splitPayments.set(sp);
  }

  methodIcon(id: string): string {
    const icons: Record<string, string> = { CASH: '\u{1F4B5}', CARD: '\u{1F4B3}', UPI: '\u{1F4F1}', WALLET: '\u{1F4BC}', GIFT_CARD: '\u{1F381}', LOYALTY: '\u{2B50}', SPLIT: '\u{2702}' };
    return icons[id] || '\u{1F4B0}';
  }

  applyWallet() {
    const balance = this.store.clientWallet()?.balance || 0;
    if (balance <= 0) return;
    const total = this.store.grandTotal();
    const amount = Math.min(balance, total);
    this.store.splitPayments.set({ ...this.store.splitPayments(), wallet: amount });
  }

  applyLoyalty() {
    const points = this.store.clientLoyalty()?.points || 0;
    if (points <= 0) return;
    const total = this.store.grandTotal();
    const redeemValue = Math.min(points * 0.01, total);
    this.store.splitPayments.set({ ...this.store.splitPayments(), loyalty: redeemValue });
  }

  applyPresetDiscount(d: any) {
    this.store.discountType.set(d.type === 'PERCENTAGE' ? 'percent' : 'flat');
    this.store.discountValue.set(Number(d.value) || 0);
  }

  doCheckout() {
    this.store.checkoutBusy.set(true);
    this.onCheckout.emit();
  }
}
