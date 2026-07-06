export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface BookingClient {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
}

export interface BookingStaff {
  id: string;
  fullName: string;
  email?: string;
  role?: string;
}

export interface BookingBranch {
  id: string;
  name: string;
  city?: string;
}

export interface BookingResource {
  id: string;
  name: string;
  type?: string;
}

export interface BookingServiceLine {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  serviceId?: string | null;
}

export interface BookingListItem {
  id: string;
  branchId: string;
  clientId: string;
  staffId: string;
  resourceId: string | null;
  title: string;
  notes: string | null;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  client: BookingClient | null;
  staff: BookingStaff | null;
  branch: BookingBranch | null;
  resource: BookingResource | null;
  services: BookingServiceLine[];
}

export interface BookingFilterState {
  search: string;
  status: string;
  date: string;
}

export interface BookingServiceFormLine {
  serviceId?: string | null;
  name: string;
  durationMin: number;
  price: number;
}

export interface CreateBookingForm {
  clientId: string;
  staffId: string;
  title: string;
  startTime: string;
  endTime?: string;
  branchId: string;
  notes?: string;
  services: BookingServiceFormLine[];
}

export interface ClientOption {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
}

export interface StaffOption {
  id: string;
  fullName: string;
  specialization?: string | null;
}

export interface BranchOption {
  id: string;
  name: string;
  city?: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  description?: string | null;
}

export interface PaymentInfo {
  id: string;
  bookingId: string;
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
}

export interface ViewBillData {
  booking: BookingListItem;
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
  clientDetail?: ClientDetail;
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
