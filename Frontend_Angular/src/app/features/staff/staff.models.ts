export interface Staff {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  specialization: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  branchId?: string;
  branchName?: string;
  staffCode?: string;
  employmentType?: string;
  joiningDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  city?: string;
  taxId?: string;
  payRate?: number;
  payPeriod?: string;
  avatar?: string;
  skills?: string[];
  certifications?: string[];
}

export interface StaffScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  status: string;
  notes: string | null;
  isLate: boolean;
  isEarlyDeparture: boolean;
  overtimeMinutes: number;
}

export interface StaffLeave {
  id: string;
  staffId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  approvedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface StaffPerformance {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  revenue: number;
  completionRate: number;
  averageRating: number;
  rebookingRate: number;
}

export interface StaffWorkspaceData {
  profile: Staff;
  todayBookings: any[];
  upcomingAppointments: any[];
  todayAttendance: StaffAttendance | null;
  commissionSummary: any;
  recentActivity: any[];
}

export interface DailyAttendanceSummary {
  date: string;
  present: number;
  late: number;
  absent: number;
  onBreak: number;
  total: number;
}
