export interface ClientProfile {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  city?: string | null;
  notes?: string | null;
  loyaltyPoints?: number;
  walletBalance?: number;
  totalVisits?: number;
  totalSpend?: number;
  lastVisitAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientBookingItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount?: number;
  staff?: { fullName: string } | null;
  branch?: { name: string } | null;
  services?: { name: string; price: number }[];
}

export interface ClientPaymentItem {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  bookingId?: string;
}
