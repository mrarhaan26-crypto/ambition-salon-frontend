import type { CalendarBooking } from '../calendar.models';
import type { StaffStatus, WorkingHoursType, StaffGroupType } from './calendar-staff-timeline.constants';

export interface StaffTimelineStaff {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role: string;
  department?: string;
  branchId?: string;
  branchName?: string;
  isActive: boolean;
  avatarUrl?: string;
  specialization?: string;
  color: string;
  status: StaffStatus;
  workingHours: WorkingHourSlot[];
  kpis: StaffKpiData;
  bookingsToday: number;
  revenueToday: number;
  occupancyPercent: number;
  isFavorite: boolean;
  performanceScore?: number;
  online: boolean;
}

export interface WorkingHourSlot {
  start: string;
  end: string;
  type: WorkingHoursType;
  label?: string;
}

export interface StaffTimelineAppointment {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  clientName: string;
  serviceName: string;
  durationMin: number;
  amount: number;
  staffId: string;
  top: number;
  height: number;
  left: number;
  width: number;
  color: string;
  isVIP: boolean;
  hasNotes: boolean;
  hasOverlap: boolean;
  overlapCount: number;
}

export interface StaffKpiData {
  revenue: number;
  completed: number;
  pending: number;
  cancelled: number;
  noShow: number;
  occupancy: number;
  workingHours: number;
  breakHours: number;
  performanceScore?: number;
  onTime?: number;
  avgServiceTime?: number;
}

export interface StaffGroup {
  id: string;
  label: string;
  type: StaffGroupType;
  staffIds: string[];
  collapsed: boolean;
  count: number;
}

export interface StaffTimelineFilterState {
  search: string;
  role: string;
  availability: string;
  department: string;
  branchId: string;
  favoritesOnly: boolean;
  hideInactive: boolean;
}

export interface StaffTimelineViewData {
  staffList: StaffTimelineStaff[];
  appointments: StaffTimelineAppointment[];
  groups: StaffGroup[];
  hours: number[];
  currentTimePercent: number;
  todayDate: string;
  totalStaff: number;
  totalAppointments: number;
  filteredStaff: number;
}

export interface TimelinePosition {
  top: number;
  height: number;
  left: number;
  width: number;
}

export interface DragZonePlaceholder {
  staffId: string;
  startTime: string;
  endTime: string;
}

export interface ResizeZonePlaceholder {
  staffId: string;
  appointmentId: string;
  edge: 'top' | 'bottom';
}

export interface ConflictZonePlaceholder {
  staffId: string;
  startTime: string;
  endTime: string;
  conflictingIds: string[];
}

export interface ResourceZonePlaceholder {
  resourceId: string;
  resourceType: string;
  staffId: string;
}

export interface ChairZonePlaceholder {
  chairId: string;
  staffId: string;
}

export interface RoomZonePlaceholder {
  roomId: string;
  staffId: string;
}

export interface EquipmentZonePlaceholder {
  equipmentId: string;
  staffId: string;
}

export interface AiSuggestionPlaceholder {
  staffId: string;
  suggestedStart: string;
  score: number;
  reason: string;
}

export interface BufferZonePlaceholder {
  staffId: string;
  startTime: string;
  endTime: string;
  bufferMinutes: number;
}

export interface SmartSchedulePlaceholder {
  staffId: string;
  proposedSchedule: { start: string; end: string }[];
  optimizationScore: number;
}

export interface StaffTimelineExtensionPoints {
  drag: DragZonePlaceholder | null;
  resize: ResizeZonePlaceholder | null;
  conflict: ConflictZonePlaceholder | null;
  resource: ResourceZonePlaceholder | null;
  chair: ChairZonePlaceholder | null;
  room: RoomZonePlaceholder | null;
  equipment: EquipmentZonePlaceholder | null;
  ai: AiSuggestionPlaceholder | null;
  buffer: BufferZonePlaceholder | null;
  smartSchedule: SmartSchedulePlaceholder | null;
}
