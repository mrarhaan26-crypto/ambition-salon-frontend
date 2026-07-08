export interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  period: string;
  baseSalary: number;
  commissions: number;
  tips: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  status: 'DRAFT' | 'PROCESSED' | 'PAID';
  processedAt: string | null;
  paidAt: string | null;
  notes: string;
  createdAt: string;
}

export interface PayrollSummary {
  totalPayroll: number;
  totalStaff: number;
  averagePay: number;
  pendingCount: number;
  processedCount: number;
  paidCount: number;
}
