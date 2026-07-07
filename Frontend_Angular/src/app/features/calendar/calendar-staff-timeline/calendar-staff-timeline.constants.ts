export const STAFF_TIMELINE_HOUR_HEIGHT_PX = 56;
export const STAFF_TIMELINE_HEADER_WIDTH_PX = 320;
export const STAFF_TIMELINE_MIN_COL_WIDTH_PX = 60;
export const STAFF_TIMELINE_SNAP_MINUTES = 15;
export const STAFF_TIMELINE_BUSINESS_START = 8;
export const STAFF_TIMELINE_BUSINESS_END = 21;

export const ZOOM_LEVELS = [32, 40, 56, 72, 96, 120, 144] as const;
export type ZoomLevel = (typeof ZOOM_LEVELS)[number];
export const DEFAULT_ZOOM_LEVEL: ZoomLevel = 56;
export const ZOOM_STORAGE_KEY = 'ambition_timeline_zoom';

export const STAFF_STATUS = [
  'AVAILABLE',
  'BUSY',
  'BREAK',
  'LEAVE',
  'HOLIDAY',
  'OFF_DUTY',
  'FULLY_BOOKED',
  'TRAINING',
  'MEETING',
  'EMERGENCY',
] as const;
export type StaffStatus = (typeof STAFF_STATUS)[number];

export const STAFF_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
  BREAK: 'Break',
  LEAVE: 'Leave',
  HOLIDAY: 'Holiday',
  OFF_DUTY: 'Off Duty',
  FULLY_BOOKED: 'Fully Booked',
  TRAINING: 'Training',
  MEETING: 'Meeting',
  EMERGENCY: 'Emergency',
};

export const STAFF_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#16a34a',
  BUSY: '#3b82f6',
  BREAK: '#f59e0b',
  LEAVE: '#f97316',
  HOLIDAY: '#8b5cf6',
  OFF_DUTY: '#6b7280',
  FULLY_BOOKED: '#dc2626',
  TRAINING: '#06b6d4',
  MEETING: '#8b5cf6',
  EMERGENCY: '#ef4444',
};

export const STAFF_STATUS_BG_COLORS: Record<string, string> = {
  AVAILABLE: '#f0fdf4',
  BUSY: '#eff6ff',
  BREAK: '#fefce8',
  LEAVE: '#fff7ed',
  HOLIDAY: '#f5f3ff',
  OFF_DUTY: '#f9fafb',
  FULLY_BOOKED: '#fef2f2',
  TRAINING: '#ecfeff',
  MEETING: '#f5f3ff',
  EMERGENCY: '#fef2f2',
};

export const WORKING_HOURS_TYPES = [
  'WORKING',
  'BREAK',
  'LUNCH',
  'LEAVE',
  'HOLIDAY',
  'OFF_DUTY',
  'UNAVAILABLE',
] as const;
export type WorkingHoursType = (typeof WORKING_HOURS_TYPES)[number];

export const WORKING_HOURS_LABELS: Record<string, string> = {
  WORKING: 'Working',
  BREAK: 'Break',
  LUNCH: 'Lunch',
  LEAVE: 'Leave',
  HOLIDAY: 'Holiday',
  OFF_DUTY: 'Off Duty',
  UNAVAILABLE: 'Unavailable',
};

export const WORKING_HOURS_COLORS: Record<string, string> = {
  WORKING: 'transparent',
  BREAK: '#fef3c7',
  LUNCH: '#fef3c7',
  LEAVE: '#fce7f3',
  HOLIDAY: '#ede9fe',
  OFF_DUTY: '#f3f4f6',
  UNAVAILABLE: '#f3f4f6',
};

export const STAFF_GROUP_TYPES = ['role', 'department', 'branch'] as const;
export type StaffGroupType = (typeof STAFF_GROUP_TYPES)[number];

export const STAFF_GROUP_LABELS: Record<string, string> = {
  role: 'Role',
  department: 'Department',
  branch: 'Branch',
};

export const STAFF_TIMELINE_COLORS = [
  '#4A90D9', '#50C878', '#E57373', '#FFB74D', '#9575CD',
  '#26A69A', '#F06292', '#A1887F', '#4DB6AC', '#7986CB',
  '#64B5F6', '#81C784', '#CE93D8', '#FFD54F', '#4DD0E1',
];

export const DEFAULT_FILTER_STATE = {
  search: '',
  role: '',
  availability: '',
  department: '',
  branchId: '',
  favoritesOnly: false,
  hideInactive: false,
};
