import type { CalendarBooking } from './calendar.models';

export interface DragExtension {
  onDragStart(bookingId: string): void;
  onDragMove(bookingId: string, clientY: number): void;
  onDragEnd(bookingId: string, newStartTime: string): void;
  isDragging: boolean;
}

export interface ResizeExtension {
  onResizeStart(bookingId: string, edge: 'top' | 'bottom'): void;
  onResizeMove(bookingId: string, clientY: number): void;
  onResizeEnd(bookingId: string, newStartTime: string, newEndTime: string): void;
  isResizing: boolean;
}

export interface ConflictExtension {
  checkConflicts(booking: CalendarBooking): CalendarBooking[];
  conflicts: CalendarBooking[];
  hasConflicts: boolean;
}

export interface ResourceExtension {
  resourceId: string | null;
  resourceType: string;
  isAvailable: boolean;
}

export interface AnalyticsExtension {
  trackView(view: string, date: Date): void;
  trackClick(bookingId: string): void;
  trackCreate(booking: CalendarBooking): void;
  metrics: {
    totalViews: number;
    totalClicks: number;
    totalCreates: number;
  };
}

export interface AiSchedulerExtension {
  suggestOptimization(bookings: CalendarBooking[]): CalendarBooking[];
  detectNoShowRisk(booking: CalendarBooking): number;
  suggestStaff(booking: CalendarBooking): string[];
}

export const EXTENSION_POINTS = {} as {
  drag: DragExtension | null;
  resize: ResizeExtension | null;
  conflict: ConflictExtension | null;
  resource: ResourceExtension | null;
  analytics: AnalyticsExtension | null;
  aiScheduler: AiSchedulerExtension | null;
};
