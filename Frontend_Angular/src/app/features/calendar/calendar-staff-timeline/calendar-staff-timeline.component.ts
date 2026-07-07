import { CommonModule } from '@angular/common';
import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  ChangeDetectorRef, inject, AfterViewInit, OnDestroy, ViewChild, ElementRef,
  NgZone, HostListener,
} from '@angular/core';
import { Subscription, fromEvent, interval } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { STAFF_TIMELINE_HOUR_HEIGHT_PX, STAFF_TIMELINE_HEADER_WIDTH_PX, WORKING_HOURS_COLORS, WORKING_HOURS_LABELS, ZOOM_LEVELS, DEFAULT_ZOOM_LEVEL, ZOOM_STORAGE_KEY } from './calendar-staff-timeline.constants';
import type { ZoomLevel } from './calendar-staff-timeline.constants';
import type {
  StaffTimelineStaff, StaffTimelineAppointment, StaffTimelineViewData,
  StaffGroup, StaffTimelineFilterState, WorkingHourSlot,
} from './calendar-staff-timeline.models';
import { getTimelineHours, formatTimelineHour, formatTimelineTime, getCurrentTimeLineTop, isToday, getMinutesFromMidnight } from './calendar-staff-timeline-engine';
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
        <div class="st-zoom-bar">
          <div class="st-zoom-controls">
            <span class="st-zoom-label">Zoom</span>
            <span class="st-zoom-minus" (click)="zoomOut()" [class.st-zoom-disabled]="zoomLevelIndex === 0">&minus;</span>
            <div class="st-zoom-slider">
              <input type="range" [min]="0" [max]="ZOOM_LEVELS.length - 1" [value]="zoomLevelIndex" (input)="setZoomByIndex($event)" aria-label="Timeline zoom level">
            </div>
            <span class="st-zoom-plus" (click)="zoomIn()" [class.st-zoom-disabled]="zoomLevelIndex === ZOOM_LEVELS.length - 1">+</span>
            <span class="st-zoom-value">{{ zoomLevel }}px</span>
          </div>
          <div class="st-today-badge" *ngIf="isToday" (click)="scrollToCurrentTime()">
            <span class="st-today-dot"></span> Today
          </div>
        </div>

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
                [style.min-width.px]="hourBlockWidth"
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
              <div class="st-current-time-line-global" *ngIf="isToday"
                [style.top.px]="currentTimeTop"
                role="presentation" aria-hidden="true"
              >
                <div class="st-ctl-dot"></div>
                <div class="st-ctl-line"></div>
                <span class="st-ctl-label">Now</span>
              </div>

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
                  [style.min-width.px]="hourBlockWidth"
                  [class.st-hour-business]="isBusinessHour(hour)"
                  [class.st-hour-outside]="!isBusinessHour(hour)"
                  [class.st-hour-break]="isBreakHour(staff, hour)"
                  [class.st-hour-drag-selected]="isDragSelected(staff.id, hour)"
                  [class.st-hour-drag-hover]="isDragHover(staff.id, hour)"
                  [style.background]="getHeatmapColor(staff, hour)"
                  [title]="getBreakTooltip(staff, hour)"
                  (click)="onSlotClick(staff.id, hour, $event)"
                  (pointerdown)="onSlotPointerDown(staff.id, hour, $event, staff)"
                  role="button"
                  tabindex="-1"
                  [attr.aria-label]="'Time slot ' + formatTimelineHour(hour) + ' for ' + staff.fullName"
                >
                  <div class="st-break-stripe" *ngIf="isBreakHour(staff, hour)"></div>
                  <div class="st-snap-dot" *ngFor="let m of snapMinutesList" [style.top.%]="(m / 60) * 100"></div>
                </div>

                <div
                  class="st-appointment st-appt-enter"
                  *ngFor="let appt of getStaffAppointments(staff.id); trackBy: trackByApptId"
                  [style.top.px]="recomputeTop(appt)"
                  [style.height.px]="recomputeHeight(appt)"
                  [style.left.px]="appt.left"
                  [style.background]="getApptGradient(appt)"
                  [style.border-left-color]="getApptBorderColor(appt)"
                  [style.box-shadow]="getApptShadow(appt)"
                  [class.st-appt-vip]="appt.isVIP"
                  [class.st-appt-overlap]="appt.hasOverlap"
                  [class.st-appt-dragging]="isDraggingAppt(appt.id)"
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
                  <div class="sta-shimmer"></div>
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
      overflow: hidden; position: relative; contain: layout;
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

    .st-zoom-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 16px; border-bottom: 1px solid #e5e7eb;
      background: #fafbfc; flex-shrink: 0;
    }
    .st-zoom-controls { display: flex; align-items: center; gap: 8px; }
    .st-zoom-label { font-size: 11px; font-weight: 600; color: #6b7280; min-width: 32px; }
    .st-zoom-minus, .st-zoom-plus {
      width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
      border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer;
      font-size: 16px; font-weight: 700; color: #374151; user-select: none;
      transition: background .12s, border-color .12s; line-height: 1;
    }
    .st-zoom-minus:hover, .st-zoom-plus:hover { background: #f3f4f6; border-color: #9ca3af; }
    .st-zoom-disabled { opacity: 0.3; cursor: not-allowed; pointer-events: none; }
    .st-zoom-slider { display: flex; align-items: center; }
    .st-zoom-slider input[type=range] {
      width: 80px; height: 4px; appearance: none; background: #d1d5db;
      border-radius: 2px; outline: none; cursor: pointer;
    }
    .st-zoom-slider input[type=range]::-webkit-slider-thumb {
      appearance: none; width: 14px; height: 14px; border-radius: 50%;
      background: #0b0b0b; cursor: pointer; border: 0;
    }
    .st-zoom-value { font-size: 11px; font-weight: 700; color: #6b7280; min-width: 32px; }
    .st-today-badge {
      display: flex; align-items: center; gap: 6px; cursor: pointer;
      font-size: 12px; font-weight: 600; color: #ef4444; padding: 3px 10px;
      border-radius: 20px; transition: background .15s;
    }
    .st-today-badge:hover { background: #fef2f2; }
    .st-today-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
      animation: st-pulse-dot 2s ease-in-out infinite;
    }

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

    .st-body { display: flex; flex: 1; min-height: 0; overflow: auto; scroll-behavior: smooth; }
    .st-staff-panel { flex-shrink: 0; overflow: hidden; }
    .st-timeline-panel { flex: 1; overflow-x: auto; overflow-y: hidden; position: relative; user-select: none; contain: layout; }

    .st-staff-row { border-bottom: 1px solid #f1f5f9; }
    .st-staff-row-hidden { display: none; }

    .st-timeline-row {
      display: flex; position: relative; border-bottom: 1px solid #f1f5f9;
      min-height: 120px;
    }
    .st-timeline-row-hidden { display: none; }

    .st-hour-block {
      flex-shrink: 0; border-right: 1px solid #f1f5f9;
      cursor: pointer; transition: background .15s ease; position: relative;
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
    .st-hour-heat-low { background: rgba(22,163,74,0.06); }
    .st-hour-heat-mid { background: rgba(234,179,8,0.1); }
    .st-hour-heat-high { background: rgba(239,68,68,0.1); }

    .st-snap-dot {
      position: absolute; left: 0; right: 0; height: 1px;
      background: rgba(0,0,0,0.03); pointer-events: none;
    }

    .st-current-time-line-global {
      position: absolute; left: 0; right: 0; height: 2px;
      z-index: 10; pointer-events: none; display: flex; align-items: center;
    }
    .st-ctl-dot {
      width: 10px; height: 10px; border-radius: 50%; background: #ef4444;
      margin-left: -4px; flex-shrink: 0;
      animation: st-pulse-dot 2s ease-in-out infinite;
      box-shadow: 0 0 0 3px rgba(239,68,68,0.2);
    }
    .st-ctl-line {
      flex: 1; height: 2px; background: linear-gradient(90deg, #ef4444, rgba(239,68,68,0.3));
    }
    .st-ctl-label {
      background: #ef4444; color: white; font-size: 9px; font-weight: 700;
      padding: 1px 6px; border-radius: 8px; line-height: 1.4;
      margin-left: -4px;
      animation: st-pulse-label 2s ease-in-out infinite;
    }
    @keyframes st-pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.2); }
    }
    @keyframes st-pulse-label {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }

    .st-appointment {
      position: absolute; border-radius: 8px; border-left: 3px solid;
      padding: 5px 8px; font-size: 10px; cursor: pointer;
      display: flex; flex-direction: column; gap: 2px; z-index: 1;
      overflow: hidden;
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease, opacity .2s ease, top .3s ease, height .3s ease;
      will-change: transform; contain: layout;
    }
    .st-appt-enter {
      animation: st-appt-slide-in .35s cubic-bezier(.34,1.56,.64,1) both;
    }
    @keyframes st-appt-slide-in {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .st-appointment:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow:
        0 4px 12px rgba(0,0,0,0.1),
        0 2px 4px rgba(0,0,0,0.06);
      z-index: 4;
    }
    .st-appointment:focus-visible {
      outline: 2px solid #6366f1; outline-offset: 2px; z-index: 3;
    }
    .st-appt-vip {
      box-shadow:
        inset 0 0 0 1px #f59e0b,
        0 1px 3px rgba(245,158,11,0.2);
    }
    .st-appt-vip:hover {
      box-shadow:
        inset 0 0 0 1px #f59e0b,
        0 4px 12px rgba(245,158,11,0.25),
        0 2px 4px rgba(0,0,0,0.06);
    }
    .st-appt-overlap {
      box-shadow: 0 0 0 2px #ef4444, 0 2px 8px rgba(239,68,68,0.15);
    }
    .st-appt-dragging {
      transform: scale(1.04) rotate(0.5deg);
      box-shadow: 0 12px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1);
      transition: transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .15s ease;
      z-index: 20; opacity: 0.92;
    }
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
      color: #f59e0b; text-shadow: 0 0 4px rgba(0,0,0,0.1);
    }
    .sta-shimmer {
      position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
      background-size: 200% 200%;
      animation: st-shimmer 3s ease-in-out infinite;
    }
    @keyframes st-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .st-tooltip {
      position: fixed; z-index: 9999; background: #1f2937; color: #fff;
      border-radius: 10px; padding: 10px 14px; font-size: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      max-width: 240px; pointer-events: none;
      display: flex; flex-direction: column; gap: 3px;
      animation: st-tooltip-in .15s ease;
    }
    @keyframes st-tooltip-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .st-tooltip-header { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
    .st-tooltip-row { font-size: 11px; line-height: 1.4; }
    .st-tt-label { color: #9ca3af; margin-right: 4px; }
    .st-tt-status { font-weight: 600; }
    .st-tooltip-notes { margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: #d1d5db; }

    .st-context-menu {
      position: fixed; z-index: 10000; background: #fff;
      border: 1px solid #e5e7eb; border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
      padding: 4px; min-width: 160px;
      animation: st-context-in .12s ease;
    }
    @keyframes st-context-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .st-context-backdrop {
      position: fixed; inset: 0; z-index: 9999;
    }
    .st-cm-item {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 8px 12px; border: 0; background: transparent;
      font-size: 13px; cursor: pointer; border-radius: 8px;
      text-align: left; white-space: nowrap; transition: background .1s;
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
      border-radius: 6px;
      animation: st-drag-pulse 1.5s ease-in-out infinite;
    }
    @keyframes st-drag-pulse {
      0%, 100% { border-color: rgba(99,102,241,0.5); }
      50% { border-color: rgba(99,102,241,0.9); }
    }

    @media (max-width: 1024px) {
      .staff-timeline { border-radius: 12px; }
      .st-zoom-bar { padding: 4px 12px; flex-wrap: wrap; gap: 4px; }
      .st-zoom-slider input[type=range] { width: 60px; }
    }
    @media (max-width: 768px) {
      .staff-timeline { border-radius: 10px; }
      .st-header-corner { padding: 6px 8px; min-width: 80px; }
      .st-header-title { font-size: 12px; }
      .st-hour-label { font-size: 10px; }
      .st-hour-header { padding: 6px 2px; }
      .st-appointment { border-radius: 6px; padding: 3px 6px; font-size: 9px; }
      .sta-header strong { font-size: 9px; }
      .sta-meta span { font-size: 7px; }
      .st-zoom-slider input[type=range] { width: 48px; }
      .st-zoom-controls { gap: 4px; }
      .st-zoom-label { display: none; }
      .st-context-menu { min-width: 140px; }
    }
    @media (max-width: 480px) {
      .staff-timeline { border-radius: 8px; border-left: 0; border-right: 0; }
      .st-header-corner { display: none; }
      .st-hour-header { min-width: 48px !important; padding: 4px 1px; }
      .st-hour-label { font-size: 9px; }
      .st-hour-block { min-width: 48px !important; }
      .st-appointment { padding: 2px 4px; border-left-width: 2px; }
      .sta-header strong { font-size: 8px; }
      .sta-amount { display: none; }
      .st-ctl-label { font-size: 8px; padding: 0 4px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .staff-timeline * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
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
  ZOOM_LEVELS = ZOOM_LEVELS;

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

  zoomLevel: number = DEFAULT_ZOOM_LEVEL;
  zoomLevelIndex = ZOOM_LEVELS.indexOf(DEFAULT_ZOOM_LEVEL);
  hourBlockWidth = 60;
  snapMinutesList = [15, 30, 45];
  private draggingAppointmentId: string | null = null;
  private occupancyCache = new Map<string, Map<number, number>>();

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
    this.currentTimeTop = getCurrentTimeLineTop(this.zoomLevel);
    this.isToday = isToday(new Date(value.todayDate));
    this.occupancyCache.clear();
    this.cdr.markForCheck();
  }

  ngAfterViewInit(): void {
    this.restoreZoom();
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
          this.currentTimeTop = getCurrentTimeLineTop(this.zoomLevel);
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

  scrollToCurrentTime(): void {
    this.autoScrollToCurrentTime();
  }

  private restoreZoom(): void {
    try {
      const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
      if (saved) {
        const z = parseInt(saved, 10);
        const idx = ZOOM_LEVELS.indexOf(z as ZoomLevel);
        if (idx >= 0) {
          this.zoomLevelIndex = idx;
          this.zoomLevel = z;
          this.applyZoom();
        }
      }
    } catch { }
  }

  private saveZoom(): void {
    try { localStorage.setItem(ZOOM_STORAGE_KEY, this.zoomLevel.toString()); } catch { }
  }

  private applyZoom(): void {
    this.zoomLevel = ZOOM_LEVELS[this.zoomLevelIndex];
    this.timelineRowHeight = this.zoomLevel * (this.businessEnd - this.businessStart);
    this.hourBlockWidth = Math.max(48, Math.min(80, 40 + this.zoomLevel * 0.3));
    this.currentTimeTop = getCurrentTimeLineTop(this.zoomLevel);
    this.saveZoom();
    this.cdr.markForCheck();
  }

  zoomIn(): void {
    if (this.zoomLevelIndex < ZOOM_LEVELS.length - 1) {
      this.zoomLevelIndex++;
      this.applyZoom();
    }
  }

  zoomOut(): void {
    if (this.zoomLevelIndex > 0) {
      this.zoomLevelIndex--;
      this.applyZoom();
    }
  }

  setZoomByIndex(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.zoomLevelIndex = parseInt(target.value, 10);
    this.applyZoom();
  }

  recomputeTop(appt: StaffTimelineAppointment): number {
    const date = new Date(appt.startTime);
    const minutesPastStart = getMinutesFromMidnight(date) - this.businessStart * 60;
    return Math.max(0, (minutesPastStart / 60) * this.zoomLevel);
  }

  recomputeHeight(appt: StaffTimelineAppointment): number {
    const durationMinutes = appt.durationMin || 0;
    return Math.max(20, (durationMinutes / 60) * this.zoomLevel);
  }

  getApptGradient(appt: StaffTimelineAppointment): string {
    const baseColor = appt.color;
    return `linear-gradient(135deg, ${baseColor}18 0%, ${baseColor}0c 50%, ${baseColor}08 100%)`;
  }

  getApptShadow(appt: StaffTimelineAppointment): string {
    if (appt.hasOverlap) {
      return '0 0 0 2px #ef4444, 0 2px 8px rgba(239,68,68,0.15)';
    }
    const shadowColor = this.hexToRgba(appt.color, 0.12);
    return `0 1px 3px ${shadowColor}, 0 1px 2px rgba(0,0,0,0.04)`;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  getHeatmapColor(staff: StaffTimelineStaff, hour: number): string {
    if (this.isBreakHour(staff, hour)) return '';
    if (!this.isBusinessHour(hour)) return '';

    let occupancy = this.occupancyCache.get(staff.id)?.get(hour);
    if (occupancy === undefined) {
      const staffAppts = this.getStaffAppointments(staff.id);
      const hourStart = (hour - this.businessStart) * 60;
      const hourEnd = hourStart + 60;
      let bookedMin = 0;
      for (const appt of staffAppts) {
        const apptDate = new Date(appt.startTime);
        const apptMin = apptDate.getHours() * 60 + apptDate.getMinutes();
        const apptEnd = apptMin + appt.durationMin;
        const overlapStart = Math.max(hourStart, apptMin);
        const overlapEnd = Math.min(hourEnd, apptEnd);
        if (overlapEnd > overlapStart) {
          bookedMin += overlapEnd - overlapStart;
        }
      }
      occupancy = Math.min(100, Math.round((bookedMin / 60) * 100));

      if (!this.occupancyCache.has(staff.id)) {
        this.occupancyCache.set(staff.id, new Map());
      }
      this.occupancyCache.get(staff.id)!.set(hour, occupancy);
    }

    if (occupancy === 0) return '';
    if (occupancy < 33) return `rgba(22,163,74,${0.04 + occupancy * 0.001})`;
    if (occupancy < 66) return `rgba(234,179,8,${0.06 + occupancy * 0.001})`;
    return `rgba(239,68,68,${0.08 + Math.min(occupancy, 100) * 0.001})`;
  }

  isDraggingAppt(apptId: string): boolean {
    return this.draggingAppointmentId === apptId;
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
    const hbw = this.hourBlockWidth;

    this.dragSelection = {
      active: true,
      staffId,
      startHour: hour,
      endHour: hour,
      left: (event.clientX - panelRect.left) - ((event.clientX - panelRect.left) % hbw),
      top: rowRect.top - panelRect.top + timelinePanel.scrollTop,
      width: hbw,
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
    const hbw = this.hourBlockWidth;
    const relativeX = event.clientX - panelRect.left + timelinePanel.scrollLeft;
    const hoveredHour = Math.floor(relativeX / hbw) + this.businessStart;

    if (hoveredHour !== this.dragSelection.endHour) {
      const clampedHour = Math.max(this.businessStart, Math.min(hoveredHour, this.businessEnd - 1));
      this.dragSelection.endHour = clampedHour;
      const startX = (Math.min(this.dragSelection.startHourRaw, clampedHour) - this.businessStart) * hbw;
      const endX = (Math.max(this.dragSelection.startHourRaw, clampedHour) - this.businessStart + 1) * hbw;
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
