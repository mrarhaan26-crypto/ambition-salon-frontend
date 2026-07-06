export type ConflictType =
  | 'staff_overlap'
  | 'staff_duplicate'
  | 'staff_busy'
  | 'staff_working_hours'
  | 'staff_break'
  | 'staff_lunch'
  | 'staff_leave'
  | 'staff_holiday'
  | 'staff_training'
  | 'staff_meeting'
  | 'staff_emergency'
  | 'staff_off_duty'
  | 'client_overlap'
  | 'client_duplicate'
  | 'client_service_overlap'
  | 'client_vip_priority'
  | 'client_membership'
  | 'client_package'
  | 'resource_chair'
  | 'resource_room'
  | 'resource_equipment'
  | 'resource_wash_station'
  | 'resource_vip_cabin'
  | 'resource_laser_machine'
  | 'resource_massage_bed'
  | 'buffer_before'
  | 'buffer_after'
  | 'buffer_cleaning'
  | 'buffer_preparation'
  | 'buffer_travel'
  | 'override_required';

export type ConflictSeverity = 'error' | 'warning' | 'info';

export type ConflictCategory = 'staff' | 'client' | 'resource' | 'buffer' | 'override';

export type ValidationMode = 'move' | 'resize' | 'creation' | 'update';

export interface ConflictItem {
  type: ConflictType;
  severity: ConflictSeverity;
  category: ConflictCategory;
  message: string;
  details: string;
  appointmentId?: string;
  conflictingAppointmentId?: string;
  conflictingStaffId?: string;
  conflictingClientId?: string;
  conflictingResourceId?: string;
  field?: string;
  canOverride: boolean;
  overrideRole?: OverrideRole;
}

export interface ConflictReport {
  valid: boolean;
  conflicts: ConflictItem[];
  errors: ConflictItem[];
  warnings: ConflictItem[];
  infos: ConflictItem[];
  duration: number;
  timestamp: number;
}

export type OverrideRole = 'owner' | 'manager' | 'reception';

export interface OverridePermission {
  role: OverrideRole;
  canOverrideStaffConflict: boolean;
  canOverrideClientConflict: boolean;
  canOverrideResourceConflict: boolean;
  canOverrideBufferConflict: boolean;
  maxOverridesPerDay: number;
}

export interface OverrideDecision {
  allowed: boolean;
  role: OverrideRole;
  timestamp: number;
  conflictTypes: ConflictType[];
  reason: string;
  expiresAt?: string;
}

export interface ValidationContext {
  mode: ValidationMode;
  appointmentId?: string;
  staffId: string;
  clientId?: string;
  startTime: string;
  endTime: string;
  branchId?: string;
  resourceId?: string;
  services?: { serviceId?: string; name: string; durationMin: number; price: number }[];
  isVIP?: boolean;
  membershipTier?: string;
  packageIds?: string[];
  overrideRole?: OverrideRole;
  overrideReason?: string;
}

export interface StaffScheduleBlock {
  type: 'WORKING' | 'BREAK' | 'LUNCH' | 'LEAVE' | 'HOLIDAY' | 'TRAINING' | 'MEETING' | 'EMERGENCY' | 'OFF_DUTY' | 'UNAVAILABLE';
  startTime: string;
  endTime: string;
  label?: string;
}

export interface StaffSchedule {
  staffId: string;
  blocks: StaffScheduleBlock[];
  workingHours: { start: string; end: string }[];
}

export interface ClientRestriction {
  type: 'membership' | 'package';
  id: string;
  name: string;
  allowedServices: string[];
  maxBookingsPerDay: number;
  maxBookingsPerWeek: number;
  restrictedDays: number[];
  vipOnly: boolean;
}

export interface ResourceAvailability {
  resourceId: string;
  type: string;
  name: string;
  available: boolean;
  bookedSlots: { startTime: string; endTime: string }[];
}

export interface ConflictLookupTable {
  staffAppointments: Map<string, { startTime: string; endTime: string; id: string }[]>;
  clientAppointments: Map<string, { startTime: string; endTime: string; id: string }[]>;
  resourceAppointments: Map<string, { startTime: string; endTime: string; id: string }[]>;
  staffSchedules: Map<string, StaffSchedule>;
  clientRestrictions: Map<string, ClientRestriction>;
  resourceAvailability: Map<string, ResourceAvailability>;
}

export function createEmptyConflictReport(): ConflictReport {
  return {
    valid: true,
    conflicts: [],
    errors: [],
    warnings: [],
    infos: [],
    duration: 0,
    timestamp: Date.now(),
  };
}

export function addConflict(report: ConflictReport, item: ConflictItem): ConflictReport {
  report.conflicts.push(item);
  if (item.severity === 'error') report.errors.push(item);
  else if (item.severity === 'warning') report.warnings.push(item);
  else report.infos.push(item);
  report.valid = report.errors.length === 0;
  return report;
}

export const BUSINESS_HOURS_DEFAULT = { start: 9, end: 20 };
export const VALIDATION_TIMEOUT_MS = 5000;
export const MAX_CONFLICTS_PER_REPORT = 50;
