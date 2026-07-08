export interface ReportQuery {
  from?: string;
  to?: string;
  branchId?: string;
  staffId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface KpiCard {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export interface RevenueReport {
  summary: {
    totalRevenue: number;
    totalProfit: number;
    profitMargin: number;
    totalSales: number;
    averagePerSale: number;
    averagePerDay: number;
  };
  byStatus: { status: string; amount: number; count: number }[];
  byPaymentMethod: { method: string; amount: number; count: number }[];
  daily: { date: string; revenue: number; profit: number; count: number }[];
  byService: { serviceId: string; serviceName: string; revenue: number; count: number; percentage: number }[];
  byStaff: { staffId: string; staffName: string; revenue: number; count: number }[];
}

export interface ProfitReport {
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    netProfit: number;
    expenses: number;
    profitMargin: number;
    operatingMargin: number;
  };
  byCategory: { category: string; revenue: number; cost: number; profit: number; margin: number }[];
  monthly: { month: string; revenue: number; cost: number; profit: number; margin: number }[];
  expenses: { category: string; amount: number; percentage: number }[];
}

export interface StaffReport {
  summary: {
    totalStaff: number;
    activeStaff: number;
    totalBookings: number;
    completedBookings: number;
    totalRevenue: number;
    avgRating: number;
  };
  staff: StaffReportItem[];
  topPerformers: StaffReportItem[];
  utilization: { staffId: string; staffName: string; utilizationRate: number; availableHours: number; bookedHours: number }[];
}

export interface StaffReportItem {
  staffId: string;
  fullName: string;
  role: string;
  isActive: boolean;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  revenue: number;
  avgRating: number;
  servicesCount: number;
  conversionRate: number;
}

export interface BranchReport {
  summary: {
    totalBranches: number;
    totalRevenue: number;
    totalBookings: number;
    totalClients: number;
    totalStaff: number;
  };
  branches: BranchReportItem[];
  comparison: { metric: string; values: { branchName: string; value: number }[] }[];
}

export interface BranchReportItem {
  branchId: string;
  branchName: string;
  revenue: number;
  bookings: number;
  clients: number;
  staffCount: number;
  avgBookingValue: number;
  utilizationRate: number;
  growth: number;
}

export interface ServiceReport {
  summary: {
    totalServices: number;
    totalRevenue: number;
    totalBookings: number;
    avgPrice: number;
    mostPopular: string;
  };
  services: ServiceReportItem[];
  byCategory: { category: string; revenue: number; count: number; percentage: number }[];
}

export interface ServiceReportItem {
  serviceId: string;
  serviceName: string;
  category: string;
  price: number;
  duration: number;
  bookingCount: number;
  revenue: number;
  percentage: number;
  growth: number;
}

export interface PackageReport {
  summary: {
    totalPackages: number;
    activePackages: number;
    totalSold: number;
    totalRevenue: number;
    redemptionRate: number;
  };
  packages: PackageReportItem[];
}

export interface PackageReportItem {
  packageId: string;
  packageName: string;
  price: number;
  soldCount: number;
  redeemedCount: number;
  revenue: number;
  redemptionRate: number;
  popularity: number;
}

export interface MembershipReport {
  summary: {
    totalMembers: number;
    activeMembers: number;
    newMembers: number;
    churnedMembers: number;
    churnRate: number;
    totalRevenue: number;
    avgLifetimeValue: number;
    renewalRate: number;
  };
  byTier: { tier: string; count: number; revenue: number; percentage: number }[];
  monthly: { month: string; newMembers: number; activeMembers: number; churned: number; revenue: number }[];
  perks: { perk: string; usageCount: number; membersUsed: number }[];
}

export interface WalletReport {
  summary: {
    totalWallets: number;
    activeWallets: number;
    totalBalance: number;
    totalLoaded: number;
    totalSpent: number;
    totalRefunded: number;
    avgBalance: number;
  };
  transactions: { type: string; amount: number; count: number; percentage: number }[];
  daily: { date: string; loaded: number; spent: number; net: number }[];
}

export interface InventoryReport {
  summary: {
    totalProducts: number;
    totalValue: number;
    totalCost: number;
    lowStockCount: number;
    outOfStockCount: number;
    categoriesCount: number;
  };
  byCategory: { category: string; count: number; value: number; cost: number }[];
  lowStock: InventoryItem[];
  movements: { type: string; count: number; quantity: number }[];
}

export interface InventoryItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStockLevel: number;
  value: number;
}

export interface CustomerReport {
  summary: {
    totalClients: number;
    newClients: number;
    returningClients: number;
    activeClients: number;
    churnedClients: number;
    churnRate: number;
    avgVisitsPerClient: number;
    avgSpendPerClient: number;
    lifetimeValue: number;
    retentionRate: number;
  };
  byTier: { tier: string; count: number; percentage: number; revenue: number }[];
  newVsReturning: { month: string; newClients: number; returningClients: number }[];
  topClients: { clientId: string; fullName: string; visits: number; totalSpent: number; lastVisit: string; favoriteService: string }[];
  segments: { segment: string; count: number; percentage: number; avgSpend: number }[];
}

export interface GrowthReport {
  summary: {
    revenueGrowth: number;
    bookingGrowth: number;
    clientGrowth: number;
    staffGrowth: number;
    profitGrowth: number;
    periodLabel: string;
  };
  monthly: { month: string; revenue: number; bookings: number; clients: number; profit: number }[];
  metrics: { metric: string; current: number; previous: number; change: number; isPositive: boolean }[];
}

export interface HeatmapData {
  days: string[];
  hours: string[];
  data: { day: number; hour: number; value: number; count: number }[];
  maxValue: number;
  summary: {
    peakDay: string;
    peakHour: string;
    peakValue: number;
    busiestDay: string;
    slowestDay: string;
    averagePerSlot: number;
  };
}

export interface ForecastData {
  summary: {
    predictedRevenue: number;
    predictedBookings: number;
    confidence: number;
    growthEstimate: number;
    seasonalFactor: number;
  };
  monthly: { month: string; predicted: number; lower: number; upper: number; actual?: number }[];
  byService: { serviceName: string; predictedRevenue: number; confidence: number; trend: 'up' | 'down' | 'stable' }[];
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  sections: string[];
  dateFrom?: string;
  dateTo?: string;
  includeCharts: boolean;
}

export interface EmailReportConfig {
  recipients: string[];
  subject: string;
  message: string;
  sections: string[];
  format: 'pdf' | 'excel';
  schedule?: ScheduleConfig;
}

export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  active: boolean;
}

export interface AiInsight {
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  value: number;
  change: number;
  direction?: 'up' | 'down';
  confidence?: number;
  date?: string;
}
