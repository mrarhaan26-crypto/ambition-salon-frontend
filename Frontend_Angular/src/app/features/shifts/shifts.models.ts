export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  isRecurring: boolean;
  recurringPattern: 'WEEKLY' | 'BIWEEKLY' | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABSENT';
  notes: string;
  createdAt: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  daysOfWeek: number[];
  isActive: boolean;
}
