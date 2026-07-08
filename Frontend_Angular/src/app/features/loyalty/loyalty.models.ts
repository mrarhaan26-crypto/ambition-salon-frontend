export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  multiplier: number;
  color: string;
  icon: string;
  benefits: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface LoyaltyMember {
  id: string;
  clientId: string;
  clientName: string;
  email: string;
  phone: string;
  tier: LoyaltyTier;
  points: number;
  lifetimePoints: number;
  visits: number;
  lastVisit: string | null;
  joinedAt: string;
  birthday: string | null;
  isActive: boolean;
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'SERVICE' | 'PRODUCT' | 'DISCOUNT' | 'GIFT_CARD';
  value: number;
  image: string;
  isActive: boolean;
  stock: number | null;
  category: string;
}

export interface Redemption {
  id: string;
  clientId: string;
  clientName: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  redeemedAt: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  note: string;
}

export interface PointsTransaction {
  id: string;
  clientId: string;
  clientName: string;
  points: number;
  type: 'EARNED' | 'SPENT' | 'ADJUSTMENT' | 'BONUS' | 'EXPIRED' | 'REFERRAL';
  description: string;
  reference: string;
  createdAt: string;
}

export interface LoyaltyAnalytics {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  pointsInCirculation: number;
  avgPointsPerMember: number;
  tierDistribution: { tierName: string; count: number; color: string }[];
  monthlyEarned: { month: string; points: number }[];
  monthlyRedeemed: { month: string; points: number }[];
}

export interface LoyaltySettings {
  pointsPerDollar: number;
  signupBonus: number;
  birthdayBonus: number;
  referralBonus: number;
  reviewBonus: number;
  currencyName: string;
  pointsExpiryDays: number | null;
  minRedeemPoints: number;
  autoEnroll: boolean;
}
