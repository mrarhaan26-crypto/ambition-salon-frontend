export interface DailyClosing {
  id: string;
  date: string;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  expectedCash: number;
  actualCash: number | null;
  cashDifference: number | null;
  cardTotal: number;
  otherTotal: number;
  totalRevenue: number;
  notes: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
}

export interface ClosingSummary {
  openDays: number;
  closedDays: number;
  totalRevenue: number;
  totalCashDiff: number;
  lastClosing: string | null;
}
