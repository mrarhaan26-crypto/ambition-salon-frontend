export interface TrendResult {
  dir: 'up' | 'down' | 'neutral';
  pct: number;
}

export interface HealthResult {
  label: string;
  class: string;
}

export interface HealthConfig {
  completionRate: number;
  targetProgress: number;
  lowStockCount: number;
  duePayments: number;
}

export interface BookingSummary {
  staffId?: string;
  staffName?: string;
  staff?: { fullName?: string; name?: string };
  status: string;
  totalAmount?: number;
  [key: string]: any;
}

export interface StaffMember {
  id: string;
  fullName?: string;
  name?: string;
  [key: string]: any;
}

export interface RecordWithDate {
  [key: string]: any;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function computeTrend(today: number, yesterday: number): TrendResult {
  if (yesterday === 0) return { dir: today > 0 ? 'up' : 'neutral', pct: today > 0 ? 100 : 0 };
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return { dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral', pct: Math.abs(pct) };
}

export function computeBusinessHealth(config: HealthConfig): HealthResult {
  const lowStockPenalty = config.lowStockCount > 0 ? 15 : 0;
  const duePenalty = config.duePayments > 0 ? 10 : 0;
  const score = (config.completionRate * 0.4) + (config.targetProgress * 0.4) - lowStockPenalty - duePenalty;

  if (score >= 70) return { label: 'Excellent', class: 'health-excellent' };
  if (score >= 40) return { label: 'Good', class: 'health-good' };
  return { label: 'Warning', class: 'health-warning' };
}

export function computeDailyTarget(yesterdayRevenue: number, defaultTarget = 5000): number {
  return Math.round(Math.max(yesterdayRevenue * 1.2, defaultTarget));
}

export function computeStaffBookingCount(bookingsToday: BookingSummary[], staffMember: StaffMember): number {
  const staffName = (staffMember.fullName || staffMember.name || '').toLowerCase();
  const staffId = staffMember.id;
  return bookingsToday.filter(b => {
    const bStaffName = (b.staff?.fullName || b.staffName || '').toLowerCase();
    const bStaffId = b.staffId;
    return (bStaffId && bStaffId === staffId) || (bStaffName && staffName && bStaffName.includes(staffName)) || (staffName && bStaffName.includes(staffName));
  }).length;
}

export function computeStaffCompletedCount(bookingsToday: BookingSummary[], staffMember: StaffMember): number {
  const staffName = (staffMember.fullName || staffMember.name || '').toLowerCase();
  const staffId = staffMember.id;
  return bookingsToday.filter(b => {
    const bStaffName = (b.staff?.fullName || b.staffName || '').toLowerCase();
    const bStaffId = b.staffId;
    return ((bStaffId && bStaffId === staffId) || (bStaffName && staffName && bStaffName.includes(staffName)) || (staffName && bStaffName.includes(staffName))) && b.status === 'COMPLETED';
  }).length;
}

export function computeStaffRevenue(bookingsToday: BookingSummary[], staffMember: StaffMember): number {
  const staffName = (staffMember.fullName || staffMember.name || '').toLowerCase();
  const staffId = staffMember.id;
  return bookingsToday.filter(b => {
    const bStaffName = (b.staff?.fullName || b.staffName || '').toLowerCase();
    const bStaffId = b.staffId;
    return ((bStaffId && bStaffId === staffId) || (bStaffName && staffName && bStaffName.includes(staffName)) || (staffName && bStaffName.includes(staffName))) && b.status === 'COMPLETED';
  }).reduce((sum, b) => sum + (b.totalAmount || 0), 0);
}

export function filterByDate<T extends Record<string, any>>(records: T[], dateField: string, targetDate: Date): T[] {
  const targetStr = toDateStr(targetDate);
  return (records || []).filter((r) => {
    if (r[dateField]) return toDateStr(new Date(r[dateField])) === targetStr;
    return false;
  });
}

export function filterToday(records: any[], dateField: string): any[] {
  return filterByDate(records, dateField, new Date());
}

export function filterYesterday(records: any[], dateField: string): any[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return filterByDate(records, dateField, yesterday);
}
