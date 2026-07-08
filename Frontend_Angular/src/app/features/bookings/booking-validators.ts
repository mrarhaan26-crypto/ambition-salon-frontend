import type { BookingDrawerDraft, BookingDrawerSchedule } from './booking-drawer.models';

export const BUSINESS_START = 8;
export const BUSINESS_END = 20;
export const MAX_DURATION_MIN = 480;
export const MIN_DURATION_MIN = 5;
export const HOLIDAY_DATES: string[] = [];
export const CLOSED_WEEK_DAYS: number[] = []; // 0=Sun, 6=Sat

export function isWithinWorkingHours(time: string): boolean {
  const [h, m] = time.split(':').map(Number);
  const totalMin = h * 60 + m;
  const startMin = BUSINESS_START * 60;
  const endMin = BUSINESS_END * 60;
  return totalMin >= startMin && totalMin + 15 <= endMin;
}

export function isWithinBusinessHours(date: string, startTime: string, endTime: string): boolean {
  if (!date || !startTime || !endTime) return false;
  return isWithinWorkingHours(startTime) && isWithinWorkingHours(endTime);
}

export function isValidDuration(durationMin: number): boolean {
  return durationMin >= MIN_DURATION_MIN && durationMin <= MAX_DURATION_MIN;
}

export function isHoliday(date: string): boolean {
  return HOLIDAY_DATES.includes(date);
}

export function isClosedDay(date: string): boolean {
  const day = new Date(date).getDay();
  return CLOSED_WEEK_DAYS.includes(day);
}

export function isStaffOnLeave(staffId: string, date: string, leaveDays: Array<{ staffId: string; date: string }>): boolean {
  return leaveDays.some(l => l.staffId === staffId && l.date === date);
}

export function isDuringBreak(time: string, breaks: Array<{ start: string; end: string }>): boolean {
  const t = parseTime(time);
  return breaks.some(b => t >= parseTime(b.start) && t < parseTime(b.end));
}

export function timeOverlaps(
  start1: string, end1: string,
  start2: string, end2: string,
): boolean {
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  return s1 < e2 && e1 > s2;
}

export function getOverlapDuration(
  start1: string, end1: string,
  start2: string, end2: string,
): number {
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  const overlapStart = Math.max(s1, s2);
  const overlapEnd = Math.min(e1, e2);
  return Math.max(0, overlapEnd - overlapStart);
}

export function validateBookingDraft(draft: BookingDrawerDraft): string[] {
  const errors: string[] = [];

  if (!draft.customer.fullName.trim()) errors.push('Customer name is required');
  if (!draft.customer.mobile.trim()) errors.push('Customer mobile is required');
  if (draft.services.length === 0) errors.push('At least one service is required');
  if (!draft.schedule.date) errors.push('Date is required');
  if (!draft.schedule.startTime) errors.push('Start time is required');
  if (!draft.schedule.staffId) errors.push('Staff is required');

  if (draft.schedule.date && draft.schedule.startTime && draft.schedule.endTime) {
    if (isHoliday(draft.schedule.date)) errors.push('Cannot book on a holiday');
    if (isClosedDay(draft.schedule.date)) errors.push('Salon is closed on this day');
    if (!isWithinWorkingHours(draft.schedule.startTime)) errors.push('Start time is outside working hours');
    if (!isWithinWorkingHours(draft.schedule.endTime)) errors.push('End time is outside working hours');
  }

  const totalDur = draft.services.reduce((sum, s) => sum + s.durationMin, 0);
  if (totalDur > 0 && !isValidDuration(totalDur)) {
    if (totalDur < MIN_DURATION_MIN) errors.push(`Minimum booking duration is ${MIN_DURATION_MIN} minutes`);
    if (totalDur > MAX_DURATION_MIN) errors.push(`Maximum booking duration is ${MAX_DURATION_MIN} minutes`);
  }

  return errors;
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
