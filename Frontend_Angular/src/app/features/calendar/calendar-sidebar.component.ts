import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { DAYS_OF_WEEK_SHORT, MONTHS, STATUS_COLORS } from './calendar.constants';
import { getDaysInMonth, getFirstDayOfMonth, isToday } from './calendar.utils';

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
                  [disabled]="!day"
                  (click)="selectDate(day!)"
                  [attr.aria-label]="day ? (day | date:'fullDate') : null"
                  [attr.aria-current]="day && isTodayFn(day) ? 'date' : null"
                >
                  {{ day ? day.getDate() : '' }}
                </button>
              </ng-container>
            </div>
          </div>
        </section>

        <!-- Staff Filter Placeholder -->
        <section class="sidebar-section" aria-label="Staff filter">
          <h3 class="sidebar-label">Staff</h3>
          <div class="sidebar-placeholder">
            <div class="ph-line"></div>
            <div class="ph-line"></div>
            <div class="ph-line"></div>
          </div>
        </section>

        <!-- Branch Selector Placeholder -->
        <section class="sidebar-section" aria-label="Branch selector">
          <h3 class="sidebar-label">Branch</h3>
          <div class="sidebar-placeholder">
            <div class="ph-line"></div>
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

        <!-- Quick Actions Placeholder -->
        <section class="sidebar-section" aria-label="Quick actions">
          <h3 class="sidebar-label">Quick Actions</h3>
          <div class="quick-actions">
            <button class="qa-btn" aria-label="New appointment (coming soon)" disabled>+ New Appointment</button>
            <button class="qa-btn" aria-label="Add walk-in (coming soon)" disabled>+ Walk-in</button>
            <button class="qa-btn" aria-label="Block time (coming soon)" disabled>Block Time</button>
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
    .sidebar-placeholder { display: flex; flex-direction: column; gap: 6px; }
    .ph-line { height: 10px; background: var(--soft, #f7f7f7); border-radius: 4px; }

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
    .mini-cal-days { display: flex; flex-direction: column; gap: 2px; }
    .mini-cal-days > ng-container { display: contents; }
    .mini-cal-days > ng-container { display: grid; grid-template-columns: repeat(7, 1fr); }
    :host ::ng-deep .mini-cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .mini-cal-day {
      aspect-ratio: 1;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text, #111);
      transition: background 0.15s;
    }
    .mini-cal-day:hover:not(.empty) { background: var(--soft, #f7f7f7); }
    .mini-cal-day.today { background: var(--black, #0b0b0b); color: #fff; font-weight: 700; }
    .mini-cal-day.weekend:not(.today) { color: var(--muted, #6b7280); }
    .mini-cal-day.empty { cursor: default; }
    .mini-cal-day:focus-visible { outline: 2px solid var(--black, #0b0b0b); outline-offset: 2px; }

    /* Legend */
    .legend-list { display: flex; flex-direction: column; gap: 4px; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-label { color: var(--text, #111); }

    /* Quick Actions */
    .quick-actions { display: flex; flex-direction: column; gap: 6px; }
    .qa-btn {
      height: 34px;
      border: 1px dashed var(--border, #e5e7eb);
      border-radius: 8px;
      background: transparent;
      color: var(--muted, #6b7280);
      font-size: 12px;
      cursor: not-allowed;
      padding: 0 12px;
      text-align: left;
    }
    .qa-btn:focus-visible { outline: 2px solid var(--black, #0b0b0b); outline-offset: 2px; }
    @media (max-width: 768px) {
      .sidebar { width: 240px; min-width: 240px; }
    }
  `]
})
export class CalendarSidebarComponent implements OnChanges {
  @Input() collapsed = false;
  @Input() currentDate: Date = new Date();
  @Output() toggle = new EventEmitter<void>();
  @Output() dateSelected = new EventEmitter<Date>();

  DAYS_OF_WEEK_SHORT = DAYS_OF_WEEK_SHORT;
  MONTHS = MONTHS;
  miniMonth: number;
  miniYear: number;
  monthGrid: (Date | null)[][] = [];

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
