import { CalendarView, MONTHS, DAYS_OF_WEEK } from './calendar.constants';

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
