export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAYS_OF_WEEK_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export const BUSINESS_HOURS_START = 9;
export const BUSINESS_HOURS_END = 20;
export const BUSINESS_HOURS = BUSINESS_HOURS_END - BUSINESS_HOURS_START;
export const VIEWS = ['day', 'week', 'month', 'timeline'] as const;
export type CalendarView = (typeof VIEWS)[number];

export const APPOINTMENT_STATUSES = [
  'DRAFT', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_SERVICE',
  'COMPLETED', 'CANCELLED', 'NO_SHOW', 'PAID', 'ARCHIVED',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#B0BEC5',
  PENDING: '#FFB74D',
  CONFIRMED: '#4A90D9',
  CHECKED_IN: '#50C878',
  WAITING: '#9575CD',
  IN_SERVICE: '#26A69A',
  IN_PROGRESS: '#26A69A',
  COMPLETED: '#2E7D32',
  CANCELLED: '#9E9E9E',
  NO_SHOW: '#E57373',
  PAID: '#1B5E20',
  ARCHIVED: '#78909C',
  ARRIVED: '#50C878',
  NEEDS_CONFIRMATION: '#FFB74D',
};

export const STATUS_TEXT_COLORS: Record<string, string> = {
  DRAFT: '#fff',
  PENDING: '#fff',
  CONFIRMED: '#fff',
  CHECKED_IN: '#fff',
  WAITING: '#fff',
  IN_SERVICE: '#fff',
  IN_PROGRESS: '#fff',
  COMPLETED: '#fff',
  CANCELLED: '#fff',
  NO_SHOW: '#fff',
  PAID: '#fff',
  ARCHIVED: '#fff',
  ARRIVED: '#fff',
  NEEDS_CONFIRMATION: '#fff',
};

export const STATUS_BG_COLORS: Record<string, string> = {
  DRAFT: '#f5f5f5',
  PENDING: '#fff8e1',
  CONFIRMED: '#e3f2fd',
  CHECKED_IN: '#e8f5e9',
  WAITING: '#f3e5f5',
  IN_SERVICE: '#e0f2f1',
  IN_PROGRESS: '#e0f2f1',
  COMPLETED: '#e8f5e9',
  CANCELLED: '#fafafa',
  NO_SHOW: '#ffebee',
  PAID: '#e8f5e9',
  ARCHIVED: '#eceff1',
  ARRIVED: '#e8f5e9',
  NEEDS_CONFIRMATION: '#fff8e1',
};

export const STATUS_BORDER_COLORS: Record<string, string> = {
  DRAFT: '#B0BEC5',
  PENDING: '#FFB74D',
  CONFIRMED: '#4A90D9',
  CHECKED_IN: '#50C878',
  WAITING: '#9575CD',
  IN_SERVICE: '#26A69A',
  IN_PROGRESS: '#26A69A',
  COMPLETED: '#2E7D32',
  CANCELLED: '#9E9E9E',
  NO_SHOW: '#E57373',
  PAID: '#1B5E20',
  ARCHIVED: '#78909C',
  ARRIVED: '#50C878',
  NEEDS_CONFIRMATION: '#FFB74D',
};

export const STATUS_DOT_COLORS: Record<string, string> = {
  DRAFT: '#B0BEC5',
  PENDING: '#FFB74D',
  CONFIRMED: '#4A90D9',
  CHECKED_IN: '#50C878',
  WAITING: '#9575CD',
  IN_SERVICE: '#26A69A',
  IN_PROGRESS: '#26A69A',
  COMPLETED: '#2E7D32',
  CANCELLED: '#9E9E9E',
  NO_SHOW: '#E57373',
  PAID: '#1B5E20',
  ARCHIVED: '#78909C',
  ARRIVED: '#50C878',
  NEEDS_CONFIRMATION: '#FFB74D',
};

