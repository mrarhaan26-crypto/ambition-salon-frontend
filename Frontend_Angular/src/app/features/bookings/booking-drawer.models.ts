import type { BookingStatus, ClientOption, StaffOption, BranchOption, ServiceOption } from './bookings.models';

export type BookingDrawerMode = 'create' | 'edit' | 'duplicate' | 'walkin' | 'repeat';
export type BookingStep = 1 | 2 | 3 | 4;
export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface BookingDrawerCustomer {
  id?: string;
  mobile: string;
  fullName: string;
  gender: string;
  dob: string;
  anniversary: string;
  email: string;
  address: string;
  isVIP: boolean;
  membershipId: string;
  membershipName: string;
  loyaltyPoints: number;
  walletBalance: number;
  allergies: string;
  preferences: string;
  lastVisit: string | null;
  lifetimeSpend: number;
  visitCount: number;
  notes: string;
}

export interface BookingDrawerService {
  id: string;
  serviceId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  durationMin: number;
  price: number;
  discount: number;
  discountType: 'percent' | 'fixed';
  tax: number;
  taxRate: number;
  commission: number;
  commissionType: 'percent' | 'fixed';
  color: string;
  staffId: string;
  staffName: string;
  chairId: string;
  chairName: string;
  roomId: string;
  roomName: string;
  customStartTime: string;
  customEndTime: string;
  bufferBefore: number;
  bufferAfter: number;
  notes: string;
  isFavorite: boolean;
  splitGroupId?: string;
  staffIds?: string[];
  resourceIds?: string[];
  equipmentIds?: string[];
  packageId?: string;
  membershipId?: string;
}

export interface BookingDrawerSplitSegment {
  id: string;
  serviceDraftId: string;
  staffId: string;
  resourceId?: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  notes?: string;
}

