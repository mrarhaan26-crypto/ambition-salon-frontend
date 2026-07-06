export const QUEUE_STATUSES = [
  'WAITING', 'CHECKED_IN', 'CALLED', 'ASSIGNED',
  'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const CHECK_IN_TYPES = ['manual', 'walk_in', 'early', 'late'] as const;
export type CheckInType = (typeof CHECK_IN_TYPES)[number];

export const PRIORITY_LEVELS = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const QUEUE_SORT_FIELDS = ['priority', 'checkInTime', 'appointmentTime', 'waitingTime'] as const;
export type QueueSortField = (typeof QUEUE_SORT_FIELDS)[number];

export interface QueueEntry {
  id: string;
  token: string;
  queueNumber: number;
  status: QueueStatus;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  isVIP: boolean;
  membershipTier?: string;
  staffId?: string;
  staffName?: string;
  resourceId?: string;
  resourceName?: string;
  services: QueueService[];
  appointmentId?: string;
  appointmentTime?: string;
  checkInTime: string;
  checkInType: CheckInType;
  priority: PriorityLevel;
  priorityScore: number;
  priorityReason?: string;
  position: number;
  estimatedWaitMinutes: number;
  estimatedServiceMinutes: number;
  waitingMinutes: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  calledAt?: string;
  assignedAt?: string;
  inServiceAt?: string;
  completedAt?: string;
}

export interface QueueService {
  serviceId?: string;
  name: string;
  durationMin: number;
  price: number;
}

export interface CheckInRequest {
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  appointmentId?: string;
  appointmentTime?: string;
  staffId?: string;
  staffName?: string;
  services: QueueService[];
  notes?: string;
  isVIP?: boolean;
  membershipTier?: string;
  createdBy: string;
}

export interface CheckInResult {
  entry: QueueEntry;
  checkInType: CheckInType;
  isEarly: boolean;
  isLate: boolean;
  waitTimeMinutes: number;
}

export interface QueueDisplayItem {
  id: string;
  token: string;
  queueNumber: number;
  clientName: string;
  isVIP: boolean;
  status: QueueStatus;
  priority: PriorityLevel;
  position: number;
  estimatedWaitMinutes: number;
  estimatedServiceMinutes: number;
  waitingMinutes: number;
  assignedStaff?: string;
  assignedResource?: string;
  serviceName: string;
  serviceDuration: number;
  checkInTime: string;
  membershipTier?: string;
}

export interface QueueStats {
  totalWaiting: number;
  totalCheckedIn: number;
  totalInService: number;
  totalCompleted: number;
  totalCancelled: number;
  totalNoShow: number;
  averageWaitMinutes: number;
  longestWaitMinutes: number;
  estimatedTotalServiceMinutes: number;
  peakQueueLength: number;
}

export function getQueueStatusLabel(status: QueueStatus): string {
  const labels: Record<string, string> = {
    WAITING: 'Waiting', CHECKED_IN: 'Checked In', CALLED: 'Called',
    ASSIGNED: 'Assigned', IN_SERVICE: 'In Service',
    COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No Show',
  };
  return labels[status] || status;
}

export function getQueueStatusColor(status: QueueStatus): string {
  const colors: Record<string, string> = {
    WAITING: '#f59e0b', CHECKED_IN: '#3b82f6', CALLED: '#8b5cf6',
    ASSIGNED: '#6366f1', IN_SERVICE: '#16a34a',
    COMPLETED: '#2e7d32', CANCELLED: '#9e9e9e', NO_SHOW: '#ef4444',
  };
  return colors[status] || '#6b7280';
}

export function getPriorityColor(level: PriorityLevel): string {
  const colors: Record<string, string> = {
    LOW: '#9ca3af', NORMAL: '#3b82f6', HIGH: '#f59e0b', URGENT: '#ef4444',
  };
  return colors[level] || '#6b7280';
}

export function getCheckInTypeLabel(type: CheckInType): string {
  const labels: Record<string, string> = {
    manual: 'Manual', walk_in: 'Walk-in', early: 'Early Arrival', late: 'Late Arrival',
  };
  return labels[type] || type;
}
