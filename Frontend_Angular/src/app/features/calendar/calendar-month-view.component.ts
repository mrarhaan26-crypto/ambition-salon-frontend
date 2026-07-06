import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { DAYS_OF_WEEK, STATUS_COLORS } from './calendar.constants';
import { getMonthGrid, isToday, isSameDay, isWeekend } from './calendar.utils';
import type { CalendarBooking } from './calendar.models';

@Component({
  selector: 'app-calendar-month-view',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="month-view" role="grid" aria-label="Month view">
      <div class="mv-header" role="row">
        <div *ngFor="let day of DAYS_OF_WEEK" class="mv-header-cell" role="columnheader">
          {{ day }}
        </div>
      </div>

      <div class="mv-body">
        <div *ngFor="let week of monthGrid; let wi = index" class="mv-week" role="row">
          <button
            *ngFor="let day of week; let di = index"
            class="mv-day"
            [class.today]="!!day && isTodayFn(day)"
            [class.selected]="!!day && selectedDate && isSameDayFn(day, selectedDate)"
            [class.other-month]="!day || day.getMonth() !== currentDate.getMonth()"
            [class.weekend]="!day || isWeekendFn(di)"
            [disabled]="!day"
            (click)="selectDay(day!)"
            [attr.aria-label]="day ? (day | date:'fullDate') + ' ' + getAppointmentsForDay(day).length + ' appointments' : null"
            [attr.aria-current]="day && isTodayFn(day) ? 'date' : null"
          >
            <span class="mv-day-num">{{ day ? day.getDate() : '' }}</span>
            <div class="mv-day-indicators" *ngIf="day && day.getMonth() === currentDate.getMonth()">
              <div class="mv-apt-dots">
                <span
                  *ngFor="let b of getAppointmentsForDay(day).slice(0, 3); trackBy: trackById"
                  class="mv-apt-dot"
                  [style.background]="getStatusColor(b.status)"
                  [title]="(b.client?.fullName || '') + ' - ' + (b.services?.[0]?.name || b.title)"
                ></span>
                <span class="mv-apt-more" *ngIf="getAppointmentsForDay(day).length > 3">
                  +{{ getAppointmentsForDay(day).length - 3 }}
                </span>
              </div>
              <span class="mv-badge" *ngIf="getAppointmentsForDay(day).length > 0">
                {{ getAppointmentsForDay(day).length }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .month-view { display: flex; flex-direction: column; height: 100%; }
    .mv-header { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--border, #e5e7eb); position: sticky; top: 0; background: #fff; z-index: 2; }
    .mv-header-cell { padding: 10px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted, #6b7280); text-align: center; }
    .mv-body { flex: 1; display: flex; flex-direction: column; }
    .mv-week { display: grid; grid-template-columns: repeat(7, 1fr); flex: 1; min-height: 100px; }
    .mv-day { border: none; background: #fff; border-right: 1px solid var(--border, #e5e7eb); border-bottom: 1px solid var(--border, #e5e7eb); cursor: pointer; display: flex; flex-direction: column; align-items: flex-start; padding: 6px 8px; gap: 2px; transition: background 0.12s; text-align: left; overflow: hidden; }
    .mv-day:hover { background: var(--soft, #f7f7f7); }
    .mv-day:focus-visible { outline: 2px solid var(--black, #0b0b0b); outline-offset: -2px; z-index: 1; }
    .mv-day.other-month { background: #fafafa; }
    .mv-day.other-month .mv-day-num { color: var(--muted, #6b7280); opacity: 0.4; }
    .mv-day.weekend:not(.today):not(.selected) { background: #fcfcfc; }
    .mv-day.today { background: #f0f7ff; }
    .mv-day.today .mv-day-num { background: var(--black, #0b0b0b); color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .mv-day.selected { background: #e8f0fe; }
    .mv-day:disabled { cursor: default; }
    .mv-day-num { font-size: 13px; font-weight: 600; line-height: 1; flex-shrink: 0; }
    .mv-day-indicators { display: flex; flex-direction: column; gap: 2px; width: 100%; flex: 1; }
    .mv-apt-dots { display: flex; gap: 3px; align-items: center; flex-wrap: wrap; }
    .mv-apt-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .mv-apt-more { font-size: 9px; color: var(--muted, #6b7280); font-weight: 600; }
    .mv-badge { font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 600; background: var(--soft, #f7f7f7); color: var(--muted, #6b7280); align-self: flex-start; }
    @media (max-width: 768px) {
      .mv-week { min-height: 60px; }
      .mv-day { padding: 4px; }
      .mv-day-num { font-size: 11px; }
      .mv-apt-dot { width: 4px; height: 4px; }
      .mv-badge { font-size: 8px; padding: 0 4px; }
    }
  `]
})
export class CalendarMonthViewComponent {
  @Input() currentDate: Date = new Date();
  @Input() selectedDate: Date = new Date();
  @Input() appointments: CalendarBooking[] = [];
  @Output() daySelect = new EventEmitter<Date>();

  DAYS_OF_WEEK = DAYS_OF_WEEK;

  get monthGrid(): (Date | null)[][] {
    return getMonthGrid(this.currentDate.getFullYear(), this.currentDate.getMonth());
  }

  trackById(_i: number, b: CalendarBooking): string { return b.id; }

  isTodayFn(d: Date): boolean { return isToday(d); }
  isSameDayFn(d1: Date, d2: Date): boolean { return isSameDay(d1, d2); }
  isWeekendFn(dayOfWeek: number): boolean { return isWeekend(dayOfWeek); }

  getAppointmentsForDay(day: Date): CalendarBooking[] {
    return this.appointments.filter(b => isSameDay(new Date(b.startTime), day));
  }

  getStatusColor(status: string): string {
    return STATUS_COLORS[status] || '#999';
  }

  selectDay(day: Date): void {
    this.daySelect.emit(day);
  }
}
