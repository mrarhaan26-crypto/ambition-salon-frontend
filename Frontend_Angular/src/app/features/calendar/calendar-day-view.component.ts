import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { BUSINESS_HOURS_START, BUSINESS_HOURS_END, HOUR_HEIGHT_PX } from './calendar.constants';
import { isToday, getHoursArray, formatHour, buildAppointmentCardData } from './calendar.utils';
import type { CalendarBooking } from './calendar.models';
import type { AppointmentCardData } from './calendar-appointment.models';
import { AppointmentCardComponent } from './appointment-card.component';
import { DragEngineService } from './calendar-drag-engine/calendar-drag-engine.service';
import { DragVisualService } from './calendar-drag-engine/calendar-drag-visual.service';
import type { ViewCoordinateAdapter } from './calendar-drag-engine/calendar-drag-engine.service';
import type { DragTarget } from './calendar-drag-engine/calendar-drag-state.service';
import { getDurationMinutes } from './calendar.utils';

@Component({
  selector: 'app-calendar-day-view',
  standalone: true,
  imports: [CommonModule, AppointmentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="day-view" role="grid" aria-label="Day view for {{ currentDate | date:'fullDate' }}">
      <div class="dv-header">
        <div class="dv-header-info">
          <span class="dv-day-name">{{ currentDate | date:'EEEE' }}</span>
          <span
            class="dv-day-num"
            [class.today-num]="isTodayFn(currentDate)"
          >{{ currentDate.getDate() }}</span>
          <span class="dv-day-month">{{ currentDate | date:'MMMM yyyy' }}</span>
          <span class="dv-count" *ngIf="appointments.length > 0">{{ appointments.length }} appointment{{ appointments.length !== 1 ? 's' : '' }}</span>
        </div>
        <div class="dv-bh" *ngIf="isTodayFn(currentDate)">
          <span class="dv-bh-dot"></span>
          <span>Business hours: {{ formatHourFn(BUSINESS_HOURS_START) }} – {{ formatHourFn(BUSINESS_HOURS_END) }}</span>
        </div>
      </div>

      <div class="dv-body" #dvBodyRef>
        <div class="dv-time-col">
          <div *ngFor="let hour of hours" class="dv-time-row">
            <span class="dv-time-label">{{ formatHourFn(hour) }}</span>
          </div>
        </div>

        <div class="dv-grid" #dvGridRef>
          <div class="dv-day-col" [class.today]="isTodayFn(currentDate)">
            <div
              *ngFor="let hour of hours; let hi = index"
              class="dv-hour-slot"
              [class.business-hours]="hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END"
              [class.dv-hour-alt]="hi % 2 === 1"
              [class.dv-slot-valid]="isValidDropTarget(hour)"
              (click)="onSlotClick(hour)"
              [attr.aria-label]="'Time slot: ' + formatHourFn(hour)"
            >
              <div class="dv-hour-line"></div>
              <div class="dv-half-line"></div>
            </div>

            <div class="dv-appointments-layer">
              <ng-container *ngFor="let apt of appointmentCards; trackBy: trackById">
                <app-appointment-card
                  [data]="apt"
                  [top]="apt.top"
                  [height]="apt.height"
                  [dragging]="dragEngine.stateService.targetAppointmentId === apt.id && dragEngine.stateService.isDragging"
                  (cardClick)="onAppointmentClick($event)"
                  (dragStart)="onCardDragStart($event)"
                  (resizeStartEvent)="onCardResizeStart($event)"
                ></app-appointment-card>
              </ng-container>
            </div>

            <div class="dv-current-time" *ngIf="isTodayFn(currentDate)" [style.top.px]="getCurrentTimePosition()">
              <span class="dv-now-dot" aria-label="Current time indicator"></span>
              <span class="dv-now-line"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="drag-ghost" *ngIf="visual.ghost.visible"
        [style.left.px]="visual.ghost.x"
        [style.top.px]="visual.ghost.y"
        [style.width.px]="visual.ghost.width || 200"
        [style.height.px]="visual.ghost.height || 60"
        [style.background]="visual.ghost.color + '20'"
        [style.border-left-color]="visual.ghost.color"
        role="presentation"
        aria-hidden="true"
      >
        <strong>{{ visual.ghost.title }}</strong>
        <span>{{ visual.ghost.durationMinutes }}m</span>
      </div>
    </div>
  `,
  styles: [`
    .day-view { display: flex; flex-direction: column; height: 100%; position: relative; }
    .dv-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border, #e5e7eb);
      background: #fff; position: sticky; top: 0; z-index: 2;
    }
    .dv-header-info { display: flex; align-items: center; gap: 12px; }
    .dv-day-name { font-size: 14px; color: var(--muted, #6b7280); font-weight: 500; }
    .dv-day-num { font-size: 28px; font-weight: 800; }
    .dv-day-num.today-num {
      background: var(--black, #0b0b0b); color: #fff; width: 40px; height: 40px;
      border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    }
    .dv-day-month { font-size: 14px; color: var(--muted, #6b7280); }
    .dv-count { font-size: 12px; font-weight: 600; color: var(--muted, #6b7280); background: var(--soft, #f7f7f7); padding: 4px 10px; border-radius: 12px; }
    .dv-bh { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted, #6b7280); }
    .dv-bh-dot { width: 6px; height: 6px; background: #50C878; border-radius: 50%; }
    .dv-body { display: flex; flex: 1; overflow-y: auto; position: relative; }
    .dv-time-col { width: 70px; min-width: 70px; border-right: 1px solid var(--border, #e5e7eb); flex-shrink: 0; }
    .dv-time-row { height: 60px; display: flex; align-items: flex-start; justify-content: center; padding-top: 2px; }
    .dv-time-label { font-size: 11px; font-weight: 500; color: var(--muted, #6b7280); }
    .dv-grid { flex: 1; position: relative; }
    .dv-day-col { position: relative; height: 100%; }
    .dv-day-col.today { background: #f0f7ff; }
    .dv-hour-slot { height: 60px; position: relative; cursor: pointer; }
    .dv-hour-slot:hover { background: rgba(0,0,0,0.02); }
    .dv-hour-slot.dv-hour-alt { background: rgba(0,0,0,0.01); }
    .dv-slot-valid { background: rgba(99,102,241,0.06); }
    .dv-hour-line { position: absolute; top: 0; left: 0; right: 0; border-top: 1px solid var(--border, #e5e7eb); }
    .dv-half-line { position: absolute; top: 30px; left: 0; right: 0; border-top: 1px dashed var(--border, #e5e7eb); opacity: 0.5; }
    .dv-appointments-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }
    .dv-appointments-layer app-appointment-card { pointer-events: auto; }
    .dv-current-time { position: absolute; left: 0; right: 0; z-index: 2; pointer-events: none; }
    .dv-now-dot {
      position: absolute; left: -5px; top: -5px; width: 10px; height: 10px;
      background: #e53935; border-radius: 50%; z-index: 1;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.8);
    }
    .dv-now-line { position: absolute; top: 0; left: 0; right: 0; border-top: 2px solid #e53935; }
    .drag-ghost {
      position: fixed; pointer-events: none; z-index: 9999;
      border-radius: 8px; border-left: 3px solid;
      padding: 8px 12px; font-size: 11px;
      display: flex; flex-direction: column; gap: 2px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.14);
      opacity: 0.88; transform: translate(-50%,-50%);
      max-width: 200px; white-space: nowrap;
      transition: none;
    }
    .drag-ghost strong { font-size: 11px; font-weight: 700; color: #0b0b0b; overflow: hidden; text-overflow: ellipsis; }
    .drag-ghost span { font-size: 10px; color: #374151; }
  `]
})
export class CalendarDayViewComponent implements OnInit, OnDestroy {
  @Input() currentDate: Date = new Date();
  @Input() appointments: CalendarBooking[] = [];
  @Input() staffColorMap: Record<string, string> = {};
  @Output() appointmentClick = new EventEmitter<string>();
  @Output() slotClick = new EventEmitter<{ date: Date; hour: number }>();

  @ViewChild('dvBodyRef') bodyRef?: ElementRef<HTMLElement>;
  @ViewChild('dvGridRef') gridRef?: ElementRef<HTMLElement>;

  protected dragEngine = inject(DragEngineService);
  protected visual = inject(DragVisualService);

  BUSINESS_HOURS_START = BUSINESS_HOURS_START;
  BUSINESS_HOURS_END = BUSINESS_HOURS_END;
  hours = getHoursArray(0, 24);

  private unregisterAdapter?: () => void;

  ngOnInit(): void {
    this.dragEngine.registerAdapter(this.createAdapter());
  }

  ngOnDestroy(): void {
    this.dragEngine.unregisterAdapter();
  }

  get appointmentCards(): (AppointmentCardData & { top: number; height: number })[] {
    return this.appointments.map(b => buildAppointmentCardData(b, this.staffColorMap));
  }

  trackById(_index: number, item: AppointmentCardData): string { return item.id; }

  isTodayFn(d: Date): boolean { return isToday(d); }

  formatHourFn(hour: number): string { return formatHour(hour); }

  getCurrentTimePosition(): number {
    const now = new Date();
    return (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT_PX;
  }

  onAppointmentClick(id: string): void {
    if (this.dragEngine.stateService.isActive) return;
    this.appointmentClick.emit(id);
  }

  onSlotClick(hour: number): void {
    if (this.dragEngine.stateService.isActive) return;
    this.slotClick.emit({ date: this.currentDate, hour });
  }

  onCardDragStart(event: { appointmentId: string; clientX: number; clientY: number }): void {
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

  isValidDropTarget(hour: number): boolean {
    return this.dragEngine.stateService.isActive;
  }

  private createAdapter(): ViewCoordinateAdapter {
    return {
      getContainer: () => this.gridRef?.nativeElement || document.createElement('div'),
      yToTime: (clientY: number, containerEl: HTMLElement) => {
        const rect = containerEl.getBoundingClientRect();
        const relativeY = clientY - rect.top + containerEl.scrollTop;
        const minutes = Math.max(0, relativeY / 60 * 60);
        const hour = Math.floor(minutes / 60);
        const date = new Date(this.currentDate);
        date.setHours(hour, minutes % 60, 0, 0);
        return { date, minutes, hour };
      },
      xToStaffId: () => '',
      getAppointmentElement: (id: string) => {
        const el = this.bodyRef?.nativeElement?.querySelector(`[data-appointment-id="${id}"]`);
        return el as HTMLElement | null;
      },
      getStaffColor: (staffId: string) => this.staffColorMap[staffId] || '#6366f1',
      onAppointmentUpdated: (_id, _newStart, _newEnd, _newStaffId) => {
        // Will be wired to API in future sprint
      },
    };
  }
}
