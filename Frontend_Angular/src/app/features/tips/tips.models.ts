export interface TipRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  amount: number;
  type: 'CASH' | 'CARD' | 'POOL';
  poolShare: number | null;
  source: string;
  createdAt: string;
}

export interface TipSummary {
  totalTips: number;
  totalCash: number;
  totalCard: number;
  totalPool: number;
  staffCount: number;
  averagePerStaff: number;
}
