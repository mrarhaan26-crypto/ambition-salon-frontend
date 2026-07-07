import { CommonModule } from '@angular/common';
import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  ChangeDetectorRef, inject, AfterViewInit, OnDestroy, ViewChild, ElementRef,
  NgZone, HostListener,
} from '@angular/core';
import { Subscription, fromEvent, interval } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { STAFF_TIMELINE_HOUR_HEIGHT_PX, STAFF_TIMELINE_HEADER_WIDTH_PX, WORKING_HOURS_COLORS, WORKING_HOURS_LABELS } from './calendar-staff-timeline.constants';
import type {
  StaffTimelineStaff, StaffTimelineAppointment, StaffTimelineViewData,
  StaffGroup, StaffTimelineFilterState, WorkingHourSlot,
} from './calendar-staff-timeline.models';
import { getTimelineHours, formatTimelineHour, formatTimelineTime, getCurrentTimeLineTop, isToday } from './calendar-staff-timeline-engine';
import { getWorkingHourTypeForTime } from './calendar-staff-timeline-engine';
import { StaffHeaderCardComponent } from './calendar-staff-header-card.component';
import { StaffTimelineFiltersComponent } from './calendar-staff-filters.component';
import { StaffTimelineGroupsComponent } from './calendar-staff-groups.component';
import { StaffTimelineService } from './calendar-staff-timeline.service';
import { STATUS_LABELS, STATUS_COLORS } from '../calendar.constants';

export interface ContextMenuEvent {
  appointmentId: string;
  x: number;
  y: number;
  appointment: StaffTimelineAppointment;
}

