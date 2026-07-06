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
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
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
  CONFIRMED: 2,
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
