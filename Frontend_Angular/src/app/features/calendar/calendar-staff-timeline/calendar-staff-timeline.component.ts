import { CommonModule } from '@angular/common';
import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  ChangeDetectorRef, inject, AfterViewInit, OnDestroy, ViewChild, ElementRef,
  NgZone,
} from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { STAFF_TIMELINE_HOUR_HEIGHT_PX, STAFF_TIMELINE_HEADER_WIDTH_PX } from './calendar-staff-timeline.constants';
import type {
  StaffTimelineStaff, StaffTimelineAppointment, StaffTimelineViewData,
  StaffGroup, StaffTimelineFilterState,
} from './calendar-staff-timeline.models';
import { getTimelineHours, formatTimelineHour, formatTimelineTime, getCurrentTimeLineTop, isToday, computeStatus } from './calendar-staff-timeline-engine';
import { StaffHeaderCardComponent } from './calendar-staff-header-card.component';
import { StaffTimelineFiltersComponent } from './calendar-staff-filters.component';
import { StaffTimelineGroupsComponent } from './calendar-staff-groups.component';
import { StaffTimelineService } from './calendar-staff-timeline.service';

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

            <div class="st-timeline-panel" #timelinePanelRef>
              <div
                class="st-timeline-row"
                *ngFor="let staff of visibleStaff; let i = index; trackBy: trackByStaffId"
                [class.st-timeline-row-hidden]="isStaffHidden(staff.id, groups)"
                [style.height.px]="timelineRowHeight"
              >
                <div
                  class="st-hour-block"
                  *ngFor="let hour of viewData.hours; let h = index; trackBy: trackByHour"
                  [style.min-width.px]="60"
                  [class.st-hour-business]="isBusinessHour(hour)"
                  [class.st-hour-outside]="!isBusinessHour(hour)"
                  (click)="onSlotClick(staff.id, hour)"
                  role="button"
                  tabindex="-1"
                  [attr.aria-label]="'Time slot ' + formatTimelineHour(hour) + ' for ' + staff.fullName"
                ></div>

                <div
                  class="st-appointment"
                  *ngFor="let appt of getStaffAppointments(staff.id); trackBy: trackByApptId"
                  [style.top.px]="appt.top"
                  [style.height.px]="appt.height"
                  [style.left.px]="appt.left"
                  [style.background]="appt.color + '20'"
                  [style.border-left-color]="appt.color"
                  [class.st-appt-vip]="appt.isVIP"
                  [class.st-appt-overlap]="appt.hasOverlap"
                  role="button"
                  tabindex="0"
                  [attr.aria-label]="'Appointment: ' + appt.clientName + ' - ' + appt.serviceName"
                  (click)="onAppointmentClick(appt.id); $event.stopPropagation()"
                  (keydown.enter)="onAppointmentClick(appt.id)"
                  (keydown.space)="onAppointmentClick(appt.id); $event.preventDefault()"
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
    </div>
  `,
  styles: [`
    .staff-timeline {
      display: flex; flex-direction: column; flex: 1; min-height: 0;
      background: white; border: 1px solid #e5e7eb; border-radius: 16px;
      overflow: hidden;
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
    .st-timeline-panel { flex: 1; overflow-x: auto; overflow-y: hidden; position: relative; }

    .st-staff-row { border-bottom: 1px solid #f1f5f9; }
    .st-staff-row-hidden { display: none; }

    .st-timeline-row {
      display: flex; position: relative; border-bottom: 1px solid #f1f5f9;
      min-height: 120px;
    }
    .st-timeline-row-hidden { display: none; }

    .st-hour-block {
      flex-shrink: 0; border-right: 1px solid #f1f5f9;
      cursor: pointer; transition: background .1s;
    }
    .st-hour-block:hover { background: #f0f4ff; }
    .st-hour-business { background: transparent; }
    .st-hour-outside { background: #fafafa; }

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
  `],
})
export class StaffTimelineComponent implements AfterViewInit, OnDestroy {
  @Input() date = '';
  @Input() branchId = '';
  @Input() loading = false;
  @Output() appointmentClick = new EventEmitter<string>();
  @Output() slotClick = new EventEmitter<{ staffId: string; hour: number }>();

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

  private filterState: StaffTimelineFilterState = {
    search: '', role: '', availability: '', department: '',
    branchId: '', favoritesOnly: false, hideInactive: false,
  };

  private scrollSub?: Subscription;

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
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.scrollSub?.unsubscribe();
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
    return hour >= 8 && hour < 20;
  }

  getStaffAppointments(staffId: string): StaffTimelineAppointment[] {
    return this.viewData.appointments.filter(a => a.staffId === staffId);
  }

  getDurationBarPct(appt: StaffTimelineAppointment): number {
    return Math.min(100, (appt.durationMin / 480) * 100);
  }

  onSlotClick(staffId: string, hour: number): void {
    this.slotClick.emit({ staffId, hour });
  }

  onAppointmentClick(apptId: string): void {
    this.appointmentClick.emit(apptId);
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
