import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { DAYS_OF_WEEK, BUSINESS_HOURS_START, BUSINESS_HOURS_END, HOUR_HEIGHT_PX } from './calendar.constants';
import { getWeekDates, isToday, getHoursArray, formatHour, buildAppointmentCardData } from './calendar.utils';
import type { CalendarBooking } from './calendar.models';
import type { AppointmentCardData } from './calendar-appointment.models';
import { AppointmentCardComponent } from './appointment-card.component';
import { DragEngineService } from './calendar-drag-engine/calendar-drag-engine.service';
import { DragVisualService } from './calendar-drag-engine/calendar-drag-visual.service';
import type { ViewCoordinateAdapter } from './calendar-drag-engine/calendar-drag-engine.service';
import type { DragTarget } from './calendar-drag-engine/calendar-drag-state.service';
import { getDurationMinutes } from './calendar.utils';

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

      <div class="wv-body" #wvBodyRef>
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
                  [dragging]="dragEngine.stateService.targetAppointmentId === apt.id && dragEngine.stateService.isDragging"
                  (cardClick)="onAppointmentClick($event)"
                  (dragStart)="onCardDragStart($event, day)"
                  (resizeStartEvent)="onCardResizeStart($event)"
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

      <div class="drag-ghost-week" *ngIf="visual.ghost.visible"
        [style.left.px]="visual.ghost.x"
        [style.top.px]="visual.ghost.y"
        role="presentation"
        aria-hidden="true"
      >
        <strong>{{ visual.ghost.title }}</strong>
        <span>{{ visual.ghost.durationMinutes }}m</span>
      </div>
    </div>
  `,
  styles: [`
    .week-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; position: relative; }
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
    .drag-ghost-week {
      position: fixed; pointer-events: none; z-index: 9999;
      border-radius: 8px; border: 1px solid var(--border, #e5e7eb);
      background: #fff; padding: 6px 12px; font-size: 11px;
      display: flex; flex-direction: column; gap: 2px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.14);
      opacity: 0.88; transform: translate(-50%,-50%);
      transition: none;
    }
    .drag-ghost-week strong { font-size: 11px; font-weight: 700; }
    .drag-ghost-week span { font-size: 10px; color: #374151; }
  `]
})
export class CalendarWeekViewComponent implements OnInit, OnDestroy {
  @Input() currentDate: Date = new Date();
  @Input() appointments: CalendarBooking[] = [];
  @Input() staffColorMap: Record<string, string> = {};
  @Output() appointmentClick = new EventEmitter<string>();
  @Output() dayClick = new EventEmitter<Date>();

  @ViewChild('wvBodyRef') bodyRef?: ElementRef<HTMLElement>;

  protected dragEngine = inject(DragEngineService);
  protected visual = inject(DragVisualService);

  DAYS_OF_WEEK = DAYS_OF_WEEK;
  BUSINESS_HOURS_START = BUSINESS_HOURS_START;
  BUSINESS_HOURS_END = BUSINESS_HOURS_END;
  hours = getHoursArray(0, 24);

  ngOnInit(): void {
    this.dragEngine.registerAdapter(this.createAdapter());
  }

  ngOnDestroy(): void {
    this.dragEngine.unregisterAdapter();
  }

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
    if (this.dragEngine.stateService.isActive) return;
    this.appointmentClick.emit(id);
  }

  onDayColClick(day: Date): void {
    if (this.dragEngine.stateService.isActive) return;
    this.dayClick.emit(day);
  }

  onCardDragStart(event: { appointmentId: string; clientX: number; clientY: number }, day: Date): void {
    const booking = this.appointments.find(b => b.id === event.appointmentId);
    if (!booking) return;

    const target: DragTarget = {
      appointmentId: booking.id,
      staffId: booking.staffId ?? '',
      startTime: booking.startTime,
      endTime: booking.endTime,
      durationMinutes: getDurationMinutes(booking.startTime, booking.endTime),
      title: booking.client?.fullName || booking.title || 'Appointment',
    };

    this.dragEngine.startDrag(target, event.clientX, event.clientY, 'mouse');
  }

  onCardResizeStart(event: { appointmentId: string; edge: 'top' | 'bottom'; clientX: number; clientY: number }): void {
    const booking = this.appointments.find(b => b.id === event.appointmentId);
    if (!booking) return;

    const target: DragTarget = {
      appointmentId: booking.id,
      staffId: booking.staffId ?? '',
      startTime: booking.startTime,
      endTime: booking.endTime,
      durationMinutes: getDurationMinutes(booking.startTime, booking.endTime),
      title: booking.client?.fullName || booking.title || 'Appointment',
    };

    this.dragEngine.startResize(target, event.edge, event.clientX, event.clientY);
  }

  private createAdapter(): ViewCoordinateAdapter {
    return {
      getContainer: () => this.bodyRef?.nativeElement || document.createElement('div'),
      yToTime: (clientY: number, containerEl: HTMLElement) => {
        const rect = containerEl.getBoundingClientRect();
        const relativeY = clientY - rect.top + containerEl.scrollTop;
        const minutes = Math.max(0, (relativeY / HOUR_HEIGHT_PX) * 60);
        const hour = Math.floor(minutes / 60);
        const date = new Date(this.currentDate);
        date.setHours(hour, minutes % 60, 0, 0);
        return { date, minutes, hour };
      },
      xToStaffId: () => '',
      getAppointmentElement: (id: string) => {
        return this.bodyRef?.nativeElement?.querySelector(`[data-appointment-id="${id}"]`) as HTMLElement | null;
      },
      getStaffColor: (staffId: string) => this.staffColorMap[staffId] || '#6366f1',
      onAppointmentUpdated: () => {},
    };
  }
}
