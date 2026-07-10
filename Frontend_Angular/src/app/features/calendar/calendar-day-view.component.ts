import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
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
import type { SidebarStaff } from './calendar-sidebar.component';
import { Subscription, fromEvent } from 'rxjs';

const STAFF_COL_WIDTH = 200;
const TIME_COL_WIDTH = 70;

@Component({
  selector: 'app-calendar-day-view',
  standalone: true,
  imports: [CommonModule, AppointmentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sdv-root" role="grid" aria-label="Staff day view for {{ currentDate | date:'fullDate' }}">
      <!-- Header Row: time corner + staff headers -->
      <div class="sdv-header-row">
        <div class="sdv-time-corner" [style.width.px]="TIME_COL_WIDTH">
          <span class="sdv-date-label">{{ currentDate | date:'EEE' }}</span>
          <span class="sdv-date-num" [class.today]="isTodayFn(currentDate)">{{ currentDate.getDate() }}</span>
        </div>
        <div class="sdv-staff-header" #staffHeaderRef>
          <div class="sdv-staff-header-inner" [style.width.px]="headerInnerWidth">
            <div
              *ngFor="let staff of _staffList; let si = index"
              class="sdv-sh-cell"
              [style.width.px]="STAFF_COL_WIDTH"
            >
              <span class="sh-badge">{{ si + 1 }}</span>
              <span class="sh-avatar" [style.background]="staff.color">{{ staff.initials }}</span>
              <div class="sh-info">
                <span class="sh-name">{{ staff.name }}</span>
                <span class="sh-role">{{ staff.role || 'Staff' }}</span>
              </div>
              <span class="sh-count" *ngIf="getColumnAppointments(staff.id).length > 0">
                {{ getColumnAppointments(staff.id).length }}
              </span>
            </div>
            <div class="sdv-sh-cell sdv-sh-add" [style.width.px]="STAFF_COL_WIDTH">
              <button class="sh-add-btn" (click)="addStaff.emit()" title="Add staff column" aria-label="Add staff">+</button>
              <span class="sh-add-label">Add Staff</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Body: time column + scrollable staff grid -->
      <div class="sdv-body" #sdvBodyRef>
        <div class="sdv-time-col" [style.width.px]="TIME_COL_WIDTH" #sdvTimeColRef>
          <div class="sdv-time-col-inner" [style.height.px]="totalGridHeight">
            <div *ngFor="let hour of hours" class="sdv-time-row" [style.height.px]="HOUR_HEIGHT_PX">
              <span class="sdv-time-label">{{ formatHourFn(hour) }}</span>
            </div>
          </div>
        </div>

        <div class="sdv-grid-wrapper" #sdvGridWrapperRef>
          <div class="sdv-grid" [style.width.px]="gridInnerWidth" [style.height.px]="totalGridHeight">
            <ng-container *ngFor="let staff of _staffList; let si = index">
              <div class="sdv-staff-col" [style.width.px]="STAFF_COL_WIDTH" [style.left.px]="si * STAFF_COL_WIDTH">
                <div
                  *ngFor="let hour of hours; let hi = index"
                  class="sdv-hour-slot"
                  [class.business-hours]="hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END"
                  [class.sdv-alt]="hi % 2 === 1"
                  [class.sdv-valid]="isValidDropTarget()"
                  (click)="onSlotClick(staff.id, hour)"
                  [attr.aria-label]="staff.name + ' ' + formatHourFn(hour)"
                >
                  <div class="sdv-hour-line"></div>
                  <div class="sdv-half-line"></div>
                </div>

                <div class="sdv-appts-layer">
                  <ng-container *ngFor="let apt of getColumnAppointments(staff.id); trackBy: trackById">
                    <app-appointment-card
                      [data]="apt"
                      [top]="apt.top"
                      [height]="apt.height"
                      [dragging]="dragEngine.stateService.targetAppointmentId === apt.id && dragEngine.stateService.isDragging"
                      (cardClick)="onAppointmentClick(apt.id)"
                      (dragStart)="onCardDragStart($event)"
                      (resizeStartEvent)="onCardResizeStart($event)"
                    ></app-appointment-card>
                  </ng-container>
                </div>
              </div>
            </ng-container>

            <!-- Add Staff column (empty grid area) -->
            <div class="sdv-staff-col sdv-col-add" [style.width.px]="STAFF_COL_WIDTH" [style.left.px]="_staffList.length * STAFF_COL_WIDTH">
              <div *ngFor="let hour of hours" class="sdv-hour-slot sdv-add-slot" (click)="addStaff.emit()">
                <div class="sdv-hour-line"></div>
              </div>
            </div>

            <!-- Current time line across all staff columns -->
            <div class="sdv-now-line" *ngIf="isTodayFn(currentDate)" [style.top.px]="currentTimeTop">
              <span class="sdv-now-dot"></span>
              <span class="sdv-now-bar"></span>
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
        role="presentation" aria-hidden="true"
      >
        <strong>{{ visual.ghost.title }}</strong>
        <span>{{ visual.ghost.durationMinutes }}m</span>
      </div>
    </div>
  `,
  styles: [`
    .sdv-root { display: flex; flex-direction: column; height: 100%; position: relative; }

    /* Header row */
    .sdv-header-row { display: flex; flex-shrink: 0; border-bottom: 1px solid var(--border, #e5e7eb); background: #fff; z-index: 3; position: sticky; top: 0; }
    .sdv-time-corner { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-right: 1px solid var(--border, #e5e7eb); flex-shrink: 0; }
    .sdv-date-label { font-size: 11px; font-weight: 600; color: var(--muted, #6b7280); text-transform: uppercase; }
    .sdv-date-num { font-size: 18px; font-weight: 800; color: var(--text, #111); }
    .sdv-date-num.today { background: var(--black, #0b0b0b); color: #fff; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
    .sdv-staff-header { overflow: hidden; flex: 1; }
    .sdv-staff-header-inner { display: flex; }
    .sdv-sh-cell {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px;
      border-right: 1px solid var(--border, #e5e7eb); flex-shrink: 0;
      background: #fafbfc; position: relative;
    }
    .sdv-sh-cell:last-child { border-right: none; }
    .sh-badge {
      width: 18px; height: 18px; border-radius: 4px; background: var(--soft, #e5e7eb);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: var(--muted, #6b7280); flex-shrink: 0;
    }
    .sh-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    .sh-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .sh-name { font-size: 12px; font-weight: 700; color: var(--text, #111); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sh-role { font-size: 10px; color: var(--muted, #6b7280); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sh-count { font-size: 10px; font-weight: 700; color: var(--muted, #6b7280); background: var(--soft, #f7f7f7); padding: 2px 7px; border-radius: 999px; flex-shrink: 0; }
    .sdv-sh-add { justify-content: center; gap: 4px; background: transparent; border-right: none; }
    .sh-add-btn {
      width: 28px; height: 28px; border-radius: 50%; border: 2px dashed var(--border, #d1d5db);
      background: transparent; color: var(--muted, #6b7280); font-size: 16px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .sh-add-btn:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
    .sh-add-label { font-size: 10px; color: var(--muted, #9ca3af); }

    /* Body */
    .sdv-body { flex: 1; display: flex; overflow: hidden; position: relative; }
    .sdv-time-col { flex-shrink: 0; border-right: 1px solid var(--border, #e5e7eb); background: #fff; overflow: hidden; position: relative; z-index: 1; }
    .sdv-time-col-inner { }
    .sdv-time-row { display: flex; align-items: flex-start; justify-content: center; padding-top: 2px; }
    .sdv-time-label { font-size: 11px; font-weight: 500; color: var(--muted, #6b7280); }

    /* Grid */
    .sdv-grid-wrapper { flex: 1; overflow: auto; position: relative; }
    .sdv-grid { position: relative; }
    .sdv-staff-col { position: absolute; top: 0; border-right: 1px solid var(--border, #e5e7eb); }
    .sdv-staff-col:last-child { border-right: none; }
    .sdv-col-add { border-right: none; }
    .sdv-add-slot { cursor: pointer; }
    .sdv-add-slot:hover { background: rgba(99,102,241,0.04); }
    .sdv-hour-slot { position: relative; cursor: pointer; }
    .sdv-hour-slot:hover { background: rgba(0,0,0,0.015); }
    .sdv-alt { background: rgba(0,0,0,0.008); }
    .sdv-valid { background: rgba(99,102,241,0.05); }
    .sdv-hour-line { position: absolute; top: 0; left: 0; right: 0; border-top: 1px solid var(--border, #e5e7eb); }
    .sdv-half-line { position: absolute; top: 30px; left: 0; right: 0; border-top: 1px dashed var(--border, #e5e7eb); opacity: 0.4; }

    /* Appointments layer */
    .sdv-appts-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }
    .sdv-appts-layer app-appointment-card { pointer-events: auto; }

    /* Current time line */
    .sdv-now-line { position: absolute; left: 0; right: 0; z-index: 2; pointer-events: none; }
    .sdv-now-dot { position: absolute; left: -5px; top: -5px; width: 10px; height: 10px; background: #e53935; border-radius: 50%; box-shadow: 0 0 0 2px rgba(255,255,255,0.8); z-index: 1; }
    .sdv-now-bar { position: absolute; top: 0; left: 0; right: 0; border-top: 2px solid #e53935; }

    /* Drag ghost */
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

    @media (max-width: 1024px) {
      .sdv-sh-cell { padding: 6px 8px; gap: 6px; }
      .sh-avatar { width: 24px; height: 24px; font-size: 9px; }
      .sh-name { font-size: 11px; }
      .sh-role { display: none; }
      .sdv-time-corner { padding: 6px 8px; }
    }
    @media (max-width: 768px) {
      .sdv-header-row { display: none; }
      .sdv-time-col { display: none; }
      .sdv-grid-wrapper { overflow-y: auto; }
      .sdv-staff-col { position: relative; left: auto !important; width: 100% !important; border-right: none; border-bottom: 2px solid var(--border, #e5e7eb); }
      .sdv-grid { height: auto !important; }
      .sdv-now-line { display: none; }
    }
  `]
})
export class CalendarDayViewComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() currentDate: Date = new Date();
  @Input() appointments: CalendarBooking[] = [];
  @Input() staffColorMap: Record<string, string> = {};
  @Input() set staffList(val: SidebarStaff[] | null) {
    this._staffList = (val || []).filter(s => s.active);
  }
  @Output() appointmentClick = new EventEmitter<string>();
  @Output() slotClick = new EventEmitter<{ date: Date; hour: number; staffId: string }>();
  @Output() addStaff = new EventEmitter<void>();

  @ViewChild('sdvBodyRef') bodyRef?: ElementRef<HTMLElement>;
  @ViewChild('sdvGridWrapperRef') gridWrapperRef?: ElementRef<HTMLElement>;
  @ViewChild('sdvTimeColRef') timeColRef?: ElementRef<HTMLElement>;
  @ViewChild('staffHeaderRef') staffHeaderRef?: ElementRef<HTMLElement>;

  protected dragEngine = inject(DragEngineService);
  protected visual = inject(DragVisualService);
  private ngZone = inject(NgZone);

  readonly BUSINESS_HOURS_START = BUSINESS_HOURS_START;
  readonly BUSINESS_HOURS_END = BUSINESS_HOURS_END;
  readonly HOUR_HEIGHT_PX = HOUR_HEIGHT_PX;
  readonly STAFF_COL_WIDTH = STAFF_COL_WIDTH;
  readonly TIME_COL_WIDTH = TIME_COL_WIDTH;
  hours = getHoursArray(0, 24);

  _staffList: SidebarStaff[] = [];
  private scrollSubs: Subscription[] = [];

  private unregisterAdapter?: () => void;

  get totalGridHeight(): number {
    return this.hours.length * HOUR_HEIGHT_PX;
  }

  get gridInnerWidth(): number {
    return (this._staffList.length + 1) * STAFF_COL_WIDTH;
  }

  get headerInnerWidth(): number {
    return (this._staffList.length + 1) * STAFF_COL_WIDTH;
  }

  get currentTimeTop(): number {
    const now = new Date();
    return (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT_PX;
  }

  ngOnInit(): void {
    this.dragEngine.registerAdapter(this.createAdapter());
  }

  ngAfterViewInit(): void {
    this.setupScrollSync();
  }

  ngOnDestroy(): void {
    this.dragEngine.unregisterAdapter();
    this.scrollSubs.forEach(s => s.unsubscribe());
    this.scrollSubs = [];
  }

  private setupScrollSync(): void {
    const grid = this.gridWrapperRef?.nativeElement;
    const timeCol = this.timeColRef?.nativeElement;
    const header = this.staffHeaderRef?.nativeElement;

    if (!grid || !timeCol || !header) return;

    this.ngZone.runOutsideAngular(() => {
      const gridScroll$ = fromEvent(grid, 'scroll');
      this.scrollSubs.push(
        gridScroll$.subscribe(() => {
          timeCol.scrollTop = grid.scrollTop;
          header.scrollLeft = grid.scrollLeft;
        })
      );
    });
  }

  getColumnAppointments(staffId: string): (AppointmentCardData & { top: number; height: number })[] {
    const staffAppts = this.appointments.filter(b => b.staffId === staffId || b.staff?.id === staffId);
    return staffAppts.map(b => buildAppointmentCardData(b, this.staffColorMap));
  }

  trackById(_index: number, item: AppointmentCardData): string { return item.id; }

  isTodayFn(d: Date): boolean { return isToday(d); }

  formatHourFn(hour: number): string { return formatHour(hour); }

  onAppointmentClick(id: string): void {
    if (this.dragEngine.stateService.isActive) return;
    this.appointmentClick.emit(id);
  }

  onSlotClick(staffId: string, hour: number): void {
    if (this.dragEngine.stateService.isActive) return;
    this.slotClick.emit({ date: this.currentDate, hour, staffId });
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

  isValidDropTarget(): boolean {
    return this.dragEngine.stateService.isActive;
  }

  private createAdapter(): ViewCoordinateAdapter {
    return {
      getContainer: () => this.gridWrapperRef?.nativeElement || document.createElement('div'),
      yToTime: (clientY: number, containerEl: HTMLElement) => {
        const rect = containerEl.getBoundingClientRect();
        const relativeY = clientY - rect.top + containerEl.scrollTop;
        const minutes = Math.max(0, (relativeY / HOUR_HEIGHT_PX) * 60);
        const hour = Math.floor(minutes / 60);
        const date = new Date(this.currentDate);
        date.setHours(hour, minutes % 60, 0, 0);
        return { date, minutes, hour };
      },
      xToStaffId: (clientX: number) => {
        const containerEl = this.gridWrapperRef?.nativeElement;
        if (!containerEl) return '';
        const rect = containerEl.getBoundingClientRect();
        const relativeX = clientX - rect.left + containerEl.scrollLeft;
        const colIndex = Math.floor(relativeX / STAFF_COL_WIDTH);
        const staff = this._staffList[colIndex];
        return staff?.id ?? '';
      },
      getAppointmentElement: (id: string) => {
        const el = this.bodyRef?.nativeElement?.querySelector(`[data-appointment-id="${id}"]`);
        return el as HTMLElement | null;
      },
      getStaffColor: (staffId: string) => this.staffColorMap[staffId] || '#6366f1',
      onAppointmentUpdated: (_id, _newStart, _newEnd, _newStaffId) => {},
    };
  }
}
