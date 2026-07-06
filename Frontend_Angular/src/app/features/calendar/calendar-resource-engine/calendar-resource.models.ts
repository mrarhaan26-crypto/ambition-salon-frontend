export const RESOURCE_TYPES = [
  'chair', 'room', 'vip_cabin', 'wash_station', 'equipment',
  'laser_machine', 'massage_bed', 'nail_table', 'facial_room', 'hair_station',
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_STATUSES = [
  'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'ARCHIVED',
] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const RESOURCE_OCCUPANCY = [
  'FREE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE',
  'BLOCKED', 'HOLIDAY', 'OUT_OF_SERVICE',
] as const;
export type ResourceOccupancy = (typeof RESOURCE_OCCUPANCY)[number];

export const RESERVATION_TYPES = [
  'primary', 'secondary', 'temporary', 'exclusive',
] as const;
export type ReservationType = (typeof RESERVATION_TYPES)[number];

export const RESERVATION_STATUSES = [
  'ACTIVE', 'PENDING', 'CANCELLED', 'EXPIRED', 'RELEASED',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const MAINTENANCE_TYPES = [
  'CLEANING', 'REPAIR', 'CALIBRATION', 'INSPECTION',
  'MANUAL_BLOCK', 'HOLIDAY_BLOCK',
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const BRANCH_SCOPES = ['shared', 'branch', 'global'] as const;
export type BranchScope = (typeof BRANCH_SCOPES)[number];

export interface ResourceEntity {
  id: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  branchId: string;
  branchScope: BranchScope;
  description?: string;
  capacity: number;
  isFavorite: boolean;
  isHidden: boolean;
  color: string;
  icon?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  id: string;
  resourceId: string;
  appointmentId: string;
  type: ReservationType;
  status: ReservationStatus;
  staffId?: string;
  clientId?: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  expiresAt?: string;
  releasedAt?: string;
}

export interface MaintenanceBlock {
  id: string;
  resourceId: string;
  type: MaintenanceType;
  startTime: string;
  endTime: string;
  label: string;
  description?: string;
  createdBy: string;
  createdAt: string;
}

export interface ResourceTimelineSlot {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  occupancy: ResourceOccupancy;
  startTime: string;
  endTime: string;
  appointmentId?: string;
  allocationId?: string;
  maintenanceId?: string;
  label: string;
  color: string;
  staffName?: string;
  clientName?: string;
}

export interface ResourceUtilizationStats {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  totalMinutes: number;
  freeMinutes: number;
  busyMinutes: number;
  maintenanceMinutes: number;
  idleMinutes: number;
  usagePercent: number;
  peakUsageHour: number;
  peakUsageDate: string;
  periodStart: string;
  periodEnd: string;
}

export interface ResourceFilter {
  type?: ResourceType[];
  status?: ResourceStatus[];
  branchId?: string[];
  availability?: boolean;
  favorite?: boolean;
  hidden?: boolean;
  maintenance?: boolean;
  search?: string;
  tags?: string[];
}

export interface ResourceCreateRequest {
  name: string;
  type: ResourceType;
  branchId: string;
  branchScope?: BranchScope;
  description?: string;
  capacity?: number;
  color?: string;
  icon?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ResourceUpdateRequest {
  name?: string;
  description?: string;
  capacity?: number;
  color?: string;
  icon?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ResourceReservationRequest {
  resourceId: string;
  appointmentId: string;
  type: ReservationType;
  staffId?: string;
  clientId?: string;
  startTime: string;
  endTime: string;
}

export interface ResourceBranchTransferRequest {
  resourceId: string;
  targetBranchId: string;
  newScope: BranchScope;
  reason?: string;
}

export function getResourceTypeLabel(type: ResourceType): string {
  const labels: Record<string, string> = {
    chair: 'Chair', room: 'Room', vip_cabin: 'VIP Cabin',
    wash_station: 'Wash Station', equipment: 'Equipment',
    laser_machine: 'Laser Machine', massage_bed: 'Massage Bed',
    nail_table: 'Nail Table', facial_room: 'Facial Room',
    hair_station: 'Hair Station',
  };
  return labels[type] || type;
}

export function getResourceStatusColor(status: ResourceStatus): string {
  const colors: Record<string, string> = {
    ACTIVE: '#16a34a', INACTIVE: '#6b7280',
    MAINTENANCE: '#f59e0b', OUT_OF_SERVICE: '#dc2626',
    ARCHIVED: '#9ca3af',
  };
  return colors[status] || '#6b7280';
}

export function getOccupancyColor(occupancy: ResourceOccupancy): string {
  const colors: Record<string, string> = {
    FREE: '#16a34a', RESERVED: '#3b82f6',
    OCCUPIED: '#dc2626', CLEANING: '#f59e0b',
    MAINTENANCE: '#f97316', BLOCKED: '#6b7280',
    HOLIDAY: '#8b5cf6', OUT_OF_SERVICE: '#ef4444',
  };
  return colors[occupancy] || '#6b7280';
}
