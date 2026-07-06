export interface DragExtensionV2 {
  onDragStart(staffId: string, appointmentId: string, clientY: number): void;
  onDragMove(clientY: number): void;
  onDragEnd(newStaffId: string, newStartTime: string): void;
  isDragging: boolean;
}

export interface ResizeExtensionV2 {
  onResizeStart(appointmentId: string, edge: 'top' | 'bottom', clientY: number): void;
  onResizeMove(clientY: number): void;
  onResizeEnd(newStartTime: string, newEndTime: string): void;
  isResizing: boolean;
}

export interface ConflictExtensionV2 {
  checkConflicts(staffId: string, startTime: string, endTime: string): string[];
  getConflicts(staffId: string): string[];
  hasConflicts: boolean;
}

export interface ResourceExtensionV2 {
  assignResource(staffId: string, resourceId: string): void;
  unassignResource(staffId: string): void;
  getResourceUsage(staffId: string): { resourceId: string; type: string }[];
}

export interface ChairExtension {
  assignChair(staffId: string, chairId: string): void;
  getChairAssignment(staffId: string): string | null;
}

export interface RoomExtension {
  assignRoom(staffId: string, roomId: string): void;
  getRoomAssignment(staffId: string): string | null;
}

export interface EquipmentExtension {
  assignEquipment(staffId: string, equipmentId: string): void;
  getEquipmentAssignment(staffId: string): string | null;
}

export interface AiSchedulerExtensionV2 {
  suggestOptimization(staffIds: string[], date: string): any[];
  detectConflictRisk(staffId: string, startTime: string, endTime: string): number;
  suggestStaff(serviceId: string, startTime: string): string[];
}

export interface BufferZoneExtension {
  getBufferBefore(staffId: string): number;
  getBufferAfter(staffId: string): number;
  setBufferBefore(staffId: string, minutes: number): void;
  setBufferAfter(staffId: string, minutes: number): void;
}

export interface SmartScheduleExtension {
  optimizeDay(staffId: string, date: string): any[];
  getOptimizationScore(staffId: string): number;
  proposedSchedule: { start: string; end: string }[];
}

export const STAFF_TIMELINE_EXTENSIONS = {
  drag: null as DragExtensionV2 | null,
  resize: null as ResizeExtensionV2 | null,
  conflict: null as ConflictExtensionV2 | null,
  resource: null as ResourceExtensionV2 | null,
  chair: null as ChairExtension | null,
  room: null as RoomExtension | null,
  equipment: null as EquipmentExtension | null,
  ai: null as AiSchedulerExtensionV2 | null,
  buffer: null as BufferZoneExtension | null,
  smartSchedule: null as SmartScheduleExtension | null,
};
