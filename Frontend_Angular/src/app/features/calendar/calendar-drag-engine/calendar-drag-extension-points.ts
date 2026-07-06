import type { CalendarBooking } from '../calendar.models';

export interface ConflictExtensionV3 {
  checkBeforeDrag(appointmentId: string, newStart: string, newEnd: string, newStaffId?: string): Promise<{ hasConflict: boolean; conflicts: string[] }>;
  checkBeforeResize(appointmentId: string, newStart: string, newEnd: string): Promise<{ hasConflict: boolean; conflicts: string[] }>;
}

export interface BufferExtensionV2 {
  getBufferBefore(staffId: string): number;
  getBufferAfter(staffId: string): number;
  adjustForBuffer(startTime: string, endTime: string, staffId: string): { startTime: string; endTime: string };
}

export interface ResourceExtensionV3 {
  getResourceForStaff(staffId: string): string | null;
  isResourceAvailable(resourceId: string, start: string, end: string): boolean;
  assignResource(staffId: string, resourceId: string, start: string, end: string): void;
}

export interface ChairExtensionV2 {
  getChairForStaff(staffId: string): string | null;
  assignChair(staffId: string, chairId: string): void;
}

export interface RoomExtensionV2 {
  getRoomForStaff(staffId: string): string | null;
  assignRoom(staffId: string, roomId: string): void;
}

export interface EquipmentExtensionV2 {
  getEquipmentForStaff(staffId: string): string | null;
  assignEquipment(staffId: string, equipmentId: string): void;
}

export interface AnalyticsExtensionV2 {
  trackDragStart(appointmentId: string): void;
  trackDragEnd(appointmentId: string, oldStart: string, newStart: string): void;
  trackResizeStart(appointmentId: string): void;
  trackResizeEnd(appointmentId: string, oldDuration: number, newDuration: number): void;
  trackDrop(appointmentId: string, targetStaffId: string): void;
}

export interface AiSchedulerExtensionV3 {
  onDragMove(appointmentId: string, candidateStart: string, candidateStaffId?: string): Promise<{ score: number; suggestion?: string }>;
  suggestOptimization(bookings: CalendarBooking[]): CalendarBooking[];
}

export const DRAG_EXTENSION_POINTS = {
  conflict: null as ConflictExtensionV3 | null,
  buffer: null as BufferExtensionV2 | null,
  resource: null as ResourceExtensionV3 | null,
  chair: null as ChairExtensionV2 | null,
  room: null as RoomExtensionV2 | null,
  equipment: null as EquipmentExtensionV2 | null,
  analytics: null as AnalyticsExtensionV2 | null,
  aiScheduler: null as AiSchedulerExtensionV3 | null,
};