export interface TooltipData {
  appointmentId: string;
  clientName: string;
  phone: string;
  serviceName: string;
  staffName: string;
  durationMin: number;
  status: string;
  total: number;
  notes: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface DragSlotSelection {
  staffId: string;
  startHour: number;
  endHour: number;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-staff-timeline',
  standalone: true,
  imports: [
    CommonModule, StaffHeaderCardComponent,
    StaffTimelineFiltersComponent, StaffTimelineGroupsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="staff-timeline" role="region" aria-label="Staff Timeline">
      <div class="st-loading" *ngIf="loading">
        <div class="st-spinner"></div>
        <span>Loading timeline...</span>
      </div>

      <div class="st-empty" *ngIf="!loading && viewData.staffList.length === 0">
        <strong>No staff available</strong>
        <p>Add staff members to view the timeline.</p>
      </div>

      <ng-container *ngIf="!loading && viewData.staffList.length > 0">
        <app-staff-timeline-filters
          [staffList]="viewData.staffList"
          (filterChange)="onFilterChange($event)"
        ></app-staff-timeline-filters>

        <app-staff-timeline-groups
          [groups]="viewData.groups"
          [staffList]="viewData.staffList"
          (groupsChange)="onGroupsChange($event)"
        ></app-staff-timeline-groups>

        <div class="st-wrapper" #wrapperRef>
          <div class="st-header-panel" #headerPanelRef>
            <div class="st-header-corner" [style.width.px]="STAFF_TIMELINE_HEADER_WIDTH_PX">
              <span class="st-header-title">Staff</span>
              <span class="st-header-count">{{ visibleStaff.length }} staff</span>
            </div>
            <div class="st-time-header" #timeHeaderRef>
              <div
                class="st-hour-header"
                *ngFor="let hour of viewData.hours"
                [style.min-width.px]="60"
              >
                <span class="st-hour-label">{{ formatTimelineHour(hour) }}</span>
              </div>
            </div>
          </div>

          <div class="st-body" #bodyRef>
            <div class="st-staff-panel" #staffPanelRef>
              <div
                class="st-staff-row"
                *ngFor="let staff of visibleStaff; let i = index; trackBy: trackByStaffId"
                [class.st-staff-row-hidden]="isStaffHidden(staff.id, groups)"
                [attr.data-staff-id]="staff.id"
              >
                <app-staff-header-card
                  [staff]="staff"
                  class="st-header-card"
                ></app-staff-header-card>
              </div>
            </div>

            <div class="st-timeline-panel" #timelinePanelRef
              (pointerdown)="onTimelinePointerDown($event)"
              (pointermove)="onTimelinePointerMove($event)"
              (pointerup)="onTimelinePointerUp($event)"
              (pointerleave)="onTimelinePointerUp($event)"
            >
              <div
                class="st-timeline-row"
                *ngFor="let staff of visibleStaff; let i = index; trackBy: trackByStaffId"
                [class.st-timeline-row-hidden]="isStaffHidden(staff.id, groups)"
                [style.height.px]="timelineRowHeight"
                [attr.data-staff-id]="staff.id"
              >
                <div
                  class="st-hour-block"
                  *ngFor="let hour of viewData.hours; let h = index; trackBy: trackByHour"
                  [style.min-width.px]="60"
                  [class.st-hour-business]="isBusinessHour(hour)"
                  [class.st-hour-outside]="!isBusinessHour(hour)"
                  [class.st-hour-break]="isBreakHour(staff, hour)"
                  [class.st-hour-drag-selected]="isDragSelected(staff.id, hour)"
                  [class.st-hour-drag-hover]="isDragHover(staff.id, hour)"
                  [title]="getBreakTooltip(staff, hour)"
                  (click)="onSlotClick(staff.id, hour, $event)"
                  (pointerdown)="onSlotPointerDown(staff.id, hour, $event, staff)"
                  role="button"
                  tabindex="-1"
                  [attr.aria-label]="'Time slot ' + formatTimelineHour(hour) + ' for ' + staff.fullName"
                >
                  <div class="st-break-stripe" *ngIf="isBreakHour(staff, hour)"></div>
                </div>

                <div
                  class="st-appointment"
                  *ngFor="let appt of getStaffAppointments(staff.id); trackBy: trackByApptId"
                  [style.top.px]="appt.top"
                  [style.height.px]="appt.height"
                  [style.left.px]="appt.left"
                  [style.background]="getApptBackground(appt)"
                  [style.border-left-color]="getApptBorderColor(appt)"
                  [class.st-appt-vip]="appt.isVIP"
                  [class.st-appt-overlap]="appt.hasOverlap"
                  role="button"
                  tabindex="0"
                  [attr.aria-label]="'Appointment: ' + appt.clientName + ' - ' + appt.serviceName"
                  (click)="onAppointmentClick(appt.id); $event.stopPropagation()"
                  (keydown.enter)="onAppointmentClick(appt.id)"
                  (keydown.space)="onAppointmentClick(appt.id); $event.preventDefault()"
                  (mouseenter)="showApptTooltip($event, appt)"
                  (mouseleave)="hideApptTooltip()"
                  (contextmenu)="onContextMenu($event, appt)"
                >
                  <div class="sta-header">
                    <strong>{{ appt.clientName }}</strong>
                    <span class="sta-amount" *ngIf="appt.amount">{{ appt.amount | currency }}</span>
                  </div>
                  <div class="sta-meta">
                    <span>{{ formatTimelineTime(appt.startTime) }} - {{ formatTimelineTime(appt.endTime) }}</span>
                    <span class="sta-service" *ngIf="appt.serviceName">{{ appt.serviceName }}</span>
                  </div>
                  <div class="sta-duration-bar" [style.width.%]="getDurationBarPct(appt)"></div>
                  <span class="sta-vip-badge" *ngIf="appt.isVIP" aria-label="VIP client">&#9733;</span>
                </div>

                <div
                  class="st-current-time-line"
                  *ngIf="isToday"
                  [style.top.px]="currentTimeTop"
                  role="presentation"
                  aria-hidden="true"
                >
                  <span class="st-current-time-label">Now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="st-tooltip" *ngIf="tooltip.visible"
        [style.left.px]="tooltip.x"
        [style.top.px]="tooltip.y"
        role="tooltip"
      >
        <div class="st-tooltip-header">{{ tooltip.clientName }}</div>
        <div class="st-tooltip-row" *ngIf="tooltip.phone"><span class="st-tt-label">Phone:</span> {{ tooltip.phone }}</div>
        <div class="st-tooltip-row"><span class="st-tt-label">Service:</span> {{ tooltip.serviceName }}</div>
        <div class="st-tooltip-row"><span class="st-tt-label">Staff:</span> {{ tooltip.staffName }}</div>
        <div class="st-tooltip-row"><span class="st-tt-label">Duration:</span> {{ tooltip.durationMin }} min</div>
        <div class="st-tooltip-row"><span class="st-tt-label">Status:</span> <span class="st-tt-status">{{ tooltip.status }}</span></div>
        <div class="st-tooltip-row" *ngIf="tooltip.total"><span class="st-tt-label">Total:</span> {{ tooltip.total | currency }}</div>
        <div class="st-tooltip-notes" *ngIf="tooltip.notes">{{ tooltip.notes }}</div>
      </div>

      <div class="st-context-menu" *ngIf="contextMenu.show"
        [style.left.px]="contextMenu.x"
        [style.top.px]="contextMenu.y"
        (click)="$event.stopPropagation()"
      >
        <button class="st-cm-item" (click)="onContextAction('open')"><span class="st-cm-icon">&#128196;</span> Open</button>
        <button class="st-cm-item" (click)="onContextAction('checkout')"><span class="st-cm-icon">&#128184;</span> Checkout</button>
        <button class="st-cm-item" (click)="onContextAction('duplicate')"><span class="st-cm-icon">&#128203;</span> Duplicate</button>
        <button class="st-cm-item" (click)="onContextAction('reschedule')"><span class="st-cm-icon">&#128259;</span> Reschedule</button>
        <button class="st-cm-item" (click)="onContextAction('cancel')"><span class="st-cm-icon">&#10060;</span> Cancel</button>
        <div class="st-cm-divider"></div>
        <button class="st-cm-item st-cm-danger" (click)="onContextAction('delete')"><span class="st-cm-icon">&#128465;</span> Delete</button>
      </div>

      <div class="st-context-backdrop" *ngIf="contextMenu.show" (click)="closeContextMenu()" (contextmenu)="$event.preventDefault(); closeContextMenu()"></div>

      <div class="st-drag-selection-bar" *ngIf="dragSelection.active"
        [style.left.px]="dragSelection.left"
        [style.top.px]="dragSelection.top"
        [style.width.px]="dragSelection.width"
        [style.height.px]="dragSelection.height"
      ></div>
    </div>
  `,
  styles: [`
    .staff-timeline {
      display: flex; flex-direction: column; flex: 1; min-height: 0;
      background: white; border: 1px solid #e5e7eb; border-radius: 16px;
      overflow: hidden; position: relative;
    }
    .st-loading, .st-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 60px 20px; gap: 12px;
      text-align: center; color: #6b7280; flex: 1;
    }
    .st-spinner {
      width: 24px; height: 24px; border: 3px solid #e5e7eb;
      border-top-color: #0b0b0b; border-radius: 50%;
      animation: st-spin .7s linear infinite;
    }
    @keyframes st-spin { to { transform: rotate(360deg); } }
    .st-empty strong { font-size: 16px; color: #374151; }
    .st-empty p { font-size: 13px; color: #9ca3af; margin: 0; }

    .st-wrapper { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
    .st-header-panel { display: flex; flex-shrink: 0; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
    .st-header-corner {
      flex-shrink: 0; display: flex; flex-direction: column;
      justify-content: center; padding: 8px 12px;
      border-right: 1px solid #e5e7eb;
    }
    .st-header-title { font-size: 13px; font-weight: 700; color: #374151; }
    .st-header-count { font-size: 10px; color: #9ca3af; font-weight: 600; }
    .st-time-header { display: flex; overflow: hidden; }
    .st-hour-header {
      flex-shrink: 0; display: flex; align-items: center;
      justify-content: center; padding: 8px 4px;
      border-right: 1px solid #e5e7eb;
    }
    .st-hour-header:last-child { border-right: 0; }
    .st-hour-label { font-size: 11px; font-weight: 600; color: #6b7280; white-space: nowrap; }

    .st-body { display: flex; flex: 1; min-height: 0; overflow: auto; }
    .st-staff-panel { flex-shrink: 0; overflow: hidden; }
    .st-timeline-panel { flex: 1; overflow-x: auto; overflow-y: hidden; position: relative; user-select: none; }

    .st-staff-row { border-bottom: 1px solid #f1f5f9; }
    .st-staff-row-hidden { display: none; }

    .st-timeline-row {
      display: flex; position: relative; border-bottom: 1px solid #f1f5f9;
      min-height: 120px;
    }
    .st-timeline-row-hidden { display: none; }

    .st-hour-block {
      flex-shrink: 0; border-right: 1px solid #f1f5f9;
      cursor: pointer; transition: background .1s; position: relative;
    }
    .st-hour-block:hover { background: #f0f4ff; }
    .st-hour-business { background: transparent; }
    .st-hour-outside { background: #fafafa; cursor: not-allowed; }
    .st-hour-break { cursor: not-allowed; }
    .st-hour-break .st-break-stripe {
      position: absolute; inset: 0;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 4px,
        rgba(0,0,0,0.04) 4px,
        rgba(0,0,0,0.04) 8px
      );
      pointer-events: none;
    }
    .st-hour-drag-selected { background: rgba(99,102,241,0.12) !important; }
    .st-hour-drag-hover { background: rgba(99,102,241,0.08) !important; }

    .st-appointment {
      position: absolute; border-radius: 6px; border-left: 3px solid;
      padding: 4px 8px; font-size: 10px; cursor: pointer;
      display: flex; flex-direction: column; gap: 1px; z-index: 1;
      overflow: hidden; transition: transform .1s, box-shadow .1s;
    }
    .st-appointment:hover {
      transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.08); z-index: 2;
    }
    .st-appointment:focus-visible {
      outline: 2px solid #6366f1; outline-offset: 2px; z-index: 3;
    }
    .st-appt-vip { box-shadow: inset 0 0 0 1px #f59e0b; }
    .sta-header { display: flex; justify-content: space-between; align-items: center; gap: 4px; }
    .sta-header strong { font-size: 10px; font-weight: 700; color: #0b0b0b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sta-amount { font-size: 9px; font-weight: 700; color: #059669; flex-shrink: 0; }
    .sta-meta { display: flex; gap: 4px; flex-wrap: wrap; }
    .sta-meta span { font-size: 8px; color: #6b7280; white-space: nowrap; }
    .sta-service { color: #6366f1; font-weight: 600; }
    .sta-duration-bar {
      position: absolute; bottom: 2px; left: 6px; height: 2px;
      border-radius: 1px; background: rgba(0,0,0,.08); pointer-events: none;
    }
    .sta-vip-badge {
      position: absolute; top: 2px; right: 4px; font-size: 10px;
      color: #f59e0b;
    }

    .st-current-time-line {
      position: absolute; left: 0; right: 0; height: 2px;
      background: #ef4444; z-index: 5; pointer-events: none;
    }
    .st-current-time-label {
      position: absolute; right: 4px; top: -8px; background: #ef4444;
      color: white; font-size: 9px; font-weight: 700;
      padding: 1px 6px; border-radius: 8px; line-height: 1.4;
    }

    .st-tooltip {
      position: fixed; z-index: 9999; background: #1f2937; color: #fff;
      border-radius: 8px; padding: 10px 14px; font-size: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      max-width: 240px; pointer-events: none;
      display: flex; flex-direction: column; gap: 3px;
    }
    .st-tooltip-header { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
    .st-tooltip-row { font-size: 11px; line-height: 1.4; }
    .st-tt-label { color: #9ca3af; margin-right: 4px; }
    .st-tt-status { font-weight: 600; }
    .st-tooltip-notes { margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: #d1d5db; }

    .st-context-menu {
      position: fixed; z-index: 10000; background: #fff;
      border: 1px solid #e5e7eb; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      padding: 4px; min-width: 160px;
    }
    .st-context-backdrop {
      position: fixed; inset: 0; z-index: 9999;
    }
    .st-cm-item {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 8px 12px; border: 0; background: transparent;
      font-size: 13px; cursor: pointer; border-radius: 6px;
      text-align: left; white-space: nowrap;
    }
    .st-cm-item:hover { background: #f3f4f6; }
    .st-cm-item.st-cm-danger { color: #dc2626; }
    .st-cm-item.st-cm-danger:hover { background: #fef2f2; }
    .st-cm-icon { font-size: 14px; width: 18px; text-align: center; }
    .st-cm-divider { height: 1px; background: #e5e7eb; margin: 4px 0; }

    .st-drag-selection-bar {
      position: absolute; z-index: 10; pointer-events: none;
      background: rgba(99,102,241,0.08);
      border: 1px dashed #6366f1;
      border-radius: 4px;
    }
  `],
})
export class StaffTimelineComponent implements AfterViewInit, OnDestroy {
  @Input() date = '';
  @Input() branchId = '';
  @Input() loading = false;
  @Output() appointmentClick = new EventEmitter<string>();
  @Output() slotClick = new EventEmitter<{ staffId: string; hour: number }>();
  @Output() slotRangeClick = new EventEmitter<DragSlotSelection>();
  @Output() contextAction = new EventEmitter<{ action: string; appointmentId: string }>();
  @Output() quickDuplicate = new EventEmitter<string>();

  @ViewChild('wrapperRef') wrapperRef?: ElementRef<HTMLElement>;
  @ViewChild('headerPanelRef') headerPanelRef?: ElementRef<HTMLElement>;
  @ViewChild('timeHeaderRef') timeHeaderRef?: ElementRef<HTMLElement>;
  @ViewChild('bodyRef') bodyRef?: ElementRef<HTMLElement>;
  @ViewChild('staffPanelRef') staffPanelRef?: ElementRef<HTMLElement>;
  @ViewChild('timelinePanelRef') timelinePanelRef?: ElementRef<HTMLElement>;

  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private subs: Subscription[] = [];

  STAFF_TIMELINE_HEADER_WIDTH_PX = STAFF_TIMELINE_HEADER_WIDTH_PX;

  viewData: StaffTimelineViewData = {
    staffList: [], appointments: [], groups: [],
    hours: [], currentTimePercent: 0, todayDate: '',
    totalStaff: 0, totalAppointments: 0, filteredStaff: 0,
  };

  visibleStaff: StaffTimelineStaff[] = [];
  groups: StaffGroup[] = [];
  currentTimeTop = 0;
  isToday = false;
  timelineRowHeight = 120;

  businessStart = 8;
  businessEnd = 20;

  tooltip: TooltipData = {
    appointmentId: '', clientName: '', phone: '', serviceName: '',
    staffName: '', durationMin: 0, status: '', total: 0, notes: '',
    x: 0, y: 0, visible: false,
  };
  private tooltipTimer: ReturnType<typeof setTimeout> | null = null;

  contextMenu: { show: boolean; x: number; y: number; appointmentId: string; appointment: StaffTimelineAppointment | null } = {
    show: false, x: 0, y: 0, appointmentId: '', appointment: null,
  };

  dragSelection: { active: boolean; staffId: string; startHour: number; endHour: number; left: number; top: number; width: number; height: number; isDragging: boolean; startHourRaw: number; staffElement: HTMLElement | null } = {
    active: false, staffId: '', startHour: 0, endHour: 0, left: 0, top: 0, width: 0, height: 0, isDragging: false, startHourRaw: 0, staffElement: null,
  };

  private filterState: StaffTimelineFilterState = {
    search: '', role: '', availability: '', department: '',
    branchId: '', favoritesOnly: false, hideInactive: false,
  };

  private scrollSub?: Subscription;
  private liveTimerSub?: Subscription;

  @Input() set data(value: StaffTimelineViewData) {
    this.viewData = value;
    this.visibleStaff = value.staffList;
    this.groups = value.groups;
    this.currentTimeTop = getCurrentTimeLineTop();
    this.isToday = isToday(new Date(value.todayDate));
    this.cdr.markForCheck();
  }

  ngAfterViewInit(): void {
    this.setupScrollSync();
    this.startLiveTimer();
    this.autoScrollToCurrentTime();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.scrollSub?.unsubscribe();
    this.liveTimerSub?.unsubscribe();
    if (this.tooltipTimer !== null) clearTimeout(this.tooltipTimer);
  }

  private setupScrollSync(): void {
    this.ngZone.runOutsideAngular(() => {
      const body = this.bodyRef?.nativeElement;
      const timeHeader = this.timeHeaderRef?.nativeElement;
      const staffPanel = this.staffPanelRef?.nativeElement;
      const timelinePanel = this.timelinePanelRef?.nativeElement;

      if (body && timeHeader) {
        this.subs.push(
          fromEvent(body, 'scroll').pipe(debounceTime(4)).subscribe(() => {
            if (timeHeader) timeHeader.scrollLeft = body.scrollLeft;
          })
        );
      }

      if (timelinePanel && staffPanel) {
        this.subs.push(
          fromEvent(timelinePanel, 'scroll').pipe(debounceTime(4)).subscribe(() => {
            if (staffPanel) staffPanel.scrollTop = timelinePanel.scrollTop;
          })
        );
        this.subs.push(
          fromEvent(staffPanel, 'scroll').pipe(debounceTime(4)).subscribe(() => {
            if (timelinePanel) timelinePanel.scrollTop = staffPanel.scrollTop;
          })
        );
      }
    });
  }

  private startLiveTimer(): void {
    this.ngZone.runOutsideAngular(() => {
      this.liveTimerSub = interval(60000).subscribe(() => {
        this.ngZone.run(() => {
          this.currentTimeTop = getCurrentTimeLineTop();
          this.isToday = isToday(new Date(this.viewData.todayDate));
          this.cdr.markForCheck();
        });
      });
    });
  }

  private autoScrollToCurrentTime(): void {
    if (!this.isToday) return;
    setTimeout(() => {
      const timelinePanel = this.timelinePanelRef?.nativeElement;
      if (timelinePanel) {
        const scrollTarget = Math.max(0, this.currentTimeTop - timelinePanel.clientHeight / 2);
        timelinePanel.scrollTop = scrollTarget;
      }
    }, 200);
  }

  onFilterChange(filter: StaffTimelineFilterState): void {
    this.filterState = filter;
    this.applyFilters();
  }

  onGroupsChange(updatedGroups: StaffGroup[]): void {
    this.groups = updatedGroups;
    this.cdr.markForCheck();
  }

  private applyFilters(): void {
    let filtered = [...this.viewData.staffList];
    const f = this.filterState;

    if (f.search) {
      const q = f.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.specialization && s.specialization.toLowerCase().includes(q))
      );
    }
    if (f.role) filtered = filtered.filter(s => s.role === f.role);
    if (f.availability) filtered = filtered.filter(s => s.status === f.availability);
    if (f.branchId) filtered = filtered.filter(s => s.branchId === f.branchId);
    if (f.favoritesOnly) filtered = filtered.filter(s => s.isFavorite);
    if (f.hideInactive) filtered = filtered.filter(s => s.isActive);

    this.visibleStaff = filtered;
    this.cdr.markForCheck();
  }

  isStaffHidden(staffId: string, groups: StaffGroup[]): boolean {
    for (const g of groups) {
      if (g.collapsed && g.staffIds.includes(staffId)) return true;
    }
    return false;
  }

  isBusinessHour(hour: number): boolean {
    return hour >= this.businessStart && hour < this.businessEnd;
  }

  isBreakHour(staff: StaffTimelineStaff, hour: number): boolean {
    const date = new Date(this.date + 'T' + hour.toString().padStart(2, '0') + ':00:00');
    const type = getWorkingHourTypeForTime(staff.workingHours, date);
    return type === 'BREAK' || type === 'LUNCH';
  }

  getBreakTooltip(staff: StaffTimelineStaff, hour: number): string {
    const date = new Date(this.date + 'T' + hour.toString().padStart(2, '0') + ':00:00');
    const type = getWorkingHourTypeForTime(staff.workingHours, date);
    if (type === 'BREAK' || type === 'LUNCH') {
      return WORKING_HOURS_LABELS[type] || type;
    }
    return '';
  }

  getStaffAppointments(staffId: string): StaffTimelineAppointment[] {
    return this.viewData.appointments.filter(a => a.staffId === staffId);
  }

  getDurationBarPct(appt: StaffTimelineAppointment): number {
    return Math.min(100, (appt.durationMin / 480) * 100);
  }

  getApptBackground(appt: StaffTimelineAppointment): string {
    return appt.color + '20';
  }

  getApptBorderColor(appt: StaffTimelineAppointment): string {
    return appt.color;
  }

  onSlotClick(staffId: string, hour: number, event: MouseEvent): void {
    const staff = this.visibleStaff.find(s => s.id === staffId);
    if (!staff) return;
    const date = new Date(this.date + 'T' + hour.toString().padStart(2, '0') + ':00:00');
    if (this.isBreakHour(staff, hour)) return;
    this.slotClick.emit({ staffId, hour });
  }

  onAppointmentClick(apptId: string): void {
    this.appointmentClick.emit(apptId);
  }

  showApptTooltip(event: MouseEvent, appt: StaffTimelineAppointment): void {
    if (this.tooltipTimer !== null) clearTimeout(this.tooltipTimer);
    this.tooltipTimer = setTimeout(() => {
      const booking = this.viewData.appointments.find(a => a.id === appt.id);
      if (!booking) return;
      this.tooltip = {
        appointmentId: appt.id,
        clientName: appt.clientName,
        phone: '',
        serviceName: appt.serviceName,
        staffName: '',
        durationMin: appt.durationMin,
        status: STATUS_LABELS[appt.status] || appt.status,
        total: appt.amount,
        notes: appt.hasNotes ? 'Has notes' : '',
        x: Math.min(event.clientX + 12, window.innerWidth - 260),
        y: Math.min(event.clientY - 10, window.innerHeight - 200),
        visible: true,
      };
      this.cdr.markForCheck();
    }, 300);
  }

  hideApptTooltip(): void {
    if (this.tooltipTimer !== null) clearTimeout(this.tooltipTimer);
    this.tooltip.visible = false;
    this.cdr.markForCheck();
  }

  onContextMenu(event: MouseEvent, appt: StaffTimelineAppointment): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu = {
      show: true,
      x: Math.min(event.clientX, window.innerWidth - 180),
      y: Math.min(event.clientY, window.innerHeight - 280),
      appointmentId: appt.id,
      appointment: appt,
    };
    this.cdr.markForCheck();
  }

  closeContextMenu(): void {
    this.contextMenu.show = false;
    this.cdr.markForCheck();
  }

  onContextAction(action: string): void {
    const apptId = this.contextMenu.appointmentId;
    this.closeContextMenu();
    if (action === 'duplicate') {
      this.quickDuplicate.emit(apptId);
      return;
    }
    this.contextAction.emit({ action, appointmentId: apptId });
  }

  onSlotPointerDown(staffId: string, hour: number, event: PointerEvent, staff: StaffTimelineStaff): void {
    if (event.button !== 0) return;
    if (this.isBreakHour(staff, hour)) return;
    if (!this.isBusinessHour(hour)) return;

    const timelineRow = (event.currentTarget as HTMLElement)?.closest('.st-timeline-row') as HTMLElement;
    const timelinePanel = this.timelinePanelRef?.nativeElement;
    if (!timelinePanel || !timelineRow) return;

    const rowRect = timelineRow.getBoundingClientRect();
    const panelRect = timelinePanel.getBoundingClientRect();
    const hourBlockWidth = 60;

    this.dragSelection = {
      active: true,
      staffId,
      startHour: hour,
      endHour: hour,
      left: (event.clientX - panelRect.left) - ((event.clientX - panelRect.left) % hourBlockWidth),
      top: rowRect.top - panelRect.top + timelinePanel.scrollTop,
      width: hourBlockWidth,
      height: rowRect.height,
      isDragging: true,
      startHourRaw: hour,
      staffElement: timelineRow,
    };
    event.preventDefault();
  }

  onTimelinePointerDown(event: PointerEvent): void {
    if (!this.dragSelection.isDragging) return;
  }

  onTimelinePointerMove(event: PointerEvent): void {
    if (!this.dragSelection.isDragging) return;
    const timelinePanel = this.timelinePanelRef?.nativeElement;
    if (!timelinePanel) return;

    const panelRect = timelinePanel.getBoundingClientRect();
    const hourBlockWidth = 60;
    const relativeX = event.clientX - panelRect.left + timelinePanel.scrollLeft;
    const hoveredHour = Math.floor(relativeX / hourBlockWidth) + this.businessStart;

    if (hoveredHour !== this.dragSelection.endHour) {
      const clampedHour = Math.max(this.businessStart, Math.min(hoveredHour, this.businessEnd - 1));
      this.dragSelection.endHour = clampedHour;
      const startX = (Math.min(this.dragSelection.startHourRaw, clampedHour) - this.businessStart) * hourBlockWidth;
      const endX = (Math.max(this.dragSelection.startHourRaw, clampedHour) - this.businessStart + 1) * hourBlockWidth;
      this.dragSelection.left = startX;
      this.dragSelection.width = endX - startX;
      this.cdr.markForCheck();
    }
  }

  onTimelinePointerUp(event: PointerEvent): void {
    if (!this.dragSelection.isDragging) return;
    this.dragSelection.isDragging = false;

    const startH = Math.min(this.dragSelection.startHourRaw, this.dragSelection.endHour);
    const endH = Math.max(this.dragSelection.startHourRaw, this.dragSelection.endHour);

    if (endH - startH >= 0) {
      const startDate = new Date(this.date + 'T' + startH.toString().padStart(2, '0') + ':00:00');
      const endDate = new Date(this.date + 'T' + (endH + 1).toString().padStart(2, '0') + ':00:00');
      this.slotRangeClick.emit({
        staffId: this.dragSelection.staffId,
        startHour: startH,
        endHour: endH + 1,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      });
    }

    this.dragSelection.active = false;
    this.cdr.markForCheck();
  }

  isDragSelected(staffId: string, hour: number): boolean {
    if (!this.dragSelection.active || this.dragSelection.staffId !== staffId) return false;
    const start = Math.min(this.dragSelection.startHourRaw, this.dragSelection.endHour);
    const end = Math.max(this.dragSelection.startHourRaw, this.dragSelection.endHour);
    return hour >= start && hour <= end;
  }

  isDragHover(staffId: string, hour: number): boolean {
    return this.isDragSelected(staffId, hour);
  }

  @HostListener('window:click')
  onWindowClick(): void {
    this.closeContextMenu();
  }

  trackByStaffId(_index: number, staff: StaffTimelineStaff): string {
    return staff.id;
  }

  trackByHour(_index: number, hour: number): number {
    return hour;
  }

  trackByApptId(_index: number, appt: StaffTimelineAppointment): string {
    return appt.id;
  }

  formatTimelineHour = formatTimelineHour;
  formatTimelineTime = formatTimelineTime;
}
