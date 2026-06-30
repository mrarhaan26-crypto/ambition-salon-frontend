import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CalendarService } from './calendar.service';
import { StaffService } from '../staff/staff.service';
import { Staff } from '../staff/staff.models';
import { ResourcesService } from '../resources/resources.service';
import { CalendarWaitlist } from './calendar-waitlist/calendar-waitlist';
import { CalendarAiScheduler } from './calendar-ai-scheduler/calendar-ai-scheduler';
import {
  CalendarBooking,
  CalendarSummaryResponse,
  CalendarResource,
  AiSuggestion,
  AiOptimization,
  WaitlistEntry,
  CreateFormModel,
  EditFormModel,
  RescheduleFormModel,
  WalkinFormModel,
  MonthDay,
  WeekDay,
  StatusCount,
  ClientOption,
  ServiceOption,
  BranchOption,
  CreateFormService,
  CalendarQueryParams,
  ViewMode,
  StaffResourceMode,
} from './calendar.models';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarWaitlist, CalendarAiScheduler],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Calendar</h1>
          <p>View and manage appointments across day, week, and month views.</p>
        </div>
        <div class="head-actions">
          <button (click)="goToday()" class="today-btn">Today</button>
          <button (click)="prev()" class="nav-btn">&larr;</button>
          <span class="date-label">{{ dateLabel }}<span class="today-badge" *ngIf="isCurrentDateToday()">Today</span></span>
          <button (click)="next()" class="nav-btn">&rarr;</button>
          <button (click)="refresh()" class="refresh-btn" [disabled]="loading">{{ loading ? 'Loading...' : 'Refresh' }}</button>
          <span class="updated-text" *ngIf="lastUpdated && !loading">Updated {{ lastUpdated }}</span>
        </div>
      </div>

      <div class="tabs">
        <button [class.active]="view === 'day'" (click)="setView('day')">Day</button>
        <button [class.active]="view === 'week'" (click)="setView('week')">Week</button>
        <button [class.active]="view === 'month'" (click)="setView('month')">Month</button>
        <span class="tabs-divider"></span>
        <button [class.active]="viewMode === 'staff'" (click)="viewMode='staff'" class="vm-btn">Staff</button>
        <button [class.active]="viewMode === 'resources'" (click)="viewMode='resources'" class="vm-btn">Resources</button>
        <span class="tabs-divider"></span>
        <select [(ngModel)]="resourceFilter" (change)="loadResources()" class="res-filter" *ngIf="viewMode==='resources'">
          <option value="">All Types</option>
          <option value="ROOM">Rooms</option>
          <option value="CHAIR">Chairs</option>
          <option value="STATION">Stations</option>
          <option value="EQUIPMENT">Equipment</option>
        </select>
      </div>

      <div class="filter-bar">
        <select [(ngModel)]="selectedBranchId" (change)="onBranchChange()" class="branch-filter">
          <option value="">All Branches</option>
          <option *ngFor="let b of branchList" [value]="b.id">{{ b.name || b.city || b.id }}</option>
        </select>
        <select [(ngModel)]="statusFilter" (change)="onStatusFilterChange()" class="status-filter">
          <option value="">All Status</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div><span>Loading calendar...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load calendar.</strong><p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="summary-bar" *ngIf="summary">
          <div class="sum-card"><span>Total</span><b>{{ summary.kpis?.totalBookings }}</b></div>
          <div class="sum-card"><span>Confirmed</span><b>{{ summary.kpis?.confirmed }}</b></div>
          <div class="sum-card"><span>Completed</span><b class="green">{{ summary.kpis?.completed }}</b></div>
          <div class="sum-card"><span>Pending</span><b class="amber">{{ summary.kpis?.pending }}</b></div>
          <div class="sum-card"><span>Revenue</span><b>{{ (summary.kpis?.revenue || 0) | currency }}</b></div>
        </div>
        <div class="status-legend">
          <span class="legend-item" *ngFor="let item of statusLegendItems">
            <span [class]="'legend-dot dot-' + item.cls"></span>
            <span class="legend-label">{{ item.label }}</span>
          </span>
        </div>

        <div class="day-view view-transition" *ngIf="view === 'day'">
          <ng-container *ngIf="viewMode === 'staff'">
            <div class="dv-empty-staff" *ngIf="staffList.length === 0">
              <strong>No staff available</strong>
              <p>Add staff members in the Staff section to use the staff view.</p>
            </div>
            <div class="staff-filter-bar" *ngIf="staffList.length > 0">
              <button class="staff-filter-pill" [class.active]="!selectedStaffFilter" (click)="selectedStaffFilter=''">All Staff</button>
              <button class="staff-filter-pill" *ngFor="let s of staffList" [class.active]="selectedStaffFilter===s.id" (click)="selectedStaffFilter=s.id">{{ s.fullName }}</button>
              <span class="sf-spacer"></span>
              <button class="walkin-btn" (click)="openWalkin()">+ Walk-in</button>
              <button class="waitlist-toggle-btn" [class.active]="showWaitlist" (click)="toggleWaitlist()">
                <span class="wl-icon">📋</span> Waitlist
                <span class="wl-count" *ngIf="waitlistEntries.length > 0">{{ waitlistEntries.length }}</span>
              </button>
              <button class="ai-toggle-btn" [class.active]="showAiPanel" (click)="toggleAiPanel()">
                <span class="ai-icon">✨</span> AI Suggestions
              </button>
            </div>
            <div class="wl-fill-banner" *ngIf="fillWaitlistEntry">
              <div class="wl-fill-info">
                <span class="wl-fill-badge">Fill from waitlist</span>
                <span>{{ fillWaitlistEntry.client?.fullName || 'Walk-in' }} — {{ fillWaitlistEntry.serviceName || 'No service' }}</span>
              </div>
              <button class="wl-fill-cancel" (click)="fillWaitlistEntry = null">Cancel</button>
            </div>
            <div class="dv-content-wrapper" *ngIf="staffList.length > 0">
              <div class="dv-container">
                <div class="dv-time-col">
                  <div class="dv-header-gap"></div>
                  <div class="dv-time-row" *ngFor="let hour of dayHours"
                    (click)="openCreateBookingUnassigned(hour)">
                    <span class="dv-time-label">{{ hour }}:00</span>
                  </div>
                </div>
                <div class="dv-staff-scroll" [class.calendar-dragging]="dragBooking !== null">
                  <div class="dv-staff-col" *ngFor="let staff of visibleStaffList; let si = index" [attr.data-staff-id]="staff.id">
                    <div class="dv-staff-header">
                      <div class="staff-header-content">
                        <div class="staff-avatar" [class]="staffAccentClass(staff)">{{ staffInitials(staff) }}</div>
                        <div class="staff-header-main">
                          <span class="staff-header-name">{{ staff.fullName }}</span>
                          <span class="staff-header-meta">{{ getStaffDayBookingCount(staff.id) }} booking{{ getStaffDayBookingCount(staff.id) !== 1 ? 's' : '' }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="dv-staff-body">
                      <div class="dv-hour-row" *ngFor="let hour of dayHours; let hi = index"
                        [class.dv-hour-row-alt]="hi % 2 === 1"
                        [class.dv-hour-busy]="isStaffBusyAtHour(staff.id, hour)"
                        (click)="openCreateBooking(staff, hour)"></div>
                      <div class="dv-bookings-layer">
                        <div class="booking-chip" *ngFor="let b of getStaffBookings(staff.id)"
                          [class]="'status-' + (b.status || '').toLowerCase()"
                          [class.dragging-booking]="dragBooking === b"
                          [ngStyle]="getBookingBlockStyle(b)"
                          tabindex="0" role="button"
                          [attr.aria-label]="getBookingAriaLabel(b)"
                          (pointerdown)="startBookingDrag($event, b)"
                          (click)="openDrawer(b); $event.stopPropagation()"
                          (keydown)="openBookingFromKeyboard($event, b)">
                          <strong>{{ b.client?.fullName || 'Client' }}</strong>
                          <span>{{ b.title }} — {{ formatTime(b.startTime) }}-{{ formatTime(b.endTime) }}</span>
                          <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                        </div>
                        <div class="current-time-line" *ngIf="isCurrentDateToday()" [ngStyle]="getCurrentTimeIndicatorStyle()">
                          <span class="current-time-label">Now</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="dv-sidebar-stack" *ngIf="showAiPanel || showWaitlist">
                <app-calendar-ai-scheduler
                  *ngIf="showAiPanel"
                  [suggestions]="aiSuggestions"
                  [loading]="aiLoading"
                  [error]="aiError"
                  [serviceId]="aiServiceId"
                  [serviceDuration]="aiServiceDuration"
                  [optimizing]="aiOptimizing"
                  [optimization]="aiOptimization"
                  [serviceList]="serviceList"
                  [staffList]="staffList"
                  (serviceIdChange)="aiServiceId = $event; aiServiceDuration = getServiceDuration($event); loadAiSuggestions()"
                  (serviceDurationChange)="aiServiceDuration = $event"
                  (runSuggest)="loadAiSuggestions()"
                  (runOptimize)="loadAiOptimizeDay()"
                  (bookSlot)="aiBookSlot($event)"
                  (closePanel)="showAiPanel = false">
                </app-calendar-ai-scheduler>
                <app-calendar-waitlist
                  *ngIf="showWaitlist"
                  [entries]="waitlistEntries"
                  [loading]="waitlistLoading"
                  [error]="waitlistError"
                  [fillEntry]="fillWaitlistEntry"
                  (fillEntryChange)="fillWaitlistEntry = $event"
                  (cancelFill)="fillWaitlistEntry = null"
                  (removeEntry)="removeWaitlistEntry($event)">
                </app-calendar-waitlist>
              </div>
            </div>
            <div class="dv-empty-bookings" *ngIf="staffList.length > 0 && bookings.length === 0">
              <strong>No bookings for this day</strong>
              <p>Add a booking or walk-in to get started.</p>
              <div class="empty-actions">
                <button (click)="openCreateBookingForDate(currentDate)" class="empty-btn">New Booking</button>
                <button (click)="openWalkin()" class="empty-btn empty-btn-secondary">Walk-in</button>
              </div>
            </div>
          </ng-container>
          <ng-container *ngIf="viewMode === 'resources'">
            <div class="wl-fill-banner" *ngIf="fillWaitlistEntry">
              <div class="wl-fill-info">
                <span class="wl-fill-badge">Fill from waitlist</span>
                <span>{{ fillWaitlistEntry.client?.fullName || 'Walk-in' }} — {{ fillWaitlistEntry.serviceName || 'No service' }}</span>
              </div>
              <button class="wl-fill-cancel" (click)="fillWaitlistEntry = null">Cancel</button>
            </div>
            <div class="dv-content-wrapper">
              <div class="dv-container">
                <div class="dv-time-col">
                  <div class="dv-header-gap"></div>
                  <div class="dv-time-row" *ngFor="let hour of dayHours"
                    (click)="openCreateBookingUnassigned(hour)">
                    <span class="dv-time-label">{{ hour }}:00</span>
                  </div>
                </div>
                <div class="dv-staff-scroll" [class.calendar-dragging]="dragBooking !== null">
                  <div class="dv-staff-col" *ngFor="let resource of resourceList" [attr.data-resource-id]="resource.id">
                    <div class="dv-staff-header">
                      {{ resource.name }}
                      <span class="res-type-badge">{{ resource.type }}</span>
                    </div>
                    <div class="dv-staff-body">
                      <div class="dv-hour-row" *ngFor="let hour of dayHours; let hi = index"
                        [class.dv-hour-row-alt]="hi % 2 === 1"
                        [class.dv-hour-busy]="isResourceBusyAtHour(resource.id, hour)"
                        (click)="openCreateBookingFromResource(resource, hour)"></div>
                      <div class="dv-bookings-layer">
                         <div class="booking-chip" *ngFor="let b of getAllResourceBookings(resource.id)"
                          [class]="'status-' + (b.status || '').toLowerCase()"
                          [class.dragging-booking]="dragBooking === b"
                          [ngStyle]="getBookingBlockStyle(b)"
                          tabindex="0" role="button"
                          [attr.aria-label]="getBookingAriaLabel(b)"
                          (pointerdown)="startBookingDrag($event, b)"
                          (click)="openDrawer(b); $event.stopPropagation()"
                          (keydown)="openBookingFromKeyboard($event, b)">
                          <strong>{{ b.client?.fullName || 'Client' }}</strong>
                          <span>{{ b.title }} — {{ formatTime(b.startTime) }}-{{ formatTime(b.endTime) }}</span>
                          <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                        </div>
                        <div class="current-time-line" *ngIf="isCurrentDateToday()" [ngStyle]="getCurrentTimeIndicatorStyle()">
                          <span class="current-time-label">Now</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="dv-staff-col dv-unassigned-col">
                    <div class="dv-staff-header">Unassigned</div>
                    <div class="dv-staff-body">
                      <div class="dv-hour-row" *ngFor="let hour of dayHours; let hi = index"
                        [class.dv-hour-row-alt]="hi % 2 === 1"
                        (click)="openCreateBookingUnassigned(hour)"></div>
                      <div class="dv-bookings-layer">
                         <div class="booking-chip" *ngFor="let b of getAllUnassignedBookings()"
                          [class]="'status-' + (b.status || '').toLowerCase()"
                          [class.dragging-booking]="dragBooking === b"
                          [ngStyle]="getBookingBlockStyle(b)"
                          tabindex="0" role="button"
                          [attr.aria-label]="getBookingAriaLabel(b)"
                          (pointerdown)="startBookingDrag($event, b)"
                          (click)="openDrawer(b); $event.stopPropagation()"
                          (keydown)="openBookingFromKeyboard($event, b)">
                          <strong>{{ b.client?.fullName || 'Client' }}</strong>
                          <span>{{ b.title }} — {{ formatTime(b.startTime) }}-{{ formatTime(b.endTime) }}</span>
                          <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                        </div>
                        <div class="current-time-line" *ngIf="isCurrentDateToday()" [ngStyle]="getCurrentTimeIndicatorStyle()">
                          <span class="current-time-label">Now</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="dv-sidebar-stack" *ngIf="showAiPanel || showWaitlist">
                <app-calendar-ai-scheduler
                  *ngIf="showAiPanel"
                  [suggestions]="aiSuggestions"
                  [loading]="aiLoading"
                  [error]="aiError"
                  [serviceId]="aiServiceId"
                  [serviceDuration]="aiServiceDuration"
                  [optimizing]="aiOptimizing"
                  [optimization]="aiOptimization"
                  [serviceList]="serviceList"
                  [staffList]="staffList"
                  (serviceIdChange)="aiServiceId = $event; aiServiceDuration = getServiceDuration($event); loadAiSuggestions()"
                  (serviceDurationChange)="aiServiceDuration = $event"
                  (runSuggest)="loadAiSuggestions()"
                  (runOptimize)="loadAiOptimizeDay()"
                  (bookSlot)="aiBookSlot($event)"
                  (closePanel)="showAiPanel = false">
                </app-calendar-ai-scheduler>
                <app-calendar-waitlist
                  *ngIf="showWaitlist"
                  [entries]="waitlistEntries"
                  [loading]="waitlistLoading"
                  [error]="waitlistError"
                  [fillEntry]="fillWaitlistEntry"
                  (fillEntryChange)="fillWaitlistEntry = $event"
                  (cancelFill)="fillWaitlistEntry = null"
                  (removeEntry)="removeWaitlistEntry($event)">
                </app-calendar-waitlist>
              </div>
            </div>
            <div class="dv-empty-bookings" *ngIf="bookings.length === 0">
              <strong>No bookings for this day</strong>
              <p>Add a booking or walk-in to get started.</p>
              <div class="empty-actions">
                <button (click)="openCreateBookingForDate(currentDate)" class="empty-btn">New Booking</button>
                <button (click)="openWalkin()" class="empty-btn empty-btn-secondary">Walk-in</button>
              </div>
            </div>
          </ng-container>
        </div>

        <div class="week-view view-transition" *ngIf="view === 'week'">
          <div class="week-header">
            <div class="week-day-header" *ngFor="let day of weekDays"
              [class.today]="isDayToday(day.date)" (click)="goToDay(day.date)">
              <strong>{{ day.date | date:'EEE' }}</strong>
              <span class="week-day-date">{{ day.date | date:'MMM dd' }}</span>
              <span class="week-day-count">{{ getBookingsForDate(day.date).length }} booking{{ getBookingsForDate(day.date).length !== 1 ? 's' : '' }}</span>
            </div>
          </div>
          <div class="week-body">
            <div class="week-day-col" *ngFor="let day of weekDays"
              [class.today]="isDayToday(day.date)">
              <ng-container *ngIf="getBookingsForDate(day.date).length > 0; else emptyDay">
                <div class="week-booking" *ngFor="let b of getBookingsForDate(day.date)"
                  [class]="'status-' + (b.status || '').toLowerCase()"
                  tabindex="0" role="button"
                  [attr.aria-label]="getBookingAriaLabel(b)"
                  (click)="openDrawer(b); $event.stopPropagation()"
                  (keydown)="openBookingFromKeyboard($event, b)">
                  <strong>{{ b.client?.fullName || 'Client' }}</strong>
                  <span>{{ b.title }}</span>
                  <small>{{ formatTime(b.startTime) }}-{{ formatTime(b.endTime) }}</small>
                  <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                </div>
                <div class="week-add-action" (click)="openCreateBookingForDate(day.date); $event.stopPropagation()">+ Add</div>
              </ng-container>
              <ng-template #emptyDay>
                <div class="week-empty" (click)="openCreateBookingForDate(day.date); $event.stopPropagation()">+ Add booking</div>
              </ng-template>
            </div>
          </div>
        </div>

        <div class="month-view view-transition" *ngIf="view === 'month'">
          <div class="month-grid">
            <div class="weekday-label" *ngFor="let day of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']">{{ day }}</div>
            <div class="month-day" *ngFor="let day of monthDays"
              [class.other-month]="day.otherMonth"
              [class.today]="day.isToday"
              [class.selected]="isSameDay(day.date, currentDate)"
              (click)="openDayFromMonth(day.date)">
              <div class="month-day-head">
                <span class="month-date-number">{{ day.date | date:'d' }}</span>
                <span class="month-today-badge" *ngIf="day.isToday">Today</span>
              </div>
              <div class="month-booking-count" *ngIf="getBookingsForDate(day.date).length > 0">
                {{ getBookingsForDate(day.date).length }} booking{{ getBookingsForDate(day.date).length !== 1 ? 's' : '' }}
              </div>
              <div class="month-status-row" *ngIf="getBookingsForDate(day.date).length > 0">
                <span class="month-status-item" *ngFor="let sc of getMonthStatusCounts(day.date)">
                  <span class="month-status-dot" [class]="'dot-' + sc.status"></span>
                  <span class="month-status-num" *ngIf="sc.count > 1">{{ sc.count }}</span>
                </span>
              </div>
              <div class="month-preview-list" *ngIf="getBookingsForDate(day.date).length > 0">
                <div class="month-preview-chip" *ngFor="let b of getMonthPreviewBookings(day.date)"
                  [class]="'status-' + (b.status || '').toLowerCase()"
                  tabindex="0" role="button"
                  [attr.aria-label]="getBookingAriaLabel(b)"
                  (click)="openDrawer(b); $event.stopPropagation()"
                  (keydown)="openBookingFromKeyboard($event, b)">
                  <span class="mp-time">{{ formatTime(b.startTime) }}</span>
                  <span class="mp-title">{{ b.client?.fullName || b.title }}</span>
                  <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                </div>
                <div class="month-more" *ngIf="getMonthMoreCount(day.date) > 0"
                  (click)="openDayFromMonth(day.date); $event.stopPropagation()">
                  +{{ getMonthMoreCount(day.date) }} more
                </div>
                <div class="month-add-action" *ngIf="!day.otherMonth"
                  (click)="openCreateBookingForDate(day.date); $event.stopPropagation()">+ Add</div>
              </div>
              <div class="month-add-empty" *ngIf="getBookingsForDate(day.date).length === 0 && !day.otherMonth"
                (click)="openCreateBookingForDate(day.date); $event.stopPropagation()">+ Add</div>
              <div class="month-empty" *ngIf="getBookingsForDate(day.date).length === 0 && day.otherMonth"></div>
            </div>
          </div>
        </div>

        <div class="empty" *ngIf="bookings.length === 0">
          <strong>No bookings for this period</strong>
          <p>Try changing the date range or add a new booking.</p>
          <div class="empty-actions">
            <button (click)="goToday()" class="empty-btn">Go to Today</button>
            <button (click)="openWalkin()" class="empty-btn empty-btn-secondary">Add Walk-in</button>
          </div>
        </div>
      </ng-container>

      <div class="drawer-overlay" *ngIf="drawerBooking" (click)="closeDrawer()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>{{ drawerBooking.title }}</h2>
            <button class="close-btn" (click)="closeDrawer()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="drawer-section">
              <h3>Booking Details</h3>
              <div class="drawer-status-row">
                <span class="status-badge" [class]="'badge-' + (drawerBooking.status || '').toLowerCase()">{{ drawerBooking.status }}</span>
              </div>
              <div class="info-row"><span>Date</span><span>{{ drawerBooking.startTime | date:'EEE, MMM dd, yyyy' }}</span></div>
              <div class="info-row"><span>Time</span><span>{{ drawerBooking.startTime | date:'h:mm a' }} – {{ drawerBooking.endTime | date:'h:mm a' }}</span></div>
              <div class="info-row"><span>Staff</span><span>{{ drawerBooking.staff?.fullName || 'Unassigned' }}</span></div>
              <div class="info-row" *ngIf="drawerBooking.resourceId"><span>Resource</span><span>{{ resourceNameForId(drawerBooking.resourceId) }}</span></div>
              <div class="info-row" *ngIf="drawerBooking.totalAmount"><span>Amount</span><span>{{ drawerBooking.totalAmount | currency }}</span></div>
              <div class="info-row" *ngIf="drawerBooking.notes"><span>Notes</span><span>{{ drawerBooking.notes }}</span></div>
            </div>

            <div class="drawer-section" *ngIf="drawerBooking.services?.length">
              <h3>Services</h3>
              <div class="svc-info-row" *ngFor="let s of drawerBooking.services">
                <span>{{ s.name }}</span>
                <span>{{ s.durationMin }}min {{ s.price ? '· ' + (s.price | currency) : '' }}</span>
              </div>
            </div>

            <div class="drawer-section">
              <h3>Client</h3>
              <div class="info-row"><span>Name</span><span class="client-name">{{ drawerBooking.client?.fullName || 'N/A' }}</span></div>
              <div class="info-row" *ngIf="drawerBooking.client?.phone"><span>Phone</span><span>{{ drawerBooking.client.phone }}</span></div>
              <div class="info-row" *ngIf="drawerBooking.client?.email"><span>Email</span><span>{{ drawerBooking.client.email }}</span></div>
            </div>

            <div class="reschedule-form" *ngIf="showReschedule">
              <h3>Reschedule Booking</h3>
              <label>Staff</label>
              <select [(ngModel)]="rescheduleForm.staffId">
                <option *ngFor="let s of staffList" [value]="s.id">{{ s.fullName }}</option>
              </select>
              <label>Resource</label>
              <select [(ngModel)]="rescheduleForm.resourceId">
                <option value="">None</option>
                <option *ngFor="let r of resourceList" [value]="r.id">{{ r.name }} ({{ r.type }})</option>
              </select>
              <label>Date & Time</label>
              <input [(ngModel)]="rescheduleForm.startTime" type="datetime-local">
              <div class="drawer-actions">
                <button (click)="closeReschedule()">Back</button>
                <button class="btn-primary" (click)="doReschedule()" [disabled]="rescheduleBusy">{{ rescheduleBusy ? 'Saving...' : 'Save Changes' }}</button>
              </div>
              <div class="drawer-loading" *ngIf="rescheduleBusy"><div class="spinner"></div><span>Rescheduling...</span></div>
              <div class="drawer-error" *ngIf="rescheduleError">{{ rescheduleError }}</div>
            </div>

            <div class="cancel-form" *ngIf="showCancelForm">
              <h3>Cancel Booking</h3>
              <label>Reason for cancellation</label>
              <select [(ngModel)]="cancelReason">
                <option value="">Select a reason...</option>
                <option *ngFor="let r of cancelReasonOptions" [value]="r">{{ r }}</option>
              </select>
              <div class="cancel-custom-row" *ngIf="cancelReason === 'Other'">
                <label>Please specify</label>
                <input [(ngModel)]="cancelCustomReason" placeholder="Enter cancellation reason" maxlength="200">
              </div>
              <div class="drawer-actions">
                <button (click)="closeCancelForm()">Back</button>
                <button class="btn-danger" (click)="doCancel(drawerBooking)" [disabled]="!cancelReason || drawerBusy">{{ drawerBusy ? 'Cancelling...' : 'Confirm Cancellation' }}</button>
              </div>
              <div class="drawer-loading" *ngIf="drawerBusy"><div class="spinner"></div><span>Cancelling...</span></div>
              <div class="drawer-error" *ngIf="drawerError">{{ drawerError }}</div>
            </div>

            <div class="edit-form" *ngIf="showEditForm">
              <h3>Edit Details</h3>
              <label>Title</label>
              <input [(ngModel)]="editForm.title" placeholder="Booking title" maxlength="200">
              <label>Notes</label>
              <textarea [(ngModel)]="editForm.notes" placeholder="Optional notes" rows="3" maxlength="1000"></textarea>
              <div class="drawer-actions">
                <button (click)="closeEditForm()">Back</button>
                <button class="btn-primary" (click)="doEdit()" [disabled]="editBusy">{{ editBusy ? 'Saving...' : 'Save Changes' }}</button>
              </div>
              <div class="drawer-loading" *ngIf="editBusy"><div class="spinner"></div><span>Saving...</span></div>
              <div class="drawer-error" *ngIf="drawerError">{{ drawerError }}</div>
            </div>

            <div class="confirm-action" *ngIf="showConfirmAction">
              <h3>{{ confirmLabel }}?</h3>
              <p>Mark this booking as {{ confirmTargetStatus === 'CHECKED_IN' ? 'checked in' : 'completed' }}?</p>
              <div class="drawer-actions">
                <button (click)="closeConfirmAction()">Back</button>
                <button class="btn-primary" (click)="doStatus(drawerBooking, confirmTargetStatus)" [disabled]="drawerBusy">{{ drawerBusy ? 'Updating...' : 'Confirm' }}</button>
              </div>
              <div class="drawer-loading" *ngIf="drawerBusy"><div class="spinner"></div><span>Updating...</span></div>
              <div class="drawer-error" *ngIf="drawerError">{{ drawerError }}</div>
            </div>

            <div class="drawer-actions" *ngIf="drawerBooking.status && !showReschedule && !showCancelForm && !showEditForm && !showConfirmAction">
              <button class="btn-secondary" (click)="openEditForm(drawerBooking)">Edit Details</button>
              <button *ngIf="canReschedule(drawerBooking)" class="btn-secondary" (click)="showRescheduleForm(drawerBooking)">Reschedule</button>
              <button *ngIf="canCancel(drawerBooking)" class="btn-danger" (click)="openCancelForm()">Cancel Booking</button>
              <button *ngIf="drawerBooking.status === 'CONFIRMED'" class="btn-primary" (click)="openConfirmAction('CHECKED_IN')">Check In</button>
              <button *ngIf="drawerBooking.status === 'CHECKED_IN'" class="btn-primary" (click)="openConfirmAction('COMPLETED')">Complete</button>
            </div>

            <div class="drawer-loading" *ngIf="drawerBusy && !showReschedule && !showCancelForm && !showEditForm && !showConfirmAction"><div class="spinner"></div><span>Updating...</span></div>
            <div class="drawer-error" *ngIf="drawerError && !showReschedule && !showCancelForm && !showEditForm && !showConfirmAction">{{ drawerError }}</div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showCreate" (click)="closeCreate()">
        <div class="create-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>New Booking</h2>
            <button class="close-btn" (click)="closeCreate()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="create-form">
              <label>Client</label>
              <select [(ngModel)]="createForm.clientId">
                <option value="">Select client...</option>
                <option *ngFor="let c of clientList" [value]="c.id">{{ c.fullName || c.name }}</option>
              </select>

              <label>Staff</label>
              <select [(ngModel)]="createForm.staffId">
                <option *ngFor="let s of staffList" [value]="s.id">{{ s.fullName }}</option>
              </select>

              <label>Title</label>
              <input [(ngModel)]="createForm.title" placeholder="e.g. Haircut & Style">

              <label>Date & Time</label>
              <input [(ngModel)]="createForm.startTime" type="datetime-local">

              <label>Branch</label>
              <select [(ngModel)]="createForm.branchId">
                <option value="">Select branch...</option>
                <option *ngFor="let b of branchList" [value]="b.id">{{ b.name || b.city || b.id }}</option>
              </select>

              <label>Resource</label>
              <select [(ngModel)]="createForm.resourceId">
                <option value="">None</option>
                <option *ngFor="let r of resourceList" [value]="r.id">{{ r.name }} ({{ r.type }})</option>
              </select>

              <label>Services</label>
              <div class="create-services">
                <div class="svc-row" *ngFor="let s of createForm.services; let i = index">
                  <select [(ngModel)]="s.serviceId" (change)="onServiceSelect(i)" class="svc-select">
                    <option value="">Select service...</option>
                    <option *ngFor="let svc of serviceList" [value]="svc.id">{{ svc.name }} ({{ svc.durationMin }}min — {{ svc.price | currency }})</option>
                  </select>
                  <span class="svc-info" *ngIf="s.durationMin">{{ s.durationMin }}min</span>
                  <span class="svc-info" *ngIf="s.price">{{ s.price | currency }}</span>
                  <button class="remove-btn" (click)="removeService(i)" *ngIf="createForm.services.length > 1">x</button>
                </div>
              </div>
              <button class="add-btn" (click)="addService()">+ Add Service</button>

              <div class="svc-totals" *ngIf="createForm.services.length > 0">
                <div class="svc-tl">
                  <span>Total Duration</span>
                  <strong>{{ totalDuration }} min</strong>
                </div>
                <div class="svc-tl">
                  <span>Total Price</span>
                  <strong>{{ totalPrice | currency }}</strong>
                </div>
                <div class="svc-tl" *ngIf="createForm.startTime && totalDuration > 0">
                  <span>Estimated End</span>
                  <strong>{{ estimatedEndTime }}</strong>
                </div>
              </div>

              <label>Notes</label>
              <input [(ngModel)]="createForm.notes" placeholder="Optional notes">

              <div class="drawer-actions">
                <button (click)="closeCreate()">Cancel</button>
                <button class="btn-primary" (click)="doCreateBooking()" [disabled]="createBusy">{{ createBusy ? 'Creating...' : 'Create Booking' }}</button>
              </div>
            </div>
            <div class="drawer-loading" *ngIf="createBusy"><div class="spinner"></div><span>Creating...</span></div>
            <div class="drawer-error" *ngIf="createError">{{ createError }}</div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showWalkin" (click)="closeWalkin()">
        <div class="create-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>Walk-in Booking</h2>
            <button class="close-btn" (click)="closeWalkin()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="create-form">
              <label>Client Name</label>
              <input [(ngModel)]="walkinForm.clientName" placeholder="Enter client name" autofocus>

              <label>Staff</label>
              <select [(ngModel)]="walkinForm.staffId">
                <option value="">Select staff...</option>
                <option *ngFor="let s of staffList" [value]="s.id">{{ s.fullName }}</option>
              </select>

              <label>Service</label>
              <select [(ngModel)]="walkinForm.serviceId" (change)="onWalkinServiceChange()">
                <option value="">Select service...</option>
                <option *ngFor="let svc of serviceList" [value]="svc.id">{{ svc.name }} ({{ svc.durationMin }}min — {{ svc.price | currency }})</option>
              </select>

              <label>Branch</label>
              <select [(ngModel)]="walkinForm.branchId">
                <option value="">Select branch...</option>
                <option *ngFor="let b of branchList" [value]="b.id">{{ b.name || b.city || b.id }}</option>
              </select>

              <label>Date & Time</label>
              <input [(ngModel)]="walkinForm.startTime" type="datetime-local">

              <div class="walkin-note">Booking will be created with <strong>Pending</strong> status. Client will be auto-created if new.</div>

              <div class="drawer-actions">
                <button (click)="closeWalkin()">Cancel</button>
                <button class="btn-primary" (click)="doWalkinBooking()" [disabled]="walkinBusy">{{ walkinBusy ? 'Booking...' : 'Book Walk-in' }}</button>
              </div>
            </div>
            <div class="drawer-loading" *ngIf="walkinBusy"><div class="spinner"></div><span>Booking walk-in...</span></div>
            <div class="drawer-error" *ngIf="walkinError">{{ walkinError }}</div>
          </div>
        </div>
      </div>

      <div class="drop-overlay" *ngIf="showDropConfirm" (click)="cancelDropReschedule()">
        <div class="drop-dialog" (click)="$event.stopPropagation()">
          <div class="drop-dialog-header">
            <h3>Reschedule Booking</h3>
          </div>
          <div class="drop-dialog-body">
            <div class="drop-info-row">
              <span>Booking</span>
              <strong>{{ dropConfirmBooking?.client?.fullName || dropConfirmBooking?.title || 'Booking' }}</strong>
            </div>
            <div class="drop-info-row">
              <span>New Time</span>
              <strong>{{ dropConfirmTime }}</strong>
            </div>
            <div class="drop-info-row" *ngIf="dropConfirmTargetName">
              <span>{{ viewMode === 'staff' ? 'Staff' : 'Resource' }}</span>
              <strong>{{ dropConfirmTargetName }}</strong>
            </div>
          </div>
          <div class="drop-dialog-actions">
            <button (click)="cancelDropReschedule()" [disabled]="dropConfirmBusy">Cancel</button>
            <button class="btn-primary" (click)="confirmDropReschedule()" [disabled]="dropConfirmBusy">{{ dropConfirmBusy ? 'Rescheduling...' : 'Confirm Reschedule' }}</button>
          </div>
          <div class="drawer-loading" *ngIf="dropConfirmBusy"><div class="spinner"></div><span>Rescheduling...</span></div>
          <div class="drawer-error" *ngIf="dropConfirmError">{{ dropConfirmError }}</div>
        </div>
      </div>

      <div class="drag-ghost" *ngIf="dragGhostVisible" [style.left.px]="dragGhostX" [style.top.px]="dragGhostY">
        <strong>{{ dragGhostBooking?.client?.fullName || dragGhostBooking?.title || 'Booking' }}</strong>
        <span>{{ formatTime(dragGhostBooking?.startTime || '') }}-{{ formatTime(dragGhostBooking?.endTime || '') }}</span>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:20px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .head-actions{display:flex;gap:8px;align-items:center}
    .today-btn,.nav-btn,.refresh-btn{border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;background:white}
    .today-btn{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .refresh-btn{font-size:12px;padding:10px 14px;min-height:40px}
    .refresh-btn:disabled{opacity:.5;cursor:default}
    .updated-text{font-size:11px;color:#9ca3af;white-space:nowrap}
    .date-label{font-weight:700;font-size:16px;min-width:200px;text-align:center;color:#374151;letter-spacing:-.02em}
    .tabs{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
    .tabs button{border:1px solid #e5e7eb;border-radius:10px;padding:10px 20px;font-weight:700;cursor:pointer;background:white}
    .tabs button.active{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .tabs-divider{width:1px;height:28px;background:#e5e7eb;margin:0 8px}
    .vm-btn{font-size:12px;padding:8px 16px!important}
    .res-filter{border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:600;background:white}
    .filter-bar{display:flex;gap:8px;align-items:center;padding:0 0 8px}
    .branch-filter,.status-filter{border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:600;background:white;min-width:160px}
    .status-filter{min-width:130px}
    .res-type-badge{font-size:9px;background:#e5e7eb;color:#374151;border-radius:6px;padding:1px 6px;font-weight:600;margin-left:4px}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .summary-bar{display:flex;gap:8px;flex-wrap:wrap;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:8px 12px}
    .status-legend{display:flex;flex-wrap:wrap;gap:4px 16px;padding:6px 0 2px;align-items:center}
    .legend-item{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#4b5563}
    .legend-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .sum-card{flex:1;text-align:center;padding:2px 8px;border-right:1px solid #e5e7eb;min-width:80px}
    .sum-card:last-child{border-right:0}
    .sum-card span{display:block;font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.04em;margin-bottom:1px}
    .sum-card b{font-size:16px;color:#0b0b0b}
    .green{color:#16a34a}.amber{color:#d97706}
    .staff-filter-bar{display:flex;gap:6px;padding:10px 12px;flex-wrap:wrap;border-bottom:1px solid #e5e7eb}
    .staff-filter-pill{border:1px solid #e5e7eb;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;background:white;color:#374151;transition:all .15s}
    .staff-filter-pill.active{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .staff-filter-pill:hover:not(.active){background:#f3f4f6}
    .sf-spacer{flex:1}
    .walkin-btn{border:0;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:700;cursor:pointer;background:#059669;color:white;transition:background .15s}
    .walkin-btn:hover{background:#047857}
    .waitlist-toggle-btn{display:inline-flex;align-items:center;gap:4px;border:1px solid #d1d5db;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;background:white;color:#374151;transition:all .15s;margin-left:6px}
    .waitlist-toggle-btn:hover{background:#f3f4f6;border-color:#9ca3af}
    .waitlist-toggle-btn.active{background:#eef2ff;border-color:#6366f1;color:#4338ca}
    .ai-toggle-btn{display:inline-flex;align-items:center;gap:4px;border:1px solid #d1d5db;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;background:white;color:#374151;transition:all .15s;margin-left:6px}
    .ai-toggle-btn:hover{background:#f3f4f6;border-color:#9ca3af}
    .ai-toggle-btn.active{background:#f0f0ff;border-color:#6366f1;color:#4f46e5;box-shadow:0 0 0 1px rgba(99,102,241,.2)}
    .ai-icon{font-size:14px}
    .dv-sidebar-stack{display:flex;flex-direction:column;border-left:1px solid #e0e0e0;overflow-y:auto}
    .wl-icon{font-size:14px}
    .wl-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:9px;background:#6366f1;color:white;font-size:10px;font-weight:700;padding:0 4px}
    .dv-content-wrapper{display:flex;flex:1;min-height:0}
    .wl-fill-banner{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#fffbeb;border-bottom:2px solid #f59e0b;font-size:13px}
    .wl-fill-info{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .wl-fill-badge{font-size:10px;font-weight:700;background:#f59e0b;color:white;border-radius:6px;padding:2px 8px;text-transform:uppercase;letter-spacing:.03em}
    .wl-fill-cancel{font-size:11px;padding:4px 12px;background:white;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;color:#374151;font-weight:600;transition:background .12s,border-color .12s}
    .wl-fill-cancel:hover{background:#f3f4f6;border-color:#9ca3af}
    .wl-fill-cancel:hover{background:#f3f4f6}
    .view-transition{animation:calFadeIn .2s ease}
    @keyframes calFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @media(prefers-reduced-motion:reduce){.view-transition{animation:none}}
    .day-view{background:white;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden}
    .dv-container{display:flex}
    .dv-time-col{flex-shrink:0;width:60px;border-right:1px solid #e5e7eb;background:#fafafa}
    .dv-header-gap{height:52px;border-bottom:1px solid #e5e7eb}
    .dv-time-row{height:56px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #f1f5f9;cursor:pointer}
    .dv-time-row:hover{background:#eef2ff}
    .dv-time-label{font-size:11px;color:#6b7280;font-weight:600}
    .dv-staff-scroll{display:flex;flex:1;overflow-x:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
    .dv-staff-col{min-width:200px;flex:1 0 200px;border-right:1px solid #e5e7eb}
    .dv-staff-col:last-child{border-right:0}
    .dv-staff-header{min-height:52px;display:flex;align-items:center;font-weight:700;font-size:13px;border-bottom:1px solid #e5e7eb;background:#f9fafb;position:sticky;top:0;z-index:2;padding:6px 10px}
    .staff-header-content{display:flex;align-items:center;gap:8px;width:100%}
    .staff-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white;flex-shrink:0}
    .staff-avatar-c1{background:#6366f1}.staff-avatar-c2{background:#059669}.staff-avatar-c3{background:#d97706}.staff-avatar-c4{background:#dc2626}.staff-avatar-c5{background:#7c3aed}
    .staff-header-main{display:flex;flex-direction:column;min-width:0;flex:1}
    .staff-header-name{font-size:13px;font-weight:700;color:#0b0b0b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .staff-header-meta{font-size:9px;color:#6b7280;font-weight:600}
    .dv-staff-body{position:relative}
    .dv-hour-row{height:56px;border-bottom:1px solid #f1f5f9;padding:2px 4px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:2px;overflow:hidden;cursor:pointer}
    .dv-hour-row:hover{background:#f0f4ff}
    .dv-hour-row-alt{background:#fafafa}
    .dv-hour-busy{background:#f0f4ff!important}
    .dv-hour-busy:hover{background:#e0e8ff!important}
    .dv-unassigned-col{background:#fafcff}
    .dv-unassigned-col .dv-staff-header{background:#eef2ff;color:#4338ca;font-style:italic;border-left:3px solid #6366f1}
    .dv-unassigned-col .booking-chip{opacity:.85}
    .dv-unassigned-col .dv-bookings-layer .booking-chip{opacity:.85}
    .dv-empty-staff{padding:48px;text-align:center;color:#6b7280}
    .dv-empty-staff strong{display:block;font-size:16px;color:#374151;margin-bottom:4px}
    .dv-empty-staff p{font-size:13px;color:#9ca3af}
    .dv-empty-bookings{padding:32px 24px;text-align:center;color:#6b7280;background:white;border-radius:16px;border:1px solid #e5e7eb;margin:12px}
    .dv-empty-bookings strong{display:block;font-size:14px;color:#374151;margin-bottom:4px}
    .dv-empty-bookings p{margin:0 0 12px}
    .empty-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:4px}
    .empty-btn{padding:7px 14px;border-radius:8px;border:1px solid #e5e7eb;background:white;font-size:11px;font-weight:700;color:#6366f1;cursor:pointer;transition:background .12s,border-color .12s}
    .empty-btn:hover{background:#eef2ff;border-color:#6366f1}
    .empty-btn-secondary{color:#4b5563}
    .empty-btn-secondary:hover{background:#f3f4f6;border-color:#d1d5db}
    .booking-chip{padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;background:#f3f4f6;width:100%;position:relative}
    .booking-chip.status-confirmed{background:#dbeafe;border-left:3px solid #3b82f6}
    .booking-chip.status-completed{background:#f0fdf4;border-left:3px solid #16a34a}
    .booking-chip.status-pending{background:#fefce8;border-left:3px solid #eab308}
    .booking-chip.status-cancelled{background:#fef2f2;border-left:3px solid #dc2626;text-decoration:line-through}
    .booking-chip.status-checked_in{background:#f3e8ff;border-left:3px solid #7c3aed}
    .booking-chip strong{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .booking-chip span{display:none}
    .booking-chip{transition:transform .12s ease,box-shadow .12s ease}
    @media(hover:hover){.booking-chip:hover{transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,.06)}}
    .booking-chip:active{transform:scale(.97)}
    .booking-bar{position:absolute;bottom:2px;left:6px;right:6px;height:2px;border-radius:1px;background:rgba(0,0,0,.08);pointer-events:none}
    .dv-staff-body{position:relative}
    .dv-bookings-layer{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none}
    .dv-bookings-layer .booking-chip{pointer-events:auto;position:absolute;overflow:hidden;z-index:1;border-radius:6px;padding:4px 8px;font-size:10px;cursor:pointer;background:#f3f4f6;border-left:3px solid #d1d5db;display:flex;flex-direction:column;gap:1px;min-height:18px}
    .dv-bookings-layer .booking-chip.status-confirmed{background:#dbeafe;border-left-color:#3b82f6}
    .dv-bookings-layer .booking-chip.status-completed{background:#f0fdf4;border-left-color:#16a34a}
    .dv-bookings-layer .booking-chip.status-pending{background:#fefce8;border-left-color:#eab308}
    .dv-bookings-layer .booking-chip.status-cancelled{background:#fef2f2;border-left-color:#dc2626;text-decoration:line-through}
    .dv-bookings-layer .booking-chip.status-checked_in{background:#f3e8ff;border-left-color:#7c3aed}
    .dv-bookings-layer .booking-chip strong{display:block;font-size:10px;font-weight:700;color:#0b0b0b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}
    .dv-bookings-layer .booking-chip span{display:block;font-size:9px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}
    .dv-bookings-layer .booking-chip{transition:transform .12s ease,box-shadow .12s ease}
    @media(hover:hover){.dv-bookings-layer .booking-chip:hover{transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,0,0,.08);z-index:2}}
    .dv-bookings-layer .booking-chip:active{transform:scale(.97)}
    .booking-chip:focus-visible,.week-booking:focus-visible,.month-preview-chip:focus-visible{outline:2px solid #6366f1;outline-offset:2px;border-radius:6px}
    .dv-bookings-layer .booking-chip:focus-visible{outline:2px solid #6366f1;outline-offset:1px;z-index:3}
    .current-time-line{position:absolute;left:0;right:0;height:2px;background:#ef4444;z-index:5;pointer-events:none}
    .current-time-label{position:absolute;right:4px;top:-8px;background:#ef4444;color:white;font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px;pointer-events:none;line-height:1.4}
    .dv-bookings-layer .booking-chip{touch-action:none;cursor:grab}
    .dv-bookings-layer .booking-chip.dragging-booking{opacity:.35;pointer-events:none;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,.12)}
    .calendar-dragging{cursor:grabbing!important;-webkit-user-select:none;user-select:none}
    .calendar-dragging .dv-bookings-layer .booking-chip{pointer-events:none;transform:none!important;box-shadow:none!important}
    .dv-staff-col.drag-over-slot{background:#f8faff}
    .dv-staff-col.drag-over-slot .dv-staff-header{background:#eef2ff}
    .drag-ghost{position:fixed;pointer-events:none;z-index:55;background:white;border:1px solid #d1d5db;border-left:3px solid #6366f1;border-radius:8px;padding:6px 12px;font-size:11px;display:flex;flex-direction:column;gap:2px;box-shadow:0 6px 20px rgba(0,0,0,.14);opacity:.88;transform:translate(-50%,-50%);max-width:200px;white-space:nowrap}
    .drag-ghost strong{font-size:11px;font-weight:700;color:#0b0b0b;overflow:hidden;text-overflow:ellipsis}
    .drag-ghost span{font-size:10px;color:#374151;overflow:hidden;text-overflow:ellipsis}
    .week-view{background:white;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden}
    .week-header{display:grid;grid-template-columns:repeat(7,1fr);background:#f9fafb;border-bottom:1px solid #e5e7eb}
    .week-day-header{padding:14px 8px;text-align:center;cursor:pointer;border-right:1px solid #e5e7eb;transition:background .15s}
    .week-day-header:last-child{border-right:0}
    .week-day-header:hover{background:#f3f4f6}
    .week-day-header.today{background:#eef2ff}
    .week-day-header strong{display:block;font-size:13px}
    .week-day-date{font-size:11px;color:#6b7280;display:block}
    .week-day-count{font-size:10px;color:#6366f1;font-weight:700;display:block;margin-top:4px}
    .week-body{display:grid;grid-template-columns:repeat(7,1fr);min-height:300px}
    .week-day-col{padding:8px;border-right:1px solid #f1f5f9;min-height:200px}
    .week-day-col:last-child{border-right:0}
    .week-day-col.today{background:#fafcff}
    .week-day-col:hover{background:#f9fafb}
    .week-booking{padding:8px 10px;border-radius:8px;margin-bottom:6px;cursor:pointer;font-size:11px;background:#f3f4f6;border-left:3px solid transparent;position:relative}
    .week-booking.status-confirmed{background:#dbeafe;border-left-color:#3b82f6}
    .week-booking.status-completed{background:#f0fdf4;border-left-color:#16a34a}
    .week-booking.status-pending{background:#fefce8;border-left-color:#eab308}
    .week-booking.status-cancelled{background:#fef2f2;border-left-color:#dc2626;text-decoration:line-through}
    .week-booking.status-checked_in{background:#f3e8ff;border-left-color:#7c3aed}
    .week-booking strong{display:block;font-size:12px;margin-bottom:2px}
    .week-booking span{display:block;color:#374151;margin-bottom:2px}
    .week-booking small{color:#6b7280;font-size:10px}
    .week-empty{text-align:center;color:#6366f1;font-size:13px;font-weight:700;padding:24px 0;cursor:pointer;border:2px dashed #e5e7eb;border-radius:8px;margin:4px 0;transition:border-color .15s,background .15s}
    .week-empty:hover{border-color:#6366f1;background:#f0f4ff}
    .week-add-action{text-align:center;color:#6366f1;font-size:12px;font-weight:700;padding:8px;cursor:pointer;border-radius:8px;transition:background .15s}
    .week-add-action:hover{background:#eef2ff}
    .month-view{background:white;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden}
    .month-grid{display:grid;grid-template-columns:repeat(7,1fr)}
    .weekday-label{padding:12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb}
    .month-day{padding:8px;min-height:100px;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .15s}
    .month-day:nth-child(7n){border-right:0}
    .month-day.other-month{opacity:.4}
    .month-day.today{background:#f0f9ff}
    .month-day.selected{background:#fafcff}
    .month-day:hover{background:#f9fafb}
    .month-day-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
    .month-date-number{font-size:14px;font-weight:700;color:#0b0b0b}
    .other-month .month-date-number{color:#9ca3af}
    .month-today-badge{font-size:9px;background:#6366f1;color:white;border-radius:8px;padding:1px 6px;font-weight:700}
    .today-badge{font-size:10px;background:#6366f1;color:white;border-radius:10px;padding:2px 8px;font-weight:700;margin-left:8px;vertical-align:middle}
    .month-booking-count{font-size:10px;color:#6366f1;font-weight:700;margin-bottom:4px}
    .month-status-row{display:flex;gap:4px;margin-bottom:4px;flex-wrap:wrap;align-items:center}
    .month-status-item{display:flex;align-items:center;gap:2px}
    .month-status-dot{width:7px;height:7px;border-radius:50%;display:inline-block}
    .month-status-num{font-size:9px;color:#6b7280;font-weight:700}
    .dot-confirmed{background:#3b82f6}.dot-completed{background:#16a34a}.dot-pending{background:#eab308}.dot-cancelled{background:#dc2626}.dot-checked_in{background:#7c3aed}
    .month-preview-list{display:grid;gap:2px}
    .month-preview-chip{padding:2px 6px;border-radius:4px;font-size:10px;cursor:pointer;background:#f3f4f6;border-left:2px solid transparent;display:flex;gap:4px;align-items:center;overflow:hidden;position:relative}
    .month-preview-chip.status-confirmed{background:#dbeafe;border-left-color:#3b82f6}
    .month-preview-chip.status-completed{background:#f0fdf4;border-left-color:#16a34a}
    .month-preview-chip.status-pending{background:#fefce8;border-left-color:#eab308}
    .month-preview-chip.status-cancelled{background:#fef2f2;border-left-color:#dc2626}
    .month-preview-chip.status-checked_in{background:#f3e8ff;border-left-color:#7c3aed}
    .mp-time{color:#6b7280;font-weight:600;flex-shrink:0}
    .mp-title{color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .month-more{font-size:10px;color:#6366f1;font-weight:700;cursor:pointer;padding:2px 4px}
    .month-more:hover{text-decoration:underline}
    .month-add-action{font-size:10px;color:#6366f1;font-weight:700;cursor:pointer;padding:2px 4px;transition:background .15s;border-radius:4px;display:inline-block}
    .month-add-action:hover{background:#eef2ff}
    .month-add-empty{font-size:11px;color:#6366f1;font-weight:700;cursor:pointer;padding:4px;text-align:center;border:1px dashed #e5e7eb;border-radius:6px;transition:border-color .15s,background .15s}
    .month-add-empty:hover{border-color:#6366f1;background:#f0f4ff}
    .month-empty{font-size:10px;color:#d1d5db;padding:2px 0}
    .empty{padding:48px 32px;text-align:center;max-width:420px;margin:24px auto;color:#6b7280;background:white;border-radius:20px;border:1px solid #e5e7eb}
    .empty strong{display:block;font-size:16px;color:#374151;margin-bottom:4px}
    .empty p{font-size:13px;color:#9ca3af;margin:0 0 16px}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white;z-index:1}
    .drawer-header h2{margin:0;font-size:20px}
    .close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280;padding:0;line-height:1}
    .drawer-body{padding:24px 28px;display:grid;gap:24px}
    .drawer-section{background:#fafafa;border-radius:14px;padding:16px 18px;border:1px solid #f3f4f6}
    .drawer-section h3{font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 14px;letter-spacing:.06em}
    .info-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
    .info-row:last-child{border-bottom:0}
    .info-row span:first-child{color:#6b7280;font-weight:600}
    .info-row span:last-child{text-align:right;max-width:60%;font-weight:600;color:#0b0b0b}
    .drawer-status-row{text-align:center;padding:4px 0 12px;border-bottom:1px solid #f3f4f6;margin-bottom:2px}
    .status-badge{font-size:12px;padding:4px 14px;border-radius:20px;font-weight:700;display:inline-block;letter-spacing:.02em}
    .badge-confirmed{background:#dbeafe;color:#1d4ed8}
    .badge-completed{background:#f0fdf4;color:#16a34a}
    .badge-pending{background:#fefce8;color:#a16207}
    .badge-cancelled{background:#fef2f2;color:#dc2626}
    .badge-no_show{background:#f3f4f6;color:#6b7280}
    .badge-checked_in{background:#f3e8ff;color:#7c3aed}
    .drawer-actions{display:flex;gap:10px;flex-wrap:wrap;padding:4px 0}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px;min-height:44px;transition:opacity .15s,background .15s,transform .1s}
    .drawer-actions button:active{transform:scale(.97)}
    .btn-primary{background:#0b0b0b;color:white}
    .btn-primary:hover{background:#1f2937}
    .btn-primary:disabled{opacity:.5;cursor:default;background:#9ca3af}
    .btn-secondary{background:#f3f4f6;color:#374151}
    .btn-secondary:hover{background:#e5e7eb}
    .btn-secondary:disabled{opacity:.5;cursor:default}
    .btn-danger{background:#fee2e2;color:#991b1b}
    .btn-danger:hover{background:#fecaca}
    .btn-danger:disabled{opacity:.5;cursor:default}
    .reschedule-form{display:grid;gap:12px;padding:16px;background:#f9fafb;border-radius:16px}
    .reschedule-form h3{margin:0;font-size:14px;font-weight:700}
    .reschedule-form label{font-size:13px;font-weight:600;color:#374151;margin-bottom:-8px}
    .reschedule-form select,.reschedule-form input{padding:12px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px}
    .cancel-form{display:grid;gap:12px;padding:16px;background:#fef2f2;border-radius:16px;border:1px solid #fecaca}
    .cancel-form h3{margin:0;font-size:14px;font-weight:700;color:#991b1b}
    .cancel-form label{font-size:13px;font-weight:600;color:#374151;margin-bottom:-8px}
    .cancel-form select,.cancel-form input{padding:12px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px}
    .edit-form{display:grid;gap:12px;padding:16px;background:#f9fafb;border-radius:16px}
    .edit-form h3{margin:0;font-size:14px;font-weight:700}
    .edit-form label{font-size:13px;font-weight:600;color:#374151;margin-bottom:-8px}
    .edit-form input,.edit-form textarea{padding:12px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;font-family:inherit;resize:vertical}
    .confirm-action{display:grid;gap:12px;padding:16px;background:#f0fdf4;border-radius:16px;border:1px solid #bbf7d0;text-align:center}
    .confirm-action h3{margin:0;font-size:14px;font-weight:700;color:#166534}
    .confirm-action p{margin:0;font-size:13px;color:#374151}
    .svc-info-row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;border-bottom:1px solid #f3f4f6}
    .svc-info-row span:last-child{color:#6b7280;white-space:nowrap}
    .client-name{font-weight:700;color:#0b0b0b}
    .cancel-custom-row{display:grid;gap:8px}
    .drawer-loading{display:flex;align-items:center;gap:10px;justify-content:center;padding:12px;color:#6b7280;font-size:13px}
    .drawer-error{background:#fef2f2;color:#991b1b;padding:12px;border-radius:12px;font-size:13px;text-align:center}
    .drawer-centered{justify-content:center;align-items:center}
    .create-panel{background:white;border-radius:24px;width:min(520px,90%);max-height:min(90dvh,100%);overflow-y:auto;-webkit-overflow-scrolling:touch;animation:fadeIn .2s ease}
    @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    .create-form{display:grid;gap:12px}
    .create-form label{font-size:13px;font-weight:700;color:#374151;margin-bottom:-6px}
    .create-form input,.create-form select{padding:14px;border:1px solid #e5e7eb;border-radius:14px;font-size:14px}
    .create-services{display:grid;gap:8px}
    .svc-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .svc-select{flex:1;min-width:140px}
    .svc-info{font-size:13px;font-weight:700;color:#374151;white-space:nowrap}
    .remove-btn{border:0;background:#fee2e2;color:#991b1b;border-radius:8px;width:32px;height:32px;font-weight:900;cursor:pointer;flex-shrink:0}
    .add-btn{border:1px dashed #e5e7eb;border-radius:12px;padding:12px;background:transparent;cursor:pointer;font-weight:600;font-size:13px}
    .svc-totals{display:grid;gap:6px;padding:12px 14px;background:#f9fafb;border-radius:12px;font-size:13px}
    .svc-tl{display:flex;justify-content:space-between;align-items:center}
    .svc-tl span{color:#6b7280;font-weight:600}
    .svc-tl strong{color:#0b0b0b}
    .walkin-note{font-size:12px;color:#6b7280;background:#f0fdf4;border-radius:12px;padding:10px 14px;line-height:1.5}
    .drop-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:60}
    .drop-dialog{background:white;border-radius:20px;width:min(420px,92%);max-height:90dvh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.18);animation:fadeIn .2s ease;display:grid;gap:0}
    .drop-dialog-header{padding:20px 24px 0}
    .drop-dialog-header h3{margin:0;font-size:17px;font-weight:700;color:#0b0b0b}
    .drop-dialog-body{display:grid;gap:2px;padding:16px 24px}
    .drop-info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;gap:12px}
    .drop-info-row:last-child{border-bottom:0}
    .drop-info-row span{color:#6b7280;font-weight:600;white-space:nowrap}
    .drop-info-row strong{text-align:right;color:#0b0b0b;word-break:break-word}
    .drop-dialog-actions{display:flex;gap:10px;padding:4px 24px 20px}
    .drop-dialog-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px;min-height:44px}
    .drop-dialog-actions button:first-child{background:#f3f4f6;color:#374151}
    .drop-dialog-actions button:first-child:hover{background:#e5e7eb}
    .drop-dialog-actions button:first-child:disabled{opacity:.5;cursor:default}
    @media(max-width:480px){
      .drop-dialog{border-radius:16px;width:94%}
      .drop-dialog-header{padding:16px 18px 0}
      .drop-dialog-header h3{font-size:15px}
      .drop-dialog-body{padding:12px 18px}
      .drop-info-row{font-size:13px;padding:8px 0}
      .drop-dialog-actions{padding:2px 18px 16px;gap:6px}
      .drop-dialog-actions button{font-size:12px;padding:10px 12px;min-height:40px}
    }
    @media(max-width:1200px){
      .page{max-width:100%;overflow-x:hidden}
      .dv-content-wrapper{max-width:100%}
    }
    @media(max-width:1024px){
      .day-view{border-radius:16px}
      .dv-staff-col{min-width:180px;flex:1 0 180px}
      .dv-hour-row{height:50px}
      .dv-time-row{height:50px}
      .drawer-header{padding:20px 24px}
      .drawer-body{padding:20px 24px}
      .drawer-header h2{font-size:18px}
      .month-day{min-height:90px}
      .month-date-number{font-size:13px}
      .dv-sidebar-stack{min-width:260px;max-width:320px}
    }
    @media(max-width:900px){
      .drawer-panel{width:100%}
      .summary-bar{gap:4px;padding:6px 10px}
      .sum-card{padding:2px 6px;min-width:60px}
      .week-view,.month-view{overflow-x:auto;-webkit-overflow-scrolling:touch}
      .month-grid{min-width:700px}
      .week-header{min-width:700px}
      .week-body{min-width:700px}
      .week-day-col{min-width:100px}
      .dv-staff-col{min-width:160px;flex:1 0 160px}
      .dv-hour-row{height:48px}
      .dv-time-row{height:48px}
      .head-actions{flex-wrap:wrap;justify-content:center}
      .staff-filter-bar{gap:4px;padding:8px}
      .dv-sidebar-stack{min-width:240px;max-width:280px}
      .wl-fill-banner{flex-wrap:wrap;gap:6px;padding:6px 12px}
      .create-panel{width:min(500px,95%)}
    }
    @media(max-width:768px){
      .head h1{font-size:24px}
      .head p{display:none}
      .date-label{font-size:14px;min-width:auto}
      .today-btn,.nav-btn{padding:8px 12px;font-size:13px;min-height:40px}
      .refresh-btn{padding:8px 12px;font-size:12px;min-height:40px}
      .updated-text{font-size:10px}
      .tabs button{padding:8px 14px;font-size:12px;min-height:40px}
      .vm-btn{padding:6px 12px!important}
      .summary-bar{gap:2px;padding:6px 8px}
      .sum-card{padding:2px 4px;min-width:50px}
      .sum-card b{font-size:14px}
      .dv-staff-col{min-width:150px;flex:1 0 150px}
      .dv-hour-row{height:44px}
      .dv-time-row{height:44px}
      .dv-time-col{width:48px}
      .dv-time-label{font-size:10px}
      .day-view{border-radius:12px}
      .week-view,.month-view{border-radius:12px}
      .drawer-header{padding:16px 20px}
      .drawer-body{padding:16px 20px}
      .drawer-header h2{font-size:17px}
      .drawer-actions button{font-size:12px;padding:10px 12px;min-height:42px}
      .month-day{min-height:80px;padding:6px}
      .month-date-number{font-size:12px}
      .month-preview-chip{font-size:9px}
      .mp-time{font-size:9px}
      .create-panel{width:95%}
      .create-form input,.create-form select{padding:12px;font-size:13px}
      .reschedule-form select,.reschedule-form input{padding:10px}
      .cancel-form select,.cancel-form input{padding:10px}
      .edit-form input,.edit-form textarea{padding:10px}
      .filter-bar{padding:0 0 6px}
      .branch-filter{font-size:12px;padding:6px 10px;min-width:140px}
      .tabs-divider{display:none}
      .staff-filter-bar{gap:4px;padding:6px 8px;justify-content:center}
      .staff-filter-pill{padding:4px 10px;font-size:11px}
      .sf-spacer{display:none}
      .walkin-btn,.waitlist-toggle-btn,.ai-toggle-btn{padding:4px 10px;font-size:11px}
      .waitlist-toggle-btn,.ai-toggle-btn{margin-left:0}
      .dv-sidebar-stack{min-width:200px;max-width:260px;border-left-width:0;border-top:1px solid #e0e0e0}
      .dv-content-wrapper{flex-direction:column}
      .dv-container{overflow-x:auto;-webkit-overflow-scrolling:touch}
      .dv-staff-scroll{overflow-x:auto}
      .drawer-panel{max-height:100dvh}
      .res-filter{font-size:12px;padding:6px 10px}
    }
    @media(max-width:640px){
      .page{gap:12px}
      .head{flex-direction:column;align-items:stretch;gap:8px}
      .head h1{font-size:20px}
      .head-actions{flex-wrap:wrap;justify-content:center;gap:4px}
      .date-label{font-size:12px;min-width:0;width:100%;order:-1;text-align:center}
      .today-btn,.nav-btn{padding:6px 10px;font-size:11px;min-height:34px;flex:1;text-align:center}
      .refresh-btn{padding:6px 10px;font-size:11px;min-height:34px;flex:1}
      .updated-text{display:none}
      .tabs{gap:2px;justify-content:center}
      .tabs button{padding:6px 10px;font-size:11px;min-height:34px;flex:1;text-align:center}
      .vm-btn{padding:4px 8px!important}
      .filter-bar{flex-wrap:wrap;gap:4px}
      .branch-filter,.status-filter{font-size:11px;min-width:0;width:100%;padding:6px 10px}
      .summary-bar{gap:2px;padding:4px 6px;overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch}
      .sum-card{padding:2px 4px;min-width:60px;flex:0 0 auto;border-right:1px solid #e5e7eb}
      .sum-card b{font-size:13px}
      .sum-card span{font-size:8px}
      .staff-filter-bar{padding:6px;gap:3px;overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;justify-content:flex-start}
      .staff-filter-pill{padding:4px 8px;font-size:10px;white-space:nowrap;flex-shrink:0}
      .walkin-btn,.waitlist-toggle-btn,.ai-toggle-btn{padding:4px 8px;font-size:10px;white-space:nowrap;flex-shrink:0}
      .day-view{border-radius:10px;border-left:0;border-right:0}
      .dv-time-col{width:36px}
      .dv-time-label{font-size:9px}
      .dv-staff-col{min-width:130px;flex:1 0 130px}
      .dv-hour-row{height:38px}
      .dv-time-row{height:38px}
      .dv-header-gap{height:40px}
      .dv-staff-header{min-height:40px;padding:4px 6px;font-size:11px}
      .staff-avatar{width:22px;height:22px;font-size:10px}
      .staff-header-name{font-size:11px}
      .staff-header-meta{font-size:8px}
      .dv-empty-bookings{padding:16px;font-size:12px}
      .dv-empty-staff{padding:24px;font-size:12px}
      .week-view,.month-view{border-radius:10px;border-left:0;border-right:0}
      .month-day{min-height:60px;padding:3px}
      .month-date-number{font-size:10px}
      .month-today-badge{font-size:7px;padding:1px 4px}
      .month-booking-count{font-size:9px}
      .month-preview-chip{padding:1px 3px;font-size:7px;gap:1px}
      .mp-time{font-size:7px}
      .month-more{font-size:8px;padding:1px 2px}
      .month-add-action{font-size:8px}
      .month-add-empty{font-size:9px;padding:2px}
      .week-day-header{padding:8px 2px}
      .week-day-header strong{font-size:10px}
      .week-day-date{font-size:9px}
      .week-day-count{font-size:8px}
      .week-day-col{padding:4px;min-width:80px}
      .week-booking{padding:4px 6px;font-size:10px}
      .week-booking strong{font-size:10px}
      .week-booking span{font-size:9px}
      .week-booking small{font-size:8px}
      .week-empty{font-size:11px;padding:12px 0}
      .drawer-panel{max-height:100dvh;border-radius:0}
      .drawer-centered .create-panel{width:100%;max-height:100dvh;border-radius:0}
      .dv-sidebar-stack{min-width:100%;max-width:100%;border-top:1px solid #e0e0e0;max-height:300px}
    }
    @media(max-width:480px){
      .head h1{font-size:18px}
      .head-actions{justify-content:center;gap:4px}
      .date-label{font-size:12px;min-width:0}
      .today-btn,.nav-btn{padding:5px 8px;font-size:11px;min-height:32px}
      .refresh-btn{padding:5px 8px;font-size:10px;min-height:32px}
      .tabs{justify-content:center}
      .tabs button{padding:5px 8px;font-size:10px;min-height:32px}
      .vm-btn{padding:3px 6px!important}
      .summary-bar{gap:2px;padding:4px 6px}
      .sum-card{padding:2px 2px;min-width:50px}
      .sum-card span{font-size:8px}
      .sum-card b{font-size:12px}
      .dv-time-col{width:34px}
      .dv-staff-col{min-width:120px;flex:1 0 120px}
      .dv-hour-row{height:36px}
      .dv-time-row{height:36px}
      .dv-header-gap{height:38px}
      .dv-staff-header{min-height:38px}
      .dv-time-label{font-size:8px}
      .week-day-header{padding:6px 2px}
      .week-day-header strong{font-size:10px}
      .week-day-date{font-size:8px}
      .week-day-count{font-size:8px}
      .month-day{min-height:56px;padding:2px}
      .month-date-number{font-size:10px}
      .month-preview-chip{padding:1px 2px;font-size:7px;gap:1px}
      .month-more{font-size:8px}
      .month-add-action{font-size:8px}
      .month-add-empty{font-size:8px}
      .drawer-panel{max-height:100dvh}
      .drawer-header{padding:12px 16px}
      .drawer-body{padding:12px 16px;gap:14px}
      .drawer-header h2{font-size:15px}
      .drawer-actions{gap:6px}
      .drawer-actions button{font-size:11px;padding:8px 10px;min-height:38px}
      .info-row{font-size:12px;padding:6px 0}
      .create-panel{width:100%;border-radius:0;max-height:100dvh}
      .create-form input,.create-form select{padding:10px;font-size:12px}
      .create-form label{font-size:12px}
      .svc-row{gap:4px}
      .svc-select{min-width:80px}
      .reschedule-form{padding:10px;gap:8px}
      .cancel-form{padding:10px;gap:8px}
      .edit-form{padding:10px;gap:8px}
      .confirm-action{padding:10px}
      .filter-bar{padding:0 0 4px}
      .branch-filter,.status-filter{font-size:11px;padding:5px 8px;min-width:0}
      .res-filter{font-size:11px;padding:5px 8px}
      .dv-sidebar-stack{max-height:260px}
    }
  `]
})
export class CalendarComponent {
  private api = inject(CalendarService);
  private staffApi = inject(StaffService);
  private resourcesApi = inject(ResourcesService);
  private http = inject(HttpClient);

  view: ViewMode = 'day';
  viewMode: StaffResourceMode = 'staff';
  currentDate = new Date();
  bookings: CalendarBooking[] = [];
  statusFilter = '';
  fullBookings: CalendarBooking[] = [];
  summary: CalendarSummaryResponse | null = null;
  loading = true;
  error = '';
  drawerBooking: CalendarBooking | null = null;
  drawerBusy = false;
  drawerError = '';
  showCancelForm = false;
  cancelReason = '';
  cancelCustomReason = '';
  cancelReasonOptions = [
    'Client requested cancellation',
    'Client no-show',
    'Staff unavailable',
    'Duplicate booking',
    'Wrong booking details',
    'Other',
  ];

  private dayViewScrollLeft = 0;
  private dayViewScrollTop = 0;
  private isRestoringScroll = false;

  readonly statusLegendItems = [
    { label: 'Confirmed', cls: 'confirmed' },
    { label: 'Pending', cls: 'pending' },
    { label: 'Completed', cls: 'completed' },
    { label: 'Cancelled', cls: 'cancelled' },
    { label: 'Checked In', cls: 'checked_in' },
  ];

  showEditForm = false;
  editBusy = false;
  editForm: EditFormModel = { title: '', notes: '' };

  showConfirmAction = false;
  confirmTargetStatus = '';
  confirmLabel = '';

  dayHours = Array.from({ length: 12 }, (_, i) => i + 8);
  weekDays: WeekDay[] = [];
  monthDays: MonthDay[] = [];
  staffList: Staff[] = [];
  resourceList: CalendarResource[] = [];
  resourceFilter = '';
  selectedStaffFilter = '';
  selectedBranchId = '';

  showCreate = false;
  createBusy = false;
  createError = '';
  createForm: CreateFormModel = { clientId: '', staffId: '', title: '', startTime: '', branchId: '', notes: '', resourceId: '', services: [{ serviceId: '', name: '', durationMin: 0, price: 0 }] };
  clientList: ClientOption[] = [];
  serviceList: ServiceOption[] = [];
  branchList: BranchOption[] = [];

  showWalkin = false;
  walkinBusy = false;
  walkinError = '';
  walkinForm: WalkinFormModel = { clientName: '', staffId: '', startTime: '', branchId: '', serviceId: '', serviceName: '', serviceDuration: 30, servicePrice: 0 };

  showReschedule = false;
  rescheduleBusy = false;
  rescheduleError = '';
  rescheduleForm: RescheduleFormModel = { staffId: '', startTime: '' };

  showWaitlist = false;
  waitlistEntries: WaitlistEntry[] = [];
  waitlistLoading = false;
  waitlistError = '';
  fillWaitlistEntry: WaitlistEntry | null = null;

  showAiPanel = false;
  aiSuggestions: AiSuggestion[] = [];
  aiLoading = false;
  aiError = '';
  aiServiceId = '';
  aiServiceDuration = 30;
  aiOptimizing = false;
  aiOptimization: AiOptimization | null = null;

  dragBooking: CalendarBooking | null = null;
  dragStartX = 0;
  dragStartY = 0;
  dragDidMove = false;
  dragLockClick = false;
  dropTargetStaffId: string | null = null;
  dropTargetResourceId: string | null = null;
  dropTargetHour: number | null = null;
  dropTargetMinute = 0;
  private previousDropTarget: HTMLElement | null = null;

  dragGhostVisible = false;
  dragGhostX = 0;
  dragGhostY = 0;
  dragGhostBooking: CalendarBooking | null = null;

  showDropConfirm = false;
  dropConfirmBooking: CalendarBooking | null = null;
  dropConfirmTime = '';
  dropConfirmTargetName = '';
  private dropConfirmPayload: Record<string, any> = {};
  dropConfirmBusy = false;
  dropConfirmError = '';

  lastUpdated = '';
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

  get visibleStaffList(): Staff[] {
    if (!this.selectedStaffFilter) return this.staffList;
    return this.staffList.filter(s => s.id === this.selectedStaffFilter);
  }

  get dateLabel(): string {
    if (this.view === 'day') return `Day · ${this.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
    if (this.view === 'week') {
      const start = this.weekDays[0]?.date;
      const end = this.weekDays[6]?.date;
      return start ? `Week · ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '';
    }
    return `Month · ${this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }

  ngOnInit() { this.load(); this.startAutoRefresh(); }
  ngOnDestroy() { this.stopAutoRefresh(); }

  @HostListener('document:keydown', ['$event'])
  handleCalendarShortcut(event: KeyboardEvent): void {
    if (this.shouldIgnoreCalendarShortcut(event)) return;
    if (this.dragBooking) return;
    const key = event.key;
    if (key === 'Escape') {
      if (this.showDropConfirm) { this.cancelDropReschedule(); event.preventDefault(); return; }
      if (this.showWalkin) { this.closeWalkin(); event.preventDefault(); return; }
      if (this.showCreate) { this.closeCreate(); event.preventDefault(); return; }
      if (this.drawerBooking) { this.closeDrawer(); event.preventDefault(); return; }
      return;
    }
    if ((event.target as HTMLElement)?.closest?.('[role="dialog"], [role="alertdialog"], .drawer, .drawer-overlay')) return;
    switch (key) {
      case 'ArrowLeft': this.prev(); event.preventDefault(); break;
      case 'ArrowRight': this.next(); event.preventDefault(); break;
      case 't': case 'T': this.goToday(); event.preventDefault(); break;
      case 'd': case 'D': this.setView('day'); event.preventDefault(); break;
      case 'w': case 'W': this.setView('week'); event.preventDefault(); break;
      case 'm': case 'M': this.setView('month'); event.preventDefault(); break;
    }
  }

  private shouldIgnoreCalendarShortcut(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  setView(v: 'day' | 'week' | 'month') {
    this.saveDayViewScroll();
    this.view = v;
    this.load();
  }

  private saveDayViewScroll() {
    const el = document.querySelector('.dv-staff-scroll');
    if (el) {
      this.dayViewScrollLeft = el.scrollLeft;
      this.dayViewScrollTop = el.scrollTop;
    }
  }

  private restoreDayViewScroll() {
    const el = document.querySelector('.dv-staff-scroll');
    if (el) {
      this.isRestoringScroll = true;
      el.scrollLeft = this.dayViewScrollLeft;
      el.scrollTop = this.dayViewScrollTop;
      requestAnimationFrame(() => { this.isRestoringScroll = false; });
    }
  }
  goToday() { this.currentDate = new Date(); this.load(); }

  prev() {
    if (this.view === 'day') this.currentDate.setDate(this.currentDate.getDate() - 1);
    if (this.view === 'week') this.currentDate.setDate(this.currentDate.getDate() - 7);
    if (this.view === 'month') this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.load();
  }

  next() {
    if (this.view === 'day') this.currentDate.setDate(this.currentDate.getDate() + 1);
    if (this.view === 'week') this.currentDate.setDate(this.currentDate.getDate() + 7);
    if (this.view === 'month') this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.drawerBooking = null;
    const dateStr = this.currentDate.toISOString().slice(0, 10);
    const params: CalendarQueryParams = { date: dateStr };
    if (this.selectedBranchId) params.branchId = this.selectedBranchId;

    if (this.view === 'day') {
      this.api.getCalendarDay(params).subscribe({
        next: (d) => { this.fullBookings = Array.isArray(d) ? d : []; this.applyStatusFilter(); this.loading = false; requestAnimationFrame(() => this.restoreDayViewScroll()); },
        error: () => { this.error = 'Calendar data unavailable.'; this.loading = false; },
      });
    }
    if (this.view === 'week') {
      this.api.getCalendarWeek(params).subscribe({
        next: (d) => { this.fullBookings = Array.isArray(d) ? d : []; this.applyStatusFilter(); this.buildWeek(); this.loading = false; },
        error: () => { this.error = 'Calendar data unavailable.'; this.loading = false; },
      });
    }
    if (this.view === 'month') {
      this.api.getCalendarMonth(params).subscribe({
        next: (d) => { this.fullBookings = Array.isArray(d) ? d : []; this.applyStatusFilter(); this.buildMonth(); this.loading = false; },
        error: () => { this.error = 'Calendar data unavailable.'; this.loading = false; },
      });
    }

    this.api.getCalendarSummary({ date: dateStr, ...(this.selectedBranchId ? { branchId: this.selectedBranchId } : {}) }).subscribe({
      next: (d) => this.summary = d,
      error: () => {},
    });

    this.staffApi.getAll({ isActive: true, ...(this.selectedBranchId ? { branchId: this.selectedBranchId } : {}) }).subscribe({
      next: (d) => {
        this.staffList = Array.isArray(d) ? d : [];
        this.calculateDayHours();
      },
    });

    this.loadResources();
    this.loadBranches();
    if (this.showWaitlist) {
      this.loadWaitlist();
    }
  }

  refresh() { this.load(); this.updateLastUpdated(); }

  onBranchChange() { this.load(); }

  private applyStatusFilter() {
    this.bookings = this.statusFilter ? this.fullBookings.filter(b => b.status === this.statusFilter) : this.fullBookings;
  }

  onStatusFilterChange() {
    this.applyStatusFilter();
  }

  private updateLastUpdated() {
    const now = new Date();
    this.lastUpdated = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  private canAutoRefresh(): boolean {
    return !this.showCreate && !this.showWalkin && !this.showReschedule && !this.showCancelForm
      && !this.showEditForm && !this.showConfirmAction && !this.dragLockClick && !this.loading;
  }

  private startAutoRefresh() {
    this.stopAutoRefresh();
    this.autoRefreshTimer = setInterval(() => {
      if (this.canAutoRefresh()) {
        this.load();
        this.updateLastUpdated();
      }
    }, 60000);
  }

  private stopAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  private loadResources() {
    const params: CalendarQueryParams = { isActive: true };
    if (this.resourceFilter) params.type = this.resourceFilter;
    this.resourcesApi.getAll(params).subscribe({
      next: (d) => this.resourceList = Array.isArray(d) ? d : [],
    });
  }

  private loadBranches() {
    if (this.branchList.length === 0) {
      this.http.get<BranchOption[]>('http://localhost:3000/api/branches').subscribe({
        next: (d) => this.branchList = Array.isArray(d) ? d : [],
      });
    }
  }

  toggleWaitlist(): void {
    this.showWaitlist = !this.showWaitlist;
    if (this.showWaitlist) {
      this.loadWaitlist();
    }
  }

  loadWaitlist(): void {
    this.waitlistLoading = true;
    this.waitlistError = '';
    const dateStr = this.currentDate.toISOString().slice(0, 10);
    this.http.get<WaitlistEntry[]>('/api/waitlist', {
      params: { branchId: '1', status: 'WAITING', from: dateStr, to: dateStr }
    }).subscribe({
      next: (d) => {
        this.waitlistEntries = Array.isArray(d) ? d : [];
        this.waitlistLoading = false;
      },
      error: (err) => {
        this.waitlistError = 'Failed to load waitlist.';
        this.waitlistLoading = false;
      },
    });
  }

  removeWaitlistEntry(id: string): void {
    this.http.delete(`/api/waitlist/${id}`).subscribe({
      next: () => {
        this.waitlistEntries = this.waitlistEntries.filter(e => e.id !== id);
      },
    });
  }

  toggleAiPanel(): void {
    this.showAiPanel = !this.showAiPanel;
    if (this.showAiPanel && this.serviceList.length === 0) {
      this.http.get<ServiceOption[]>('http://localhost:3000/api/services').subscribe({
        next: (d) => this.serviceList = Array.isArray(d) ? d : [],
      });
    }
  }

  getServiceDuration(serviceId: string): number {
    const svc = this.serviceList.find((s: any) => s.id === serviceId);
    return svc?.durationMin || 30;
  }

  loadAiSuggestions(): void {
    const dateStr = this.currentDate.toISOString().slice(0, 10);
    const params: CalendarQueryParams = { branchId: '1', date: dateStr };
    if (this.aiServiceId) {
      const svc = this.serviceList.find((s: any) => s.id === this.aiServiceId);
      if (svc?.durationMin) params.durationMinutes = svc.durationMin;
    } else {
      params.durationMinutes = this.aiServiceDuration || 30;
    }
    this.aiLoading = true;
    this.aiError = '';
    this.api.getAiSuggestions(params).subscribe({
      next: (d) => {
        this.aiSuggestions = Array.isArray(d?.suggestions) ? d.suggestions : [];
        this.aiOptimization = d?.optimization || null;
        this.aiLoading = false;
      },
      error: () => {
        this.aiError = 'Failed to load AI suggestions.';
        this.aiLoading = false;
      },
    });
  }

  loadAiOptimizeDay(): void {
    const dateStr = this.currentDate.toISOString().slice(0, 10);
    const params: CalendarQueryParams = { branchId: '1', date: dateStr };
    if (this.aiServiceId) {
      const svc = this.serviceList.find((s: any) => s.id === this.aiServiceId);
      if (svc?.durationMin) params.durationMinutes = svc.durationMin;
    } else {
      params.durationMinutes = this.aiServiceDuration || 30;
    }
    this.aiOptimizing = true;
    this.aiError = '';
    this.api.getAiOptimizeDay(params).subscribe({
      next: (d) => {
        this.aiSuggestions = Array.isArray(d?.suggestions) ? d.suggestions : [];
        this.aiOptimization = d?.optimization || null;
        this.aiOptimizing = false;
      },
      error: () => {
        this.aiError = 'Failed to optimize day.';
        this.aiOptimizing = false;
      },
    });
  }

  aiBookSlot(slot: AiSuggestion): void {
    if (!slot.staffId || !slot.suggestedStart) {
      this.aiError = 'Invalid slot data.';
      return;
    }
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    const start = new Date(slot.suggestedStart);
    const svcName = this.aiServiceId ? (this.getServiceName(this.aiServiceId) || '') : '';
    this.createForm = {
      clientId: '',
      staffId: slot.staffId,
      title: svcName || 'Booking',
      startTime: start.toISOString().slice(0, 16),
      branchId: this.selectedBranchId,
      notes: '',
      services: [{ serviceId: this.aiServiceId || '', name: svcName, durationMin: 0, price: 0 }],
    };
    this.loadClientsAndServices();
  }

  private getServiceName(id: string): string {
    const s = this.serviceList.find((sv: any) => sv.id === id);
    return s ? s.name : '';
  }

  private calculateDayHours() {
    const dayOfWeek = this.currentDate.getDay();
    const fallback = Array.from({ length: 12 }, (_, i) => i + 8);

    if (this.staffList.length === 0) {
      this.dayHours = fallback;
      return;
    }

    const calls = this.staffList.map(s => this.staffApi.getSchedule(s.id));

    forkJoin(calls).subscribe({
      next: (results) => {
        let minStart = 24;
        let maxEnd = 0;
        for (const schedules of results) {
          const list = Array.isArray(schedules) ? schedules : [];
          for (const s of list) {
            if (s.dayOfWeek !== dayOfWeek || s.isActive === false) continue;
            const sh = parseInt(s.startTime?.split(':')[0], 10);
            const eh = parseInt(s.endTime?.split(':')[0], 10);
            if (!isNaN(sh) && sh < minStart) minStart = sh;
            if (!isNaN(eh) && eh > maxEnd) maxEnd = eh;
          }
        }
        if (minStart < 24 && maxEnd > minStart) {
          this.dayHours = Array.from({ length: maxEnd - minStart }, (_, i) => i + minStart);
        } else {
          this.dayHours = fallback;
        }
      },
      error: () => { this.dayHours = fallback; },
    });
  }

  private extractCalendarError(error: any): string {
    let msg = '';
    if (typeof error === 'string') {
      msg = error;
    } else if (error?.error?.message) {
      msg = Array.isArray(error.error.message) ? error.error.message[0] : error.error.message;
    } else if (error?.error?.error) {
      msg = error.error.error;
    } else if (error?.message) {
      msg = error.message;
    } else {
      return 'Something went wrong. Please try again.';
    }
    msg = String(msg).trim();
    if (!msg) return 'Something went wrong. Please try again.';
    const lower = msg.toLowerCase();
    if (lower.includes('staff') && (lower.includes('conflict') || lower.includes('already booked') || lower.includes('already has')))
      return 'This staff member already has a booking at this time.';
    if (lower.includes('client') && (lower.includes('conflict') || lower.includes('already') || lower.includes('appointment')))
      return 'This client already has another appointment at this time.';
    if (lower.includes('resource') && (lower.includes('conflict') || lower.includes('already booked')))
      return 'This room/chair/equipment is already booked at this time.';
    if (lower.includes('availability') || lower.includes('not available') || lower.includes('not working'))
      return 'This staff member is not available at the selected time.';
    if (lower.includes('outside') || lower.includes('working hours') || lower.includes('business hours'))
      return 'Selected time is outside working hours.';
    if (lower.includes('client') && (lower.includes('required') || lower.includes('missing')))
      return 'Please select a client.';
    if (lower.includes('staff') && (lower.includes('required') || lower.includes('missing')))
      return 'Please select a staff member.';
    if (lower.includes('service') && (lower.includes('required') || lower.includes('missing')))
      return 'Please select at least one service.';
    if (lower.includes('branch') && (lower.includes('required') || lower.includes('missing')))
      return 'Please select a branch.';
    return msg;
  }

  openDrawer(b: CalendarBooking) { if (this.dragLockClick) { this.dragLockClick = false; return; } this.drawerBooking = b; this.drawerBusy = false; this.drawerError = ''; this.showReschedule = false; this.showCancelForm = false; this.showEditForm = false; this.showConfirmAction = false; this.cancelReason = ''; this.cancelCustomReason = ''; }
  openBookingFromKeyboard(event: KeyboardEvent, booking: CalendarBooking): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    this.openDrawer(booking);
  }
  getBookingAriaLabel(b: CalendarBooking): string {
    const client = b.client?.fullName || 'Client';
    const time = `${this.formatTime(b.startTime)}-${this.formatTime(b.endTime)}`;
    return `Booking: ${client}, ${b.title}, ${time}`;
  }
  closeDrawer() { this.drawerBooking = null; this.showReschedule = false; this.showCancelForm = false; this.showEditForm = false; this.showConfirmAction = false; }

  canCancel(b: CalendarBooking): boolean { return b && ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status); }
  canReschedule(b: CalendarBooking): boolean { return b && ['PENDING', 'CONFIRMED'].includes(b.status); }

  closeCancelForm() { this.showCancelForm = false; this.cancelReason = ''; this.cancelCustomReason = ''; this.drawerError = ''; }

  openEditForm(b: CalendarBooking) { this.showReschedule = false; this.showCancelForm = false; this.showConfirmAction = false; this.editForm.title = b.title || ''; this.editForm.notes = b.notes || ''; this.showEditForm = true; this.drawerError = ''; }
  closeEditForm() { this.showEditForm = false; this.editForm = { title: '', notes: '' }; this.drawerError = ''; }
  openCancelForm() { this.showReschedule = false; this.showEditForm = false; this.showConfirmAction = false; this.showCancelForm = true; this.cancelReason = ''; this.cancelCustomReason = ''; this.drawerError = ''; }
  openConfirmAction(status: string) { this.showReschedule = false; this.showCancelForm = false; this.showEditForm = false; this.showConfirmAction = true; this.confirmTargetStatus = status; this.confirmLabel = status === 'CHECKED_IN' ? 'Check In' : 'Complete'; this.drawerError = ''; }
  closeConfirmAction() { this.showConfirmAction = false; this.confirmTargetStatus = ''; this.confirmLabel = ''; this.drawerError = ''; }
  doEdit() {
    const { title, notes } = this.editForm;
    if (!title?.trim()) { this.drawerError = 'Title is required.'; return; }
    const booking = this.drawerBooking;
    if (!booking) { this.drawerError = 'No booking selected.'; return; }
    this.editBusy = true; this.drawerError = '';
    this.http.patch(`http://localhost:3000/api/bookings/${booking.id}`, { title: title.trim(), notes: notes?.trim() || undefined }).subscribe({
      next: () => { this.editBusy = false; this.closeEditForm(); this.closeDrawer(); this.load(); },
      error: (e) => { this.editBusy = false; this.drawerError = this.extractCalendarError(e); },
    });
  }

  doCancel(b: CalendarBooking) {
    const reason = this.cancelReason === 'Other' && this.cancelCustomReason
      ? this.cancelCustomReason.trim()
      : this.cancelReason;
    if (!reason) { this.drawerError = 'Please select a cancellation reason.'; return; }
    this.drawerBusy = true; this.drawerError = '';
    this.api.cancelBooking(b.id, { reason }).subscribe({
      next: () => { this.drawerBusy = false; this.closeDrawer(); this.load(); },
      error: (e) => { this.drawerBusy = false; this.drawerError = this.extractCalendarError(e); },
    });
  }

  doStatus(b: CalendarBooking, status: string) {
    this.drawerBusy = true; this.drawerError = '';
    this.api.updateStatus(b.id, status).subscribe({
      next: () => { this.drawerBusy = false; this.closeDrawer(); this.load(); },
      error: (e) => { this.drawerBusy = false; this.drawerError = this.extractCalendarError(e); },
    });
  }

  getBookingsAtHour(hour: number): CalendarBooking[] {
    return this.bookings.filter(b => new Date(b.startTime).getHours() === hour);
  }

  getBookingsForDate(date: Date): CalendarBooking[] {
    const d = new Date(date);
    return this.bookings.filter(b => {
      const bd = new Date(b.startTime);
      return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth() && bd.getDate() === d.getDate();
    });
  }

  getBookingsForResource(resourceId: string, hour: number): CalendarBooking[] {
    return this.bookings.filter(b => {
      const bResourceId = b.resourceId || b.resource?.id;
      if (!bResourceId) return false;
      if (bResourceId !== resourceId) return false;
      const bHour = new Date(b.startTime).getHours();
      return bHour === hour;
    });
  }

  openCreateBookingUnassigned(hour: number) {
    if (this.dragLockClick) { this.dragLockClick = false; return; }
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    const start = new Date(this.currentDate);
    start.setHours(hour, 0, 0, 0);
    const wl = this.fillWaitlistEntry;
    this.createForm = {
      clientId: wl?.clientId || '',
      staffId: '',
      resourceId: '',
      title: wl?.serviceName || '',
      startTime: start.toISOString().slice(0, 16),
      branchId: this.selectedBranchId,
      notes: wl?.notes || '',
      services: [{ serviceId: '', name: wl?.serviceName || '', durationMin: 0, price: 0 }],
    };
    this.loadClientsAndServices();
  }

  openCreateBookingForDate(date: Date) {
    if (this.dragLockClick) { this.dragLockClick = false; return; }
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    const start = new Date(date);
    start.setHours(10, 0, 0, 0);
    this.createForm = {
      clientId: '',
      staffId: '',
      resourceId: '',
      title: '',
      startTime: start.toISOString().slice(0, 16),
      branchId: this.selectedBranchId,
      notes: '',
      services: [{ serviceId: '', name: '', durationMin: 0, price: 0 }],
    };
    this.loadClientsAndServices();
  }

  openCreateBookingFromResource(resource: CalendarResource, hour: number) {
    if (this.dragLockClick) { this.dragLockClick = false; return; }
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    const start = new Date(this.currentDate);
    start.setHours(hour, 0, 0, 0);
    const wl = this.fillWaitlistEntry;
    this.createForm = {
      clientId: wl?.clientId || '',
      staffId: '',
      resourceId: resource.id,
      title: wl?.serviceName || '',
      startTime: start.toISOString().slice(0, 16),
      branchId: this.selectedBranchId,
      notes: wl?.notes || '',
      services: [{ serviceId: '', name: wl?.serviceName || '', durationMin: 0, price: 0 }],
    };
    this.loadClientsAndServices();
  }

  getUnassignedBookings(hour: number): CalendarBooking[] {
    return this.bookings.filter(b => {
      const bResourceId = b.resourceId || b.resource?.id;
      if (bResourceId) return false;
      const bHour = new Date(b.startTime).getHours();
      return bHour === hour;
    });
  }

  resourceNameForId(id: string): string {
    const r = this.resourceList.find(r => r.id === id);
    return r ? `${r.name} (${r.type})` : '';
  }

  getBookingsForStaff(staffId: string, hour: number): CalendarBooking[] {
    return this.bookings.filter(b => {
      const bStaffId = b.staffId || b.staff?.id;
      if (bStaffId !== staffId) return false;
      const bHour = new Date(b.startTime).getHours();
      return bHour === hour;
    });
  }

  formatTime(dt: string): string {
    return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  getStaffBookings(staffId: string): CalendarBooking[] {
    return this.bookings.filter(b => {
      const bStaffId = b.staffId || b.staff?.id;
      return bStaffId === staffId;
    });
  }

  getAllResourceBookings(resourceId: string): CalendarBooking[] {
    return this.bookings.filter(b => {
      const bResourceId = b.resourceId || b.resource?.id;
      return bResourceId === resourceId;
    });
  }

  getAllUnassignedBookings(): CalendarBooking[] {
    return this.bookings.filter(b => !(b.resourceId || b.resource?.id));
  }

  getBookingDurationMinutes(booking: CalendarBooking): number {
    if (!booking.startTime || !booking.endTime) return 30;
    const start = new Date(booking.startTime).getTime();
    const end = new Date(booking.endTime).getTime();
    const diff = Math.round((end - start) / 60000);
    return Math.max(15, Math.min(diff, 480));
  }

  getDurationBarPercent(booking: CalendarBooking): number {
    return Math.min(100, 20 + this.getBookingDurationMinutes(booking) * 0.15);
  }

  getBookingBlockStyle(booking: CalendarBooking): any {
    if (!booking.startTime || this.dayHours.length === 0) return {};
    const start = new Date(booking.startTime);
    const firstHour = this.dayHours[0];
    const lastHour = this.dayHours[this.dayHours.length - 1];
    const totalMinutes = (lastHour + 1 - firstHour) * 60;
    if (totalMinutes <= 0) return {};
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const firstHourMinutes = firstHour * 60;
    const offsetMinutes = Math.max(0, startMinutes - firstHourMinutes);
    const durationMin = this.getBookingDurationMinutes(booking);
    return {
      top: (offsetMinutes / totalMinutes * 100) + '%',
      height: (durationMin / totalMinutes * 100) + '%',
      position: 'absolute',
      left: '4px',
      right: '4px',
      zIndex: 1,
    };
  }

  isCurrentDateToday(): boolean {
    return this.isSameDay(this.currentDate, new Date());
  }

  getCurrentTimeIndicatorStyle(): any {
    if (!this.isCurrentDateToday() || this.dayHours.length === 0) return { display: 'none' };
    const now = new Date();
    const firstHour = this.dayHours[0];
    const lastHour = this.dayHours[this.dayHours.length - 1];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const firstHourMinutes = firstHour * 60;
    const lastHourEndMinutes = (lastHour + 1) * 60;
    if (nowMinutes < firstHourMinutes || nowMinutes > lastHourEndMinutes) return { display: 'none' };
    const totalMinutes = (lastHour + 1 - firstHour) * 60;
    const offsetMinutes = nowMinutes - firstHourMinutes;
    return {
      top: (offsetMinutes / totalMinutes * 100) + '%',
    };
  }

  startBookingDrag(event: PointerEvent, booking: CalendarBooking) {
    if (!this.canReschedule(booking)) return;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragBooking = booking;
    this.dragDidMove = false;
    this.dragGhostBooking = booking;
    this.dragGhostVisible = false;
    this.dropTargetStaffId = null;
    this.dropTargetResourceId = null;
    this.dropTargetHour = null;
    this.dropTargetMinute = 0;
    document.addEventListener('pointermove', this.boundPointerMove);
    document.addEventListener('pointerup', this.boundPointerUp);
    document.addEventListener('pointercancel', this.boundPointerUp);
  }

  private boundPointerMove = (event: PointerEvent) => {
    if (!this.dragBooking) return;
    const dx = Math.abs(event.clientX - this.dragStartX);
    const dy = Math.abs(event.clientY - this.dragStartY);
    if (dx <= 5 && dy <= 5) return;
    this.dragDidMove = true;
    this.dragGhostVisible = true;
    this.dragGhostX = event.clientX;
    this.dragGhostY = event.clientY;
    event.preventDefault();
    const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    if (!el) return;
    const col = el.closest('.dv-staff-col') as HTMLElement | null;
    if (!col) {
      this.previousDropTarget?.classList.remove('drag-over-slot');
      this.previousDropTarget = null;
      this.dropTargetHour = null;
      return;
    }
    if (col !== this.previousDropTarget) {
      this.previousDropTarget?.classList.remove('drag-over-slot');
      col.classList.add('drag-over-slot');
      this.previousDropTarget = col;
    }
    if (col.classList.contains('dv-unassigned-col')) {
      this.dropTargetStaffId = null;
      this.dropTargetResourceId = null;
    } else if (this.viewMode === 'staff') {
      this.dropTargetStaffId = col.getAttribute('data-staff-id');
      this.dropTargetResourceId = null;
    } else {
      this.dropTargetResourceId = col.getAttribute('data-resource-id');
      this.dropTargetStaffId = null;
    }
    const body = col.querySelector('.dv-staff-body') as HTMLElement | null;
    if (!body) return;
    const rect = body.getBoundingClientRect();
    const relY = event.clientY - rect.top;
    const totalMinutes = (this.dayHours[this.dayHours.length - 1] + 1 - this.dayHours[0]) * 60;
    if (totalMinutes <= 0) return;
    const minutesFromTop = Math.max(0, (relY / rect.height) * totalMinutes);
    const snappedMinutes = Math.round(minutesFromTop / 15) * 15;
    const firstHourMinutes = this.dayHours[0] * 60;
    const targetTotalMinutes = firstHourMinutes + snappedMinutes;
    const lastHourEndMinutes = (this.dayHours[this.dayHours.length - 1] + 1) * 60;
    if (targetTotalMinutes < firstHourMinutes) {
      this.dropTargetHour = this.dayHours[0];
      this.dropTargetMinute = 0;
    } else if (targetTotalMinutes + this.getBookingDurationMinutes(this.dragBooking) > lastHourEndMinutes) {
      const maxStartMinutes = lastHourEndMinutes - this.getBookingDurationMinutes(this.dragBooking);
      if (maxStartMinutes < firstHourMinutes) {
        this.dropTargetHour = this.dayHours[0];
        this.dropTargetMinute = 0;
      } else {
        const clampedMin = Math.round(maxStartMinutes / 15) * 15;
        this.dropTargetHour = Math.floor(clampedMin / 60);
        this.dropTargetMinute = clampedMin % 60;
      }
    } else {
      this.dropTargetHour = Math.floor(targetTotalMinutes / 60);
      this.dropTargetMinute = targetTotalMinutes % 60;
    }
  }

  private boundPointerUp = (event: PointerEvent) => {
    document.removeEventListener('pointermove', this.boundPointerMove);
    document.removeEventListener('pointerup', this.boundPointerUp);
    document.removeEventListener('pointercancel', this.boundPointerUp);
    this.previousDropTarget?.classList.remove('drag-over-slot');
    this.previousDropTarget = null;
    const didDrag = this.dragDidMove;
    const booking = this.dragBooking;
    this.dragBooking = null;
    this.dragDidMove = false;
    this.dragGhostVisible = false;
    this.dragGhostBooking = null;
    if (!didDrag) return;
    event.preventDefault();
    this.dragLockClick = true;
    setTimeout(() => { this.dragLockClick = false; }, 150);
    if (booking && this.dropTargetHour !== null) {
      this.confirmAndApplyDragReschedule(booking);
    }
    this.dropTargetStaffId = null;
    this.dropTargetResourceId = null;
    this.dropTargetHour = null;
    this.dropTargetMinute = 0;
  }

  private confirmAndApplyDragReschedule(booking: CalendarBooking) {
    if (this.dropTargetHour === null) return;
    const targetTime = new Date(this.currentDate);
    targetTime.setHours(this.dropTargetHour, this.dropTargetMinute || 0, 0, 0);
    const timeStr = targetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    let targetName = '';
    if (this.viewMode === 'staff' && this.dropTargetStaffId) {
      const staff = this.staffList.find(s => s.id === this.dropTargetStaffId);
      targetName = staff?.fullName || 'Unknown';
    } else if (this.viewMode === 'resources' && this.dropTargetResourceId !== null) {
      const res = this.resourceList.find(r => r.id === this.dropTargetResourceId);
      targetName = res ? `${res.name} (${res.type})` : 'Unassigned';
    } else if (this.viewMode === 'resources' && this.dropTargetResourceId === null) {
      targetName = 'Unassigned';
    }
    const payload: Record<string, any> = { startTime: targetTime.toISOString().slice(0, 16) };
    if (this.viewMode === 'resources' && this.dropTargetResourceId !== (booking.resourceId || '')) {
      payload.resourceId = this.dropTargetResourceId || null;
    }
    this.dropConfirmBooking = booking;
    this.dropConfirmTime = timeStr;
    this.dropConfirmTargetName = targetName;
    this.dropConfirmPayload = payload;
    this.dropConfirmBusy = false;
    this.dropConfirmError = '';
    this.showDropConfirm = true;
  }

  confirmDropReschedule(): void {
    const booking = this.dropConfirmBooking;
    if (!booking) { this.cancelDropReschedule(); return; }
    this.dropConfirmBusy = true;
    this.dropConfirmError = '';
    this.http.patch(`http://localhost:3000/api/bookings/${booking.id}/reschedule`, this.dropConfirmPayload).subscribe({
      next: () => {
        this.dropConfirmBusy = false;
        this.showDropConfirm = false;
        this.dropConfirmBooking = null;
        this.dropConfirmPayload = {};
        this.load();
      },
      error: (e) => {
        this.dropConfirmBusy = false;
        this.dropConfirmError = this.extractCalendarError(e);
        this.dragGhostVisible = false;
        this.dragGhostBooking = null;
      },
    });
  }

  cancelDropReschedule(): void {
    this.showDropConfirm = false;
    this.dropConfirmBooking = null;
    this.dropConfirmPayload = {};
    this.dropConfirmBusy = false;
    this.dropConfirmError = '';
    this.dragGhostVisible = false;
    this.dragGhostBooking = null;
  }

  staffInitials(staff: Staff): string {
    if (!staff.fullName) return '?';
    const parts = staff.fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  staffAccentClass(staff: Staff): string {
    const colors = ['staff-avatar-c1', 'staff-avatar-c2', 'staff-avatar-c3', 'staff-avatar-c4', 'staff-avatar-c5'];
    let hash = 0;
    for (let i = 0; i < staff.id.length; i++) {
      hash = ((hash << 5) - hash) + staff.id.charCodeAt(i);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getStaffDayBookingCount(staffId: string): number {
    return this.bookings.filter(b => {
      const bStaffId = b.staffId || b.staff?.id;
      return bStaffId === staffId;
    }).length;
  }

  isStaffBusyAtHour(staffId: string, hour: number): boolean {
    return this.getStaffBookings(staffId).some(b => {
      const s = new Date(b.startTime).getHours();
      const e = new Date(b.endTime).getHours();
      return hour >= s && hour < e;
    });
  }

  isResourceBusyAtHour(resourceId: string, hour: number): boolean {
    return this.getAllResourceBookings(resourceId).some(b => {
      const s = new Date(b.startTime).getHours();
      const e = new Date(b.endTime).getHours();
      return hour >= s && hour < e;
    });
  }

  openCreateBooking(staff: Staff, hour: number) {
    if (this.dragLockClick) { this.dragLockClick = false; return; }
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    const start = new Date(this.currentDate);
    start.setHours(hour, 0, 0, 0);
    const wl = this.fillWaitlistEntry;
    this.createForm = {
      clientId: wl?.clientId || '',
      staffId: staff.id,
      title: wl?.serviceName || '',
      startTime: start.toISOString().slice(0, 16),
      branchId: this.selectedBranchId,
      notes: wl?.notes || '',
      services: [{ serviceId: '', name: wl?.serviceName || '', durationMin: 0, price: 0 }],
    };
    this.loadClientsAndServices();
  }

  openWalkin() {
    this.showWalkin = true;
    this.walkinBusy = false;
    this.walkinError = '';
    this.loadClientsAndServices();
    let staffId = '';
    if (this.selectedStaffFilter) {
      staffId = this.selectedStaffFilter;
    } else if (this.staffList.length > 0) {
      staffId = this.staffList[0].id;
    }
    const start = new Date(this.currentDate);
    const now = new Date();
    start.setHours(now.getHours(), 0, 0, 0);
    this.walkinForm = { clientName: '', staffId, startTime: start.toISOString().slice(0, 16), branchId: this.selectedBranchId, serviceId: '', serviceName: '', serviceDuration: 30, servicePrice: 0 };
  }

  closeWalkin() { this.showWalkin = false; this.walkinError = ''; }
  closeCreate() { this.showCreate = false; this.createBusy = false; this.createError = ''; }

  onWalkinServiceChange() {
    const svcId = this.walkinForm.serviceId;
    const svc = svcId ? this.serviceList.find((s: any) => s.id === svcId) : null;
    if (svc) {
      this.walkinForm.serviceName = svc.name;
      this.walkinForm.serviceDuration = svc.durationMin;
      this.walkinForm.servicePrice = svc.price;
    } else {
      this.walkinForm.serviceName = '';
      this.walkinForm.serviceDuration = 30;
      this.walkinForm.servicePrice = 0;
    }
  }

  doWalkinBooking() {
    this.walkinBusy = true;
    this.walkinError = '';
    const name = this.walkinForm.clientName?.trim();
    if (!name) { this.walkinError = 'Client name is required.'; this.walkinBusy = false; return; }
    if (!this.walkinForm.staffId) { this.walkinError = 'Staff is required.'; this.walkinBusy = false; return; }
    if (!this.walkinForm.serviceId) { this.walkinError = 'Please select a service.'; this.walkinBusy = false; return; }
    if (!this.walkinForm.branchId) { this.walkinError = 'Please select a branch.'; this.walkinBusy = false; return; }
    if (!this.walkinForm.startTime) { this.walkinError = 'Date & time is required.'; this.walkinBusy = false; return; }
    const existing = this.clientList.find((c: ClientOption) => (c.fullName || c.name || '').toLowerCase() === name.toLowerCase());
    if (existing) {
      this.createWalkinBooking(existing.id);
    } else {
      this.http.post<{ id: string }>('http://localhost:3000/api/clients', { fullName: name }).subscribe({
        next: (client) => this.createWalkinBooking(client.id),
        error: () => { this.walkinBusy = false; this.walkinError = 'Failed to create client.'; },
      });
    }
  }

  private createWalkinBooking(clientId: string) {
    const payload: Record<string, any> = {
      clientId,
      staffId: this.walkinForm.staffId,
      title: 'Walk-in',
      startTime: this.walkinForm.startTime,
      branchId: this.walkinForm.branchId,
      services: [{
        name: this.walkinForm.serviceName || 'Walk-in Service',
        durationMin: this.walkinForm.serviceDuration || 30,
        price: this.walkinForm.servicePrice || 0,
      }],
    };
    if (this.walkinForm.notes) payload.notes = this.walkinForm.notes;
    this.http.post('http://localhost:3000/api/bookings', payload).subscribe({
      next: () => { this.walkinBusy = false; this.showWalkin = false; this.load(); },
      error: (e) => { this.walkinBusy = false; this.walkinError = this.extractCalendarError(e); },
    });
  }

  addService() { this.createForm.services.push({ serviceId: '', name: '', durationMin: 0, price: 0 }); }
  removeService(i: number) { this.createForm.services.splice(i, 1); }

  onServiceSelect(i: number) {
    const svcId = this.createForm.services[i].serviceId;
    const svc = svcId ? this.serviceList.find((s: any) => s.id === svcId) : null;
    if (svc) {
      this.createForm.services[i].name = svc.name;
      this.createForm.services[i].durationMin = svc.durationMin;
      this.createForm.services[i].price = svc.price;
    } else {
      this.createForm.services[i].name = '';
      this.createForm.services[i].durationMin = 0;
      this.createForm.services[i].price = 0;
    }
  }

  get totalDuration(): number {
    return this.createForm.services.reduce((sum: number, s: any) => sum + (Number(s.durationMin) || 0), 0);
  }

  get totalPrice(): number {
    return this.createForm.services.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0);
  }

  get estimatedEndTime(): string {
    if (!this.createForm.startTime || !this.totalDuration) return '';
    const start = new Date(this.createForm.startTime);
    const end = new Date(start.getTime() + this.totalDuration * 60000);
    return end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  doCreateBooking() {
    this.createBusy = true;
    this.createError = '';
    const payload: Record<string, any> = {
      clientId: this.createForm.clientId,
      staffId: this.createForm.staffId,
      title: this.createForm.title || 'Booking',
      startTime: this.createForm.startTime,
      branchId: this.createForm.branchId,
      notes: this.createForm.notes || undefined,
      services: this.createForm.services.filter((s: CreateFormService) => s.name),
    };
    if (this.createForm.resourceId) payload.resourceId = this.createForm.resourceId;
    this.http.post('http://localhost:3000/api/bookings', payload).subscribe({
      next: () => {
        this.createBusy = false; this.showCreate = false;
        if (this.fillWaitlistEntry) {
          const wlId = this.fillWaitlistEntry.id;
          this.fillWaitlistEntry = null;
          this.http.post(`http://localhost:3000/api/waitlist/${wlId}/booked`, {}).subscribe({
            next: () => { this.loadWaitlist(); },
            error: () => { this.loadWaitlist(); },
          });
        }
        this.load();
      },
      error: (e) => { this.createBusy = false; this.createError = this.extractCalendarError(e); },
    });
  }

  showRescheduleForm(b: CalendarBooking) {
    this.showEditForm = false;
    this.showCancelForm = false;
    this.showConfirmAction = false;
    this.showReschedule = true;
    this.rescheduleBusy = false;
    this.rescheduleError = '';
    const start = new Date(b.startTime);
    this.rescheduleForm = {
      staffId: b.staffId || b.staff?.id || '',
      resourceId: b.resourceId || '',
      startTime: start.toISOString().slice(0, 16),
    };
  }

  closeReschedule() { this.showReschedule = false; }

  doReschedule() {
    this.rescheduleBusy = true;
    this.rescheduleError = '';
    const b = this.drawerBooking;
    if (!b) return;
    const payload: Record<string, any> = { startTime: this.rescheduleForm.startTime };
    if (this.rescheduleForm.resourceId !== (b.resourceId || '')) {
      payload.resourceId = this.rescheduleForm.resourceId || null;
    }
    this.http.patch(`http://localhost:3000/api/bookings/${b.id}/reschedule`, payload).subscribe({
      next: () => { this.rescheduleBusy = false; this.closeDrawer(); this.load(); },
      error: (e) => { this.rescheduleBusy = false; this.rescheduleError = this.extractCalendarError(e); },
    });
  }

  private loadClientsAndServices() {
    this.http.get<ClientOption[]>('http://localhost:3000/api/clients').subscribe({
      next: (d) => this.clientList = Array.isArray(d) ? d : [],
    });
    this.http.get<ServiceOption[]>('http://localhost:3000/api/services').subscribe({
      next: (d) => this.serviceList = Array.isArray(d) ? d : [],
    });
    this.http.get<BranchOption[]>('http://localhost:3000/api/branches').subscribe({
      next: (d) => this.branchList = Array.isArray(d) ? d : [],
    });
  }

  goToDay(date: Date) {
    this.currentDate = new Date(date);
    this.view = 'day';
    this.viewMode = 'staff';
    this.load();
  }

  isDayToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  getMonthStatusCounts(date: Date): StatusCount[] {
    const bookings = this.getBookingsForDate(date);
    const counts: Record<string, number> = {};
    for (const b of bookings) {
      const s = (b.status || '').toLowerCase();
      counts[s] = (counts[s] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }

  getMonthPreviewBookings(date: Date): CalendarBooking[] {
    return this.getBookingsForDate(date).slice(0, 3);
  }

  getMonthMoreCount(date: Date): number {
    const count = this.getBookingsForDate(date).length;
    return count > 3 ? count - 3 : 0;
  }

  openDayFromMonth(date: Date) {
    this.goToDay(date);
  }

  private buildWeek() {
    const start = new Date(this.currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d };
    });
  }

  private buildMonth() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const prevMonthLast = new Date(year, month, 0).getDate();
    const today = new Date();
    this.monthDays = [];
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLast - i);
      this.monthDays.push({ date: d, otherMonth: true, isToday: this.isSameDay(d, today) });
    }
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      this.monthDays.push({ date: d, otherMonth: false, isToday: this.isSameDay(d, today) });
    }
    while (this.monthDays.length < 42) {
      const last = this.monthDays[this.monthDays.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      this.monthDays.push({ date: d, otherMonth: true, isToday: false });
    }
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
}
