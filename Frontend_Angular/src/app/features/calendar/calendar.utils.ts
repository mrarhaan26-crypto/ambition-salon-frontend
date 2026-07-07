import {
  CalendarView, MONTHS, DAYS_OF_WEEK, HOUR_HEIGHT_PX, MINUTE_HEIGHT_PX,
  OVERLAP_OFFSET_WIDTH, MAX_OVERLAP_COLUMNS, STAFF_COLORS,
  STATUS_COLORS, STATUS_DOT_COLORS, VIP_THRESHOLD, PACKAGE_THRESHOLD,
  MIN_CARD_HEIGHT, DEFAULT_STAFF_COLOR,
} from './calendar.constants';
import type { CalendarBooking } from './calendar.models';
import type { AppointmentCardData } from './calendar-appointment.models';

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

export function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function formatDateTitle(date: Date, view: CalendarView): string {
  if (view === 'day') {
    return `${DAYS_OF_WEEK[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  if (view === 'week') {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
    }
    return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
  }
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(date: Date): Date[] {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

export function getHoursArray(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function formatHour24(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function parseTime(dateStr: string | Date): Date {
  return typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
}

export function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function getAppointmentTop(date: Date): number {
  return (getMinutesFromMidnight(date) / 60) * HOUR_HEIGHT_PX;
}

export function getAppointmentHeight(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const durationMinutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);
  return (durationMinutes / 60) * HOUR_HEIGHT_PX;
}

export function getAppointmentStyle(booking: CalendarBooking): Partial<CSSStyleDeclaration> {
  const top = getAppointmentTop(parseTime(booking.startTime));
  const height = getAppointmentHeight(booking.startTime, booking.endTime);
  return {
    position: 'absolute',
    top: `${top}px`,
    height: `${Math.max(height, 24)}px`,
    left: '4px',
    right: '4px',
  } as any;
}

export function computeOverlapColumns(bookings: CalendarBooking[]): Map<string, number> {
  const sorted = [...bookings].sort((a, b) =>
    parseTime(a.startTime).getTime() - parseTime(b.startTime).getTime()
  );
  const columns: CalendarBooking[][] = [];
  const assignment = new Map<string, number>();

  for (const b of sorted) {
    const bStart = parseTime(b.startTime);
    const bEnd = parseTime(b.endTime);
    let placed = false;

    for (let ci = 0; ci < columns.length; ci++) {
      const col = columns[ci];
      const last = col[col.length - 1];
      const lastEnd = parseTime(last.endTime);
      if (bStart.getTime() >= lastEnd.getTime()) {
        col.push(b);
        assignment.set(b.id, ci);
        placed = true;
        break;
      }
    }

    if (!placed) {
      if (columns.length < MAX_OVERLAP_COLUMNS) {
        columns.push([b]);
        assignment.set(b.id, columns.length - 1);
      }
    }
  }

  return assignment;
}

export function getAppointmentsForDate(bookings: CalendarBooking[], date: Date): CalendarBooking[] {
  return bookings.filter(b => isSameDay(parseTime(b.startTime), date));
}

export function getAppointmentsForDayOfWeek(bookings: CalendarBooking[], dayOfWeek: number, weekStart: Date): CalendarBooking[] {
  const targetDate = new Date(weekStart);
  targetDate.setDate(weekStart.getDate() + dayOfWeek);
  return getAppointmentsForDate(bookings, targetDate);
}

export function getTotalDurationMinutes(booking: CalendarBooking): number {
  return Math.max(0, (parseTime(booking.endTime).getTime() - parseTime(booking.startTime).getTime()) / 60000);
}

export function getStaffInitials(name: string): string {
  return name.split(' ').map(s => s.charAt(0)).join('').toUpperCase().slice(0, 2);
}

export function getStaffColor(staffId: string, colors: string[]): string {
  if (!staffId) return '#999';
  let hash = 0;
  for (let i = 0; i < staffId.length; i++) {
    hash = staffId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function isVIP(booking: CalendarBooking): boolean {
  return (booking.totalAmount ?? 0) >= 200 || false;
}

export function hasNotes(booking: CalendarBooking): boolean {
  return !!booking.notes;
}

export function hasPackage(booking: CalendarBooking): boolean {
  return (booking.services ?? []).length > PACKAGE_THRESHOLD;
}

export function hasMembership(booking: CalendarBooking): boolean {
  return false;
}

export interface CardPositionData {
  top: number;
  height: number;
}

export function computeCardPosition(startTime: string, endTime: string): CardPositionData {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const top = (start.getHours() * 60 + start.getMinutes()) / 60 * HOUR_HEIGHT_PX;
  const height = Math.max((end.getTime() - start.getTime()) / 60000 / 60 * HOUR_HEIGHT_PX, MIN_CARD_HEIGHT);
  return { top, height };
}

export function buildAppointmentCardData(
  booking: CalendarBooking,
  staffColorMap: Record<string, string>,
): AppointmentCardData & CardPositionData {
  const service = (booking.services ?? [])[0];
  const color = staffColorMap[booking.staffId ?? ''] || DEFAULT_STAFF_COLOR;
  const initials = (booking.staff?.fullName || '?').split(' ').map(s => s.charAt(0)).join('').toUpperCase().slice(0, 2);
  const pos = computeCardPosition(booking.startTime, booking.endTime);
  return {
    id: booking.id,
    title: booking.title,
    status: booking.status,
    startTime: booking.startTime,
    endTime: booking.endTime,
    clientName: booking.client?.fullName || 'Unknown',
    clientId: booking.clientId,
    staffName: booking.staff?.fullName || '',
    staffId: booking.staffId,
    staffInitials: initials,
    staffColor: color,
    serviceName: service?.name || booking.title || 'Appointment',
    serviceCount: (booking.services ?? []).length,
    durationMin: 0,
    amount: booking.totalAmount ?? 0,
    notes: booking.notes || '',
    isVIP: (booking.totalAmount ?? 0) >= VIP_THRESHOLD,
    hasPackage: (booking.services ?? []).length > PACKAGE_THRESHOLD,
    hasMembership: false,
    colorStrip: booking.status,
    ...pos,
  };
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS['CONFIRMED'];
}

export function getStatusDotColor(status: string): string {
  return STATUS_DOT_COLORS[status] || STATUS_DOT_COLORS['CONFIRMED'];
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft', PENDING: 'Pending', NEEDS_CONFIRMATION: 'Needs Confirmation',
    CONFIRMED: 'Confirmed', ARRIVED: 'Arrived', CHECKED_IN: 'Checked In',
    WAITING: 'Waiting', IN_SERVICE: 'In Service',
    COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No Show',
    PAID: 'Paid', ARCHIVED: 'Archived',
  };
  return labels[status] || status;
}

export function getStaffColorById(staffId: string): string {
  return getStaffColor(staffId, [...STAFF_COLORS]);
}

export function getVipColor(isVip: boolean): string {
  return isVip ? '#FFD700' : 'transparent';
}

export function getDurationMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
