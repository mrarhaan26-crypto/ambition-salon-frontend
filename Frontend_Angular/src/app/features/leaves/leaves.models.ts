export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  type: 'SICK' | 'VACATION' | 'PERSONAL' | 'BEREAVEMENT' | 'MATERNITY' | 'OTHER';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveSummary {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  staffOnLeave: number;
  byType: { type: string; count: number }[];
}
