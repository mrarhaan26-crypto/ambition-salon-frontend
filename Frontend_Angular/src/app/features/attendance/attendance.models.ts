export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  duration: number | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  notes: string;
}

export interface AttendanceSummary {
  totalToday: number;
  clockedIn: number;
  notClockedIn: number;
  lateToday: number;
  staffHours: { staffName: string; hours: number }[];
}
