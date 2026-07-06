import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, OnInit, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { DAYS_OF_WEEK_SHORT, MONTHS, STATUS_COLORS, STATUS_DOT_COLORS } from './calendar.constants';
import { getDaysInMonth, getFirstDayOfMonth, isToday, isSameDay } from './calendar.utils';
import type { CalendarBooking } from './calendar.models';
import { QueueEngineService } from './calendar-queue-engine/calendar-queue-engine.service';
import { ResourceEngineService } from './calendar-resource-engine/calendar-resource-engine.service';
import type { ResourceEntity } from './calendar-resource-engine/calendar-resource.models';

@Component({
  selector: 'app-calendar-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed" role="complementary" aria-label="Calendar sidebar">
      <button class="collapse-btn" (click)="toggle.emit()" [attr.aria-label]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
        {{ collapsed ? '&#9654;' : '&#9664;' }}
      </button>

      <div class="sidebar-content" *ngIf="!collapsed">
        <!-- Mini Calendar -->
        <section class="sidebar-section" aria-label="Mini calendar">
          <div class="mini-cal-header">
            <button class="cal-nav" (click)="prevMonth()" aria-label="Previous month">&larr;</button>
            <span class="cal-title">{{ MONTHS[miniMonth] }} {{ miniYear }}</span>
            <button class="cal-nav" (click)="nextMonth()" aria-label="Next month">&rarr;</button>
          </div>
          <div class="mini-cal-grid" role="grid" aria-label="Calendar">
            <div class="mini-cal-day-names">
              <span *ngFor="let d of DAYS_OF_WEEK_SHORT" class="mini-cal-dow" role="columnheader">{{ d }}</span>
            </div>
            <div class="mini-cal-days">
              <ng-container *ngFor="let week of monthGrid; let wi = index">
                <button
                  *ngFor="let day of week; let di = index"
                  class="mini-cal-day"
                  [class.today]="day && isTodayFn(day)"
                  [class.empty]="!day"
                  [class.weekend]="di === 0 || di === 6"
                  [class.has-appointments]="day && getDayAppointmentCount(day) > 0"
                  [disabled]="!day"
                  (click)="selectDate(day!)"
                  [attr.aria-label]="day ? (day | date:'fullDate') + ' ' + getDayAppointmentCount(day) + ' appointments' : null"
                  [attr.aria-current]="day && isTodayFn(day) ? 'date' : null"
                >
                  {{ day ? day.getDate() : '' }}
                </button>
              </ng-container>
            </div>
          </div>
        </section>

        <!-- Queue Summary -->
        <section class="sidebar-section" aria-label="Queue summary">
          <h3 class="sidebar-label">Queue</h3>
          <div class="queue-summary" *ngIf="queueStats">
            <div class="qs-row">
              <span class="qs-label">Waiting</span>
              <span class="qs-value qs-waiting">{{ queueStats.waiting }}</span>
            </div>
            <div class="qs-row">
              <span class="qs-label">In Service</span>
              <span class="qs-value qs-ips">{{ queueStats.inService }}</span>
            </div>
            <div class="qs-row">
              <span class="qs-label">Completed Today</span>
              <span class="qs-value qs-done">{{ queueStats.completed }}</span>
            </div>
          </div>
          <div class="queue-summary-empty" *ngIf="!queueStats">
            <span class="qs-empty-text">No queue data</span>
          </div>
        </section>

        <!-- Staff List -->
        <section class="sidebar-section" aria-label="Staff filter">
          <h3 class="sidebar-label">Staff</h3>
          <div class="staff-list">
            <button
              *ngFor="let s of sidebarStaff"
              class="staff-chip"
              [class.active]="s.active"
              (click)="toggleStaffFilter(s.id)"
            >
              <span class="sc-avatar" [style.background]="s.color">{{ s.initials }}</span>
              <span class="sc-name">{{ s.name }}</span>
            </button>
          </div>
        </section>

        <!-- Resource Availability -->
        <section class="sidebar-section" aria-label="Resource availability">
          <h3 class="sidebar-label">Resources</h3>
          <div class="resource-list">
            <div *ngFor="let r of resourceItems" class="resource-item">
              <span class="ri-dot" [class.ri-free]="r.available" [class.ri-used]="!r.available"></span>
              <span class="ri-name">{{ r.name }}</span>
              <span class="ri-type">{{ r.type }}</span>
            </div>
          </div>
        </section>

        <!-- Legend -->
        <section class="sidebar-section" aria-label="Status legend">
          <h3 class="sidebar-label">Legend</h3>
          <div class="legend-list">
            <div *ngFor="let item of legendItems" class="legend-item">
              <span class="legend-dot" [style.background]="item.color"></span>
              <span class="legend-label">{{ item.label }}</span>
            </div>
          </div>
        </section>

        <!-- Quick Actions -->
        <section class="sidebar-section" aria-label="Quick actions">
          <h3 class="sidebar-label">Quick Actions</h3>
          <div class="quick-actions">
            <button class="qa-btn qa-active" (click)="newAppointment.emit()" aria-label="New appointment">+ New Appointment</button>
            <button class="qa-btn qa-active" (click)="newWalkIn.emit()" aria-label="Add walk-in">+ Walk-in</button>
            <button class="qa-btn qa-active" (click)="openAiScheduler.emit()" aria-label="AI Scheduler">AI Scheduler</button>
          </div>
        </section>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      min-width: 260px;
      background: #fff;
      border-right: 1px solid var(--border, #e5e7eb);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transition: width 0.2s, min-width 0.2s;
      position: relative;
    }
    .sidebar.collapsed { width: 40px; min-width: 40px; }
    .sidebar-content { padding: 16px; display: flex; flex-direction: column; gap: 20px; }
    .collapse-btn {
      position: absolute;
      top: 8px;
      right: 4px;
      width: 28px;
      height: 28px;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }
    .collapse-btn:hover { background: var(--soft, #f7f7f7); }
    .sidebar-section { display: flex; flex-direction: column; gap: 8px; }
    .sidebar-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted, #6b7280); margin: 0; }

    /* Mini Calendar */
    .mini-cal-header { display: flex; align-items: center; justify-content: space-between; }
    .cal-nav {
      width: 28px; height: 28px; border: none; background: transparent;
      cursor: pointer; border-radius: 6px; font-size: 14px; display: flex;
      align-items: center; justify-content: center; color: var(--text, #111);
    }
    .cal-nav:hover { background: var(--soft, #f7f7f7); }
    .cal-title { font-size: 13px; font-weight: 700; }
    .mini-cal-grid { display: flex; flex-direction: column; gap: 4px; }
    .mini-cal-day-names { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; }
    .mini-cal-dow { font-size: 10px; font-weight: 600; color: var(--muted, #6b7280); padding: 4px 0; }
    .mini-cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .mini-cal-day {
      aspect-ratio: 1;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text, #111);
      transition: background 0.15s;
      position: relative;
    }
    .mini-cal-day:hover:not(.empty) { background: var(--soft, #f7f7f7); }
    .mini-cal-day.today { background: var(--black, #0b0b0b); color: #fff; font-weight: 700; }
    .mini-cal-day.has-appointments:not(.today)::after {
      content: ''; width: 4px; height: 4px; border-radius: 50%;
      background: var(--muted, #6b7280); position: absolute; bottom: 2px;
    }
    .mini-cal-day.weekend:not(.today) { color: var(--muted, #6b7280); }
    .mini-cal-day.empty { cursor: default; }
    .mini-cal-day:focus-visible { outline: 2px solid var(--black, #0b0b0b); outline-offset: 2px; }

    /* Queue Summary */
    .queue-summary { display: flex; flex-direction: column; gap: 4px; }
    .queue-summary-empty { font-size: 12px; color: var(--muted, #6b7280); padding: 4px 0; }
    .qs-empty-text { font-style: italic; }
    .qs-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
    .qs-label { color: var(--text, #111); font-weight: 500; }
    .qs-value { font-weight: 700; }
    .qs-waiting { color: #f59e0b; }
    .qs-ips { color: #3b82f6; }
    .qs-done { color: #16a34a; }

    /* Staff List */
    .staff-list { display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto; }
    .staff-chip {
      display: flex; align-items: center; gap: 8px; padding: 6px 8px;
      border: 1px solid transparent; border-radius: 8px; background: transparent;
      cursor: pointer; font-size: 12px; text-align: left; width: 100%;
      transition: background 0.12s;
    }
    .staff-chip:hover { background: var(--soft, #f7f7f7); }
    .staff-chip.active { border-color: var(--border, #e5e7eb); background: var(--soft, #f7f7f7); }
    .sc-avatar {
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .sc-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Resource List */
    .resource-list { display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow-y: auto; }
    .resource-item { display: flex; align-items: center; gap: 6px; font-size: 11px; }
    .ri-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .ri-free { background: #16a34a; }
    .ri-used { background: #f59e0b; }
    .ri-name { font-weight: 600; color: var(--text, #111); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ri-type { font-size: 9px; color: var(--muted, #6b7280); text-transform: capitalize; flex-shrink: 0; }

    /* Legend */
    .legend-list { display: flex; flex-direction: column; gap: 4px; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-label { color: var(--text, #111); }

    /* Quick Actions */
    .quick-actions { display: flex; flex-direction: column; gap: 6px; }
    .qa-btn {
      height: 34px;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      background: transparent;
      color: var(--text, #111);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 0 12px;
      text-align: left;
      transition: background 0.12s;
    }
    .qa-btn:hover { background: var(--soft, #f7f7f7); }
    .qa-btn:focus-visible { outline: 2px solid var(--black, #0b0b0b); outline-offset: 2px; }
    @media (max-width: 768px) {
      .sidebar { width: 240px; min-width: 240px; }
    }
  `]
})
export class CalendarSidebarComponent implements OnChanges, OnInit, OnDestroy {
  @Input() collapsed = false;
  @Input() currentDate: Date = new Date();
  @Input() appointments: CalendarBooking[] = [];
  @Input() sidebarStaff: SidebarStaff[] = [];
  @Output() toggle = new EventEmitter<void>();
  @Output() dateSelected = new EventEmitter<Date>();
  @Output() newAppointment = new EventEmitter<void>();
  @Output() newWalkIn = new EventEmitter<void>();
  @Output() openAiScheduler = new EventEmitter<void>();
  @Output() staffFilterChange = new EventEmitter<string[]>();

  private queueEngine = inject(QueueEngineService);
  private resourceEngine = inject(ResourceEngineService);
  private cdr = inject(ChangeDetectorRef);
  private pollingHandle: ReturnType<typeof setInterval> | null = null;

  DAYS_OF_WEEK_SHORT = DAYS_OF_WEEK_SHORT;
  MONTHS = MONTHS;
  miniMonth: number;
  miniYear: number;
  monthGrid: (Date | null)[][] = [];
  queueStats: { waiting: number; inService: number; completed: number } | null = null;
  resourceItems: { name: string; type: string; available: boolean }[] = [];

  legendItems = Object.entries(STATUS_COLORS).map(([status, color]) => ({
    label: status.charAt(0) + status.slice(1).toLowerCase(),
    color,
  }));

  constructor() {
    const now = new Date();
    this.miniMonth = now.getMonth();
    this.miniYear = now.getFullYear();
    this.buildMonthGrid();
  }

  ngOnInit(): void {
    this.updateQueueStats();
    this.loadResources();
    this.pollingHandle = setInterval(() => {
      this.updateQueueStats();
      this.loadResources();
      this.cdr.markForCheck();
    }, 15_000);
  }

  ngOnDestroy(): void {
    if (this.pollingHandle !== null) {
      clearInterval(this.pollingHandle);
      this.pollingHandle = null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentDate']) {
      this.miniMonth = this.currentDate.getMonth();
      this.miniYear = this.currentDate.getFullYear();
      this.buildMonthGrid();
    }
  }

  isTodayFn(date: Date): boolean {
    return isToday(date);
  }

  getDayAppointmentCount(day: Date): number {
    return this.appointments.filter(b => isSameDay(new Date(b.startTime), day)).length;
  }

  prevMonth(): void {
    if (this.miniMonth === 0) {
      this.miniMonth = 11;
      this.miniYear--;
    } else {
      this.miniMonth--;
    }
    this.buildMonthGrid();
  }

  nextMonth(): void {
    if (this.miniMonth === 11) {
      this.miniMonth = 0;
      this.miniYear++;
    } else {
      this.miniMonth++;
    }
    this.buildMonthGrid();
  }

  selectDate(date: Date): void {
    this.dateSelected.emit(date);
  }

  toggleStaffFilter(staffId: string): void {
    const idx = this.sidebarStaff.findIndex(s => s.id === staffId);
    if (idx >= 0) {
      this.sidebarStaff[idx].active = !this.sidebarStaff[idx].active;
      this.staffFilterChange.emit(this.sidebarStaff.filter(s => s.active).map(s => s.id));
    }
  }

  private loadResources(): void {
    try {
      const resources = this.resourceEngine.managerService.getAll();
      const today = this.currentDate.toISOString().slice(0, 10);
      this.resourceItems = resources.map((r: ResourceEntity) => ({
        name: r.name,
        type: r.type,
        available: r.status === 'ACTIVE',
      }));
    } catch {
      this.resourceItems = [];
    }
  }

  private updateQueueStats(): void {
    try {
      const stats = this.queueEngine.getStats();
      this.queueStats = {
        waiting: stats.totalWaiting + stats.totalCheckedIn,
        inService: stats.totalInService,
        completed: stats.totalCompleted,
      };
    } catch {
      this.queueStats = null;
    }
  }

  private buildMonthGrid(): void {
    const daysInMonth = getDaysInMonth(this.miniYear, this.miniMonth);
    const firstDay = getFirstDayOfMonth(this.miniYear, this.miniMonth);
    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      week.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(new Date(this.miniYear, this.miniMonth, d));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) { week.push(null); }
      weeks.push(week);
    }
    this.monthGrid = weeks;
  }
}

export interface SidebarStaff {
  id: string;
  name: string;
  color: string;
  initials: string;
  active: boolean;
}