export interface BookingDrawerProduct {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BookingDrawerPackage {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BookingDrawerAttachment {
  id: string;
  name: string;
  type: 'photo' | 'document' | 'attachment';
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

export interface BookingDrawerBillReference {
  id: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
}

export interface BookingDrawerSuggestion {
  id: string;
  type: 'recommendation' | 'upsell' | 'ai';
  title: string;
  reason: string;
  serviceId?: string;
  productId?: string;
  score?: number;
}

export type BookingSource = 'walkin' | 'online' | 'phone' | 'repeat' | 'app';

export interface BookingDrawerSchedule {
  date: string;
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
  chairId: string;
  chairName: string;
  roomId: string;
  roomName: string;
  businessStart: string;
  businessEnd: string;
  breakStart: string;
  breakEnd: string;
  bufferMin: number;
  workingDays: number[];
  holidays: string[];
  source: BookingSource;
  branchId: string;
  branchName: string;
}

export interface RecurringBookingPattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  interval: number;
  weekDays: number[];
  endDate: string;
  occurrences: number;
  rrule?: string;
  skipHolidays?: boolean;
  skipLeave?: boolean;
  seriesId?: string;
}

export interface BookingDrawerDraft {
  step: BookingStep;
  mode: BookingDrawerMode;
  editBookingId: string | null;
  bookingNumber: string;
  customer: BookingDrawerCustomer;
  services: BookingDrawerService[];
  splitSegments: BookingDrawerSplitSegment[];
  products: BookingDrawerProduct[];
  packages: BookingDrawerPackage[];
  schedule: BookingDrawerSchedule;
  recurring: RecurringBookingPattern | null;
  createdBy: string;
  createdTime: string;
  membershipDiscount: number;
  couponCode: string;
  couponDiscount: number;
  giftCardCode: string;
  giftCardAmount: number;
  depositAmount: number;
  manualDiscount: number;
  advancePaid: number;
  walletUsed: number;
  internalNotes: string;
  customerTags: CustomerTag[];
  attachments: BookingDrawerAttachment[];
  previousBills: BookingDrawerBillReference[];
  recommendations: BookingDrawerSuggestion[];
  upsellSuggestions: BookingDrawerSuggestion[];
  aiSuggestions: BookingDrawerSuggestion[];
  notes: string;
}

export interface BookingConflictInfo {
  type: 'staff' | 'chair' | 'room' | 'equipment' | 'cabin' | 'time' | 'double';
  message: string;
  staffName?: string;
  resourceName?: string;
  startTime?: string;
  endTime?: string;
  severity: 'error' | 'warning';
}

export interface BookingFreeSlot {
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
  chairId: string;
  chairName: string;
  roomId: string;
  roomName: string;
}

export interface BookingCategory {
  id: string;
  name: string;
  serviceCount: number;
}

export interface BookingStaffResource {
  id: string;
  fullName: string;
  role: string;
  specialization: string;
  avatar: string;
  isOnline: boolean;
  chairs: BookingResourceItem[];
  rooms: BookingResourceItem[];
}

export interface BookingResourceItem {
  id: string;
  name: string;
  type: 'chair' | 'room' | 'cabin' | 'equipment';
}

export interface BookingDrawerSummary {
  customerLabel: string;
  serviceCount: number;
  totalDuration: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  commissionTotal: number;
  productsTotal: number;
  packagesTotal: number;
  membershipDiscount: number;
  couponDiscount: number;
  giftCardAmount: number;
  manualDiscount: number;
  depositAmount: number;
  advancePaid: number;
  walletUsed: number;
  grandTotal: number;
  balanceDue: number;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  gender: string;
  dob: string;
  anniversary: string;
  address: string;
  isVIP: boolean;
  membershipId: string;
  membershipName: string;
  loyaltyPoints: number;
  walletBalance: number;
  allergies: string;
  preferences: string;
  lastVisit: string | null;
  lifetimeSpend: number;
  visitCount: number;
  notes: string;
  createdAt: string;
}

export interface AlternativeStaff {
  staffId: string;
  staffName: string;
  role: string;
  specialization: string;
  available: boolean;
  conflictReason?: string;
}

export interface ServiceWithFavorites extends ServiceOption {
  isFavorite?: boolean;
  recentlyBooked?: boolean;
}

export interface BookingHistoryEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  services: string[];
  staffName: string;
  totalAmount: number;
  status: string;
  notes?: string;
}

export interface CustomerHistory {
  upcomingAppointments: BookingHistoryEntry[];
  pastAppointments: BookingHistoryEntry[];
  cancelledAppointments: BookingHistoryEntry[];
  noShowAppointments: BookingHistoryEntry[];
}

export interface SearchResult {
  type: 'customer' | 'booking' | 'service' | 'staff';
  id: string;
  label: string;
  sublabel: string;
  metadata?: Record<string, string>;
}

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

export interface TimelineEntry {
  time: string;
  label: string;
  type: 'service' | 'buffer' | 'break' | 'lunch';
  durationMin: number;
  serviceColor?: string;
  serviceName?: string;
}

export interface BookingHeaderInfo {
  bookingNumber: string;
  status: string;
  createdBy: string;
  createdTime: string;
  branchName: string;
  source: BookingSource;
  staffName: string;
}

export interface PreferredStaff {
  staffId: string;
  staffName: string;
  specialization: string;
  bookingCount: number;
  lastService: string;
}

export const DEFAULT_WORKING_HOURS = {
  businessStart: '09:00',
  businessEnd: '20:00',
  breakStart: '13:00',
  breakEnd: '14:00',
  bufferMin: 15,
  workingDays: [1, 2, 3, 4, 5, 6],
  holidays: [] as string[],
};

export const BOOKING_SOURCES: { value: BookingSource; label: string }[] = [
  { value: 'walkin', label: 'Walk-in' },
  { value: 'online', label: 'Online' },
  { value: 'phone', label: 'Phone' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'app', label: 'App' },
];

export const SAVE_ACTIONS = [
  { key: 'draft', label: 'Save Draft', icon: 'save' },
  { key: 'reserve', label: 'Reserve Slot', icon: 'clock' },
  { key: 'confirm', label: 'Confirm Booking', icon: 'check' },
  { key: 'waiting', label: 'Mark Waiting', icon: 'users' },
  { key: 'cancel', label: 'Cancel', icon: 'x' },
  { key: 'duplicate', label: 'Duplicate', icon: 'copy' },
  { key: 'repeat', label: 'Repeat Booking', icon: 'repeat' },
];

export interface WorkingHoursConfig {
  businessStart: string;
  businessEnd: string;
  breakStart: string;
  breakEnd: string;
  workingDays: number[];
  holidays: string[];
}

export const EMPTY_CUSTOMER: BookingDrawerCustomer = {
  mobile: '', fullName: '', gender: '', dob: '', anniversary: '',
  email: '', address: '', isVIP: false, membershipId: '', membershipName: '',
  loyaltyPoints: 0, walletBalance: 0, allergies: '', preferences: '',
  lastVisit: null, lifetimeSpend: 0, visitCount: 0, notes: '',
};

export const EMPTY_SCHEDULE: BookingDrawerSchedule = {
  date: '', startTime: '', endTime: '',
  staffId: '', staffName: '', chairId: '', chairName: '', roomId: '', roomName: '',
  businessStart: '09:00', businessEnd: '20:00',
  breakStart: '13:00', breakEnd: '14:00',
  bufferMin: 15, workingDays: [1, 2, 3, 4, 5, 6], holidays: [],
  source: 'walkin', branchId: '', branchName: '',
};

export const EMPTY_DRAFT: BookingDrawerDraft = {
  step: 1, mode: 'create', editBookingId: null, bookingNumber: '',
  customer: { ...EMPTY_CUSTOMER },
  services: [],
  splitSegments: [],
  products: [],
  packages: [],
  schedule: { ...EMPTY_SCHEDULE },
  recurring: null,
  createdBy: '', createdTime: '',
  membershipDiscount: 0, couponCode: '', couponDiscount: 0,
  giftCardCode: '', giftCardAmount: 0, depositAmount: 0,
  manualDiscount: 0, advancePaid: 0, walletUsed: 0,
  internalNotes: '', customerTags: [], attachments: [], previousBills: [],
  recommendations: [], upsellSuggestions: [], aiSuggestions: [],
  notes: '',
};

export const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
export const WEEK_DAYS: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const BOOKING_MODES: { value: BookingDrawerMode; label: string }[] = [
  { value: 'create', label: 'New Booking' },
  { value: 'walkin', label: 'Walk-in' },
  { value: 'edit', label: 'Edit Booking' },
  { value: 'duplicate', label: 'Duplicate Booking' },
  { value: 'repeat', label: 'Repeat Booking' },
];
