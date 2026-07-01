export interface CalendarClient {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface CalendarStaff {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
}

export interface CalendarBookingService {
  id?: string;
  serviceId?: string;
  name: string;
  durationMin: number;
  price: number;
}

export interface CalendarResource {
  id: string;
  name: string;
  type: string;
  description?: string;
  isActive?: boolean;
}

export interface CalendarBranch {
  id: string;
  name?: string;
  city?: string;
}

export interface CalendarBooking {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  clientId?: string;
  staffId?: string;
  resourceId?: string;
  branchId?: string;
  notes?: string;
  totalAmount?: number;
  client?: CalendarClient;
  staff?: CalendarStaff;
  resource?: CalendarResource;
  branch?: CalendarBranch;
  services?: CalendarBookingService[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarDayResponse {
  date: string;
  bookings: CalendarBooking[];
}

export interface CalendarWeekResponse {
  weekStart: string;
  days: CalendarDayResponse[];
}

export interface CalendarMonthResponse {
  month: string;
  year: number;
  days: CalendarDayResponse[];
}

export interface CalendarSummaryKpi {
  totalBookings: number;
  confirmed: number;
  completed: number;
  pending: number;
  cancelled: number;
  revenue: number;
  occupancyRate?: number;
  peakHour?: string;
  cancellationRate?: number;
}

export interface CalendarSummaryResponse {
  kpis?: CalendarSummaryKpi;
  [key: string]: any;
}

export interface CalendarAvailabilitySlot {
  startTime: string;
  endTime: string;
  staffId?: string;
  resourceId?: string;
}

export interface CalendarConflict {
  bookingId: string;
  title: string;
  startTime: string;
  endTime: string;
  staffId?: string;
  resourceId?: string;
}

export interface AiSuggestion {
  staffId: string;
  staffName?: string;
  suggestedStart: string;
  score?: number;
  reason?: string;
}

export interface AiOptimization {
  suggestions: AiSuggestion[];
  optimization?: any;
  staffUtilization?: number;
  gapReduction?: number;
}

export interface WaitlistEntry {
  id: string;
  clientId?: string;
  client?: CalendarClient;
  serviceName?: string;
  notes?: string;
  status: string;
  createdAt?: string;
}

export type ViewMode = 'day' | 'week' | 'month';
export type StaffResourceMode = 'staff' | 'resources';

export interface MonthDay {
  date: Date;
  otherMonth: boolean;
  isToday: boolean;
}

export interface WeekDay {
  date: Date;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface CreateFormService {
  serviceId: string;
  name: string;
  durationMin: number;
  price: number;
}

export interface CreateFormModel {
  clientId: string;
  staffId: string;
  title: string;
  startTime: string;
  branchId: string;
  notes: string;
  resourceId?: string;
  services: CreateFormService[];
}

export interface EditFormModel {
  title: string;
  notes: string;
}

export interface RescheduleFormModel {
  staffId: string;
  resourceId?: string;
  startTime: string;
}

export interface WalkinFormModel {
  clientName: string;
  staffId: string;
  startTime: string;
  branchId: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  notes?: string;
}

export interface CreateBookingPayload {
  clientId: string;
  staffId: string;
  title: string;
  startTime: string;
  branchId: string;
  notes?: string;
  services: { name: string; durationMin: number; price: number; serviceId?: string }[];
  resourceId?: string;
}

export interface CancelBookingPayload {
  reason: string;
}

export interface CalendarQueryParams {
  date?: string;
  startDate?: string;
  branchId?: string;
  staffId?: string;
  resourceId?: string;
  durationMinutes?: number;
  serviceId?: string;
  isActive?: boolean | string;
  type?: string;
  from?: string;
  to?: string;
  status?: string;
  [key: string]: any;
}

export interface ClientOption {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  isActive?: boolean;
}

export interface BranchOption {
  id: string;
  name?: string;
  city?: string;
}

export interface PaymentInfo {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
}

export interface ClientDetail {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  walletBalance?: number;
  totalVisits?: number;
  totalSpend?: number;
}

export interface ViewBillData {
  booking: CalendarBooking;
  clientDetail?: ClientDetail;
  payments: PaymentInfo[];
  subtotal: number;
  discount: number;
  tax: number;
  taxRate: number;
  total: number;
  paid: number;
  due: number;
  paymentMethod: string;
  staffAlert?: string;
  activityLog: ActivityLogEntry[];
}

export interface ActivityLogEntry {
  action: string;
  timestamp: string;
  user?: string;
  details?: string;
}

export interface AddPaymentForm {
  amount: number;
  method: string;
}

export type SlotSize = 15 | 30 | 60;
