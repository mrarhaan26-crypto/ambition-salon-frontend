export interface CommissionRecord {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  type: string;
  source: string;
  status: 'PENDING' | 'PAID';
  date: string;
  createdAt: string;
}

export interface CommissionRule {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  serviceId: string | null;
  serviceName: string | null;
  isActive: boolean;
}

export interface CommissionSummary {
  totalPending: number;
  totalPaid: number;
  totalCommission: number;
  staffCount: number;
}
