export interface StaffTarget {
  id: string;
  staffId: string;
  staffName: string;
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  revenueTarget: number;
  serviceTarget: number;
  clientTarget: number;
  productTarget: number;
  achievedRevenue: number;
  achievedServices: number;
  achievedClients: number;
  achievedProducts: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface TargetSummary {
  totalActive: number;
  onTrack: number;
  behind: number;
  achieved: number;
}
