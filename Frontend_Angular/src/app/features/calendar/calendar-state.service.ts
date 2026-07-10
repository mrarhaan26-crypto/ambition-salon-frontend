import { Injectable, signal, computed } from '@angular/core';
import type { CalendarView } from './calendar.constants';
import type { CalendarBooking, CalendarResource } from './calendar.models';
import type { SidebarStaff } from './calendar-sidebar.component';

export type ColorMode = 'status' | 'staff' | 'service' | 'resource' | 'source' | 'payment' | 'vip' | 'conflict' | 'branch';
export type DensityMode = 'compact' | 'comfortable' | 'spacious';
export type CardMode = 'compact' | 'expanded';

export interface CalendarFilterState {
  branchIds: string[];
  staffIds: string[];
  teamIds: string[];
  serviceIds: string[];
  categoryIds: string[];
  resourceIds: string[];
  statuses: string[];
  sources: string[];
  paymentStatuses: string[];
  vipOnly: boolean;
  membershipOnly: boolean;
  conflictOnly: boolean;
  searchQuery: string;
}

export interface CalendarPrefs {
  defaultView: CalendarView;
  slotInterval: number;
  startHour: number;
  endHour: number;
  visibleDays: number;
  weekStartsOn: number;
  timeFormat: '12h' | '24h';
  density: DensityMode;
  cardMode: CardMode;
  colorMode: ColorMode;
  bufferMinutes: number;
  confirmDragDrop: boolean;
  autoScroll: boolean;
  showCurrentTime: boolean;
  showWeekends: boolean;
  showWorkingHours: boolean;
  showResourceDisplay: boolean;
}

export interface CalendarPreset {
  id: string;
  name: string;
  filters: Partial<CalendarFilterState>;
}

@Injectable({ providedIn: 'root' })
export class CalendarStateService {
  private readonly prefsKey = 'ambition_calendar_prefs';
  private readonly presetsKey = 'ambition_calendar_presets';

  view = signal<CalendarView>('month');
  currentDate = signal<Date>(new Date());
  branchId = signal<string>('');

  filters = signal<CalendarFilterState>(this.emptyFilters());
  activeFilterCount = computed(() => {
    const f = this.filters();
    let count = 0;
    if (f.branchIds.length) count++;
    if (f.staffIds.length) count++;
    if (f.serviceIds.length) count++;
    if (f.resourceIds.length) count++;
    if (f.statuses.length) count++;
    if (f.sources.length) count++;
    if (f.vipOnly) count++;
    if (f.conflictOnly) count++;
    if (f.searchQuery) count++;
    return count;
  });

  colorMode = signal<ColorMode>('status');
  density = signal<DensityMode>('comfortable');
  cardMode = signal<CardMode>('expanded');
  fullscreen = signal(false);
  sidebarCollapsed = signal(false);
  liveSyncConnected = signal(false);

  prefs = signal<CalendarPrefs>(this.loadPrefs());
  presets = signal<CalendarPreset[]>(this.loadPresets());

  allAppointments = signal<CalendarBooking[]>([]);
  filteredAppointments = computed(() => this.applyFilters(this.allAppointments()));
  staffList = signal<SidebarStaff[]>([]);
  staffColorMap = signal<Record<string, string>>({});
  resources = signal<CalendarResource[]>([]);
  loading = signal(false);
  timelineLoading = signal(false);

  private emptyFilters(): CalendarFilterState {
    return {
      branchIds: [], staffIds: [], teamIds: [], serviceIds: [],
      categoryIds: [], resourceIds: [], statuses: [], sources: [],
      paymentStatuses: [], vipOnly: false, membershipOnly: false,
      conflictOnly: false, searchQuery: '',
    };
  }

  clearFilters(): void {
    this.filters.set(this.emptyFilters());
  }

  setFilter<K extends keyof CalendarFilterState>(key: K, value: CalendarFilterState[K]): void {
    this.filters.update(f => ({ ...f, [key]: value }));
  }

  toggleFilterArray<K extends 'branchIds' | 'staffIds' | 'teamIds' | 'serviceIds' | 'categoryIds' | 'resourceIds' | 'statuses' | 'sources' | 'paymentStatuses'>(key: K, id: string): void {
    this.filters.update(f => {
      const arr = f[key];
      const idx = arr.indexOf(id);
      if (idx >= 0) {
        return { ...f, [key]: arr.filter(x => x !== id) };
      }
      return { ...f, [key]: [...arr, id] };
    });
  }

  savePreset(name: string): void {
    const preset: CalendarPreset = {
      id: `preset-${Date.now()}`,
      name,
      filters: { ...this.filters() },
    };
    this.presets.update(p => [preset, ...p.slice(0, 9)]);
    this.savePresets();
  }

