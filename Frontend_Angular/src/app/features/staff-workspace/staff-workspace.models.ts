export interface StaffWorkspaceProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  specialization: string;
  bio: string;
  isActive: boolean;
}

export interface StaffWorkspaceBooking {
  id: string;
  clientName: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface StaffWorkspaceTask {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string;
}

export interface StaffWorkspaceCommission {
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
}

export interface StaffWorkspaceAttendance {
  today: string | null;
  totalHours: number;
  lateDays: number;
  absentDays: number;
}
