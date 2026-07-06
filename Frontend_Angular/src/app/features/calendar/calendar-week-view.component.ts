import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { DAYS_OF_WEEK, BUSINESS_HOURS_START, BUSINESS_HOURS_END, HOUR_HEIGHT_PX } from './calendar.constants';
import { getWeekDates, isToday, getHoursArray, formatHour, buildAppointmentCardData } from './calendar.utils';
import type { CalendarBooking } from './calendar.models';
import type { AppointmentCardData } from './calendar-appointment.models';
import { AppointmentCardComponent } from './appointment-card.component';

@Component({
  selector: 'app-calendar-week-view',
  standalone: true,
  imports: [CommonModule, AppointmentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="week-view" role="grid" aria-label="Week view">
      <div class="wv-header" role="row">
        <div class="wv-corner" role="columnheader"></div>
        <div
          *ngFor="let day of weekDays; trackBy: trackByDate"
          class="wv-header-cell"
          [class.today]="isTodayFn(day)"
          role="columnheader"
          [attr.aria-label]="day | date:'fullDate'"
        >
          <span class="wv-day-name">{{ DAYS_OF_WEEK[day.getDay()] }}</span>
          <span class="wv-day-num" [class.today-num]="isTodayFn(day)">{{ day.getDate() }}</span>
        </div>
      </div>

      <div class="wv-body">
        <div class="wv-time-col">
          <div *ngFor="let hour of hours" class="wv-time-slot">
            <span class="wv-time-label">{{ formatHourFn(hour) }}</span>
          </div>
        </div>

        <div class="wv-grid">
          <div
            *ngFor="let day of weekDays; let di = index; trackBy: trackByDate"
            class="wv-day-col"
            [class.today]="isTodayFn(day)"
            [class.weekend]="day.getDay() === 0 || day.getDay() === 6"
            (click)="onDayColClick(day)"
          >
            <div *ngFor="let hour of hours" class="wv-hour-cell" [class.business-hours]="hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END">
              <div class="wv-hour-line"></div>
            </div>

            <div class="wv-appointments-layer">
              <ng-container *ngFor="let apt of getDayAppointments(di); trackBy: trackById">
                <app-appointment-card
                  [data]="apt"
                  [top]="apt.top"
                  [height]="apt.height"
                  (cardClick)="onAppointmentClick($event)"
                ></app-appointment-card>
              </ng-container>
            </div>

            <div class="wv-current-time" *ngIf="isTodayFn(day)" [style.top.px]="getCurrentTimePosition()">
              <span class="wv-now-dot"></span>
              <span class="wv-now-line"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .week-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .wv-header { display: grid; grid-template-columns: 60px repeat(7, 1fr); border-bottom: 1px solid var(--border, #e5e7eb); position: sticky; top: 0; background: #fff; z-index: 3; }
    .wv-corner { border-right: 1px solid var(--border, #e5e7eb); }
    .wv-header-cell { padding: 10px 4px; text-align: center; border-right: 1px solid var(--border, #e5e7eb); }
    .wv-header-cell:last-child { border-right: none; }
    .wv-header-cell.today { background: #f0f7ff; }
    .wv-day-name { display: block; font-size: 11px; font-weight: 600; color: var(--muted, #6b7280); text-transform: uppercase; }
    .wv-day-num { display: block; font-size: 20px; font-weight: 700; margin-top: 2px; }
    .wv-day-num.today-num { background: var(--black, #0b0b0b); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
    .wv-body { display: flex; flex: 1; overflow-y: auto; position: relative; }
    .wv-time-col { width: 60px; min-width: 60px; border-right: 1px solid var(--border, #e5e7eb); flex-shrink: 0; }
    .wv-time-slot { height: 60px; display: flex; align-items: flex-start; justify-content: center; padding-top: 2px; }
    .wv-time-label { font-size: 11px; font-weight: 500; color: var(--muted, #6b7280); }
    .wv-grid { display: grid; grid-template-columns: repeat(7, 1fr); flex: 1; position: relative; }
    .wv-day-col { border-right: 1px solid var(--border, #e5e7eb); position: relative; cursor: pointer; }
    .wv-day-col:last-child { border-right: none; }
    .wv-day-col.today { background: #f0f7ff; }
    .wv-day-col.weekend { background: #fafafa; }
    .wv-hour-cell { height: 60px; position: relative; }
    .wv-hour-line { position: absolute; top: 0; left: 0; right: 0; border-top: 1px solid var(--border, #e5e7eb); }
    .wv-hour-cell.business-hours { background: transparent; }
    .wv-appointments-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }
    .wv-appointments-layer app-appointment-card { pointer-events: auto; }
    .wv-current-time { position: absolute; left: 0; right: 0; z-index: 2; pointer-events: none; }
    .wv-now-dot { position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; background: #e53935; border-radius: 50%; z-index: 1; }
    .wv-now-line { position: absolute; top: 0; left: 0; right: 0; border-top: 2px solid #e53935; }
  `]
})
export class CalendarWeekViewComponent {
  @Input() currentDate: Date = new Date();
  @Input() appointments: CalendarBooking[] = [];
  @Input() staffColorMap: Record<string, string> = {};
  @Output() appointmentClick = new EventEmitter<string>();
  @Output() dayClick = new EventEmitter<Date>();

  DAYS_OF_WEEK = DAYS_OF_WEEK;
  BUSINESS_HOURS_START = BUSINESS_HOURS_START;
  BUSINESS_HOURS_END = BUSINESS_HOURS_END;
  hours = getHoursArray(0, 24);

  get weekDays(): Date[] {
    return getWeekDates(this.currentDate);
  }

  trackByDate(_i: number, d: Date): string { return d.toISOString(); }
  trackById(_i: number, item: AppointmentCardData & { top?: number; height?: number }): string { return item.id; }

  isTodayFn(d: Date): boolean { return isToday(d); }
  formatHourFn(hour: number): string { return formatHour(hour); }

  getCurrentTimePosition(): number {
    const now = new Date();
    return (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT_PX;
  }

  getDayAppointments(dayIndex: number): (AppointmentCardData & { top: number; height: number })[] {
    const day = this.weekDays[dayIndex];
    const dayBookings = this.appointments.filter(b => {
      const bDate = new Date(b.startTime);
      return bDate.getFullYear() === day.getFullYear()
        && bDate.getMonth() === day.getMonth()
        && bDate.getDate() === day.getDate();
    });
    return dayBookings.map(b => buildAppointmentCardData(b, this.staffColorMap));
  }

  onAppointmentClick(id: string): void {
    this.appointmentClick.emit(id);
  }

  onDayColClick(day: Date): void {
    this.dayClick.emit(day);
  }


}
