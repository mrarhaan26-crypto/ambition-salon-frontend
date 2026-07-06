export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
}

export interface RevenueChartData {
  daily: ChartDataPoint[];
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
  byStatus: ChartDataPoint[];
}

export interface BookingChartData {
  byStatus: ChartDataPoint[];
  byDate: ChartDataPoint[];
  byStaff: ChartDataPoint[];
}

export interface StaffChartData {
  performance: ChartSeries[];
  utilization: ChartDataPoint[];
}

export interface ClientChartData {
  growth: ChartDataPoint[];
  distribution: ChartDataPoint[];
  retention: ChartDataPoint[];
}

export interface DashboardChartData {
  revenue: RevenueChartData;
  bookings: BookingChartData;
  staff: StaffChartData;
  clients: ClientChartData;
  period: string;
  generatedAt: string;
}
