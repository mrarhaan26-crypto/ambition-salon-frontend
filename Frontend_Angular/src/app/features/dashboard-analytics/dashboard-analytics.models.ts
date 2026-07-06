export interface DashboardOverview {
  period: { from: string; to: string };
  filters: { branchId: string | null };
  kpis: {
    totalBookings: number;
    bookingGrowth: number;
    revenue: number;
    revenueGrowth: number;
    totalClients: number;
    newClients: number;
    pendingWaitlist: number;
    activeWalkIns: number;
    totalStaff: number;
  };
}

export interface RevenueAnalytics {
  period: { from: string; to: string };
  filters: { branchId: string | null };
  summary: { total: number; averagePerBooking: number; completedBookings: number };
  byStatus: { status: string; amount: number; count: number }[];
  daily: { date: string; revenue: number; bookings: number }[];
  topServices: { name: string; revenue: number; bookings: number }[];
}

export interface OperationsAnalytics {
  period: { from: string; to: string };
  filters: { branchId: string | null };
  kpis: {
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    noShowBookings: number;
    cancellationRate: number;
    noShowRate: number;
    completionRate: number;
    waitlistEntries: number;
    walkIns: number;
  };
  bookingsByStatus: { status: string; count: number; amount: number }[];
}

export interface StaffAnalytics {
  period: { from: string; to: string };
  filters: { branchId: string | null };
  summary: { totalStaff: number; activeStaff: number; inactiveStaff: number };
  staff: StaffAnalyticsItem[];
}

export interface StaffAnalyticsItem {
  staffId: string;
  fullName: string;
  email: string;
  role: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  revenue: number;
}

export interface ClientActivity {
  period: { from: string; to: string };
  filters: { branchId: string | null };
  summary: {
    totalClients: number;
    newClients: number;
    returningClients: number;
    activeClientsInPeriod: number;
    totalClientsWithVisits: number;
    avgVisitsPerClient: number;
    activeBookings: number;
  };
  topClients: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    totalVisits: number;
    totalSpend: number;
    lastVisitAt: string | null;
    loyaltyPoints: number;
  }[];
  visitDistribution: { range: string; count: number }[];
}