export const APPOINTMENT_STATUS_BADGE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  DRAFT: { bg: '#f5f5f5', text: '#78909C', border: '#B0BEC5', dot: '#B0BEC5' },
  PENDING: { bg: '#fff8e1', text: '#f57f17', border: '#FFB74D', dot: '#FFB74D' },
  NEEDS_CONFIRMATION: { bg: '#fff8e1', text: '#f57f17', border: '#FFB74D', dot: '#FFB74D' },
  CONFIRMED: { bg: '#e3f2fd', text: '#1565c0', border: '#4A90D9', dot: '#4A90D9' },
  ARRIVED: { bg: '#e8f5e9', text: '#2e7d32', border: '#50C878', dot: '#50C878' },
  CHECKED_IN: { bg: '#e8f5e9', text: '#2e7d32', border: '#50C878', dot: '#50C878' },
  WAITING: { bg: '#f3e5f5', text: '#7b1fa2', border: '#9575CD', dot: '#9575CD' },
  IN_SERVICE: { bg: '#e0f2f1', text: '#00695c', border: '#26A69A', dot: '#26A69A' },
  IN_PROGRESS: { bg: '#e0f2f1', text: '#00695c', border: '#26A69A', dot: '#26A69A' },
  COMPLETED: { bg: '#e8f5e9', text: '#1b5e20', border: '#2E7D32', dot: '#2E7D32' },
  CANCELLED: { bg: '#fafafa', text: '#78909C', border: '#9E9E9E', dot: '#9E9E9E' },
  NO_SHOW: { bg: '#ffebee', text: '#c62828', border: '#E57373', dot: '#E57373' },
  PAID: { bg: '#e8f5e9', text: '#1b5e20', border: '#1B5E20', dot: '#1B5E20' },
  ARCHIVED: { bg: '#eceff1', text: '#546e7a', border: '#78909C', dot: '#78909C' },
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  NEEDS_CONFIRMATION: 'Needs Confirmation',
  CONFIRMED: 'Confirmed',
  ARRIVED: 'Arrived',
  CHECKED_IN: 'Checked In',
  WAITING: 'Waiting',
  IN_SERVICE: 'In Service',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
  PAID: 'Paid',
  ARCHIVED: 'Archived',
};

export const STATUS_PRIORITY_ORDER: Record<string, number> = {
  DRAFT: 0,
  PENDING: 1,
  NEEDS_CONFIRMATION: 1,
  CONFIRMED: 2,
  ARRIVED: 3,
  CHECKED_IN: 3,
  WAITING: 4,
  IN_SERVICE: 5,
  COMPLETED: 6,
  PAID: 7,
  NO_SHOW: 8,
  CANCELLED: 9,
  ARCHIVED: 10,
};

export const STATUSES_ACTIVE: AppointmentStatus[] = ['CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_SERVICE'];
export const STATUSES_TERMINAL: AppointmentStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'ARCHIVED'];

export const STAFF_COLORS = [
  '#4A90D9', '#50C878', '#E57373', '#FFB74D', '#9575CD',
  '#26A69A', '#F06292', '#A1887F', '#4DB6AC', '#7986CB',
];

export const PRIORITY_COLORS: Record<string, string> = {
  VIP: '#FFD700',
  NORMAL: 'transparent',
};

export const PAYMENT_COLORS: Record<string, string> = {
  PENDING: '#FFB74D',
  PAID: '#2E7D32',
  PARTIAL: '#4A90D9',
  REFUNDED: '#E57373',
  CANCELLED: '#9E9E9E',
};

export const MEMBERSHIP_COLORS: Record<string, string> = {
  GOLD: '#FFD700',
  SILVER: '#B0BEC5',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
  NONE: 'transparent',
};

export const HOUR_HEIGHT_PX = 60;
export const HALF_HOUR_HEIGHT_PX = 30;
export const MINUTE_HEIGHT_PX = 1;
export const OVERLAP_OFFSET_WIDTH = 20;
export const MAX_OVERLAP_COLUMNS = 4;

export const MIN_CARD_HEIGHT = 24;
export const DEFAULT_STAFF_COLOR = '#4A90D9';
export const DEFAULT_BRANCH_ID = '';
export const DEFAULT_STATUS = 'CONFIRMED';
export const VIP_THRESHOLD = 200;
export const PACKAGE_THRESHOLD = 2;
