export type LeaveType = 'CASUAL' | 'SICK' | 'MEDICAL' | 'VACATION' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'EMERGENCY' | 'PUBLIC_HOLIDAY' | 'HALF_DAY';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface StaffLeave {
  id: string;
  staffId: string;
  staff?: { id: string; fullName: string; email: string; role: string };
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  reason?: string;
  notes?: string;
  attachmentUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectReason?: string;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  byType: Record<string, number>;
}

export interface CreateLeavePayload {
  staffId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
  reason?: string;
  notes?: string;
  attachmentUrl?: string;
  branchId?: string;
}

export interface LeaveQueryParams {
  staffId?: string;
  branchId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  CASUAL: 'Casual Leave',
  SICK: 'Sick Leave',
  MEDICAL: 'Medical Leave',
  VACATION: 'Vacation',
  MATERNITY: 'Maternity Leave',
  PATERNITY: 'Paternity Leave',
  UNPAID: 'Unpaid Leave',
  EMERGENCY: 'Emergency Leave',
  PUBLIC_HOLIDAY: 'Public Holiday',
  HALF_DAY: 'Half Day',
};

export const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  CASUAL: '#3b82f6',
  SICK: '#ef4444',
  MEDICAL: '#f97316',
  VACATION: '#10b981',
  MATERNITY: '#ec4899',
  PATERNITY: '#8b5cf6',
  UNPAID: '#6b7280',
  EMERGENCY: '#dc2626',
  PUBLIC_HOLIDAY: '#06b6d4',
  HALF_DAY: '#f59e0b',
};

export const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  CANCELLED: '#6b7280',
};