  applyPreset(id: string): void {
    const preset = this.presets().find(p => p.id === id);
    if (preset) {
      this.filters.update(f => ({ ...f, ...preset.filters }));
    }
  }

  deletePreset(id: string): void {
    this.presets.update(p => p.filter(x => x.id !== id));
    this.savePresets();
  }

  setView(v: CalendarView): void {
    this.view.set(v);
  }

  setDate(date: Date): void {
    this.currentDate.set(date);
  }

  navigate(direction: -1 | 1): void {
    const d = new Date(this.currentDate());
    const v = this.view();
    if (v === 'day' || v === 'timeline') d.setDate(d.getDate() + direction);
    else if (v === 'week') d.setDate(d.getDate() + 7 * direction);
    else d.setMonth(d.getMonth() + direction);
    this.currentDate.set(d);
  }

  goToday(): void {
    this.currentDate.set(new Date());
  }

  toggleFullscreen(): void {
    this.fullscreen.update(v => !v);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  setDensity(d: DensityMode): void {
    this.density.set(d);
    this.prefs.update(p => ({ ...p, density: d }));
    this.savePrefs();
  }

  setColorMode(m: ColorMode): void {
    this.colorMode.set(m);
    this.prefs.update(p => ({ ...p, colorMode: m }));
    this.savePrefs();
  }

  setCardMode(m: CardMode): void {
    this.cardMode.set(m);
    this.prefs.update(p => ({ ...p, cardMode: m }));
    this.savePrefs();
  }

  updatePrefs(partial: Partial<CalendarPrefs>): void {
    this.prefs.update(p => ({ ...p, ...partial }));
    this.savePrefs();
    if (partial.density) this.density.set(partial.density);
    if (partial.colorMode) this.colorMode.set(partial.colorMode);
    if (partial.cardMode) this.cardMode.set(partial.cardMode);
  }

  private applyFilters(bookings: CalendarBooking[]): CalendarBooking[] {
    const f = this.filters();
    let result = bookings;
    if (f.staffIds.length > 0) {
      result = result.filter(b => f.staffIds.includes(b.staffId || b.staff?.id || ''));
    }
    if (f.branchIds.length > 0) {
      result = result.filter(b => f.branchIds.includes(b.branchId || b.branch?.id || ''));
    }
    if (f.resourceIds.length > 0) {
      result = result.filter(b => f.resourceIds.includes(b.resourceId || b.resource?.id || ''));
    }
    if (f.statuses.length > 0) {
      result = result.filter(b => f.statuses.includes(b.status));
    }
    if (f.searchQuery) {
      const q = f.searchQuery.toLowerCase();
      result = result.filter(b =>
        b.id?.toLowerCase().includes(q) ||
        b.client?.fullName?.toLowerCase().includes(q) ||
        b.client?.phone?.toLowerCase().includes(q) ||
        b.staff?.fullName?.toLowerCase().includes(q) ||
        b.title?.toLowerCase().includes(q) ||
        b.services?.some(s => s.name?.toLowerCase().includes(q)) ||
        b.notes?.toLowerCase().includes(q)
      );
    }
    if (f.vipOnly) {
      result = result.filter(b => (b.totalAmount ?? 0) >= 200);
    }
    if (f.conflictOnly) {
      // conflict filtering is visual via ConflictVisualService
    }
    if (f.sources.length > 0) {
      result = result.filter(b => f.sources.includes((b as any).source || ''));
    }
    return result;
  }

  private loadPrefs(): CalendarPrefs {
    try {
      const raw = localStorage.getItem(this.prefsKey);
      if (raw) return { ...this.defaultPrefs(), ...JSON.parse(raw) };
    } catch {}
    return this.defaultPrefs();
  }

  private savePrefs(): void {
    try {
      localStorage.setItem(this.prefsKey, JSON.stringify(this.prefs()));
    } catch {}
  }

  private loadPresets(): CalendarPreset[] {
    try {
      const raw = localStorage.getItem(this.presetsKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  private savePresets(): void {
    try {
      localStorage.setItem(this.presetsKey, JSON.stringify(this.presets()));
    } catch {}
  }

  private defaultPrefs(): CalendarPrefs {
    return {
      defaultView: 'month',
      slotInterval: 30,
      startHour: 9,
      endHour: 20,
      visibleDays: 7,
      weekStartsOn: 1,
      timeFormat: '12h',
      density: 'comfortable',
      cardMode: 'expanded',
      colorMode: 'status',
      bufferMinutes: 15,
      confirmDragDrop: true,
      autoScroll: true,
      showCurrentTime: true,
      showWeekends: true,
      showWorkingHours: true,
      showResourceDisplay: true,
    };
  }
}
