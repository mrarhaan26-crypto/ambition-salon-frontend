export interface PosSale {
  id: string;
  branchId: string;
  clientId: string | null;
  staffId: string | null;
  items: PosSaleItem[];
  totalAmount: number;
  paymentMethod: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; fullName: string } | null;
  staff?: { id: string; fullName: string; email: string; role: string } | null;
  receipt?: { receiptNumber: string; amount: number } | null;
  payment?: { method: string; status: string } | null;
}

export interface PosSaleItem {
  id: string;
  saleId: string;
  serviceId: string | null;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CartItem {
  id: string;
  type: 'service' | 'product' | 'manual';
  serviceId?: string | null;
  productId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percent' | 'flat' | 'none';
  taxRate: number;
  notes: string;
  staffId?: string | null;
  staffName?: string;
  durationMin?: number;
  stockAvailable?: number;
  sku?: string | null;
  category?: string | null;
}

export interface CheckoutForm {
  clientId: string;
  staffId: string;
  paymentMethod: string;
  discountAmount: number;
  discountType: 'percent' | 'flat';
  taxRate: number;
  note: string;
  tip: number;
  depositAmount: number;
}

export interface SplitPayment {
  cash: number;
  card: number;
  upi: number;
  wallet: number;
  giftCard: number;
  giftCardCode: string;
  loyalty: number;
  membership: number;
  package: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
}

export interface PosClientInfo {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  loyaltyPoints: number;
  walletBalance: number;
  totalVisits: number;
  totalSpend: number;
  lastVisitAt: string | null;
  isVip?: boolean;
}

export interface ClientWalletData {
  client: { id: string; fullName: string; walletBalance: number };
  balance: number;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
}

export interface ClientLoyaltyData {
  client: { id: string; fullName: string; loyaltyPoints: number };
  points: number;
  rewards: LoyaltyReward[];
}

export interface LoyaltyReward {
  id: string;
  points: number;
  type: 'EARNED' | 'REDEEMED';
  description: string | null;
  createdAt: string;
}

export interface ClientMembership {
  id: string;
  clientId: string;
  membershipPlanId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  membershipPlan: { id: string; name: string; price: number; benefits: string | null };
}

export interface ClientPackage {
  id: string;
  clientId: string;
  packageId: string;
  sessionsUsed: number;
  sessionsTotal: number;
  expiresAt: string | null;
  isActive: boolean;
  package: { id: string; name: string; price: number; services: { service: { id: string; name: string } }[] };
}

export interface GiftCardInfo {
  id: string;
  code: string;
  balance: number;
  initialBalance: number;
  status: string;
  expiresAt: string | null;
}

export interface CashDrawerSession {
  id: string;
  openingBalance: number;
  closingBalance: number | null;
  cashIn: number;
  cashOut: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  expectedBalance: number;
  variance: number | null;
}

export interface DailySummary {
  completedAmount: number;
  refundedAmount: number;
  netSales: number;
  completedCount: number;
  refundedCount: number;
  paymentTotals: Record<string, number>;
  cashDrawerVariance: number | null;
}

export interface AIRecommendation {
  type: 'upsell' | 'cross-sell' | 'retail' | 'membership' | 'package';
  title: string;
  description: string;
  confidence: number;
  itemId?: string;
  itemName?: string;
  itemPrice?: number;
}

export interface PosState {
  cart: CartItem[];
  client: PosClientInfo | null;
  clientWallet: ClientWalletData | null;
  clientLoyalty: ClientLoyaltyData | null;
  clientMemberships: ClientMembership[];
  clientPackages: ClientPackage[];
  clientGiftCards: GiftCardInfo[];
  discount: { type: 'percent' | 'flat'; value: number };
  taxRate: number;
  tip: number;
  note: string;
  splitPayments: SplitPayment;
  selectedPaymentMethod: string;
}
