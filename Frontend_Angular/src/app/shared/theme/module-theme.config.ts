export type ModuleKey =
  | 'dashboard'
  | 'command-center'
  | 'calendar'
  | 'bookings'
  | 'clients'
  | 'staff'
  | 'pos'
  | 'payments'
  | 'inventory'
  | 'finance'
  | 'marketing'
  | 'memberships'
  | 'loyalty'
  | 'reports'
  | 'ai'
  | 'multi-branch'
  | 'settings';

export interface ModuleTheme {
  key: ModuleKey;
  name: string;
  icon: string;
  gradient: string;
  accent: string;
  badge: string;
  cardClass: string;
  secondary?: string;
  soft?: string;
  border?: string;
  navActive?: string;
}

export type ActionVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface EnterpriseAction {
  key: string;
  label: string;
  icon?: string;
  variant?: ActionVariant;
  disabled?: boolean;
}

export interface Breadcrumb {
  label: string;
  link?: string;
}

export interface StatChip {
  label: string;
  value: string;
  icon?: string;
}

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface Trend {
  dir: TrendDirection;
  pct: number;
}

export const MODULE_THEMES: Record<ModuleKey, ModuleTheme> = {
  dashboard: {
    key: 'dashboard',
    name: 'Dashboard',
    icon: '📊',
    gradient: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
    accent: '#6366f1',
    badge: '#8b5cf6',
    cardClass: 'theme-dashboard',
  },
  calendar: {
    key: 'calendar',
    name: 'Calendar',
    icon: '📅',
    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%)',
    accent: '#0ea5e9',
    badge: '#2563eb',
    cardClass: 'theme-calendar',
  },
  bookings: {
    key: 'bookings',
    name: 'Bookings',
    icon: '🗓️',
    gradient: 'linear-gradient(135deg,#7c3aed 0%,#c026d3 100%)',
    accent: '#7c3aed',
    badge: '#c026d3',
    cardClass: 'theme-bookings',
  },
  clients: {
    key: 'clients',
    name: 'Clients',
    icon: '👥',
    gradient: 'linear-gradient(135deg,#ec4899 0%,#f43f5e 100%)',
    accent: '#ec4899',
    badge: '#f43f5e',
    cardClass: 'theme-clients',
  },
  staff: {
    key: 'staff',
    name: 'Staff',
    icon: '🧑‍💼',
    gradient: 'linear-gradient(135deg,#10b981 0%,#14b8a6 100%)',
    accent: '#10b981',
    badge: '#14b8a6',
    cardClass: 'theme-staff',
  },
  pos: {
    key: 'pos',
    name: 'POS',
    icon: '💳',
    gradient: 'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)',
    accent: '#f59e0b',
    badge: '#f97316',
    cardClass: 'theme-pos',
  },
  inventory: {
    key: 'inventory',
    name: 'Inventory',
    icon: '📦',
    gradient: 'linear-gradient(135deg,#84cc16 0%,#22c55e 100%)',
    accent: '#84cc16',
    badge: '#22c55e',
    cardClass: 'theme-inventory',
  },
  finance: {
    key: 'finance',
    name: 'Finance',
    icon: '💰',
    gradient: 'linear-gradient(135deg,#16a34a 0%,#0d9488 100%)',
    accent: '#16a34a',
    badge: '#0d9488',
    cardClass: 'theme-finance',
  },
  reports: {
    key: 'reports',
    name: 'Reports',
    icon: '📈',
    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#06b6d4 100%)',
    accent: '#0ea5e9',
    badge: '#06b6d4',
    cardClass: 'theme-reports',
  },
  marketing: {
    key: 'marketing',
    name: 'Marketing',
    icon: '📣',
    gradient: 'linear-gradient(135deg,#d946ef 0%,#ec4899 100%)',
    accent: '#d946ef',
    badge: '#ec4899',
    cardClass: 'theme-marketing',
  },
  ai: {
    key: 'ai',
    name: 'AI',
    icon: '✨',
    gradient: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
    accent: '#8b5cf6',
    badge: '#6d28d9',
    cardClass: 'theme-ai',
  },
  settings: {
    key: 'settings',
    name: 'Settings',
    icon: '⚙️',
    gradient: 'linear-gradient(135deg,#64748b 0%,#475569 100%)',
    accent: '#64748b',
    badge: '#475569',
    cardClass: 'theme-settings',
  },
  'command-center': {
    key: 'command-center',
    name: 'Command Center',
    icon: '🎯',
    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#8b5cf6 100%)',
    accent: '#6366f1',
    badge: '#8b5cf6',
    cardClass: 'theme-command-center',
    secondary: '#22d3ee',
    soft: 'rgba(99,102,241,.1)',
    border: 'rgba(99,102,241,.25)',
    navActive: '#6366f1',
  },
  payments: {
    key: 'payments',
    name: 'Payments',
    icon: '💰',
    gradient: 'linear-gradient(135deg,#16a34a 0%,#22c55e 100%)',
    accent: '#16a34a',
    badge: '#22c55e',
    cardClass: 'theme-payments',
    secondary: '#15803d',
    soft: 'rgba(22,163,74,.1)',
    border: 'rgba(22,163,74,.25)',
    navActive: '#16a34a',
  },
  memberships: {
    key: 'memberships',
    name: 'Memberships',
    icon: '🪪',
    gradient: 'linear-gradient(135deg,#f59e0b 0%,#d946ef 100%)',
    accent: '#f59e0b',
    badge: '#d946ef',
    cardClass: 'theme-memberships',
    secondary: '#f97316',
    soft: 'rgba(245,158,11,.1)',
    border: 'rgba(245,158,11,.25)',
    navActive: '#f59e0b',
  },
  loyalty: {
    key: 'loyalty',
    name: 'Loyalty',
    icon: '⭐',
    gradient: 'linear-gradient(135deg,#ec4899 0%,#f59e0b 100%)',
    accent: '#ec4899',
    badge: '#f59e0b',
    cardClass: 'theme-loyalty',
    secondary: '#f43f5e',
    soft: 'rgba(236,72,153,.1)',
    border: 'rgba(236,72,153,.25)',
    navActive: '#ec4899',
  },
  'multi-branch': {
    key: 'multi-branch',
    name: 'Multi-Branch',
    icon: '🏢',
    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#14b8a6 100%)',
    accent: '#0ea5e9',
    badge: '#14b8a6',
    cardClass: 'theme-multi-branch',
    secondary: '#0891b2',
    soft: 'rgba(14,165,233,.1)',
    border: 'rgba(14,165,233,.25)',
    navActive: '#0ea5e9',
  },
};

export function getModuleTheme(key: string): ModuleTheme {
  return (MODULE_THEMES as Record<string, ModuleTheme>)[key] || MODULE_THEMES.dashboard;
}

const STATUS_COLOR_MAP: Record<string, string> = {
  active: '#16a34a',
  inactive: '#94a3b8',
  pending: '#d97706',
  confirmed: '#2563eb',
  checked_in: '#7c3aed',
  completed: '#16a34a',
  cancelled: '#dc2626',
  no_show: '#6b7280',
  blocked: '#dc2626',
  maintenance: '#d97706',
  paid: '#16a34a',
  unpaid: '#dc2626',
  overdue: '#dc2626',
  open: '#2563eb',
  closed: '#16a34a',
  draft: '#94a3b8',
  sent: '#2563eb',
  failed: '#dc2626',
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
};

export function getStatusColor(status: string, fallback = '#64748b'): string {
  if (!status) return fallback;
  return STATUS_COLOR_MAP[status.toLowerCase()] || fallback;
}
