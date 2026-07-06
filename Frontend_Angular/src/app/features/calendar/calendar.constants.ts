export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAYS_OF_WEEK_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export const BUSINESS_HOURS_START = 9;
export const BUSINESS_HOURS_END = 20;
export const BUSINESS_HOURS = BUSINESS_HOURS_END - BUSINESS_HOURS_START;
export const VIEWS = ['day', 'week', 'month'] as const;
export type CalendarView = (typeof VIEWS)[number];

export const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#4A90D9',
  CHECKED_IN: '#50C878',
  COMPLETED: '#2E7D32',
  CANCELLED: '#9E9E9E',
  NO_SHOW: '#E57373',
  PENDING: '#FFB74D',
};
