export interface DashboardBooking {
  id: string;
  clientId?: string;
  staffId?: string;
  staffName?: string;
  staff?: { fullName?: string; name?: string };
  status: string;
  totalAmount?: number;
  startTime?: string;
  [key: string]: any;
}

export interface DashboardStaff {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  role: string;
  isActive?: boolean;
  [key: string]: any;
}

export interface DashboardClient {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  totalVisits?: number;
  totalSpend?: number;
  [key: string]: any;
}

export interface DashboardPayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  [key: string]: any;
}

export interface DashboardNotification {
  id: string;
  title: string;
  message?: string;
  read: boolean;
  archived?: boolean;
  createdAt: string;
  [key: string]: any;
}

export interface DashboardInventoryItem {
  id: string;
  name: string;
  quantity: number;
  minStockLevel: number;
  category?: string | null;
  [key: string]: any;
}

export interface DashboardReport {
  [key: string]: any;
}
