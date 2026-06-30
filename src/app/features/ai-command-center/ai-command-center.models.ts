export interface CommandCenterDashboard {
  range: { start: string; end: string };
  branchId: string | null;
  overview: any;
  summary: {
    totalBookings: number;
    revenue: number;
    avgBookingValue: number;
    waitlistCount: number;
    walkInCount: number;
    pendingWaitlist: number;
    activeWalkIns: number;
  };
  alerts: Alert[];
  aiSuggestions: AISuggestion[];
}

export interface Alert {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

export interface AISuggestion {
  type: string;
  source: string;
  description: string;
}

export interface CapacityForecast {
  branchId: string;
  forecastDays: number;
  avgUtilization: number;
  criticalDays: number;
  recommendations: string;
  dailyForecast: DailyForecast[];
}

export interface DailyForecast {
  date: string;
  dayName: string;
  bookedMinutes: number;
  availableMinutes: number;
  staffCount: number;
  utilizationPct: number;
  bookingCount: number;
  capacityStatus: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
}

export interface StaffPerformance {
  range: { start: string; end: string };
  branchId: string | null;
  staff: StaffMember[];
  topPerformer: StaffMember | null;
}

export interface StaffMember {
  staffId: string;
  staffName: string;
  role: string;
  totalBookings: number;
  completed: number;
  cancelled: number;
  noShow: number;
  totalMinutes: number;
  revenue: number;
  completionRate: number;
  efficiencyScore: number;
  avgBookingValue: number;
}

export interface Recommendation {
  type: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  metric: string;
}

export interface RecommendationsResponse {
  range: { start: string; end: string };
  branchId: string | null;
  recommendations: Recommendation[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
