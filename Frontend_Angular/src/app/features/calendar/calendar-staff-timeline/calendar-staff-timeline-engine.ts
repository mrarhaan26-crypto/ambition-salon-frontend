import {
  STAFF_TIMELINE_HOUR_HEIGHT_PX,
  STAFF_TIMELINE_BUSINESS_START,
  STAFF_TIMELINE_BUSINESS_END,
} from './calendar-staff-timeline.constants';
import type { StaffTimelineAppointment, StaffTimelineStaff, WorkingHourSlot } from './calendar-staff-timeline.models';
import type { CalendarBooking } from '../calendar.models';

export function getTimelineHours(start = STAFF_TIMELINE_BUSINESS_START, end = STAFF_TIMELINE_BUSINESS_END): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function getAppointmentTop(startTime: string, hourHeight = STAFF_TIMELINE_HOUR_HEIGHT_PX): number {
  const date = new Date(startTime);
  const minutesPastBusinessStart = getMinutesFromMidnight(date) - STAFF_TIMELINE_BUSINESS_START * 60;
  return Math.max(0, (minutesPastBusinessStart / 60) * hourHeight);
}

export function getAppointmentHeight(startTime: string, endTime: string, hourHeight = STAFF_TIMELINE_HOUR_HEIGHT_PX): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMinutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);
  return Math.max(20, (durationMinutes / 60) * hourHeight);
}

export function getCurrentTimePercent(): number {
  const now = new Date();
  const totalBusinessMinutes = (STAFF_TIMELINE_BUSINESS_END - STAFF_TIMELINE_BUSINESS_START) * 60;
  const minutesPastStart = getMinutesFromMidnight(now) - STAFF_TIMELINE_BUSINESS_START * 60;
  return Math.max(0, Math.min(100, (minutesPastStart / totalBusinessMinutes) * 100));
}

export function isWithinBusinessHours(date: Date): boolean {
  const hours = date.getHours();
  return hours >= STAFF_TIMELINE_BUSINESS_START && hours < STAFF_TIMELINE_BUSINESS_END;
}

export function getCurrentTimeLineTop(hourHeight = STAFF_TIMELINE_HOUR_HEIGHT_PX): number {
  const now = new Date();
  const minutesPastBusinessStart = getMinutesFromMidnight(now) - STAFF_TIMELINE_BUSINESS_START * 60;
  return Math.max(0, (minutesPastBusinessStart / 60) * hourHeight);
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export function computeTimelineAppointment(
  booking: CalendarBooking,
  staffId: string,
  color: string,
  hourHeight = STAFF_TIMELINE_HOUR_HEIGHT_PX,
): StaffTimelineAppointment {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const durationMin = Math.max(0, (end.getTime() - start.getTime()) / 60000);
  const service = (booking.services ?? [])[0];
  return {
    id: booking.id,
    title: booking.title,
    status: booking.status,
    startTime: booking.startTime,
    endTime: booking.endTime,
    clientName: booking.client?.fullName || 'Client',
    serviceName: service?.name || booking.title || 'Appointment',
    durationMin,
    amount: booking.totalAmount ?? 0,
    staffId,
    top: getAppointmentTop(booking.startTime, hourHeight),
    height: getAppointmentHeight(booking.startTime, booking.endTime, hourHeight),
    left: 4,
    width: 0,
    color,
    isVIP: (booking.totalAmount ?? 0) >= 200,
    hasNotes: !!booking.notes,
    hasOverlap: false,
    overlapCount: 0,
  };
}

export function computeOccupancyPercent(totalMinutes: number, availableMinutes: number): number {
  if (availableMinutes <= 0) return 0;
  return Math.min(100, Math.round((totalMinutes / availableMinutes) * 100));
}

export function getPerformanceScore(kpis: { completed: number; cancelled: number; revenue: number; workingHours: number }): number {
  if (kpis.workingHours <= 0) return 0;
  const completionRate = kpis.completed / Math.max(1, kpis.completed + kpis.cancelled);
  const revenuePerHour = kpis.revenue / kpis.workingHours;
  return Math.round((completionRate * 60 + Math.min(revenuePerHour, 100) * 0.4) * 10) / 10;
}

export function getStaffInitials(name: string): string {
  return name.split(' ').map(s => s.charAt(0)).join('').toUpperCase().slice(0, 2);
}

export function computeStatus(bookingsCount: number, isActive: boolean, onLeave: boolean, isAfterHours?: boolean): string {
  if (!isActive) return 'OFF_DUTY';
  if (onLeave) return 'LEAVE';
  if (isAfterHours) return 'OFF_DUTY';
  if (bookingsCount >= 8) return 'FULLY_BOOKED';
  if (bookingsCount > 0) return 'BUSY';
  return 'AVAILABLE';
}

export function isWorkingHourSlot(slot: WorkingHourSlot, date: Date): boolean {
  const slotStart = new Date(slot.start);
  const slotEnd = new Date(slot.end);
  return date >= slotStart && date < slotEnd && slot.type === 'WORKING';
}

export function getWorkingHourTypeForTime(slots: WorkingHourSlot[], date: Date): string {
  for (const slot of slots) {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);
    if (date >= slotStart && date < slotEnd) {
      return slot.type;
    }
  }
  return 'UNAVAILABLE';
}

export function getTotalWorkingMinutes(slots: WorkingHourSlot[]): number {
  return slots
    .filter(s => s.type === 'WORKING')
    .reduce((total, s) => {
      const start = new Date(s.start);
      const end = new Date(s.end);
      return total + Math.max(0, (end.getTime() - start.getTime()) / 60000);
    }, 0);
}

export function getTotalBreakMinutes(slots: WorkingHourSlot[]): number {
  return slots
    .filter(s => s.type === 'BREAK' || s.type === 'LUNCH')
    .reduce((total, s) => {
      const start = new Date(s.start);
      const end = new Date(s.end);
      return total + Math.max(0, (end.getTime() - start.getTime()) / 60000);
    }, 0);
}

export function formatTimelineHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function formatTimelineTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

export function getDurationBarPercent(booking: CalendarBooking): number {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const totalMinutes = (end.getTime() - start.getTime()) / 60000;
  return Math.min(100, (totalMinutes / 480) * 100);
}
