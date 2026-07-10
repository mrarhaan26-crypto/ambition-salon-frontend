import type { CalendarBooking, CalendarClient, CalendarStaff, CalendarBookingService, CreateBookingPayload, CancelBookingPayload } from './calendar.models';

export type { CalendarBooking, CalendarClient, CalendarStaff, CalendarBookingService, CreateBookingPayload, CancelBookingPayload };

export interface CalendarAppointmentVM {
  booking: CalendarBooking;
  top: number;
  height: number;
  left: string;
  width: string;
  columnIndex: number;
  totalColumns: number;
  staffColor: string;
  isVIP: boolean;
  hasNotes: boolean;
  hasPackage: boolean;
  hasMembership: boolean;
  durationMin: number;
}

export interface AppointmentCardData {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientId?: string;
  staffName: string;
  staffId?: string;
  staffInitials: string;
  staffColor: string;
  serviceName: string;
  serviceCount: number;
  durationMin: number;
  amount: number;
  notes: string;
  isVIP: boolean;
  hasPackage: boolean;
  hasMembership: boolean;
  hasResource: boolean;
  resourceName: string;
  source: string;
  waitingMinutes: number;
  reminderState: string;
  paymentStatus: string;
  colorStrip: string;
  isLate: boolean;
  isOnline: boolean;
  isWalkIn: boolean;
}

export interface AppointmentPaymentView {
  amount: number;
  method: string;
  status: string;
  paidAt: string;
}

export interface AppointmentTimelineEntry {
  action: string;
  timestamp: string;
  user: string;
  details: string;
}

export interface AppointmentColorRule {
  status: string;
  background: string;
  text: string;
  border: string;
  dot: string;
}

export interface AppointmentDisplayOptions {
  showStaffAvatar: boolean;
  showStatusBadge: boolean;
  showIndicators: boolean;
  showTime: boolean;
  compact: boolean;
  maxVisibleDots: number;
}

export interface CreateAppointmentPayload {
  clientId: string;
  staffId: string;
  startTime: string;
  branchId: string;
  services: { name: string; durationMin: number; price: number; serviceId?: string }[];
  title?: string;
  notes?: string;
  resourceId?: string;
  status?: string;
}

export interface UpdateAppointmentPayload {
  title?: string;
  notes?: string;
  staffId?: string;
  resourceId?: string;
  totalAmount?: number;
  status?: string;
}

export function toAppointmentCardData(booking: CalendarBooking, staffColor: string): AppointmentCardData {
  const service = (booking.services ?? [])[0];
  const b = booking as any;
  return {
    id: booking.id,
    title: booking.title,
    status: booking.status,
    startTime: booking.startTime,
    endTime: booking.endTime,
    clientName: booking.client?.fullName || 'Unknown Client',
    clientId: booking.clientId,
    staffName: booking.staff?.fullName || 'Unknown',
    staffId: booking.staffId,
    staffInitials: (booking.staff?.fullName || '?').split(' ').map(s => s.charAt(0)).join('').toUpperCase().slice(0, 2),
    staffColor,
    serviceName: service?.name || booking.title || 'Appointment',
    serviceCount: (booking.services ?? []).length,
    durationMin: 0,
    amount: booking.totalAmount ?? 0,
    notes: booking.notes || '',
    isVIP: (booking.totalAmount ?? 0) >= 200,
    hasPackage: (booking.services ?? []).length > 2,
    hasMembership: false,
    hasResource: !!(b.resource || b.resourceId),
    resourceName: b.resource?.name || b.resourceId || '',
    source: b.source || b.bookingSource || '',
    waitingMinutes: b.waitingMinutes || 0,
    reminderState: b.reminderState || '',
    paymentStatus: b.paymentStatus || '',
    colorStrip: booking.status,
    isLate: b.status === 'WAITING' && b.waitingMinutes > 15,
    isOnline: (b.source || b.bookingSource) === 'online',
    isWalkIn: (b.source || b.bookingSource) === 'walk-in',
  };
}

export function toCreatePayload(data: CreateAppointmentPayload): CreateBookingPayload {
  return {
    clientId: data.clientId,
    staffId: data.staffId,
    title: data.title || '',
    startTime: data.startTime,
    branchId: data.branchId,
    notes: data.notes,
    services: data.services,
    resourceId: data.resourceId,
  };
}
