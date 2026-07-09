import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CalendarService } from './calendar.service';
import { Client360Component } from '../client-360/client-360.component';
import { StaffService } from '../staff/staff.service';
import { Staff } from '../staff/staff.models';
import { ResourcesService } from '../resources/resources.service';
import { ClientsService } from '../clients/clients.service';
import { Client } from '../clients/client.model';
import { ServicesService } from '../services/services.service';
import { SalonService } from '../services/services.models';
import { CalendarWaitlist } from './calendar-waitlist/calendar-waitlist';
import { CalendarAiScheduler } from './calendar-ai-scheduler/calendar-ai-scheduler';
import { AuthService } from '../../core/auth/auth.service';
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
  PaymentInfo,
  ClientDetail,
  ViewBillData,
  SplitPaymentRow,
  SlotSize,
  ActivityLogEntry,
  ConflictInfo,
  RebookSlot,
  WaitlistSuggestion,
  NoShowRiskInfo,
} from './calendar.models';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarWaitlist, CalendarAiScheduler, Client360Component],
  template: `\n    <section class=\"page\">
      <!-- Premium Calendar Header -->
      <div class="premium-header">
        <div class="header-top">
          <div class="header-branding">
            <div class="brand-badge">Ambition Workspace</div>
            <h1>Calendar</h1>
            <p>Manage bookings, staff, resources, walk-ins and AI scheduling in one place</p>
          </div>
          <div class="header-user-context">
            <div class="user-info" *ngIf="currentUser">
              <span class="user-name">{{ currentUser.fullName || currentUser.email }}</span>
              <span class="user-role" *ngIf="userRole">{{ userRole }}</span>
            </div>
            <select class="branch-selector" [(ngModel)]="selectedBranchId" (change)="onBranchChange()" aria-label="Branch">
              <option value="">All Branches</option>
              <option *ngFor="let b of branchList" [value]="b.id">{{ b.name || b.city || b.id }}</option>
            </select>
          </div>
        </div>

        <div class="header-toolbar">
          <div class="nav-section">
            <button (click)="goToday()" class="btn today-btn" aria-label="Go to today">Today</button>
            <button (click)="prev()" class="btn nav-btn" aria-label="Previous period">&#8592;</button>
            <span class="date-display">{{ dateLabel }}<span class="today-badge" *ngIf="isCurrentDateToday()">Today</span></span>
            <button (click)="next()" class="btn nav-btn" aria-label="Next period">&#8594;</button>
          </div>

          <div class="view-selector">
            <button [class.active]="view === 'day' && viewMode === 'resources'" (click)="setView('day'); viewMode='resources'" class="btn view-btn">Day</button>
            <button [class.active]="view === 'week'" (click)="setView('week')" class="btn view-btn">Week</button>
            <button [class.active]="view === 'month'" (click)="setView('month')" class="btn view-btn">Month</button>
            <button [class.active]="view === 'day' && viewMode === 'staff'" (click)="setView('day'); viewMode='staff'" class="btn view-btn timeline-btn">Timeline</button>
            <span class="tabs-divider"></span>
            <button [class.active]="viewMode === 'staff'" (click)="viewMode='staff'" class="btn mode-btn">Staff</button>
            <button [class.active]="viewMode === 'resources'" (click)="viewMode='resources'" class="btn mode-btn">Resources</button>
            <select [(ngModel)]="resourceFilter" (change)="loadResources()" class="res-filter" *ngIf="viewMode==='resources'" aria-label="Resource type">
              <option value="">All Types</option>
              <option value="ROOM">Rooms</option>
              <option value="CHAIR">Chairs</option>
              <option value="STATION">Stations</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
          </div>

          <div class="action-buttons">
            <div class="header-search-wrap">
              <input type="text" class="header-search-input" placeholder="Search bookings..." disabled aria-label="Search bookings (coming soon)">
              <span class="header-search-icon">&#128269;</span>
            </div>
            <button (click)="refresh()" class="btn action-btn" [disabled]="loading" aria-label="Refresh calendar"><span class="btn-icon">&#8635;</span> Refresh</button>
            <button (click)="openCreateBookingForDate(currentDate)" class="btn action-btn primary-btn" aria-label="New booking">+ New Booking</button>
            <button (click)="openWalkin()" class="btn action-btn secondary-btn" aria-label="Add walk-in">Walk-in</button>
            <button (click)="toggleWaitlist()" [class.active]="showWaitlist" class="btn action-btn secondary-btn" aria-label="Toggle waitlist">Waitlist</button>
            <button (click)="toggleAiPanel()" [class.active]="showAiPanel" class="btn action-btn secondary-btn" aria-label="Toggle AI suggestions">AI Suggestions</button>
          </div>
        </div>
      </div>

      <div class="filter-bar">
        <select [(ngModel)]="statusFilter" (change)="onStatusFilterChange()" class="status-filter" aria-label="Status filter">
          <option value="">All Status</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <span class="tabs-divider"></span>
        <span class="slot-label">Slot:</span>
        <div class="slot-toggle">
          <button [class.active]="slotSize === 15" (click)="setSlotSize(15)" class="slot-btn">15m</button>
          <button [class.active]="slotSize === 30" (click)="setSlotSize(30)" class="slot-btn">30m</button>
          <button [class.active]="slotSize === 60" (click)="setSlotSize(60)" class="slot-btn">60m</button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div><span>Loading calendar...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load calendar.</strong><p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <!-- Premium KPI Strip -->
        <div class="premium-kpi-strip">
          <div class="kpi-card total-card">
            <div class="kpi-icon">📊</div>
            <div class="kpi-content">
              <span class="kpi-label">Total</span>
              <span class="kpi-value">{{ summary.kpis?.totalBookings }}</span>
            </div>
          </div>
          <div class="kpi-card confirmed-card">
            <div class="kpi-icon">✅</div>
            <div class="kpi-content">
              <span class="kpi-label">Confirmed</span>
              <span class="kpi-value">{{ summary.kpis?.confirmed }}</span>
            </div>
          </div>
          <div class="kpi-card completed-card">
            <div class="kpi-icon">🎯</div>
            <div class="kpi-content">
              <span class="kpi-label">Completed</span>
              <span class="kpi-value green">{{ summary.kpis?.completed }}</span>
            </div>
          </div>
          <div class="kpi-card pending-card">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-content">
              <span class="kpi-label">Pending</span>
              <span class="kpi-value amber">{{ summary.kpis?.pending }}</span>
            </div>
          </div>
          <div class="kpi-card revenue-card">
            <div class="kpi-icon">💰</div>
            <div class="kpi-content">
              <span class="kpi-label">Revenue</span>
              <span class="kpi-value">{{ (summary.kpis?.revenue || 0) | currency }}</span>
            </div>
          </div>
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
              <button class="staff-filter-pill" [class.active]="!selectedStaffFilter" (click)="selectedStaffFilter=''">
                <span class="sf-avatar sf-avatar-all">All</span><span class="sf-name">All Staff</span>
              </button>
              <button class="staff-filter-pill" *ngFor="let s of staffList" [class.active]="selectedStaffFilter===s.id" (click)="selectedStaffFilter=s.id">
                <span class="sf-avatar" [class]="staffAccentClass(s)">{{ staffInitials(s) }}</span>
                <span class="sf-name">{{ s.fullName }}</span>
                <span class="sf-count" *ngIf="getStaffDayBookingCount(s.id) > 0">{{ getStaffDayBookingCount(s.id) }}</span>
              </button>
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
                    <span class="dv-time-label">{{ formatHourLabel(hour) }}</span>
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
                          [class.no-show]="b.status === 'NO_SHOW'"
                          [ngStyle]="getBookingBlockStyle(b)"
                          tabindex="0" role="button"
                          [attr.aria-label]="getBookingAriaLabel(b)"
                          (pointerdown)="startBookingDrag($event, b)"
                          (click)="openDrawer(b); $event.stopPropagation()"
                          (keydown)="openBookingFromKeyboard($event, b)">
                          <span class="bc-header">
                            <strong>{{ b.client?.fullName || 'Client' }}</strong>
                            <span class="bc-amount" *ngIf="b.totalAmount">{{ b.totalAmount | currency }}</span>
                          </span>
                          <span class="bc-meta">{{ b.title || '' }} <span class="bc-meta-sep" *ngIf="b.title">—</span> {{ formatTime(b.startTime) }}-{{ formatTime(b.endTime) }}</span>
                          <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                          <span class="conflict-badge" *ngIf="hasConflict(b)" title="Schedule conflict detected">&#x26A0;</span>
                          <span class="no-show-badge" *ngIf="b.status === 'NO_SHOW'" title="No Show">NS</span>
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
                <div class="wl-actions" *ngIf="showWaitlist">
                  <div class="wl-msg" *ngIf="waitlistMessage">{{ waitlistMessage }}</div>
                  <button class="wl-suggest-btn" (click)="loadWaitlistSuggestions()" [disabled]="waitlistSuggestLoading">
                    {{ waitlistSuggestLoading ? 'Loading...' : 'Find Suggestions' }}
                  </button>
                  <button class="wl-autofill-btn" (click)="autofillWaitlistSlot()" [disabled]="waitlistSuggestLoading">
                    Auto-Fill Slot
                  </button>
                </div>
                <div class="wl-suggestions" *ngIf="showWaitlistSuggestions">
                  <div class="wl-suggest-header">Suggested Matches</div>
                  <div class="wl-loading" *ngIf="waitlistSuggestLoading"><div class="spinner"></div></div>
                  <div class="wl-error" *ngIf="waitlistSuggestError">{{ waitlistSuggestError }}</div>
                  <div class="wl-suggestion-item" *ngFor="let ws of waitlistSuggestions">
                    <span class="wl-s-name">{{ ws.entry?.client?.fullName || 'Client' }}</span>
                    <span class="wl-s-score">Match: {{ ws.matchScore }}%</span>
                    <button class="wl-s-fill" (click)="fillWaitlistEntry = ws.entry; showWaitlistSuggestions = false">Fill</button>
                  </div>
                  <div class="wl-empty" *ngIf="!waitlistSuggestLoading && !waitlistSuggestError && waitlistSuggestions.length === 0">
                    No matching waitlist entries.
                  </div>
                </div>
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
                    <span class="dv-time-label">{{ formatHourLabel(hour) }}</span>
                  </div>
                </div>
                <div class="dv-staff-scroll" [class.calendar-dragging]="dragBooking !== null">
                  <div class="dv-staff-col" *ngFor="let resource of resourceList" [attr.data-resource-id]="resource.id">
                    <div class="dv-staff-header">
                      {{ resource.name }}
                      <span class="res-type-badge res-type-{{ resource.type }}">{{ resource.type }}</span>
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
                          [class.no-show]="b.status === 'NO_SHOW'"
                          [ngStyle]="getBookingBlockStyle(b)"
                          tabindex="0" role="button"
                          [attr.aria-label]="getBookingAriaLabel(b)"
                          (pointerdown)="startBookingDrag($event, b)"
                          (click)="openDrawer(b); $event.stopPropagation()"
                          (keydown)="openBookingFromKeyboard($event, b)">
                          <span class="bc-header">
                            <strong>{{ b.client?.fullName || 'Client' }}</strong>
                            <span class="bc-amount" *ngIf="b.totalAmount">{{ b.totalAmount | currency }}</span>
                          </span>
                          <span class="bc-meta">{{ b.title || '' }} <span class="bc-meta-sep" *ngIf="b.title">—</span> {{ formatTime(b.startTime) }}-{{ formatTime(b.endTime) }}</span>
                          <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                          <span class="conflict-badge" *ngIf="hasConflict(b)" title="Schedule conflict detected">&#x26A0;</span>
                          <span class="no-show-badge" *ngIf="b.status === 'NO_SHOW'" title="No Show">NS</span>
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
                          [class.no-show]="b.status === 'NO_SHOW'"
                          [ngStyle]="getBookingBlockStyle(b)"
                          tabindex="0" role="button"
                          [attr.aria-label]="getBookingAriaLabel(b)"
                          (pointerdown)="startBookingDrag($event, b)"
                          (click)="openDrawer(b); $event.stopPropagation()"
                          (keydown)="openBookingFromKeyboard($event, b)">
                          <span class="bc-header">
                            <strong>{{ b.client?.fullName || 'Client' }}</strong>
                            <span class="bc-amount" *ngIf="b.totalAmount">{{ b.totalAmount | currency }}</span>
                          </span>
                          <span class="bc-meta">{{ b.title || '' }} <span class="bc-meta-sep" *ngIf="b.title">—</span> {{ formatTime(b.startTime) }}-{{ formatTime(b.endTime) }}</span>
                          <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                          <span class="conflict-badge" *ngIf="hasConflict(b)" title="Schedule conflict detected">&#x26A0;</span>
                          <span class="no-show-badge" *ngIf="b.status === 'NO_SHOW'" title="No Show">NS</span>
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
                    [class.has-conflict]="hasConflict(b)"
                    tabindex="0" role="button"
                    [attr.aria-label]="getBookingAriaLabel(b)"
                    (click)="openDrawer(b); $event.stopPropagation()"
                    (keydown)="openBookingFromKeyboard($event, b)">
                    <strong>{{ b.client?.fullName || 'Client' }}</strong>
                    <span>{{ b.title }}</span>
                    <small>{{ formatTime(b.startTime) }}-{{ formatTime(b.endTime) }}</small>
                    <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                    <span class="conflict-badge" *ngIf="hasConflict(b)" title="Schedule conflict detected">&#x26A0;</span>
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
                    [class.has-conflict]="hasConflict(b)"
                    tabindex="0" role="button"
                    [attr.aria-label]="getBookingAriaLabel(b)"
                    (click)="openDrawer(b); $event.stopPropagation()"
                    (keydown)="openBookingFromKeyboard($event, b)">
                    <span class="mp-time">{{ formatTime(b.startTime) }}</span>
                    <span class="mp-title">{{ b.client?.fullName || b.title }}</span>
                    <i class="booking-bar" [style.width.%]="getDurationBarPercent(b)"></i>
                    <span class="conflict-badge" *ngIf="hasConflict(b)" title="Schedule conflict detected">&#x26A0;</span>
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
            <div class="dh-left">
              <h2>{{ drawerBooking.client?.fullName || 'Booking' }}</h2>
              <span class="dh-subtitle">{{ drawerBooking.title }}</span>
            </div>
            <div class="dh-right">
              <div class="status-dropdown-wrapper" (click)="$event.stopPropagation()">
                <button class="sd-trigger" [class]="'sd-' + (drawerBooking.status || '').toLowerCase()" (click)="toggleStatusDropdown()">
                  <span class="sd-dot"></span>
                  <span class="sd-label">{{ getStatusLabel(drawerBooking.status) }}</span>
                  <span class="sd-arrow">&#x25BE;</span>
                </button>
                <div class="sd-menu" *ngIf="showStatusDropdown" (click)="$event.stopPropagation()">
                  <button class="sd-option sd-confirmed" (click)="selectStatus('CONFIRMED')" [class.sd-current]="drawerBooking.status === 'CONFIRMED'" [disabled]="drawerBooking.status === 'CONFIRMED' || !canTransitionTo('CONFIRMED')">
                    <span class="sd-dot"></span> Confirmed
                  </button>
                  <button class="sd-option sd-arrived" (click)="selectStatus('CHECKED_IN')" [class.sd-current]="drawerBooking.status === 'CHECKED_IN'" [disabled]="!canTransitionTo('CHECKED_IN')">
                    <span class="sd-dot"></span> Arrived
                  </button>
                  <button class="sd-option sd-start" (click)="selectStatus('CHECKED_IN')" [class.sd-current]="drawerBooking.status === 'CHECKED_IN'" [disabled]="!canTransitionTo('CHECKED_IN')">
                    <span class="sd-dot"></span> Start
                  </button>
                  <button class="sd-option sd-completed" (click)="selectStatus('COMPLETED')" [class.sd-current]="drawerBooking.status === 'COMPLETED'" [disabled]="drawerBooking.status === 'COMPLETED' || !canTransitionTo('COMPLETED')">
                    <span class="sd-dot"></span> Completed
                  </button>
                  <button class="sd-option sd-cancel" (click)="selectStatusCancel()" [disabled]="!canCancel(drawerBooking)">
                    <span class="sd-dot"></span> Cancel
                  </button>
                  <button class="sd-option sd-notcame" (click)="selectStatus('NO_SHOW')" [class.sd-current]="drawerBooking.status === 'NO_SHOW'" [disabled]="drawerBooking.status === 'NO_SHOW' || !canTransitionTo('NO_SHOW')">
                    <span class="sd-dot"></span> Not Came
                  </button>
                </div>
              </div>
              <div class="action-menu-wrapper" (click)="$event.stopPropagation()">
                <button class="action-menu-trigger" (click)="toggleActionMenu()">&#x22EE;</button>
                <div class="action-menu-dropdown" *ngIf="showActionMenu" (click)="$event.stopPropagation()">
                  <button (click)="closeActionMenu(); openEditForm(drawerBooking)"><span class="am-icon">&#x270E;</span> Edit Booking</button>
                  <button *ngIf="canReschedule(drawerBooking)" (click)="closeActionMenu(); showRescheduleForm(drawerBooking)"><span class="am-icon">&#x1F552;</span> Reschedule Booking</button>
                  <button (click)="closeActionMenu(); openAddPayment()"><span class="am-icon">&#x1F4B3;</span> Add Payment</button>
                  <button (click)="closeActionMenu(); openAddTip()"><span class="am-icon">&#x1F381;</span> Add Tip</button>
                  <button (click)="closeActionMenu(); doRebook()"><span class="am-icon">&#x1F504;</span> Rebook</button>
                  <button (click)="closeActionMenu(); openSmartRebook()"><span class="am-icon">&#x1F4C5;</span> Smart Rebook</button>
                  <button (click)="closeActionMenu(); printBill()"><span class="am-icon">&#x1F5A8;</span> Print</button>
                  <button (click)="closeActionMenu(); viewClientProfile()"><span class="am-icon">&#x1F464;</span> View Client / 360</button>
                  <button *ngIf="canCancel(drawerBooking)" (click)="closeActionMenu(); openCancelForm()" class="am-danger"><span class="am-icon">&#x1F6AB;</span> Cancel Booking</button>
                </div>
              </div>
              <button class="close-btn" (click)="closeDrawer()">&times;</button>
            </div>
          </div>
          <div class="drawer-body">
            <ng-container *ngIf="viewBillData && !viewBillLoading && viewBillActiveTab === 'details'; else mainTabs">
              <!-- View Bill Content -->
              <div class="bill-tabs">
                <button [class.active]="viewBillActiveTab==='details'" (click)="viewBillActiveTab='details'">Bill Details</button>
                <button [class.active]="viewBillActiveTab==='activity'" (click)="viewBillActiveTab='activity'">Activity Log</button>
              </div>

              <!-- Paid/Due Badge -->
              <div class="vd-paid-due-bar" *ngIf="viewBillData.total > 0">
                <span class="vd-paid-badge" *ngIf="viewBillData.paid > 0">Paid {{ viewBillData.paid | currency }}</span>
                <span class="vd-due-badge" *ngIf="viewBillComputedDue > 0">Due {{ viewBillComputedDue | currency }}</span>
                <span class="vd-overpaid-badge" *ngIf="viewBillData.paid > viewBillData.total" title="Overpaid">Overpaid {{ (viewBillData.paid - viewBillData.total) | currency }}</span>
              </div>

              <!-- Client Summary -->
              <div class="drawer-section">
                <h3>Client Summary <button class="cs-view-btn" *ngIf="drawerBooking.clientId" (click)="viewClientProfile()">View Client 360</button></h3>
                <div class="client-summary-card">
                  <div class="cs-avatar">{{ (drawerBooking.client?.fullName || '?').charAt(0) }}</div>
                  <div class="cs-info">
                    <span class="cs-name">{{ drawerBooking.client?.fullName || 'Walk-in Client' }}</span>
                    <span class="cs-contact" *ngIf="drawerBooking.client?.phone">{{ drawerBooking.client.phone }}</span>
                    <span class="cs-contact" *ngIf="drawerBooking.client?.email">{{ drawerBooking.client.email }}</span>
                  </div>
                  <div class="cs-stats" *ngIf="viewBillData.clientDetail">
                    <span class="cs-stat" *ngIf="viewBillData.clientDetail.totalVisits !== undefined"><span class="cs-stat-label">Visits</span><span class="cs-stat-val">{{ viewBillData.clientDetail.totalVisits }}</span></span>
                    <span class="cs-stat" *ngIf="viewBillData.clientDetail.totalSpend !== undefined"><span class="cs-stat-label">Spent</span><span class="cs-stat-val">{{ viewBillData.clientDetail.totalSpend | currency }}</span></span>
                  </div>
                  <div class="cs-wallet" *ngIf="viewBillData.clientDetail && viewBillData.clientDetail.walletBalance !== undefined">
                    <span class="wl-label">Wallet</span>
                    <span class="wl-amount">{{ viewBillData.clientDetail.walletBalance | currency }}</span>
                  </div>
                  <div class="cs-loyalty" *ngIf="viewBillData.clientDetail && viewBillData.clientDetail.loyaltyPoints !== undefined">
                    <span class="wl-label">Loyalty</span>
                    <span class="wl-amount">{{ viewBillData.clientDetail.loyaltyPoints }} pts</span>
                  </div>
                  <div class="cs-chips">
                    <span class="cs-chip cs-chip-vip" *ngIf="viewBillData.clientDetail && (viewBillData.clientDetail.totalSpend || 0) > 10000">&#9733; VIP</span>
                    <span class="cs-chip cs-chip-risk" *ngIf="noShowRisk && noShowRisk.riskLevel === 'high'">&#x26A0; No-Show Risk</span>
                    <span class="cs-chip cs-chip-due" *ngIf="viewBillComputedDue > 0">Due {{ viewBillComputedDue | currency }}</span>
                  </div>
                </div>
              </div>

              <!-- Membership / Package / Wallet Cards -->
              <div class="drawer-section">
                <div class="mpw-grid">
                  <div class="mpw-card">
                    <span class="mpw-icon">&#x1F3C6;</span>
                    <div class="mpw-info">
                      <span class="mpw-label">Membership</span>
                      <span class="mpw-value">No active membership</span>
                    </div>
                  </div>
                  <div class="mpw-card">
                    <span class="mpw-icon">&#x1F4E6;</span>
                    <div class="mpw-info">
                      <span class="mpw-label">Packages</span>
                      <span class="mpw-value">No package applied</span>
                    </div>
                  </div>
                  <div class="mpw-card" *ngIf="viewBillData.clientDetail && viewBillData.clientDetail.walletBalance !== undefined">
                    <span class="mpw-icon">&#x1F4B0;</span>
                    <div class="mpw-info">
                      <span class="mpw-label">Wallet</span>
                      <span class="mpw-value">{{ viewBillData.clientDetail.walletBalance | currency }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No-Show Risk -->
              <div class="drawer-section" *ngIf="noShowRisk">
                <h3>No-Show Risk</h3>
                <div class="risk-banner" [class.risk-low]="noShowRisk.riskLevel==='low'" [class.risk-medium]="noShowRisk.riskLevel==='medium'" [class.risk-high]="noShowRisk.riskLevel==='high'">
                  <span class="risk-icon">{{ noShowRisk.riskLevel === 'high' ? '&#x1F525;' : noShowRisk.riskLevel === 'medium' ? '&#x26A0;' : '&#x2705;' }}</span>
                  <span>{{ noShowRisk.reason }}</span>
                </div>
              </div>

              <!-- Payment Mode Card -->
              <div class="drawer-section">
                <h3>Payment Mode</h3>
                <div class="vd-paymode-card" *ngIf="viewBillData.payments.length > 0; else noPayMode">
                  <div class="vd-paymode-methods">
                    <span class="vd-pm-chip" *ngFor="let m of getPaymentMethodsSummary()" [class]="'vd-pm-' + m.method.toLowerCase()">
                      {{ m.method }} <strong>{{ m.total | currency }}</strong>
                    </span>
                  </div>
                  <div class="vd-paymode-total">Total Paid: <strong>{{ viewBillData.paid | currency }}</strong></div>
                </div>
                <ng-template #noPayMode>
                  <div class="vd-empty-card">No payments recorded yet</div>
                </ng-template>
              </div>

              <!-- Appointment Card -->
              <div class="drawer-section">
                <h3>Appointment</h3>
                <div class="vd-appt-card">
                  <div class="vd-appt-row">
                    <span class="vd-appt-icon">&#x1F4C5;</span>
                    <span>{{ drawerBooking.startTime | date:'EEE, MMM dd, yyyy' }}</span>
                  </div>
                  <div class="vd-appt-row">
                    <span class="vd-appt-icon">&#x1F552;</span>
                    <span>{{ drawerBooking.startTime | date:'h:mm a' }} – {{ drawerBooking.endTime | date:'h:mm a' }}</span>
                    <span class="vd-appt-dur" *ngIf="getBookingDuration() > 0">{{ getBookingDuration() }} min</span>
                  </div>
                  <div class="vd-appt-row">
                    <span class="vd-appt-icon">&#x1F9D1;&#x200D;&#x1F3EB;</span>
                    <span>{{ drawerBooking.staff?.fullName || 'Unassigned' }}</span>
                  </div>
                  <div class="vd-appt-row" *ngIf="drawerBooking.branch?.name">
                    <span class="vd-appt-icon">&#x1F3E2;</span>
                    <span>{{ drawerBooking.branch.name }}</span>
                  </div>
                  <div class="vd-appt-row" *ngIf="drawerBooking.resource?.name">
                    <span class="vd-appt-icon">&#x1F3E0;</span>
                    <span>{{ drawerBooking.resource.name }} ({{ drawerBooking.resource.type }})</span>
                  </div>
                </div>
              </div>

              <!-- Notes Card -->
              <div class="drawer-section">
                <h3>Notes</h3>
                <div class="vd-notes-card" *ngIf="drawerBooking.notes; else noNotes">
                  <p>{{ drawerBooking.notes }}</p>
                </div>
                <ng-template #noNotes><div class="vd-empty-card">No notes</div></ng-template>
              </div>

              <!-- Staff Alert Card -->
              <div class="drawer-section">
                <h3>Staff Alert</h3>
                <div class="vd-alert-card" *ngIf="viewBillData.staffAlert; else noAlert">
                  <span class="vd-alert-icon">&#x26A0;</span>
                  <span>{{ viewBillData.staffAlert }}</span>
                </div>
                <ng-template #noAlert><div class="vd-empty-card">No alerts</div></ng-template>
              </div>

              <!-- Services & Billing Table -->
              <div class="drawer-section" *ngIf="drawerBooking.services?.length">
                <h3>Services ({{ drawerBooking.services.length }})</h3>
                <div class="bill-svc-header">
                  <span class="bsh-item">Service</span>
                  <span class="bsh-dur">Time</span>
                  <span class="bsh-qty">Qty</span>
                  <span class="bsh-price">Price</span>
                  <span class="bsh-total">Total</span>
                </div>
                <div class="bill-svc-row" *ngFor="let s of drawerBooking.services">
                  <span class="bsr-name">{{ s.name }}</span>
                  <span class="bsr-dur">{{ s.durationMin || '—' }}m</span>
                  <span class="bsr-qty">1</span>
                  <span class="bsr-price">{{ s.price | currency }}</span>
                  <span class="bsr-total">{{ s.price | currency }}</span>
                </div>
              </div>

              <!-- Billing Summary -->
              <div class="drawer-section" *ngIf="drawerBooking.services?.length">
                <h3>Billing Summary</h3>
                <div class="vd-bill-summary">
                  <div class="vd-bs-row"><span>Subtotal</span><span>{{ viewBillData.subtotal | currency }}</span></div>
                  <div class="vd-bs-row" *ngIf="viewBillData.discount > 0"><span>Discount</span><span class="vd-bs-discount">-{{ viewBillData.discount | currency }}</span></div>
                  <div class="vd-bs-row" *ngIf="viewBillData.tax > 0"><span>GST ({{ viewBillData.taxRate }}%)</span><span>{{ viewBillData.tax | currency }}</span></div>
                  <div class="vd-bs-row vd-bs-total"><span>Grand Total</span><span>{{ viewBillComputedTotal | currency }}</span></div>
                  <div class="vd-bs-row vd-bs-paid"><span>Total Paid</span><span>{{ viewBillData.paid | currency }}</span></div>
                  <div class="vd-bs-row vd-bs-due" *ngIf="viewBillComputedDue > 0"><span>Due Amount</span><span>{{ viewBillComputedDue | currency }}</span></div>
                  <div class="vd-bs-row vd-bs-overpaid" *ngIf="viewBillData.paid > viewBillComputedTotal"><span>Overpaid</span><span>{{ (viewBillData.paid - viewBillComputedTotal) | currency }}</span></div>
                </div>
              </div>

              <!-- Payment Timeline -->
              <div class="drawer-section" *ngIf="viewBillData.payments.length > 0">
                <h3>Payment Timeline ({{ viewBillData.payments.length }})</h3>
                <div class="vd-pay-timeline">
                  <div class="vd-pt-entry" *ngFor="let p of viewBillData.payments">
                    <div class="vd-pt-dot" [class.vd-pt-dot-paid]="p.status==='PAID'||p.status==='COMPLETED'" [class.vd-pt-dot-pending]="p.status==='PENDING'"></div>
                    <div class="vd-pt-info">
                      <div class="vd-pt-row1">
                        <span class="vd-pt-method">{{ p.method }}</span>
                        <span class="vd-pt-amount">{{ p.amount | currency }}</span>
                      </div>
                      <div class="vd-pt-row2">
                        <span class="vd-pt-status" [class.vd-pt-status-ok]="p.status==='PAID'||p.status==='COMPLETED'" [class.vd-pt-status-pending]="p.status==='PENDING'">{{ p.status }}</span>
                        <span class="vd-pt-date">{{ p.createdAt | date:'MMM dd, h:mm a' }}</span>
                        <span class="vd-pt-ref" *ngIf="p['reference']">Ref: {{ p['reference'] }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Conflict Warnings -->
              <div class="drawer-section conflict-section" *ngIf="getBookingConflicts(drawerBooking).length > 0">
                <h3 class="conflict-heading">&#x26A0; Schedule Conflicts</h3>
                <div class="conflict-item" *ngFor="let c of getBookingConflicts(drawerBooking)">
                  <span class="conflict-icon" [class.conflict-staff]="c.type==='staff'" [class.conflict-client]="c.type==='client'" [class.conflict-resource]="c.type==='resource'">
                    {{ c.type === 'staff' ? '&#x1F9D1;' : c.type === 'client' ? '&#x1F464;' : '&#x1F3E0;' }}
                  </span>
                  <div class="conflict-info">
                    <span class="conflict-msg">{{ c.message }}</span>
                    <span class="conflict-time">{{ c.conflictingTime }}</span>
                  </div>
                </div>
              </div>

              <!-- Communication Actions -->
              <div class="drawer-section comm-section">
                <h3>Communication</h3>
                <div class="comm-grid">
                  <button class="comm-btn" title="WhatsApp integration not configured yet" disabled>Send Confirmation</button>
                  <button class="comm-btn" title="WhatsApp integration not configured yet" disabled>Send Reminder</button>
                  <button class="comm-btn" title="WhatsApp integration not configured yet" disabled>Send Invoice</button>
                  <button class="comm-btn" title="WhatsApp integration not configured yet" disabled>Ask for Review</button>
                  <button class="comm-btn" title="WhatsApp integration not configured yet" disabled>Send Due Reminder</button>
                </div>
                <div class="due-reminder-preview" *ngIf="viewBillComputedDue > 0">
                  <span class="dr-label">Due Reminder Preview:</span>
                  <span class="dr-text">Hi {{ drawerBooking.client?.fullName || 'Client' }}, your pending amount for {{ drawerBooking.title || 'service' }} on {{ drawerBooking.startTime | date:'MMM dd' }} is {{ viewBillComputedDue | currency }}.</span>
                  <button class="dr-copy" (click)="copyDueReminder()" title="Copy to clipboard">Copy</button>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="vd-actions">
                <button class="vd-btn vd-btn-primary" (click)="openAddPayment()">&#x1F4B3; Add Payment</button>
                <button class="vd-btn vd-btn-secondary" (click)="openAddTip()">&#x1F381; Add Tip</button>
                <button class="vd-btn vd-btn-secondary" (click)="printBill()">&#x1F5A8; Print Bill</button>
                <button class="vd-btn vd-btn-secondary vd-btn-disabled" title="Refund flow will be available when refund API is enabled" disabled>&#x21A9; Refund</button>
              </div>
            </ng-container>

            <!-- Activity Log Tab -->
            <ng-template #mainTabs>
              <div class="bill-tabs" *ngIf="drawerBooking">
                <button [class.active]="viewBillActiveTab==='details'" (click)="viewBillActiveTab='details'">Bill Details</button>
                <button [class.active]="viewBillActiveTab==='activity'" (click)="viewBillActiveTab='activity'">Activity Log</button>
              </div>
            </ng-template>

            <div class="activity-log-section" *ngIf="viewBillActiveTab==='activity' && viewBillData">
              <div class="drawer-section">
                <h3>Activity Log</h3>
                <div class="al-empty" *ngIf="viewBillData.activityLog.length === 0">
                  <span>No activity recorded yet.</span>
                </div>
                <div class="al-entry" *ngFor="let entry of viewBillData.activityLog">
                  <div class="al-dot"></div>
                  <div class="al-content">
                    <span class="al-action">{{ entry.action }}</span>
                    <span class="al-time">{{ entry.timestamp | date:'MMM dd, h:mm a' }}</span>
                    <span class="al-user" *ngIf="entry.user">{{ entry.user }}</span>
                    <span class="al-details" *ngIf="entry.details">{{ entry.details }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Loading -->
            <div class="drawer-loading" *ngIf="viewBillLoading"><div class="spinner"></div><span>Loading bill details...</span></div>

            <!-- Reschedule Form -->
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

            <!-- Cancel Form -->
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

            <!-- Edit Form -->
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

            <!-- Split Payment Form -->
            <div class="sp-form" *ngIf="showAddPayment">
              <div class="sp-header">
                <h3>Add Payment</h3>
                <span class="sp-due-label" *ngIf="viewBillData">Due: <strong>{{ viewBillComputedDue | currency }}</strong></span>
              </div>
              <div class="sp-quick-btns">
                <button class="sp-qb" (click)="setSplitQuick('CASH')">Full Cash</button>
                <button class="sp-qb" (click)="setSplitQuick('UPI')">Full UPI</button>
                <button class="sp-qb" (click)="setSplitQuick('CARD')">Full Card</button>
                <button class="sp-qb" (click)="setSplitFiftyFifty()">50/50 Cash+UPI</button>
                <button class="sp-qb sp-qb-clear" (click)="clearSplitRows()">Clear</button>
              </div>
              <div class="sp-rows">
                <div class="sp-row" *ngFor="let row of splitPaymentRows; let i = index">
                  <select [(ngModel)]="row.method" class="sp-method">
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="WALLET" disabled>Wallet (not supported)</option>
                  </select>
                  <input type="number" [(ngModel)]="row.amount" min="0" step="0.01" placeholder="Amount" class="sp-amount">
                  <input type="text" [(ngModel)]="row.reference" placeholder="Ref (optional)" class="sp-ref" maxlength="100">
                  <button class="sp-remove" (click)="removeSplitRow(i)" *ngIf="splitPaymentRows.length > 1">&times;</button>
                </div>
              </div>
              <button class="sp-add-row" (click)="addSplitRow()">+ Add another method</button>
              <div class="sp-summary">
                <div class="sp-s-row"><span>Total Bill</span><strong>{{ viewBillData?.total || 0 | currency }}</strong></div>
                <div class="sp-s-row"><span>Existing Paid</span><strong>{{ viewBillData?.paid || 0 | currency }}</strong></div>
                <div class="sp-s-row"><span>New Payment(s)</span><strong>{{ splitTotalNew | currency }}</strong></div>
                <div class="sp-s-row sp-s-due"><span>Due After</span><strong>{{ splitDueAfter | currency }}</strong></div>
              </div>
              <div class="sp-warning" *ngIf="splitTotalNew > viewBillComputedDue">Total payment exceeds due amount.</div>
              <div class="drawer-actions">
                <button (click)="closeAddPayment()">Back</button>
                <button class="btn-primary" (click)="doSplitPayments()" [disabled]="addPaymentBusy || !isSplitValid()">{{ addPaymentBusy ? 'Processing...' : 'Pay' }}</button>
              </div>
              <div class="drawer-error" *ngIf="addPaymentError">{{ addPaymentError }}</div>
            </div>

            <!-- Add Tip Form -->
            <div class="payment-form" *ngIf="showAddTip">
              <h3>Add Tip</h3>
              <label>Tip Amount</label>
              <input [(ngModel)]="addTipAmount" type="number" min="0" step="0.01" placeholder="0.00">
              <div class="tip-presets">
                <button *ngFor="let t of [5,10,20]" (click)="addTipAmount = t" [class.active]="addTipAmount === t">{{ t | currency }}</button>
              </div>
              <div class="drawer-actions">
                <button (click)="closeAddTip()">Back</button>
                <button class="btn-primary" (click)="doAddTip()" [disabled]="addTipBusy || !addTipAmount">{{ addTipBusy ? 'Processing...' : 'Add Tip' }}</button>
              </div>
              <div class="drawer-error" *ngIf="addTipError">{{ addTipError }}</div>
            </div>

            <!-- Smart Rebook -->
            <div class="smart-rebook-panel" *ngIf="showSmartRebook">
              <h3>Smart Rebook Suggestions</h3>
              <div class="drawer-loading" *ngIf="rebookLoading"><div class="spinner"></div><span>Finding available slots...</span></div>
              <div class="drawer-error" *ngIf="rebookError">{{ rebookError }}</div>
              <div class="rebook-list" *ngIf="!rebookLoading">
                <div class="rebook-card" *ngFor="let s of rebookSuggestions; let i = index"
                  (click)="bookRebookSlot(s)" role="button" tabindex="0">
                  <div class="rebook-num">{{ i + 1 }}</div>
                  <div class="rebook-info">
                    <span class="rebook-time">{{ s.startTime | date:'EEE, MMM dd, h:mm a' }} – {{ s.endTime | date:'h:mm a' }}</span>
                    <span class="rebook-staff">{{ s.staffName || 'Same staff' }}</span>
                  </div>
                  <button class="rebook-book-btn">Book</button>
                </div>
                <div class="rebook-empty" *ngIf="rebookSuggestions.length === 0">
                  <span>No available slots found. Try a different date.</span>
                </div>
              </div>
              <div class="drawer-actions">
                <button (click)="closeSmartRebook()">Back</button>
              </div>
            </div>

            <div class="drawer-loading" *ngIf="drawerBusy && !showReschedule && !showCancelForm && !showEditForm && !showConfirmAction && !showAddPayment && !showAddTip && !showSmartRebook"><div class="spinner"></div><span>Updating...</span></div>
            <div class="drawer-error" *ngIf="drawerError && !showReschedule && !showCancelForm && !showEditForm && !showConfirmAction && !showAddPayment && !showAddTip && !showSmartRebook">{{ drawerError }}</div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showCreate" (click)="closeCreate()">
        <div class="create-panel salonist-modal" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>New Booking</h2>
            <button class="close-btn" (click)="closeCreate()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="nb-loading" *ngIf="createBusy"><div class="spinner"></div><span>Creating booking...</span></div>
            <div class="nb-error" *ngIf="createError">{{ createError }}</div>

            <div class="nb-sections">

              <!-- Client Section -->
              <div class="nb-section">
                <div class="nb-section-title">Client</div>
                <div class="client-search-wrapper">
                  <input [(ngModel)]="clientSearchQuery" (input)="onClientSearch()" placeholder="Search client by name or phone..." class="client-search-input" autocomplete="off">
                  <div class="client-search-results" *ngIf="clientSearchQuery && (clientLookupBusy || filteredClientList.length > 0 || clientLookupError)">
                    <div class="csr-status" *ngIf="clientLookupBusy">Searching clients...</div>
                    <button class="csr-item" *ngFor="let c of filteredClientList" (click)="selectClient(c)" type="button">
                      <span class="csr-main">
                        <span class="csr-name">{{ c.fullName || c.name }}</span>
                        <span class="csr-email" *ngIf="c.email">{{ c.email }}</span>
                      </span>
                      <span class="csr-phone" *ngIf="c.phone">{{ c.phone }}</span>
                    </button>
                    <div class="csr-status csr-error" *ngIf="clientLookupError">{{ clientLookupError }}</div>
                  </div>
                  <div class="client-search-empty" *ngIf="clientSearchQuery && !clientLookupBusy && filteredClientList.length === 0">
                    <span>No matching client found.</span>
                    <div class="client-empty-actions">
                      <button type="button" class="client-empty-btn" (click)="openAddClientFromSearch()">Add new client</button>
                      <button type="button" class="client-empty-btn secondary" (click)="openWalkinFromCreate()">Book as walk-in</button>
                    </div>
                  </div>
                  <div class="new-client-form" *ngIf="showAddClientForm">
                    <div class="new-client-grid">
                      <input [(ngModel)]="newClientForm.fullName" placeholder="Client name">
                      <input [(ngModel)]="newClientForm.phone" placeholder="Phone number">
                      <input [(ngModel)]="newClientForm.email" placeholder="Email optional">
                    </div>
                    <div class="new-client-error" *ngIf="newClientError">{{ newClientError }}</div>
                    <div class="new-client-actions">
                      <button type="button" (click)="createClientFromDrawer()" [disabled]="newClientBusy">{{ newClientBusy ? 'Adding...' : 'Add client' }}</button>
                      <button type="button" class="secondary" (click)="cancelAddClient()" [disabled]="newClientBusy">Cancel</button>
                    </div>
                  </div>
                  <div class="client-selected" *ngIf="createForm.clientId && selectedClientName">
                    <div class="selected-summary">
                      <strong>{{ selectedClientName }}</strong>
                      <span *ngIf="selectedClientPhone">{{ selectedClientPhone }}</span>
                      <span *ngIf="selectedClientEmail">{{ selectedClientEmail }}</span>
                    </div>
                    <button class="cs-clear" type="button" (click)="clearSelectedClient()">&times;</button>
                  </div>
                  <div class="nb-field-error" *ngIf="showClientValidationError">Please select a client or use Walk-in booking.</div>
                </div>
              </div>

              <!-- Appointment Section -->
              <div class="nb-section">
                <div class="nb-section-title">Appointment</div>
                <div class="nb-field nb-field-full service-search-wrapper">
                  <label>Service</label>
                  <input [(ngModel)]="serviceSearchQuery" (input)="onServiceSearch()" placeholder="Search service by name or category..." class="service-search-input" autocomplete="off">
                  <div class="service-search-results" *ngIf="serviceSearchQuery && (serviceLookupBusy || filteredServiceList.length > 0 || serviceLookupError)">
                    <div class="ssr-status" *ngIf="serviceLookupBusy">Searching services...</div>
                    <button class="ssr-item" *ngFor="let svc of filteredServiceList" (click)="selectPrimaryService(svc)" type="button">
                      <span class="ssr-main">
                        <span class="ssr-name">{{ svc.name }}</span>
                        <span class="ssr-category" *ngIf="svc.category?.name">{{ svc.category?.name }}</span>
                      </span>
                      <span class="ssr-meta">{{ svc.price | currency }} / {{ svc.durationMin }} min</span>
                    </button>
                    <div class="ssr-status ssr-error" *ngIf="serviceLookupError">{{ serviceLookupError }}</div>
                  </div>
                  <div class="service-search-empty" *ngIf="serviceSearchQuery && !serviceLookupBusy && filteredServiceList.length === 0">
                    No matching service found.
                  </div>
                  <div class="selected-service" *ngIf="primarySelectedServiceName">
                    <div class="selected-summary">
                      <strong>{{ primarySelectedServiceName }}</strong>
                      <span>{{ primarySelectedServiceMeta }}</span>
                    </div>
                    <button class="cs-clear" type="button" (click)="clearPrimaryService()">&times;</button>
                  </div>
                  <div class="nb-field-error" *ngIf="showServiceValidationError">Please select a service.</div>
                </div>
                <div class="nb-grid-2">
                  <div class="nb-field">
                    <label>Title</label>
                    <input [(ngModel)]="createForm.title" placeholder="e.g. Haircut & Style">
                  </div>
                  <div class="nb-field">
                    <label>Date & Time</label>
                    <input [(ngModel)]="createForm.startTime" type="datetime-local">
                  </div>
                  <div class="nb-field">
                    <label>Staff</label>
                    <select [(ngModel)]="createForm.staffId">
                      <option value="">Select staff...</option>
                      <option *ngFor="let s of staffList" [value]="s.id">{{ s.fullName }}</option>
                    </select>
                  </div>
                  <div class="nb-field">
                    <label>Branch</label>
                    <select [(ngModel)]="createForm.branchId">
                      <option value="">Select branch...</option>
                      <option *ngFor="let b of branchList" [value]="b.id">{{ b.name || b.city || b.id }}</option>
                    </select>
                  </div>
                  <div class="nb-field">
                    <label>Resource</label>
                    <select [(ngModel)]="createForm.resourceId">
                      <option value="">None</option>
                      <option *ngFor="let r of resourceList" [value]="r.id">{{ r.name }} ({{ r.type }})</option>
                    </select>
                  </div>
                </div>
                <div class="nb-duration-row">
                  <label>Duration</label>
                  <div class="nb-duration-chips">
                    <button class="nb-dur-chip" [class.active]="bookingDuration === 15" (click)="setBookingDuration(15)" type="button">15m</button>
                    <button class="nb-dur-chip" [class.active]="bookingDuration === 30" (click)="setBookingDuration(30)" type="button">30m</button>
                    <button class="nb-dur-chip" [class.active]="bookingDuration === 45" (click)="setBookingDuration(45)" type="button">45m</button>
                    <button class="nb-dur-chip" [class.active]="bookingDuration === 60" (click)="setBookingDuration(60)" type="button">1h</button>
                    <button class="nb-dur-chip" [class.active]="bookingDuration === 90" (click)="setBookingDuration(90)" type="button">1.5h</button>
                    <button class="nb-dur-chip" [class.active]="bookingDuration === 120" (click)="setBookingDuration(120)" type="button">2h</button>
                    <button class="nb-dur-chip" [class.active]="bookingDuration === 180" (click)="setBookingDuration(180)" type="button">3h</button>
                    <button class="nb-dur-chip" [class.active]="bookingDuration === 240" (click)="setBookingDuration(240)" type="button">4h</button>
                    <button class="nb-dur-chip nb-dur-chip-custom" [class.active]="!durationPresets.includes(bookingDuration)" (click)="setBookingDuration(bookingDuration || 30)" type="button">Custom</button>
                  </div>
                  <span class="nb-end-time" *ngIf="bookingDuration > 0 && createForm.startTime">
                    Ends at <strong>{{ estimatedEndTime }}</strong> ({{ bookingDuration }} min)
                  </span>
                </div>
              </div>

              <!-- Services Section -->
              <div class="nb-section">
                <div class="nb-section-title">Services</div>
                <div class="nb-services">
                  <div class="nb-svc-header">
                    <span class="nb-sh-svc">Service</span>
                    <span class="nb-sh-qty">Qty</span>
                    <span class="nb-sh-price">Price</span>
                    <span class="nb-sh-disc">Disc %</span>
                    <span class="nb-sh-total">Total</span>
                    <span class="nb-sh-action"></span>
                  </div>
                  <div class="nb-svc-row" *ngFor="let s of createForm.services; let i = index">
                    <select [(ngModel)]="s.serviceId" (change)="onServiceSelect(i)" class="nb-svc-select">
                      <option value="">Select...</option>
                      <option *ngFor="let svc of serviceList" [value]="svc.id">{{ svc.name }} ({{ svc.durationMin }}min / {{ svc.price | currency }}{{ svc.category?.name ? ' / ' + svc.category?.name : '' }})</option>
                    </select>
                    <input type="number" [(ngModel)]="s.quantity" min="1" value="1" class="nb-svc-qty">
                    <span class="nb-svc-val">{{ (s.price || 0) | currency }}</span>
                    <input type="number" [(ngModel)]="s.discountPct" min="0" max="100" class="nb-svc-disc" placeholder="0">
                    <span class="nb-svc-val nb-svc-line-total">{{ getServiceLineTotal(i) | currency }}</span>
                    <button class="nb-svc-remove" (click)="removeService(i)" *ngIf="createForm.services.length > 1">&times;</button>
                  </div>
                  <button class="nb-add-svc" (click)="addService()">+ Add Service</button>
                </div>
                <div class="nb-dur-est" *ngIf="totalDuration > 0">
                  <span>Duration: <strong>{{ totalDuration }} min</strong></span>
                  <span *ngIf="estimatedEndTime"> Ends at <strong>{{ estimatedEndTime }}</strong></span>
                </div>
              </div>

              <!-- Billing Section -->
              <div class="nb-section" *ngIf="createForm.services.length > 0">
                <div class="nb-section-title">Billing Summary</div>
                <div class="nb-billing">
                  <div class="nb-bill-row"><span>Subtotal</span><strong>{{ subtotalPrice | currency }}</strong></div>
                  <div class="nb-bill-row"><span>Discount</span><strong>-{{ discountTotal | currency }}</strong></div>
                  <div class="nb-bill-row nb-bill-tax">
                    <span>Tax (GST)</span>
                    <span class="nb-tax-input-wrap">
                      <input type="number" [(ngModel)]="createForm.taxRate" min="0" max="100" class="nb-tax-input" placeholder="0"> %
                      <strong>{{ taxTotal | currency }}</strong>
                    </span>
                  </div>
                  <div class="nb-bill-row nb-bill-total"><span>Grand Total</span><strong>{{ grandTotal | currency }}</strong></div>
                  <div class="nb-bill-row"><span>Paid</span><strong>{{ createForm.paymentAmount || 0 | currency }}</strong></div>
                  <div class="nb-bill-row nb-bill-due"><span>Due</span><strong>{{ dueAmount | currency }}</strong></div>
                </div>
              </div>

              <!-- Payment Section -->
              <div class="nb-section" *ngIf="createForm.services.length > 0">
                <div class="nb-section-title">Payment</div>
                <div class="nb-payment">
                  <div class="nb-field">
                    <label>Payment Mode</label>
                    <select [(ngModel)]="createForm.paymentMode">
                      <option value="">— Pay at Venue —</option>
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                    </select>
                  </div>
                  <div class="nb-field" *ngIf="createForm.paymentMode">
                    <label>Amount Paid</label>
                    <input type="number" [(ngModel)]="createForm.paymentAmount" min="0" [max]="totalPrice" placeholder="0.00">
                  </div>
                </div>
                <div class="nb-pay-note">* Payment will be recorded separately after booking is saved.</div>
              </div>

              <!-- Notes Section -->
              <div class="nb-section">
                <div class="nb-section-title">Notes &amp; Alerts</div>
                <div class="nb-field">
                  <label>Booking Note</label>
                  <textarea [(ngModel)]="createForm.notes" placeholder="Optional note for this booking..." rows="2"></textarea>
                </div>
                <div class="nb-field" style="margin-top:8px">
                  <label>Staff Alert</label>
                  <textarea [(ngModel)]="createForm.staffAlert" placeholder="Alert for staff (e.g. allergies, special requests)..." rows="2"></textarea>
                </div>
              </div>

            </div>

            <!-- Sticky Footer -->
            <div class="nb-footer">
              <button class="nb-btn nb-btn-cancel" (click)="closeCreate()">Cancel</button>
              <button class="nb-btn nb-btn-primary" (click)="doCreateBooking()" [disabled]="createBusy">{{ createBusy ? 'Creating...' : 'Save Booking' }}</button>
              <button class="nb-btn nb-btn-secondary" (click)="doCreateBooking()" [disabled]="createBusy">Save &amp; Print</button>
            </div>
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

      <app-client-360 *ngIf="showClient360 && client360ClientId" [clientId]="client360ClientId" (close)="closeClient360()"></app-client-360>
    </section>
  `,
  styles: [`
    .page{display:flex;flex-direction:column;gap:20px;flex:1;min-height:0}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:#f7f7f7;padding:4px 0;margin:-4px 0}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .head-actions{display:flex;gap:8px;align-items:center}
    .today-btn,.nav-btn,.refresh-btn{border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;background:white}
    .refresh-btn{font-size:12px;padding:10px 14px;min-height:40px}
    .refresh-btn:disabled{opacity:.5;cursor:default}
    .updated-text{font-size:11px;color:#9ca3af;white-space:nowrap}
    .date-label{font-weight:700;font-size:16px;min-width:200px;text-align:center;color:#374151;letter-spacing:-.02em}
    .tabs{display:flex;gap:4px;align-items:center;flex-wrap:wrap;background:#f7f7f7;padding:4px 0}
    .tabs button{border:1px solid #e5e7eb;border-radius:10px;padding:10px 20px;font-weight:700;cursor:pointer;background:white}
    .tabs button.active{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .tabs-divider{width:1px;height:28px;background:#e5e7eb;margin:0 8px}
    .vm-btn{font-size:12px;padding:8px 16px!important}
    .res-filter{border:1px solid #e5e7eb;border-radius:12px;padding:9px 14px;font-size:13px;font-weight:600;background:rgba(255,255,255,.85);backdrop-filter:blur(6px);transition:border-color .15s,box-shadow .15s}
    .res-filter:focus,.branch-filter:focus,.status-filter:focus{outline:none;border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.18)}
    .filter-bar{display:flex;gap:8px;align-items:center;padding:0 0 8px}
    .branch-filter,.status-filter{border:1px solid #e5e7eb;border-radius:12px;padding:9px 14px;font-size:13px;font-weight:600;background:rgba(255,255,255,.85);backdrop-filter:blur(6px);min-width:160px;transition:border-color .15s,box-shadow .15s,background .15s}
    .status-filter{min-width:130px}
    .branch-filter:hover,.status-filter:hover,.res-filter:hover{border-color:#a5b4fc}
    .res-type-badge{font-size:9px;background:#e5e7eb;color:#374151;border-radius:6px;padding:2px 7px;font-weight:700;margin-left:6px;letter-spacing:.04em;text-transform:uppercase;transition:all .15s}
    .res-type-ROOM{background:#dbeafe;color:#1d4ed8}
    .res-type-CHAIR{background:#dcfce7;color:#15803d}
    .res-type-STATION{background:#fef9c3;color:#a16207}
    .res-type-EQUIPMENT{background:#fae8ff;color:#a21caf}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280;background:rgba(255,255,255,.6);border:1px solid #eef2ff;border-radius:18px;backdrop-filter:blur(4px);box-shadow:0 8px 24px rgba(17,24,39,.04);animation:fadeIn .25s ease}
    .spinner{width:26px;height:26px;border:3px solid #e0e7ff;border-top-color:#4f46e5;border-right-color:#7c3aed;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .summary-bar{display:flex;gap:8px;flex-wrap:wrap;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:8px 12px}
    .status-legend{display:flex;flex-wrap:wrap;gap:6px 18px;padding:8px 0 4px;align-items:center}
    .legend-item{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#374151;font-weight:600;background:#f8fafc;border:1px solid #eef2ff;border-radius:999px;padding:3px 10px}
    .legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;box-shadow:0 0 0 2px rgba(0,0,0,.04)}
    .sum-card{flex:1;text-align:center;padding:2px 8px;border-right:1px solid #e5e7eb;min-width:80px}
    .sum-card:last-child{border-right:0}
    .sum-card span{display:block;font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.04em;margin-bottom:1px}
    .sum-card b{font-size:16px;color:#0b0b0b}
    .green{color:#16a34a}.amber{color:#d97706}
    .staff-filter-bar{display:flex;gap:6px;padding:10px 12px;flex-wrap:wrap;border-bottom:1px solid #e5e7eb}
    .staff-filter-pill{border:1px solid #e5e7eb;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;background:white;color:#374151;transition:all .15s;box-shadow:0 1px 2px rgba(17,24,39,.04)}
    .staff-filter-pill.active{background:#4f46e5;color:white;border-color:#4f46e5;box-shadow:0 4px 12px rgba(79,70,229,.28)}
    .staff-filter-pill:hover:not(.active){background:#eef2ff;border-color:#a5b4fc}
    .staff-filter-pill:focus-visible{outline:2px solid #4f46e5;outline-offset:2px}
    .sf-spacer{flex:1}
    .walkin-btn{border:0;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:700;cursor:pointer;background:linear-gradient(120deg,#059669,#10b981);color:white;transition:background .15s,box-shadow .15s,transform .15s;box-shadow:0 3px 10px rgba(5,150,105,.3)}
    .walkin-btn:hover{background:linear-gradient(120deg,#047857,#059669);box-shadow:0 5px 14px rgba(5,150,105,.4);transform:translateY(-1px)}
    .walkin-btn:focus-visible{outline:2px solid #059669;outline-offset:2px}
    .waitlist-toggle-btn{display:inline-flex;align-items:center;gap:4px;border:1px solid #d1d5db;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;background:rgba(255,255,255,.9);color:#374151;transition:all .15s;margin-left:6px;box-shadow:0 1px 3px rgba(17,24,39,.05)}
    .waitlist-toggle-btn:hover{background:#f3f4f6;border-color:#9ca3af}
    .waitlist-toggle-btn:focus-visible{outline:2px solid #6366f1;outline-offset:2px}
    .waitlist-toggle-btn.active{background:#eef2ff;border-color:#6366f1;color:#4338ca;box-shadow:0 3px 10px rgba(99,102,241,.25)}
    .ai-toggle-btn{display:inline-flex;align-items:center;gap:4px;border:1px solid #d1d5db;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;background:rgba(255,255,255,.9);color:#374151;transition:all .15s;margin-left:6px;box-shadow:0 1px 3px rgba(17,24,39,.05)}
    .ai-toggle-btn:hover{background:#f3f4f6;border-color:#9ca3af}
    .ai-toggle-btn:focus-visible{outline:2px solid #7c3aed;outline-offset:2px}
    .ai-toggle-btn.active{background:linear-gradient(120deg,#ede9fe,#f5f3ff);border-color:#7c3aed;color:#6d28d9;box-shadow:0 3px 10px rgba(124,58,237,.22)}
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
    .day-view{background:linear-gradient(180deg,#ffffff,#fbfcff);border:1px solid #eef2ff;border-radius:22px;display:flex;flex-direction:column;min-height:520px;flex:1;box-shadow:0 10px 30px rgba(17,24,39,.06)}
    .dv-container{display:flex;flex:1;min-width:0;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;overscroll-behavior:contain}
    .dv-time-col{flex-shrink:0;width:60px;border-right:1px solid #e5e7eb;background:#fafafa;position:sticky;left:0;z-index:3;box-shadow:2px 0 6px rgba(17,24,39,.04)}
    .dv-header-gap{height:52px;border-bottom:1px solid #e5e7eb}
    .dv-time-row{height:56px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #f1f5f9;cursor:pointer}
    .dv-time-row:hover{background:#eef2ff}
    .dv-time-label{font-size:11px;color:#6b7280;font-weight:600}
    .dv-staff-scroll{display:flex;flex:1;min-width:0}
    .dv-staff-col{min-width:240px;flex:0 0 240px;border-right:1px solid #eef2ff;transition:background .15s ease}
    .dv-staff-col:hover{background:#fbfcff}
    .dv-staff-col:last-child{border-right:0}
    .dv-staff-header{min-height:56px;display:flex;align-items:center;font-weight:700;font-size:13px;border-bottom:1px solid #eef2ff;background:linear-gradient(180deg,#ffffff,#f8fafc);position:sticky;top:0;z-index:2;padding:8px 12px;box-shadow:0 1px 0 rgba(17,24,39,.04)}
    .staff-header-content{display:flex;align-items:center;gap:10px;width:100%}
    .staff-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white;flex-shrink:0;box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.15)}
    .staff-avatar-c1{background:#6366f1}.staff-avatar-c2{background:#059669}.staff-avatar-c3{background:#d97706}.staff-avatar-c4{background:#dc2626}.staff-avatar-c5{background:#7c3aed}
    .staff-header-main{display:flex;flex-direction:column;min-width:0;flex:1}
    .staff-header-name{font-size:13px;font-weight:700;color:#0b0b0b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .staff-header-meta{font-size:10px;color:#fff;font-weight:700;background:#6366f1;border-radius:999px;padding:1px 8px;margin-top:2px;align-self:flex-start;box-shadow:0 1px 3px rgba(99,102,241,.4)}
    .dv-staff-body{position:relative}
    .dv-hour-row{height:56px;border-bottom:1px solid #f1f5f9;padding:3px 6px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:2px;overflow:hidden;cursor:pointer;transition:background .15s ease,box-shadow .15s ease}
    .dv-hour-row:hover{background:#eef2ff;box-shadow:inset 0 0 0 1px rgba(99,102,241,.25),0 0 12px rgba(99,102,241,.12)}
    .dv-hour-row-alt{background:#fafafa}
    .dv-hour-row-alt:hover{background:#e6edff;box-shadow:inset 0 0 0 1px rgba(99,102,241,.25),0 0 12px rgba(99,102,241,.12)}
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
    .dv-bookings-layer .booking-chip{pointer-events:auto;position:absolute;overflow:hidden;z-index:1;border-radius:8px;padding:5px 8px;font-size:10px;cursor:pointer;background:#f3f4f6;border-left:3px solid #d1d5db;display:flex;flex-direction:column;gap:2px;min-height:20px;box-shadow:0 1px 3px rgba(17,24,39,.08)}
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
    .salonist-modal{width:min(740px,94%)!important;border-radius:20px!important}
    .salonist-modal .drawer-header{padding:20px 28px}
    .salonist-modal .drawer-body{padding:0;display:flex;flex-direction:column;gap:0}
    .nb-loading,.nb-error{padding:16px 28px}
    .nb-loading{display:flex;align-items:center;gap:10px;font-size:13px;color:#6b7280}
    .nb-error{background:#fef2f2;color:#991b1b;font-size:13px}
    .nb-sections{display:flex;flex-direction:column;gap:0}
    .nb-section{border-bottom:1px solid #f3f4f6;padding:18px 28px}
    .nb-section:last-child{border-bottom:none}
    .nb-section-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.06em;margin-bottom:12px}
    .nb-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .nb-field{display:flex;flex-direction:column;gap:4px}
    .nb-field label{font-size:12px;font-weight:600;color:#374151}
    .nb-field input,.nb-field select,.nb-field textarea{padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:inherit;width:100%;box-sizing:border-box;transition:border-color .15s}
    .nb-field input:focus,.nb-field select:focus,.nb-field textarea:focus{border-color:#6366f1;outline:none}
    .nb-field textarea{resize:vertical;min-height:48px}
    .nb-services{display:flex;flex-direction:column;gap:6px}
    .nb-svc-header{display:grid;grid-template-columns:2fr 56px 80px 60px 80px 28px;gap:6px;padding:0 4px 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.03em}
    .nb-svc-row{display:grid;grid-template-columns:2fr 56px 80px 60px 80px 28px;gap:6px;align-items:center}
    .nb-svc-select{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;background:white}
    .nb-svc-qty{width:100%;padding:8px 6px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;text-align:center}
    .nb-svc-val{font-size:13px;color:#374151;text-align:right;padding:0 4px;white-space:nowrap}
    .nb-svc-line-total{font-weight:600;color:#0b0b0b}
    .nb-svc-remove{border:0;background:transparent;color:#ef4444;font-size:18px;cursor:pointer;padding:0;line-height:1}
    .nb-add-svc{border:1px dashed #d1d5db;background:transparent;border-radius:8px;padding:8px;font-size:12px;font-weight:600;color:#6366f1;cursor:pointer;transition:background .15s}
    .nb-add-svc:hover{background:#f0f4ff}
    .nb-dur-est{display:flex;gap:16px;margin-top:8px;font-size:12px;color:#6b7280}
    .nb-dur-est strong{color:#374151}
    .nb-billing{display:flex;flex-direction:column;gap:5px}
    .nb-bill-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #f9fafb}
    .nb-bill-row:last-child{border-bottom:none}
    .nb-bill-row span{color:#6b7280}
    .nb-bill-row strong{color:#0b0b0b}
    .nb-bill-total strong{font-size:15px;color:#0b0b0b}
    .nb-bill-due{border-top:2px solid #0b0b0b;padding-top:8px;margin-top:4px}
    .nb-bill-due span{font-weight:700;color:#0b0b0b}
    .nb-bill-due strong{font-size:16px;color:#059669}
    .nb-payment{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .nb-pay-note{font-size:11px;color:#9ca3af;margin-top:8px;font-style:italic}
    .nb-duration-row{display:flex;flex-direction:column;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid #f3f4f6}
    .nb-duration-row>label{font-size:12px;font-weight:600;color:#374151}
    .nb-duration-chips{display:flex;flex-wrap:wrap;gap:6px}
    .nb-dur-chip{border:1px solid #e5e7eb;border-radius:16px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;background:white;color:#4b5563;transition:all .15s;min-height:30px}
    .nb-dur-chip:hover{border-color:#6366f1;color:#6366f1;background:#f0f4ff}
    .nb-dur-chip.active{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .nb-dur-chip-custom{border-style:dashed}
    .nb-end-time{font-size:12px;color:#6b7280;padding:4px 0}
    .nb-end-time strong{color:#059669;font-weight:700}
    .nb-svc-disc{width:100%;padding:8px 4px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;text-align:center}
    .nb-tax-input-wrap{display:flex;align-items:center;gap:6px}
    .nb-tax-input{width:50px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;text-align:center}
    .nb-bill-tax span:first-child{display:flex;align-items:center}
    .nb-footer{display:flex;gap:10px;padding:16px 28px;border-top:1px solid #e5e7eb;position:sticky;bottom:0;background:white;z-index:2}
    .nb-btn{padding:12px 20px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;border:0;transition:opacity .15s,background .15s;flex:1;text-align:center}
    .nb-btn:disabled{opacity:.5;cursor:default}
    .nb-btn-cancel{background:#f3f4f6;color:#374151}
    .nb-btn-cancel:hover{background:#e5e7eb}
    .nb-btn-primary{background:#0b0b0b;color:white}
    .nb-btn-primary:hover{background:#1f2937}
    .nb-btn-secondary{background:#f3f4f6;color:#374151;border:1px solid #e5e7eb!important}
    .nb-btn-secondary:hover{background:#e5e7eb}
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
      .dv-staff-col{min-width:180px;flex:0 0 180px}
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
      .dv-staff-col{min-width:160px;flex:0 0 160px}
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
      .dv-staff-col{min-width:150px;flex:0 0 150px}
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
      .dv-container{overflow:auto;-webkit-overflow-scrolling:touch}
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
      .dv-staff-col{min-width:130px;flex:0 0 130px}
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
    .slot-toggle{display:inline-flex;gap:2px;background:#f3f4f6;border-radius:8px;padding:2px}
    .slot-btn{border:0;background:transparent;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;color:#6b7280;transition:all .12s}
    .slot-btn.active{background:#4f46e5;color:#fff;box-shadow:0 2px 8px rgba(79,70,229,.3)}
    .slot-btn:hover:not(.active){color:#4f46e5}
    .slot-btn:focus-visible{outline:2px solid #4f46e5;outline-offset:2px}
    .slot-label{font-size:11px;font-weight:700;color:#6b7280;margin-right:2px}
    .dh-left{flex:1;min-width:0}
    .dh-left h2{margin:0;font-size:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dh-subtitle{font-size:13px;color:#6b7280;display:block;margin-top:2px}
    .dh-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
    .action-menu-wrapper{position:relative}
    .action-menu-trigger{border:0;background:#f3f4f6;border-radius:8px;width:36px;height:36px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#374151;transition:background .12s}
    .action-menu-trigger:hover{background:#e5e7eb}
    .action-menu-dropdown{position:absolute;right:0;top:calc(100% + 4px);background:white;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:10;min-width:200px;padding:6px;display:grid;gap:2px;animation:fadeIn .15s ease}
    .action-menu-dropdown button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;text-align:left;transition:background .12s}
    .action-menu-dropdown button:hover{background:#f3f4f6;color:#0b0b0b}
    .am-icon{font-size:14px;width:20px;text-align:center;flex-shrink:0}
    .client-summary-card{display:flex;align-items:center;gap:14px}
    .cs-avatar{width:44px;height:44px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0}
    .cs-info{flex:1;min-width:0;display:grid;gap:2px}
    .cs-name{font-weight:700;font-size:15px;color:#111827}
    .cs-contact{font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cs-wallet{text-align:right;background:#f0fdf4;padding:6px 12px;border-radius:10px;border:1px solid #bbf7d0;flex-shrink:0}
    .wl-label{display:block;font-size:9px;font-weight:700;text-transform:uppercase;color:#16a34a;letter-spacing:.04em}
    .wl-amount{font-size:15px;font-weight:800;color:#15803d}
    .bill-tabs{display:flex;gap:4px;padding:2px 0}
    .bill-tabs button{border:0;background:transparent;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;color:#6b7280;transition:all .12s}
    .bill-tabs button.active{background:#f3f4f6;color:#0b0b0b}
    .bill-tabs button:hover:not(.active){color:#374151}
    .bill-svc-header{display:flex;gap:8px;padding:6px 0;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb}
    .bsh-item{flex:2}
    .bsh-qty{width:36px;text-align:center}
    .bsh-price{width:70px;text-align:right}
    .bsh-total{width:70px;text-align:right}
    .bill-svc-row{display:flex;gap:8px;padding:8px 0;font-size:13px;align-items:center;border-bottom:1px solid #f3f4f6}
    .bsr-name{flex:2;font-weight:600;color:#111827}
    .bsr-qty{width:36px;text-align:center;color:#6b7280}
    .bsr-price{width:70px;text-align:right;color:#6b7280}
    .bsr-total{width:70px;text-align:right;font-weight:700;color:#0b0b0b}
    .bill-divider{height:1px;background:#e5e7eb;margin:4px 0}
    .bill-summary{display:grid;gap:6px;padding:4px 0}
    .bl-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
    .bl-row span:first-child{color:#6b7280;font-weight:600}
    .bl-row span:last-child{font-weight:700;color:#374151}
    .bl-discount{color:#16a34a!important}
    .bl-total{border-top:2px solid #e5e7eb;padding-top:8px;margin-top:4px}
    .bl-total span:last-child{font-size:16px;color:#0b0b0b}
    .bl-paid span:last-child{color:#16a34a}
    .bl-paid-amt{color:#16a34a}
    .bl-due span:last-child{color:#dc2626}
    .bl-due-amt{color:#dc2626}
    .bill-payment-mode{font-size:12px;color:#6b7280;padding:6px 0 0;border-top:1px solid #f3f4f6;margin-top:6px}
    .bill-payment-mode strong{color:#374151}
    .notes-content{padding:4px 0}
    .notes-label{font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px}
    .notes-content p{margin:0;font-size:13px;color:#374151;line-height:1.5}
    .staff-alert{display:flex;align-items:center;gap:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:8px 12px;font-size:12px;color:#92400e;margin-top:8px}
    .alert-icon{font-size:14px;flex-shrink:0}
    .bill-actions button{width:100%;border:0;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;font-size:13px;transition:all .12s}
    .btn-print{background:#f3f4f6;color:#374151}
    .btn-print:hover{background:#e5e7eb}
    .status-workflow{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px}
    .sw-label{font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.06em;margin-bottom:10px}
    .sw-buttons{display:flex;flex-wrap:wrap;gap:6px}
    .sw-btn{border:1px solid #e5e7eb;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;background:white;color:#374151;transition:all .12s;flex:1;min-width:80px;text-align:center}
    .sw-btn:hover:not(:disabled){background:#f3f4f6;border-color:#d1d5db}
    .sw-btn:disabled{opacity:.4;cursor:default}
    .sw-btn.sw-active{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .sw-confirmed.sw-active{background:#1d4ed8;border-color:#1d4ed8}
    .sw-arrived.sw-active{background:#7c3aed;border-color:#7c3aed}
    .sw-start.sw-active{background:#7c3aed;border-color:#7c3aed}
    .sw-completed.sw-active{background:#16a34a;border-color:#16a34a}
    .payment-form{display:grid;gap:12px;padding:16px;background:#f9fafb;border-radius:16px}
    .payment-form h3{margin:0;font-size:14px;font-weight:700}
    .payment-form label{font-size:13px;font-weight:600;color:#374151;margin-bottom:-8px}
    .payment-form input,.payment-form select{padding:12px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px}
    .tip-presets{display:flex;gap:8px}
    .tip-presets button{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:10px;font-size:14px;font-weight:700;cursor:pointer;background:white;color:#374151;transition:all .12s}
    .tip-presets button.active{background:#f0fdf4;border-color:#16a34a;color:#16a34a}
    .tip-presets button:hover:not(.active){background:#f3f4f6}
    .activity-log-section .al-entry{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f3f4f6}
    .activity-log-section .al-entry:last-child{border-bottom:0}
    .al-dot{width:8px;height:8px;border-radius:50%;background:#6366f1;margin-top:6px;flex-shrink:0}
    .al-content{display:grid;gap:2px}
    .al-action{font-size:13px;font-weight:600;color:#111827}
    .al-time{font-size:11px;color:#6b7280}
    .al-user{font-size:11px;color:#6366f1;font-weight:600}
    .al-details{font-size:12px;color:#4b5563}
    .al-empty{padding:16px;text-align:center;color:#9ca3af;font-size:13px}
    .status-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.03em}
    .badge-confirmed{background:#ede9fe;color:#5b21b6}
    .badge-pending{background:#fef3c7;color:#92400e}
    .badge-checked_in{background:#dbeafe;color:#1e40af}
    .badge-completed{background:#d1fae5;color:#065f46}
    .badge-cancelled{background:#fce7f3;color:#9d174d}
    .badge-no_show{background:#e5e7eb;color:#374151}
    .status-dropdown-wrapper{position:relative}
    .sd-trigger{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:20px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:.03em;transition:box-shadow .15s;white-space:nowrap}
    .sd-trigger:hover{box-shadow:0 2px 8px rgba(0,0,0,.12)}
    .sd-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0}
    .sd-arrow{font-size:10px;margin-left:2px;opacity:.7}
    .sd-confirmed{background:#ede9fe;color:#5b21b6}.sd-confirmed .sd-dot{background:#5b21b6}
    .sd-pending{background:#fef3c7;color:#92400e}.sd-pending .sd-dot{background:#92400e}
    .sd-checked_in{background:#dbeafe;color:#1e40af}.sd-checked_in .sd-dot{background:#1e40af}
    .sd-completed{background:#d1fae5;color:#065f46}.sd-completed .sd-dot{background:#065f46}
    .sd-cancelled{background:#fce7f3;color:#9d174d}.sd-cancelled .sd-dot{background:#9d174d}
    .sd-no_show{background:#e5e7eb;color:#374151}.sd-no_show .sd-dot{background:#6b7280}
    .sd-menu{position:absolute;right:0;top:calc(100% + 4px);background:white;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:15;min-width:180px;padding:6px;display:grid;gap:2px;animation:fadeIn .15s ease}
    .sd-option{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;text-align:left;transition:background .12s}
    .sd-option:hover:not(:disabled){background:#f3f4f6}
    .sd-option:disabled{opacity:.35;cursor:default}
    .sd-option .sd-dot{width:8px;height:8px}
    .sd-option.sd-current{background:#f3f4f6;font-weight:700}
    .sd-option.sd-confirmed .sd-dot{background:#5b21b6}.sd-option.sd-confirmed.sd-current{background:#ede9fe;color:#5b21b6}
    .sd-option.sd-arrived .sd-dot{background:#1e40af}.sd-option.sd-arrived.sd-current{background:#dbeafe;color:#1e40af}
    .sd-option.sd-start .sd-dot{background:#d97706}.sd-option.sd-start.sd-current{background:#fef3c7;color:#d97706}
    .sd-option.sd-completed .sd-dot{background:#065f46}.sd-option.sd-completed.sd-current{background:#d1fae5;color:#065f46}
    .sd-option.sd-cancel .sd-dot{background:#9d174d}.sd-option.sd-cancel.sd-current{background:#fce7f3;color:#9d174d}
    .sd-option.sd-notcame .sd-dot{background:#6b7280}.sd-option.sd-notcame.sd-current{background:#e5e7eb;color:#374151}
    .vd-paid-due-bar{display:flex;gap:8px;padding:8px 0;flex-wrap:wrap}
    .vd-paid-badge,.vd-due-badge,.vd-overpaid-badge{font-size:12px;font-weight:700;padding:4px 12px;border-radius:16px;letter-spacing:.02em}
    .vd-paid-badge{background:#d1fae5;color:#065f46}
    .vd-due-badge{background:#fef3c7;color:#92400e}
    .vd-overpaid-badge{background:#fce7f3;color:#9d174d}
    .cs-view-btn{border:0;background:transparent;color:#6366f1;font-size:11px;font-weight:600;cursor:pointer;padding:0;float:right;text-decoration:underline}
    .cs-view-btn:hover{color:#4338ca}
    .cs-stats{display:flex;gap:8px;flex-shrink:0}
    .cs-stat{text-align:center;background:#f9fafb;padding:4px 8px;border-radius:8px;min-width:48px}
    .cs-stat-label{display:block;font-size:8px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.04em}
    .cs-stat-val{display:block;font-size:13px;font-weight:800;color:#111827}
    .cs-loyalty{text-align:right;background:#f0f0ff;padding:6px 10px;border-radius:10px;border:1px solid #ddd6fe;flex-shrink:0}
    .vd-paymode-card{display:flex;flex-direction:column;gap:8px}
    .vd-paymode-methods{display:flex;flex-wrap:wrap;gap:6px}
    .vd-pm-chip{font-size:12px;padding:4px 10px;border-radius:12px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
    .vd-pm-chip strong{font-weight:800}
    .vd-pm-cash{background:#d1fae5;color:#065f46}
    .vd-pm-upi{background:#dbeafe;color:#1e40af}
    .vd-pm-card{background:#fce7f3;color:#9d174d}
    .vd-pm-wallet{background:#fef3c7;color:#92400e}
    .vd-pm-total{font-size:13px;color:#374151;font-weight:600}
    .vd-pm-total strong{color:#059669}
    .vd-empty-card{padding:12px;text-align:center;color:#9ca3af;font-size:12px;background:#f9fafb;border-radius:8px}
    .vd-appt-card{display:flex;flex-direction:column;gap:6px}
    .vd-appt-row{display:flex;align-items:center;gap:8px;font-size:13px;color:#374151}
    .vd-appt-icon{font-size:14px;width:20px;text-align:center;flex-shrink:0}
    .vd-appt-dur{font-size:11px;color:#6b7280;background:#f3f4f6;padding:1px 8px;border-radius:8px;margin-left:auto}
    .vd-notes-card{padding:8px 12px;background:#f9fafb;border-radius:8px;border-left:3px solid #e5e7eb}
    .vd-notes-card p{margin:0;font-size:13px;color:#374151;line-height:1.5}
    .vd-alert-card{display:flex;align-items:center;gap:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:8px 12px;font-size:12px;color:#92400e}
    .vd-alert-icon{font-size:14px;flex-shrink:0}
    .bsh-dur{width:44px;text-align:center;font-size:10px}
    .bsr-dur{width:44px;text-align:center;font-size:12px;color:#6b7280}
    .vd-bill-summary{display:flex;flex-direction:column;gap:5px}
    .vd-bs-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #f9fafb}
    .vd-bs-row:last-child{border-bottom:none}
    .vd-bs-row span:first-child{color:#6b7280;font-weight:600}
    .vd-bs-row span:last-child{font-weight:700;color:#374151}
    .vd-bs-discount{color:#16a34a!important}
    .vd-bs-total{border-top:2px solid #0b0b0b;padding-top:6px;margin-top:2px}
    .vd-bs-total span:last-child{font-size:16px;color:#0b0b0b}
    .vd-bs-paid span:last-child{color:#16a34a}
    .vd-bs-due span:last-child{color:#dc2626;font-size:15px}
    .vd-bs-overpaid span:last-child{color:#9d174d}
    .vd-pay-timeline{display:flex;flex-direction:column;gap:0}
    .vd-pt-entry{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f3f4f6}
    .vd-pt-entry:last-child{border-bottom:0}
    .vd-pt-dot{width:10px;height:10px;border-radius:50%;background:#e5e7eb;margin-top:5px;flex-shrink:0;border:2px solid white;box-shadow:0 0 0 1px #e5e7eb}
    .vd-pt-dot-paid{background:#16a34a;box-shadow:0 0 0 1px #16a34a}
    .vd-pt-dot-pending{background:#d97706;box-shadow:0 0 0 1px #d97706}
    .vd-pt-info{flex:1;min-width:0}
    .vd-pt-row1{display:flex;justify-content:space-between;align-items:center}
    .vd-pt-method{font-weight:700;font-size:13px;color:#111827}
    .vd-pt-amount{font-weight:700;font-size:13px;color:#059669}
    .vd-pt-row2{display:flex;gap:8px;font-size:11px;color:#6b7280;margin-top:2px;flex-wrap:wrap}
    .vd-pt-status{font-weight:600}
    .vd-pt-status-ok{color:#16a34a}
    .vd-pt-status-pending{color:#d97706}
    .vd-pt-ref{color:#6366f1}
    .vd-actions{display:flex;gap:8px;padding:8px 0;flex-wrap:wrap}
    .vd-btn-disabled{opacity:.5;cursor:not-allowed!important;background:#f3f4f6;color:#9ca3af!important;border:1px solid #e5e7eb}
    .vd-btn{flex:1;border:0;border-radius:12px;padding:12px 14px;font-size:12px;font-weight:700;cursor:pointer;transition:all .12s;text-align:center;min-width:100px}
    .cs-chips{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
    .cs-chip{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;text-transform:uppercase;letter-spacing:.04em}
    .cs-chip-vip{background:#fef3c7;color:#92400e;border:1px solid #fde68a}
    .cs-chip-risk{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
    .cs-chip-due{background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe}
    .mpw-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .mpw-card{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;background:#f9fafb;border-radius:12px;border:1px solid #f1f5f9;text-align:center}
    .mpw-icon{font-size:18px}
    .mpw-info{display:flex;flex-direction:column;gap:2px}
    .mpw-label{font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
    .mpw-value{font-size:12px;font-weight:600;color:#0f172a}
    .comm-section{margin-top:8px}
    .comm-grid{display:flex;flex-wrap:wrap;gap:6px}
    .comm-btn{padding:6px 14px;font-size:11px;font-weight:600;border:1px dashed #d1d5db;border-radius:100px;background:transparent;color:#9ca3af;cursor:not-allowed}
    .due-reminder-preview{display:flex;flex-direction:column;gap:4px;margin-top:10px;padding:12px;background:#fef3c7;border-radius:12px;border:1px solid #fde68a}
    .dr-label{font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.04em}
    .dr-text{font-size:12px;color:#78350f;line-height:1.4}
    .dr-copy{align-self:flex-end;font-size:11px;font-weight:600;padding:4px 12px;border-radius:8px;border:1px solid #d97706;background:white;color:#92400e;cursor:pointer}
    .vd-btn-primary{background:#0b0b0b;color:white}
    .vd-btn-primary:hover{background:#1f2937}
    .vd-btn-secondary{background:#f3f4f6;color:#374151;border:1px solid #e5e7eb}
    .vd-btn-secondary:hover{background:#e5e7eb}
    .am-danger{color:#dc2626!important}
    .am-danger:hover{background:#fef2f2!important}
    .sp-form{display:flex;flex-direction:column;gap:12px;padding:16px;background:#f9fafb;border-radius:16px}
    .sp-header{display:flex;justify-content:space-between;align-items:center}
    .sp-header h3{margin:0;font-size:14px;font-weight:700}
    .sp-due-label{font-size:13px;color:#6b7280}
    .sp-due-label strong{color:#dc2626}
    .sp-quick-btns{display:flex;flex-wrap:wrap;gap:6px}
    .sp-qb{border:1px solid #e5e7eb;border-radius:16px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;background:white;color:#4b5563;transition:all .15s}
    .sp-qb:hover{border-color:#6366f1;color:#6366f1;background:#f0f4ff}
    .sp-qb-clear{border-color:#fecaca;color:#dc2626}
    .sp-qb-clear:hover{border-color:#dc2626!important;background:#fef2f2!important;color:#dc2626!important}
    .sp-rows{display:flex;flex-direction:column;gap:8px}
    .sp-row{display:flex;gap:6px;align-items:center}
    .sp-method{flex:0 0 100px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;background:white}
    .sp-amount{flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;min-width:60px}
    .sp-ref{flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;min-width:80px}
    .sp-remove{border:0;background:transparent;color:#ef4444;font-size:20px;cursor:pointer;padding:0 4px;line-height:1}
    .sp-add-row{border:1px dashed #d1d5db;background:transparent;border-radius:8px;padding:8px;font-size:12px;font-weight:600;color:#6366f1;cursor:pointer;transition:background .15s}
    .sp-add-row:hover{background:#f0f4ff}
    .sp-summary{display:flex;flex-direction:column;gap:4px;padding:10px;background:white;border-radius:10px;border:1px solid #e5e7eb}
    .sp-s-row{display:flex;justify-content:space-between;font-size:12px}
    .sp-s-row strong{font-weight:700;color:#374151}
    .sp-s-due{border-top:1px solid #e5e7eb;padding-top:6px;margin-top:2px}
    .sp-s-due strong{color:#dc2626;font-size:14px}
    .sp-warning{font-size:11px;color:#dc2626;background:#fef2f2;border-radius:6px;padding:6px 10px;text-align:center}
    .client-search-wrapper,.service-search-wrapper{position:relative}
    .client-search-input,.service-search-input{width:100%;padding:14px;border:1px solid #e5e7eb;border-radius:14px;font-size:14px;box-sizing:border-box;outline:none;transition:border-color .2s;background:white}
    .client-search-input:focus,.service-search-input:focus{border-color:#0b0b0b}
    .client-search-results,.service-search-results{position:absolute;top:calc(100% + 4px);left:0;right:0;background:white;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:20;max-height:220px;overflow-y:auto}
    .csr-item,.ssr-item{display:flex;align-items:center;gap:12px;width:100%;padding:10px 14px;border:0;background:transparent;font-size:13px;cursor:pointer;text-align:left;transition:background .12s}
    .csr-item:hover,.ssr-item:hover{background:#f3f4f6}
    .csr-main,.ssr-main{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
    .csr-name,.ssr-name{font-weight:700;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .csr-email,.ssr-category{color:#6b7280;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .csr-phone,.ssr-meta{color:#374151;font-size:12px;font-weight:600;margin-left:auto;white-space:nowrap}
    .csr-status,.ssr-status{padding:10px 14px;font-size:12px;color:#6b7280;text-align:center}
    .csr-error,.ssr-error{color:#991b1b;background:#fef2f2}
    .client-search-empty,.service-search-empty{margin-top:8px;padding:10px 12px;font-size:12px;color:#6b7280;background:#f9fafb;border:1px dashed #d1d5db;border-radius:12px;text-align:center}
    .client-empty-actions,.new-client-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px}
    .client-empty-btn,.new-client-actions button{border:1px solid #d1d5db;border-radius:10px;background:white;color:#374151;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}
    .client-empty-btn:not(.secondary),.new-client-actions button:first-child{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .client-empty-btn.secondary,.new-client-actions .secondary{background:#f3f4f6;color:#374151;border-color:#e5e7eb}
    .new-client-form{margin-top:10px;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;display:grid;gap:8px}
    .new-client-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .new-client-grid input{padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;box-sizing:border-box;width:100%}
    .new-client-grid input:first-child{grid-column:1 / -1}
    .new-client-error,.nb-field-error{font-size:12px;color:#991b1b;background:#fef2f2;border-radius:10px;padding:8px 10px;margin-top:8px}
    .client-selected,.selected-service{margin-top:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;color:#312e81}
    .selected-summary{display:flex;flex-direction:column;gap:2px;min-width:0}
    .selected-summary strong{font-size:13px;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .selected-summary span{font-size:12px;color:#4b5563;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .selected-service{background:#f0fdf4;border-color:#bbf7d0;color:#14532d;margin-bottom:10px}
    .cs-clear{border:0;background:transparent;color:#4338ca;font-size:18px;cursor:pointer;padding:0;line-height:1;opacity:.65;flex-shrink:0}
    .cs-clear:hover{opacity:1}
    .nb-field-full{grid-column:1 / -1;margin-bottom:10px}
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
      .dv-staff-col{min-width:120px;flex:0 0 120px}
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
      .payment-form{padding:10px;gap:8px}
      .filter-bar{padding:0 0 4px}
      .branch-filter,.status-filter{font-size:11px;padding:5px 8px;min-width:0}
      .res-filter{font-size:11px;padding:5px 8px}
      .dv-sidebar-stack{max-height:260px}
      .slot-toggle{gap:1px}
      .slot-btn{padding:3px 6px;font-size:10px}
      .sw-buttons{gap:4px}
      .sw-btn{min-width:60px;padding:4px 10px;font-size:11px}
      .bill-svc-header{font-size:9px}
      .bill-svc-row{font-size:11px}
      .bsh-price,.bsh-total,.bsr-price,.bsr-total{width:56px}
      .cs-wallet{padding:4px 8px}
      .wl-amount{font-size:13px}
      .action-menu-dropdown{right:auto;left:0}
      .tip-presets button{padding:8px;font-size:13px}
      .conflict-badge{position:absolute;top:2px;right:2px;font-size:12px;color:#e53935;z-index:2}
      .no-show-badge{position:absolute;bottom:2px;right:2px;font-size:9px;font-weight:700;color:#dc2626;background:#fef2f2;border-radius:3px;padding:0 4px;line-height:1.4;z-index:2}
      .booking-chip .bc-header{display:flex;justify-content:space-between;align-items:center;gap:4px;width:100%}
      .booking-chip .bc-header strong{font-size:10px;font-weight:700;color:#0b0b0b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
      .booking-chip .bc-amount{font-size:9px;font-weight:700;color:#059669;white-space:nowrap;flex-shrink:0}
      .booking-chip .bc-meta{font-size:9px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;width:100%}
      .booking-chip .bc-meta-sep{color:#9ca3af}
      .booking-chip.no-show{opacity:.65}
      .dv-bookings-layer .booking-chip .bc-header{display:flex;justify-content:space-between;align-items:center;gap:4px;width:100%}
      .dv-bookings-layer .booking-chip .bc-header strong{font-size:10px;font-weight:700;color:#0b0b0b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
      .dv-bookings-layer .booking-chip .bc-amount{font-size:9px;font-weight:700;color:#059669;white-space:nowrap;flex-shrink:0}
      .dv-bookings-layer .booking-chip .bc-meta{display:block;font-size:9px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%}
      .dv-bookings-layer .booking-chip .bc-meta-sep{color:#9ca3af}
      .dv-bookings-layer .booking-chip.no-show{opacity:.65}
      .week-booking.has-conflict,.month-preview-chip.has-conflict{border-color:#e53935}
      .conflict-section{margin-top:8px}
      .conflict-heading{color:#e53935;font-size:13px}
      .conflict-item{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #f5f5f5}
      .conflict-icon{font-size:14px;width:20px;text-align:center}
      .conflict-info{display:flex;flex-direction:column}
      .conflict-msg{font-size:12px;color:#333}
      .conflict-time{font-size:11px;color:#888}
      .risk-banner{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;font-size:12px}
      .risk-high{background:#fff3e0;color:#e65100}
      .risk-medium{background:#fff8e1;color:#f57f17}
      .risk-low{background:#e8f5e9;color:#2e7d32}
      .risk-icon{font-size:16px}
      .smart-rebook-panel h3{font-size:14px;margin:0 0 8px}
      .rebook-list{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto}
      .rebook-card{display:flex;align-items:center;gap:10px;padding:8px 10px;background:#f9f9f9;border-radius:6px;cursor:pointer;transition:background .15s}
      .rebook-card:hover{background:#e3f2fd}
      .rebook-num{width:22px;height:22px;border-radius:50%;background:#1976d2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0}
      .rebook-info{display:flex;flex-direction:column;flex:1;min-width:0}
      .rebook-time{font-size:12px;font-weight:500;color:#333}
      .rebook-staff{font-size:11px;color:#888}
      .rebook-book-btn{padding:4px 12px;font-size:11px;border:none;border-radius:4px;background:#1976d2;color:#fff;cursor:pointer;flex-shrink:0}
      .rebook-book-btn:hover{background:#1565c0}
      .rebook-empty{padding:12px;text-align:center;font-size:12px;color:#888}
      .wl-actions{display:flex;flex-direction:column;gap:4px;padding:8px;border-top:1px solid #e0e0e0}
      .wl-msg{padding:4px 8px;background:#e8f5e9;border-radius:4px;font-size:11px;color:#2e7d32}
      .wl-suggest-btn,.wl-autofill-btn{padding:6px 10px;font-size:11px;border:1px solid #ccc;border-radius:4px;background:#fff;cursor:pointer}
      .wl-suggest-btn:hover,.wl-autofill-btn:hover{background:#f5f5f5}
      .wl-suggestions{padding:8px;border-top:1px solid #e0e0e0}
      .wl-suggest-header{font-size:11px;font-weight:600;margin-bottom:6px;color:#555}
      .wl-suggestion-item{display:flex;align-items:center;gap:6px;padding:4px 0}
      .wl-s-name{font-size:12px;flex:1}
      .wl-s-score{font-size:10px;color:#888}
      .wl-s-fill{padding:2px 8px;font-size:10px;border:none;border-radius:3px;background:#1976d2;color:#fff;cursor:pointer}
      .wl-empty{padding:8px;font-size:11px;color:#888;text-align:center}
      .wl-loading{display:flex;justify-content:center;padding:8px}
      .wl-error{font-size:11px;color:#e53935;padding:4px 0}
    }

    /* ===== Premium Calendar Header / Toolbar / KPI Polish ===== */
    .premium-header{
      background:linear-gradient(120deg,#4f46e5 0%,#7c3aed 45%,#db2777 100%);
      border-radius:18px;padding:18px 20px;color:#fff;
      box-shadow:0 10px 30px rgba(79,70,229,.25);margin-bottom:14px;
    }
    .header-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
    .header-branding{display:flex;flex-direction:column;gap:2px}
    .brand-badge{
      display:inline-block;align-self:flex-start;font-size:11px;font-weight:700;letter-spacing:.4px;
      text-transform:uppercase;background:rgba(255,255,255,.18);color:#fff;
      padding:3px 10px;border-radius:999px;margin-bottom:6px;backdrop-filter:blur(4px);
    }
    .header-branding h1{margin:0;font-size:26px;font-weight:800;line-height:1.1}
    .header-branding p{margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.82)}
    .header-user-context{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .user-info{display:flex;flex-direction:column;align-items:flex-end;line-height:1.2}
    .user-name{font-size:13px;font-weight:700}
    .user-role{
      font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;
      background:rgba(255,255,255,.22);color:#fff;padding:2px 8px;border-radius:999px;margin-top:3px;
    }
    .branch-selector{
      border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.15);color:#fff;
      border-radius:10px;padding:7px 10px;font-size:12px;font-weight:600;cursor:pointer;
    }
    .branch-selector option{color:#111}
    .header-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px}
    .nav-section{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.14);padding:4px 8px;border-radius:12px}
    .date-display{font-weight:700;font-size:14px;min-width:130px;text-align:center;color:#fff}
    .today-badge{margin-left:6px;font-size:10px;background:#fff;color:#4f46e5;padding:1px 7px;border-radius:999px;font-weight:800}
    .view-selector{display:flex;background:rgba(255,255,255,.14);border-radius:12px;padding:3px;gap:2px}
    .view-btn,.mode-btn{
      border:none;background:transparent;color:rgba(255,255,255,.85);font-weight:700;font-size:12px;
      padding:7px 14px;border-radius:9px;cursor:pointer;transition:all .15s;
    }
    .view-btn:hover,.mode-btn:hover{background:rgba(255,255,255,.22);color:#fff}
    .view-btn.active,.mode-btn.active{background:#fff;color:#4f46e5;box-shadow:0 2px 8px rgba(0,0,0,.15)}
    .timeline-btn{border-left:2px solid rgba(255,255,255,.3)}
    .action-buttons{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .header-search-wrap{position:relative;display:flex;align-items:center}
    .header-search-input{
      width:180px;padding:8px 12px 8px 32px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.15);
      color:#fff;border-radius:10px;font-size:12px;font-weight:600;cursor:not-allowed;opacity:.7;
      transition:all .15s;backdrop-filter:blur(4px);
    }
    .header-search-input::placeholder{color:rgba(255,255,255,.7)}
    .header-search-input:focus{outline:none;border-color:rgba(255,255,255,.6);opacity:.85}
    .header-search-icon{position:absolute;left:10px;font-size:13px;pointer-events:none;opacity:.7}
    .btn{font-family:inherit}
    .today-btn,.nav-btn{border:none;cursor:pointer;font-weight:700;font-size:12px;border-radius:10px;transition:all .15s}
    .today-btn{background:rgba(255,255,255,.18);color:#fff;padding:8px 14px}
    .today-btn:hover{background:rgba(255,255,255,.3)}
    .nav-btn{background:rgba(255,255,255,.18);color:#fff;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;font-size:16px}
    .nav-btn:hover{background:rgba(255,255,255,.32)}
    .action-btn{padding:9px 14px;border-radius:10px;font-size:12px;display:inline-flex;align-items:center;gap:6px}
    .primary-btn{background:#fff;color:#4f46e5;box-shadow:0 4px 12px rgba(0,0,0,.18)}
    .primary-btn:hover{background:#f1f5ff;transform:translateY(-1px)}
    .secondary-btn{background:rgba(255,255,255,.2);color:#fff}
    .secondary-btn:hover{background:rgba(255,255,255,.34)}
    .action-btn.active{background:#fff;color:#4f46e5}
    .today-btn:focus-visible,.nav-btn:focus-visible,.action-btn:focus-visible,.primary-btn:focus-visible,.secondary-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
    .today-btn,.nav-btn,.action-btn,.primary-btn,.secondary-btn{box-shadow:0 4px 12px rgba(0,0,0,.12)}
    .today-btn:hover,.nav-btn:hover{box-shadow:0 6px 16px rgba(0,0,0,.22);transform:translateY(-1px)}

    /* KPI strip */
    .premium-kpi-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:14px}
    .kpi-card{
      display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:16px;color:#111;
      background:#fff;box-shadow:0 6px 18px rgba(17,24,39,.08);border:1px solid #eef2ff;transition:transform .15s,box-shadow .15s;
    }
    .kpi-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(17,24,39,.14)}
    .kpi-icon{font-size:22px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;flex-shrink:0}
    .kpi-content{display:flex;flex-direction:column;line-height:1.2}
    .kpi-label{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px}
    .kpi-value{font-size:20px;font-weight:800}
    .total-card .kpi-icon{background:#eef2ff;color:#4f46e5}
    .confirmed-card .kpi-icon{background:#dcfce7;color:#16a34a}
    .completed-card .kpi-icon{background:#d1fae5;color:#059669}
    .completed-card .kpi-value.green{color:#059669}
    .pending-card .kpi-icon{background:#fef9c3;color:#ca8a04}
    .pending-card .kpi-value.amber{color:#ca8a04}
    .revenue-card .kpi-icon{background:#ffe4e6;color:#e11d48}

    /* Staff filter pills (avatar + count + horizontal scroll) */
    .staff-filter-bar{display:flex;align-items:center;gap:8px;overflow-x:auto;padding:8px 2px 10px;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
    .staff-filter-pill{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex-shrink:0}
    .sf-avatar{
      width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:800;color:#fff;background:#6366f1;flex-shrink:0;
    }
    .sf-avatar-all{background:#9ca3af}
    .sf-name{font-weight:600}
    .sf-count{background:#eef2ff;color:#4f46e5;font-size:11px;font-weight:800;border-radius:999px;padding:1px 7px;margin-left:2px}

    /* Responsive */
    @media(max-width:1100px){
      .premium-kpi-strip{grid-template-columns:repeat(3,1fr)}
    }
    @media(max-width:860px){
      .header-top{flex-direction:column;align-items:stretch}
      .header-user-context{justify-content:space-between}
      .header-toolbar{flex-direction:column;align-items:stretch}
      .nav-section{justify-content:center}
      .view-selector,.action-buttons{justify-content:center;flex-wrap:wrap}
      .premium-kpi-strip{grid-template-columns:repeat(2,1fr)}
      .header-search-wrap{width:100%}
      .header-search-input{width:100%}
    }
    @media(max-width:560px){
      .premium-header{border-radius:14px;padding:14px}
      .header-branding h1{font-size:22px}
      .premium-kpi-strip{grid-template-columns:1fr 1fr}
      .action-btn.primary-btn{flex-shrink:0}
      .header-search-wrap{width:100%;order:10}
      .header-search-input{width:100%;font-size:11px;padding:6px 10px 6px 28px}
      .header-search-icon{left:8px;font-size:12px}
    }
  `]
})
export class CalendarComponent {
  private api = inject(CalendarService);
  private staffApi = inject(StaffService);
  private resourcesApi = inject(ResourcesService);
  private clientsApi = inject(ClientsService);
  private servicesApi = inject(ServicesService);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  get currentUser(): any {
    return this.auth.getUser();
  }

  get userInitials(): string {
    const u = this.currentUser;
    const name: string = u?.fullName || u?.email || '';
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  get userRole(): string {
    const role: string = this.currentUser?.role || '';
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

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
  createForm: CreateFormModel = { clientId: '', staffId: '', title: '', startTime: '', branchId: '', notes: '', resourceId: '', services: [{ serviceId: '', name: '', durationMin: 0, price: 0, quantity: 1 }] };
  clientList: ClientOption[] = [];
  filteredClientList: ClientOption[] = [];
  clientSearchQuery = '';
  clientLookupBusy = false;
  clientLookupError = '';
  clientSearchTouched = false;
  createSubmitAttempted = false;
  showAddClientForm = false;
  newClientForm = { fullName: '', phone: '', email: '' };
  newClientBusy = false;
  newClientError = '';
  private clientSearchSubject = new Subject<string>();
  serviceList: ServiceOption[] = [];
  filteredServiceList: ServiceOption[] = [];
  serviceSearchQuery = '';
  serviceLookupBusy = false;
  serviceLookupError = '';
  private serviceSearchSubject = new Subject<string>();
  branchList: BranchOption[] = [];

  slotSize: SlotSize = 30;
  showSlotSelector = false;

  viewBillData: ViewBillData | null = null;
  viewBillLoading = false;
  viewBillActiveTab: 'details' | 'activity' = 'details';

  showActionMenu = false;

  showStatusDropdown = false;

  showAddPayment = false;
  addPaymentBusy = false;
  addPaymentError = '';
  splitPaymentRows: SplitPaymentRow[] = [{ amount: 0, method: 'CASH', reference: '' }];

  showAddTip = false;
  addTipAmount = 0;
  addTipBusy = false;
  addTipError = '';

  showClient360 = false;
  client360ClientId = '';

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
  waitlistMessage = '';

  showAiPanel = false;
  aiSuggestions: AiSuggestion[] = [];
  aiLoading = false;
  aiError = '';
  aiServiceId = '';
  aiServiceDuration = 30;
  aiOptimizing = false;
  aiOptimization: AiOptimization | null = null;

  conflicts: ConflictInfo[] = [];

  showSmartRebook = false;
  rebookSuggestions: RebookSlot[] = [];
  rebookLoading = false;
  rebookError = '';

  showWaitlistSuggestions = false;
  waitlistSuggestions: WaitlistSuggestion[] = [];
  waitlistSuggestLoading = false;
  waitlistSuggestError = '';

  noShowRisk: NoShowRiskInfo | null = null;

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

  ngOnInit() {
    this.load();
    this.startAutoRefresh();
    this.clientSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => this.searchClients(query));
    this.serviceSearchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(query => this.searchServices(query));
  }
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
    const el = document.querySelector('.dv-container');
    if (el) {
      this.dayViewScrollLeft = el.scrollLeft;
      this.dayViewScrollTop = el.scrollTop;
    }
  }

  private restoreDayViewScroll() {
    const el = document.querySelector('.dv-container');
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
    const dateStr = this.toLocalDateString(this.currentDate);
    const params: CalendarQueryParams = { date: dateStr };
    if (this.selectedBranchId) params.branchId = this.selectedBranchId;

    if (this.view === 'day') {
      this.api.getCalendarDay(params).subscribe({
        next: (d) => { this.fullBookings = Array.isArray(d) ? d : []; this.applyStatusFilter(); this.detectConflicts(); this.loading = false; requestAnimationFrame(() => this.restoreDayViewScroll()); },
        error: () => { this.error = 'Calendar data unavailable.'; this.loading = false; },
      });
    }
    if (this.view === 'week') {
      this.api.getCalendarWeek(params).subscribe({
        next: (d) => { this.fullBookings = Array.isArray(d) ? d : []; this.applyStatusFilter(); this.detectConflicts(); this.buildWeek(); this.loading = false; },
        error: () => { this.error = 'Calendar data unavailable.'; this.loading = false; },
      });
    }
    if (this.view === 'month') {
      this.api.getCalendarMonth(params).subscribe({
        next: (d) => { this.fullBookings = Array.isArray(d) ? d : []; this.applyStatusFilter(); this.detectConflicts(); this.buildMonth(); this.loading = false; },
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
    this.detectConflicts();
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
      && !this.showEditForm && !this.showConfirmAction && !this.drawerBooking
      && !this.dragLockClick && !this.loading;
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
    const dateStr = this.toLocalDateString(this.currentDate);
    const branchId = this.getDefaultBranchId();
    const params: CalendarQueryParams = { status: 'WAITING', from: dateStr, to: dateStr };
    if (branchId) params.branchId = branchId;
    this.http.get<WaitlistEntry[]>('http://localhost:3000/api/waitlist', {
      params: params as any
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
    this.http.delete(`http://localhost:3000/api/waitlist/${id}`).subscribe({
      next: () => {
        this.waitlistEntries = this.waitlistEntries.filter(e => e.id !== id);
      },
    });
  }

  toggleAiPanel(): void {
    this.showAiPanel = !this.showAiPanel;
    if (this.showAiPanel && this.serviceList.length === 0) {
      this.loadServices();
    }
  }

  getServiceDuration(serviceId: string): number {
    const svc = this.serviceList.find((s: any) => s.id === serviceId);
    return svc?.durationMin || 30;
  }

  loadAiSuggestions(): void {
    const dateStr = this.toLocalDateString(this.currentDate);
    const branchId = this.getDefaultBranchId();
    const params: CalendarQueryParams = { date: dateStr };
    if (branchId) params.branchId = branchId;
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
    const dateStr = this.toLocalDateString(this.currentDate);
    const branchId = this.getDefaultBranchId();
    const params: CalendarQueryParams = { date: dateStr };
    if (branchId) params.branchId = branchId;
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
    this.resetCreateLookupState();
    const start = new Date(slot.suggestedStart);
    const svcName = this.aiServiceId ? (this.getServiceName(this.aiServiceId) || '') : '';
    this.createForm = {
      clientId: '',
      staffId: slot.staffId,
      title: svcName || 'Booking',
        startTime: this.toLocalDatetimeString(start),
      branchId: this.getDefaultBranchId(),
      notes: '',
      services: [{ serviceId: this.aiServiceId || '', name: svcName, durationMin: 0, price: 0, quantity: 1 }],
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
  closeDrawer() { this.drawerBooking = null; this.showReschedule = false; this.showCancelForm = false; this.showEditForm = false; this.showConfirmAction = false; this.showSmartRebook = false; this.showStatusDropdown = false; this.showActionMenu = false; }

  canCancel(b: CalendarBooking): boolean { return b && ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status); }
  canReschedule(b: CalendarBooking): boolean { return b && ['PENDING', 'CONFIRMED'].includes(b.status); }

  private detectConflicts(): void {
    const result: ConflictInfo[] = [];
    const bookings = this.bookings;
    const addConflict = (type: ConflictInfo['type'], current: CalendarBooking, other: CalendarBooking, message: string) => {
      result.push({
        type,
        message,
        conflictingBookingId: current.id,
        conflictingTitle: other.title,
        conflictingTime: `${this.formatTime(other.startTime)}-${this.formatTime(other.endTime)}`,
      });
    };
    for (let i = 0; i < bookings.length; i++) {
      for (let j = i + 1; j < bookings.length; j++) {
        const a = bookings[i];
        const b = bookings[j];
        if (!this.timesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
        if (a.staffId && b.staffId && a.staffId === b.staffId && a.id !== b.id) {
          addConflict('staff', a, b, `Staff overlap: ${a.client?.fullName || '?'} & ${b.client?.fullName || '?'}`);
          addConflict('staff', b, a, `Staff overlap: ${b.client?.fullName || '?'} & ${a.client?.fullName || '?'}`);
        }
        if (a.clientId && b.clientId && a.clientId === b.clientId && a.id !== b.id) {
          addConflict('client', a, b, `Client overlap: ${a.client?.fullName || '?'} has conflicting booking`);
          addConflict('client', b, a, `Client overlap: ${b.client?.fullName || '?'} has conflicting booking`);
        }
        if (a.resourceId && b.resourceId && a.resourceId === b.resourceId && a.id !== b.id) {
          addConflict('resource', a, b, `Resource overlap: ${a.client?.fullName || '?'} & ${b.client?.fullName || '?'}`);
          addConflict('resource', b, a, `Resource overlap: ${b.client?.fullName || '?'} & ${a.client?.fullName || '?'}`);
        }
      }
    }
    this.conflicts = result;
  }

  getBookingConflicts(b: CalendarBooking): ConflictInfo[] {
    if (!b) return [];
    return this.conflicts.filter(c => c.conflictingBookingId === b.id);
  }

  hasConflict(b: CalendarBooking): boolean {
    if (!b) return false;
    const id = b.id;
    return this.conflicts.some(c => c.conflictingBookingId === id);
  }

  private timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
    const a = new Date(s1).getTime();
    const b = new Date(e1).getTime();
    const c = new Date(s2).getTime();
    const d = new Date(e2).getTime();
    return a < d && c < b;
  }

  openSmartRebook(): void {
    if (!this.drawerBooking) return;
    this.showSmartRebook = true;
    this.showReschedule = false;
    this.showCancelForm = false;
    this.showEditForm = false;
    this.showAddPayment = false;
    this.showAddTip = false;
    this.loadSmartRebookSuggestions();
  }

  closeSmartRebook(): void {
    this.showSmartRebook = false;
    this.rebookSuggestions = [];
    this.rebookError = '';
  }

  loadSmartRebookSuggestions(): void {
    if (!this.drawerBooking) return;
    const b = this.drawerBooking;
    const dateStr = this.toLocalDateString(new Date());
    const staffId = b.staffId || '';
    const branchId = b.branchId || this.getDefaultBranchId();
    const svcIds = (b.services || []).map(s => s.serviceId).filter(Boolean).join(',');
    this.rebookLoading = true;
    this.rebookError = '';
    this.api.getBookingSlots({
      branchId,
      staffId,
      date: dateStr,
      serviceIds: svcIds || 'none',
      slotSizeMinutes: 30,
    }).subscribe({
      next: (d: any) => {
        const slots: any[] = Array.isArray(d?.slots) ? d.slots : [];
        const totalDuration = this.getTotalBookingDuration(b);
        const startHour = new Date().getHours() + 1;
        const staffName = b.staff?.fullName || '';
        const suggestions: RebookSlot[] = [];
        const now = new Date();
        for (const slot of slots) {
          if (!slot.available) continue;
          const st = new Date(slot.startTime);
          if (st <= now) continue;
          const end = new Date(st.getTime() + totalDuration * 60000);
          suggestions.push({
            startTime: slot.startTime,
            endTime: end.toISOString(),
            staffId,
            staffName,
            available: true,
          });
        }
        if (suggestions.length === 0) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(10, 0, 0, 0);
          for (let i = 0; i < 3; i++) {
            const st = new Date(tomorrow.getTime() + i * totalDuration * 60000 * 2);
            suggestions.push({
              startTime: st.toISOString(),
              endTime: new Date(st.getTime() + totalDuration * 60000).toISOString(),
              staffId,
              staffName,
              available: true,
            });
          }
        }
        this.rebookSuggestions = suggestions.slice(0, 5);
        this.rebookLoading = false;
      },
      error: () => {
        const b2 = this.drawerBooking;
        if (b2) {
          const staffName = b2.staff?.fullName || '';
          const totalDuration = this.getTotalBookingDuration(b2);
          const suggestions: RebookSlot[] = [];
          const startHour = new Date().getHours() + 1;
          for (let i = 0; i < 3; i++) {
            const d = new Date();
            d.setDate(d.getDate() + (i > 0 ? i : 0));
            d.setHours(startHour + i * 2, 0, 0, 0);
            suggestions.push({
              startTime: d.toISOString(),
              endTime: new Date(d.getTime() + totalDuration * 60000).toISOString(),
              staffId: b2.staffId || '',
              staffName,
              available: true,
            });
          }
          this.rebookSuggestions = suggestions;
        }
        this.rebookLoading = false;
        this.rebookError = 'Used local suggestions (API unavailable).';
      },
    });
  }

  bookRebookSlot(slot: RebookSlot): void {
    const b = this.drawerBooking;
    if (!b) return;
    this.closeSmartRebook();
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    this.resetCreateLookupState();
    this.createForm = {
      clientId: b.clientId || '',
      staffId: slot.staffId || b.staffId || '',
      title: b.title || 'Rebook',
      startTime: this.toLocalDatetimeString(new Date(slot.startTime)),
      branchId: b.branchId || this.getDefaultBranchId(),
      notes: b.notes || '',
      resourceId: b.resourceId || undefined,
      services: (b.services || []).map(s => ({
        serviceId: s.serviceId || '',
        name: s.name,
        durationMin: s.durationMin,
        price: s.price,
      })),
    };
    this.closeDrawer();
    this.loadClientsAndServices();
  }

  private getTotalBookingDuration(b: CalendarBooking): number {
    if (b.services?.length) {
      return b.services.reduce((sum, s) => sum + (s.durationMin || 0), 0) || 60;
    }
    const diff = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
    return Math.max(30, Math.round(diff / 60000));
  }

  loadNoShowRisk(): void {
    const b = this.drawerBooking;
    if (!b || !b.clientId) { this.noShowRisk = null; return; }
    const pastCount = this.bookings.filter(
      bk => bk.clientId === b.clientId && bk.status === 'NO_SHOW' && bk.id !== b.id
    ).length;
    if (pastCount >= 3) {
      this.noShowRisk = { riskLevel: 'high', reason: `Client has ${pastCount} no-shows — consider confirming.` };
    } else if (pastCount >= 1) {
      this.noShowRisk = { riskLevel: 'medium', reason: `Client has ${pastCount} past no-show(s).` };
    } else {
      this.noShowRisk = null;
    }
  }

  loadWaitlistSuggestions(): void {
    const dateStr = this.toLocalDateString(this.currentDate);
    const branchId = this.getDefaultBranchId();
    const params: CalendarQueryParams = {
      startTime: `${dateStr}T10:00:00Z`,
      endTime: `${dateStr}T20:00:00Z`,
    };
    if (branchId) params.branchId = branchId;
    this.waitlistSuggestLoading = true;
    this.waitlistSuggestError = '';
    this.api.getWaitlistSuggestions(params).subscribe({
      next: (d: any) => {
        this.waitlistSuggestions = Array.isArray(d) ? d : [];
        this.waitlistSuggestLoading = false;
        this.showWaitlistSuggestions = true;
      },
      error: () => {
        this.waitlistSuggestError = 'Waitlist suggestions unavailable.';
        this.waitlistSuggestLoading = false;
        this.showWaitlistSuggestions = true;
      },
    });
  }

  autofillWaitlistSlot(): void {
    const dateStr = this.toLocalDateString(this.currentDate);
    const branchId = this.getDefaultBranchId();
    const body: CalendarQueryParams = {
      startTime: `${dateStr}T10:00:00Z`,
      endTime: `${dateStr}T20:00:00Z`,
    };
    if (branchId) body.branchId = branchId;
    this.waitlistSuggestLoading = true;
    this.waitlistSuggestError = '';
    this.api.autofillWaitlist(body).subscribe({
      next: (d: any) => {
        this.waitlistSuggestLoading = false;
        if (d?.matched && d?.suggestion?.entry) {
          this.fillWaitlistEntry = d.suggestion.entry;
          this.waitlistMessage = 'Auto-matched waitlist entry ready to fill!';
          this.waitlistSuggestLoading = false;
          this.showWaitlistSuggestions = false;
        } else {
          this.waitlistSuggestError = d?.message || 'No suitable match found.';
        }
      },
      error: () => {
        this.waitlistSuggestLoading = false;
        this.waitlistSuggestError = 'Auto-fill failed.';
      },
    });
  }

  closeCancelForm() { this.showCancelForm = false; this.cancelReason = ''; this.cancelCustomReason = ''; this.drawerError = ''; }

  openEditForm(b: CalendarBooking) { this.showReschedule = false; this.showCancelForm = false; this.showConfirmAction = false; this.showSmartRebook = false; this.editForm.title = b.title || ''; this.editForm.notes = b.notes || ''; this.showEditForm = true; this.drawerError = ''; }
  closeEditForm() { this.showEditForm = false; this.editForm = { title: '', notes: '' }; this.drawerError = ''; }
  openCancelForm() { this.showReschedule = false; this.showEditForm = false; this.showConfirmAction = false; this.showSmartRebook = false; this.showCancelForm = true; this.cancelReason = ''; this.cancelCustomReason = ''; this.drawerError = ''; }
  openConfirmAction(status: string) { this.showReschedule = false; this.showCancelForm = false; this.showEditForm = false; this.showSmartRebook = false; this.showConfirmAction = true; this.confirmTargetStatus = status; this.confirmLabel = status === 'CHECKED_IN' ? 'Check In' : 'Complete'; this.drawerError = ''; }
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

  private toLocalDatetimeString(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private toLocalDateString(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private getDefaultBranchId(): string {
    return this.selectedBranchId || (this.branchList.length === 1 ? this.branchList[0].id : '');
  }

  openCreateBookingUnassigned(hour: number) {
    if (this.dragLockClick) { this.dragLockClick = false; return; }
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    this.resetCreateLookupState();
    const start = new Date(this.currentDate);
    start.setHours(hour, 0, 0, 0);
    const wl = this.fillWaitlistEntry;
    this.createForm = {
      clientId: wl?.clientId || '',
      staffId: '',
      resourceId: '',
      title: wl?.serviceName || '',
        startTime: this.toLocalDatetimeString(start),
      branchId: this.getDefaultBranchId(),
      notes: wl?.notes || '',
      services: [{ serviceId: '', name: wl?.serviceName || '', durationMin: 0, price: 0, quantity: 1 }],
    };
    this.loadClientsAndServices();
  }

  openCreateBookingForDate(date: Date) {
    if (this.dragLockClick) { this.dragLockClick = false; return; }
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    this.resetCreateLookupState();
    const start = new Date(date);
    start.setHours(10, 0, 0, 0);
    this.createForm = {
      clientId: '',
      staffId: '',
      resourceId: '',
      title: '',
        startTime: this.toLocalDatetimeString(start),
      branchId: this.getDefaultBranchId(),
      notes: '',
      services: [{ serviceId: '', name: '', durationMin: 0, price: 0, quantity: 1 }],
    };
    this.loadClientsAndServices();
  }

  openCreateBookingFromResource(resource: CalendarResource, hour: number) {
    if (this.dragLockClick) { this.dragLockClick = false; return; }
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    this.resetCreateLookupState();
    const start = new Date(this.currentDate);
    start.setHours(hour, 0, 0, 0);
    const wl = this.fillWaitlistEntry;
    this.createForm = {
      clientId: wl?.clientId || '',
      staffId: '',
      resourceId: resource.id,
      title: wl?.serviceName || '',
        startTime: this.toLocalDatetimeString(start),
      branchId: this.getDefaultBranchId(),
      notes: wl?.notes || '',
      services: [{ serviceId: '', name: wl?.serviceName || '', durationMin: 0, price: 0, quantity: 1 }],
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

  formatHourLabel(hour: number): string {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
    const payload: Record<string, any> = { startTime: this.toLocalDatetimeString(targetTime) };
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
    this.resetCreateLookupState();
    const start = new Date(this.currentDate);
    start.setHours(hour, 0, 0, 0);
    const wl = this.fillWaitlistEntry;
    this.createForm = {
      clientId: wl?.clientId || '',
      staffId: staff.id,
      title: wl?.serviceName || '',
        startTime: this.toLocalDatetimeString(start),
      branchId: this.getDefaultBranchId(),
      notes: wl?.notes || '',
      staffAlert: '',
      services: [{ serviceId: '', name: wl?.serviceName || '', durationMin: 0, price: 0, quantity: 1 }],
      durationMin: 30,
      manualDuration: false,
      discountTotal: 0,
      taxRate: 0,
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
    this.walkinForm = { clientName: '', staffId, startTime: this.toLocalDatetimeString(start), branchId: this.getDefaultBranchId(), serviceId: '', serviceName: '', serviceDuration: 30, servicePrice: 0 };
  }

  closeWalkin() { this.showWalkin = false; this.walkinError = ''; }
  closeCreate() { this.showCreate = false; this.createBusy = false; this.createError = ''; this.resetCreateLookupState(); }

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
        serviceId: this.walkinForm.serviceId || undefined,
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

  addService() { this.createForm.services.push({ serviceId: '', name: '', durationMin: 0, price: 0, quantity: 1, discountPct: 0 }); }
  removeService(i: number) { this.createForm.services.splice(i, 1); }

  readonly durationPresets = [15, 30, 45, 60, 90, 120, 180, 240];

  get bookingDuration(): number {
    if (this.createForm.manualDuration && this.createForm.durationMin) {
      return this.createForm.durationMin;
    }
    const total = this.totalDuration;
    return total > 0 ? total : (this.createForm.durationMin || 30);
  }

  setBookingDuration(min: number) {
    this.createForm.durationMin = min;
    this.createForm.manualDuration = true;
  }

  onServiceSelect(i: number) {
    const svcId = this.createForm.services[i].serviceId;
    const svc = svcId ? this.serviceList.find((s: any) => s.id === svcId) : null;
    if (svc) {
      this.applyServiceToLine(i, svc);
    } else {
      this.createForm.services[i].name = '';
      this.createForm.services[i].durationMin = 0;
      this.createForm.services[i].price = 0;
      if (i === 0) this.serviceSearchQuery = '';
    }
  }

  get totalDuration(): number {
    return this.createForm.services.reduce((sum: number, s: any) => sum + (Number(s.durationMin) || 0), 0);
  }

  get totalPrice(): number {
    return this.createForm.services.reduce((sum: number, s: any) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 1), 0);
  }

  getServiceLineTotal(i: number): number {
    const s = this.createForm.services[i];
    const base = (Number(s.price) || 0) * (Number(s.quantity) || 1);
    const pct = Number(s.discountPct) || 0;
    return pct > 0 ? base * (1 - pct / 100) : base;
  }

  get subtotalPrice(): number {
    let sum = 0;
    for (let i = 0; i < this.createForm.services.length; i++) {
      sum += this.getServiceLineTotal(i);
    }
    return sum;
  }

  get discountTotal(): number {
    return this.totalPrice - this.subtotalPrice;
  }

  get taxTotal(): number {
    const rate = Number(this.createForm.taxRate) || 0;
    return rate > 0 ? this.subtotalPrice * (rate / 100) : 0;
  }

  get grandTotal(): number {
    return this.subtotalPrice + this.taxTotal;
  }

  get dueAmount(): number {
    const paid = Number(this.createForm.paymentAmount) || 0;
    return Math.max(0, this.grandTotal - paid);
  }

  get estimatedEndTime(): string {
    if (!this.createForm.startTime || !this.bookingDuration) return '';
    const start = new Date(this.createForm.startTime);
    const end = new Date(start.getTime() + this.bookingDuration * 60000);
    return end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  private validateCreateForm(): string | null {
    if (!this.createForm.clientId && !this.createForm.isWalkIn) return 'Please select a client or use Walk-in booking.';
    if (!this.createForm.staffId) return 'Please select a staff member.';
    if (!this.createForm.branchId) return 'Please select a branch.';
    if (!this.createForm.startTime) return 'Please set the date & time.';
    const validServices = this.createForm.services.filter(s => s.name && s.durationMin > 0);
    if (validServices.length === 0) return 'Please select at least one service.';
    return null;
  }

  doCreateBooking() {
    this.createSubmitAttempted = true;
    this.createBusy = true;
    this.createError = '';
    const validationError = this.validateCreateForm();
    if (validationError) {
      this.createError = validationError;
      this.createBusy = false;
      return;
    }
    const validServices = this.createForm.services
      .filter((s: CreateFormService) => s.name && s.durationMin > 0)
      .map((s: CreateFormService) => ({
        serviceId: s.serviceId || undefined,
        name: s.name,
        durationMin: Number(s.durationMin) || 0,
        price: Number(s.price) || 0,
      }));
    const payload: Record<string, any> = {
      clientId: this.createForm.clientId,
      staffId: this.createForm.staffId,
      title: this.createForm.title || validServices.map(s => s.name).join(', '),
      startTime: this.createForm.startTime,
      branchId: this.createForm.branchId,
      notes: this.createForm.notes || undefined,
      staffAlert: this.createForm.staffAlert || undefined,
      services: validServices,
    };
    if (this.createForm.resourceId) payload.resourceId = this.createForm.resourceId;
    this.http.post('http://localhost:3000/api/bookings', payload).subscribe({
      next: () => {
        this.createBusy = false; this.showCreate = false;
        if (this.fillWaitlistEntry) {
          const wlId = this.fillWaitlistEntry.id;
          this.fillWaitlistEntry = null;
          this.resetCreateLookupState();
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
    this.showSmartRebook = false;
    this.showReschedule = true;
    this.rescheduleBusy = false;
    this.rescheduleError = '';
    const start = new Date(b.startTime);
    this.rescheduleForm = {
      staffId: b.staffId || b.staff?.id || '',
      resourceId: b.resourceId || '',
        startTime: this.toLocalDatetimeString(start),
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

  setSlotSize(size: SlotSize) {
    this.slotSize = size;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      CONFIRMED: 'Confirmed',
      PENDING: 'Pending',
      CHECKED_IN: 'Arrived',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'Not Came',
    };
    return labels[status] || status;
  }

  canTransitionTo(status: string): boolean {
    if (!this.drawerBooking) return false;
    if (this.drawerBooking.status === 'COMPLETED' || this.drawerBooking.status === 'CANCELLED' || this.drawerBooking.status === 'NO_SHOW') return false;
    if (status === 'CHECKED_IN') return this.drawerBooking.status === 'CONFIRMED' || this.drawerBooking.status === 'PENDING';
    if (status === 'COMPLETED') return this.drawerBooking.status === 'CHECKED_IN';
    if (status === 'NO_SHOW') return this.drawerBooking.status !== 'NO_SHOW' && !['COMPLETED','CANCELLED'].includes(this.drawerBooking.status);
    return true;
  }

  toggleActionMenu() { this.showActionMenu = !this.showActionMenu; this.showStatusDropdown = false; }
  closeActionMenu() { this.showActionMenu = false; }

  toggleStatusDropdown() { this.showStatusDropdown = !this.showStatusDropdown; this.showActionMenu = false; }

  selectStatus(status: string) {
    this.showStatusDropdown = false;
    if (status === 'CANCELLED') { this.openCancelForm(); return; }
    if (!this.drawerBooking) return;
    this.doStatus(this.drawerBooking, status);
  }

  selectStatusCancel() {
    this.showStatusDropdown = false;
    if (this.drawerBooking && this.canCancel(this.drawerBooking)) {
      this.openCancelForm();
    }
  }

  getPaymentMethodsSummary(): { method: string; total: number }[] {
    if (!this.viewBillData?.payments) return [];
    const map: Record<string, number> = {};
    for (const p of this.viewBillData.payments) {
      if (p.status === 'PAID' || p.status === 'COMPLETED') {
        map[p.method] = (map[p.method] || 0) + (p.amount || 0);
      }
    }
    return Object.entries(map).map(([method, total]) => ({ method, total }));
  }

  getBookingDuration(): number {
    const b = this.drawerBooking;
    if (!b) return 0;
    if (b.services?.length) {
      return b.services.reduce((sum, s) => sum + (s.durationMin || 0), 0);
    }
    const diff = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
    return Math.max(0, Math.round(diff / 60000));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showActionMenu) {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-menu-wrapper')) {
        this.showActionMenu = false;
      }
    }
    if (this.showStatusDropdown) {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-dropdown-wrapper')) {
        this.showStatusDropdown = false;
      }
    }
  }

  openAddPayment() {
    this.showAddPayment = true;
    const due = this.viewBillComputedDue;
    this.splitPaymentRows = [{ amount: due > 0 ? due : 0, method: 'CASH', reference: '' }];
    this.addPaymentBusy = false;
    this.addPaymentError = '';
    this.showReschedule = false; this.showCancelForm = false; this.showEditForm = false; this.showConfirmAction = false; this.showSmartRebook = false;
  }
  closeAddPayment() { this.showAddPayment = false; this.addPaymentError = ''; }

  addSplitRow() { this.splitPaymentRows.push({ amount: 0, method: 'CASH', reference: '' }); }
  removeSplitRow(i: number) { if (this.splitPaymentRows.length > 1) this.splitPaymentRows.splice(i, 1); }

  setSplitQuick(method: string) {
    const due = this.viewBillComputedDue;
    this.splitPaymentRows = [{ amount: due > 0 ? due : 0, method, reference: '' }];
  }

  setSplitFiftyFifty() {
    const due = this.viewBillComputedDue;
    const half = Math.round((due / 2) * 100) / 100;
    this.splitPaymentRows = [
      { amount: half, method: 'CASH', reference: '' },
      { amount: Math.max(0, due - half), method: 'UPI', reference: '' },
    ];
  }

  clearSplitRows() {
    this.splitPaymentRows = [{ amount: 0, method: 'CASH', reference: '' }];
  }

  get viewBillComputedTotal(): number {
    if (!this.viewBillData) return 0;
    return this.viewBillData.subtotal + (this.viewBillData.tax || 0) - (this.viewBillData.discount || 0);
  }

  get viewBillComputedDue(): number {
    if (!this.viewBillData) return 0;
    const total = this.viewBillComputedTotal;
    const paid = this.viewBillData.paid || 0;
    return paid >= total ? 0 : total - paid;
  }

  get splitTotalNew(): number {
    return this.splitPaymentRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }

  get splitDueAfter(): number {
    const due = this.viewBillComputedDue;
    return Math.max(0, due - this.splitTotalNew);
  }

  isSplitValid(): boolean {
    if (!this.splitPaymentRows.length) return false;
    for (const row of this.splitPaymentRows) {
      if ((Number(row.amount) || 0) <= 0) return false;
      if (!row.method) return false;
    }
    return true;
  }

  doSplitPayments() {
    if (!this.drawerBooking || !this.isSplitValid()) return;
    this.addPaymentBusy = true;
    this.addPaymentError = '';
    const bookingId = this.drawerBooking.id;
    const rows = this.splitPaymentRows.filter(r => (Number(r.amount) || 0) > 0);
    let completed = 0;
    let totalFailures = '';

    const payNext = (index: number) => {
      if (index >= rows.length) {
        this.addPaymentBusy = false;
        if (totalFailures) {
          this.addPaymentError = totalFailures;
          if (completed > 0) {
            this.closeAddPayment();
            this.closeDrawer();
            this.load();
          }
        } else {
          this.closeAddPayment();
          this.closeDrawer();
          this.load();
        }
        return;
      }
      const row = rows[index];
      this.api.addPayment(bookingId, { amount: row.amount, method: row.method }).subscribe({
        next: () => { completed++; payNext(index + 1); },
        error: (e) => {
          totalFailures += `${row.method} ₹${row.amount}: ${e.error?.message || 'Payment failed.'} `;
          payNext(index + 1);
        },
      });
    };
    payNext(0);
  }

  openAddTip() {
    this.showAddTip = true;
    this.addTipAmount = 0;
    this.addTipBusy = false;
    this.addTipError = '';
    this.showReschedule = false; this.showCancelForm = false; this.showEditForm = false; this.showConfirmAction = false; this.showSmartRebook = false;
  }
  closeAddTip() { this.showAddTip = false; this.addTipError = ''; }
  doAddTip() {
    if (!this.addTipAmount || !this.drawerBooking) return;
    this.addTipBusy = true; this.addTipError = '';
    this.api.addPayment(this.drawerBooking.id, { amount: this.addTipAmount, method: 'TIP' }).subscribe({
      next: () => { this.addTipBusy = false; this.closeAddTip(); this.closeDrawer(); this.load(); },
      error: (e) => { this.addTipBusy = false; this.addTipError = e.error?.message || 'Tip failed.'; },
    });
  }

  doRebook() {
    if (!this.drawerBooking) return;
    this.closeDrawer();
    const start = new Date();
    start.setHours(start.getHours() + 1, 0, 0, 0);
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    this.resetCreateLookupState();
    this.createForm = {
      clientId: this.drawerBooking.clientId || '',
      staffId: this.drawerBooking.staffId || '',
      title: this.drawerBooking.title || 'Rebook',
        startTime: this.toLocalDatetimeString(start),
      branchId: this.drawerBooking.branchId || this.getDefaultBranchId(),
      notes: this.drawerBooking.notes || '',
      resourceId: this.drawerBooking.resourceId || undefined,
      services: (this.drawerBooking.services || []).map(s => ({
        serviceId: s.serviceId || '',
        name: s.name,
        durationMin: s.durationMin,
        price: s.price,
      })),
    };
    this.loadClientsAndServices();
  }

  copyDueReminder() {
    if (!this.drawerBooking || !this.viewBillData) return;
    const due = this.viewBillComputedDue;
    const dueStr = '$' + due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const msg = `Hi ${this.drawerBooking.client?.fullName || 'Client'}, your pending amount for ${this.drawerBooking.title || 'service'} on ${new Date(this.drawerBooking.startTime).toLocaleDateString()} is ${dueStr}.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }
  }

  printBill() {
    this.closeActionMenu();
    const orig = document.querySelector('.drawer-panel') as HTMLElement;
    if (!orig) return;
    const printContent = orig.cloneNode(true) as HTMLElement;
    if (!printContent) return;
    const b = this.drawerBooking;
    const vd = this.viewBillData;
    const invNo = b?.id ? `INV-${b.id.substring(0, 8).toUpperCase()}` : 'INV-TEMP';
    const now = new Date();
    const printHeader = document.createElement('div');
    printHeader.className = 'print-header';
    printHeader.innerHTML = `
      <div class="ph-top">
        <div class="ph-business">
          <strong class="ph-name">Ambition Unisex Salon</strong>
          <span class="ph-address">Your Branch Name</span>
        </div>
        <div class="ph-invoice">
          <span class="ph-inv-label">Invoice #${invNo}</span>
          <span class="ph-date">${now.toLocaleDateString()} ${now.toLocaleTimeString()}</span>
        </div>
      </div>
      <div class="ph-client">
        <span>${b?.client?.fullName || 'Client'}</span>
        <span *ngIf="b?.client?.phone">${b?.client?.phone || ''}</span>
      </div>
      <hr>`;
    const printFooter = document.createElement('div');
    printFooter.className = 'print-footer';
    printFooter.innerHTML = `<hr><p class="pf-thanks">Thank you for choosing Ambition Unisex Salon!</p><p class="pf-note">This is a computer-generated invoice.</p>`;
    printContent.insertBefore(printHeader, printContent.firstChild);
    printContent.appendChild(printFooter);
    const win = window.open('', '_blank');
    if (!win) return;
    const styles = Array.from(document.styleSheets).map(sheet => {
      try { return Array.from(sheet.cssRules || []).map(r => r.cssText).join(''); }
      catch(e) { return ''; }
    }).join('');
    const hideSelectors = '.action-menu-wrapper,.action-menu-trigger,.close-btn,.sw-buttons,.status-workflow,.drawer-actions,.bill-actions,.comm-section,.mpw-grid,.cs-view-btn,.sd-trigger,.sd-menu';
    win.document.write(`<html><head><title>Invoice ${invNo}</title><style>${styles} body{padding:24px;font-size:13px} ${hideSelectors}{display:none!important} .print-header{margin-bottom:20px} .ph-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px} .ph-business{display:flex;flex-direction:column} .ph-name{font-size:18px;font-weight:800} .ph-address{font-size:12px;color:#64748b} .ph-invoice{text-align:right;display:flex;flex-direction:column} .ph-inv-label{font-size:14px;font-weight:700} .ph-date{font-size:11px;color:#94a3b8} .ph-client{font-size:14px;margin-bottom:4px} .print-footer{margin-top:24px;text-align:center} .pf-thanks{font-size:14px;font-weight:600;margin:12px 0 4px} .pf-note{font-size:11px;color:#94a3b8}</style></head><body>${printContent.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  }

  viewClientProfile() {
    if (!this.drawerBooking?.clientId) return;
    this.client360ClientId = this.drawerBooking.clientId;
    this.showClient360 = true;
  }

  closeClient360() {
    this.showClient360 = false;
    this.client360ClientId = '';
  }

  openDrawer(b: CalendarBooking) {
    if (this.dragLockClick) { this.dragLockClick = false; return; }
    this.drawerBooking = b;
    this.drawerBusy = false;
    this.drawerError = '';
    this.showReschedule = false;
    this.showCancelForm = false;
    this.showEditForm = false;
    this.showConfirmAction = false;
    this.showAddPayment = false;
    this.showAddTip = false;
    this.showActionMenu = false;
    this.cancelReason = '';
    this.cancelCustomReason = '';
    this.viewBillActiveTab = 'details';
    this.loadViewBillData(b);
    this.loadNoShowRisk();
  }

  private loadViewBillData(b: CalendarBooking) {
    this.viewBillLoading = true;
    this.viewBillData = null;
    const svcTotal = (b.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
    const baseTotal = svcTotal;
    const baseData: ViewBillData = {
      booking: b,
      payments: [],
      subtotal: svcTotal,
      discount: 0,
      tax: 0,
      taxRate: 0,
      total: baseTotal,
      paid: 0,
      due: baseTotal,
      paymentMethod: '',
      staffAlert: '',
      activityLog: this.buildActivityLog(b),
    };
    const paymentObs = b.id ? this.api.getBookingPayments(b.id) : null;
    const clientObs = b.clientId ? this.api.getClientDetail(b.clientId) : null;
    if (paymentObs || clientObs) {
      const obs: any[] = [];
      if (paymentObs) obs.push(paymentObs);
      if (clientObs) obs.push(clientObs);
      forkJoin(obs).subscribe({
        next: (results: any[]) => {
          let payments: PaymentInfo[] = [];
          let clientDetail: ClientDetail | undefined;
          if (paymentObs) {
            payments = results[0] || [];
            baseData.payments = payments;
            const paid = payments.filter(p => p.status === 'PAID' || p.status === 'COMPLETED').reduce((s, p) => s + (p.amount || 0), 0);
            baseData.paid = paid;
            baseData.due = paid >= baseData.total ? 0 : baseData.total - paid;
            const lastPay = payments.find(p => p.status === 'PAID' || p.status === 'COMPLETED');
            if (lastPay) baseData.paymentMethod = lastPay.method;
          }
          if (clientObs) {
            const ci = clientObs ? results[paymentObs ? 1 : 0] : null;
            if (ci) {
              baseData.clientDetail = ci;
            }
          }
          this.viewBillData = baseData;
          this.viewBillLoading = false;
        },
        error: () => {
          this.viewBillData = baseData;
          this.viewBillLoading = false;
        },
      });
    } else {
      this.viewBillData = baseData;
      this.viewBillLoading = false;
    }
  }

  private buildActivityLog(b: CalendarBooking): ActivityLogEntry[] {
    const entries: ActivityLogEntry[] = [];
    const now = new Date().toISOString();
    if (b.createdAt) entries.push({ action: 'Booking created', timestamp: b.createdAt, details: `Status: ${b.status}` });
    if (b.updatedAt && b.updatedAt !== b.createdAt) entries.push({ action: 'Booking updated', timestamp: b.updatedAt });
    if (b.status === 'COMPLETED') entries.push({ action: 'Booking completed', timestamp: b.updatedAt || b.createdAt || now });
    if (b.status === 'CANCELLED') entries.push({ action: 'Booking cancelled', timestamp: b.updatedAt || b.createdAt || now });
    if (b.status === 'CHECKED_IN') entries.push({ action: 'Client arrived', timestamp: b.updatedAt || b.createdAt || now });
    if (b.status === 'NO_SHOW') entries.push({ action: 'Client did not arrive', timestamp: b.updatedAt || b.createdAt || now });
    return entries;
  }

  onClientSearch() {
    this.clientSearchTouched = true;
    this.showAddClientForm = false;
    this.clientSearchSubject.next(this.clientSearchQuery);
  }

  onServiceSearch() {
    this.serviceSearchSubject.next(this.serviceSearchQuery);
  }

  get selectedClient(): ClientOption | undefined {
    return this.clientList.find(c => c.id === this.createForm.clientId);
  }

  get selectedClientName(): string {
    const c = this.selectedClient;
    return c ? (c.fullName || c.name || '') : '';
  }

  get selectedClientPhone(): string {
    return this.selectedClient?.phone || '';
  }

  get selectedClientEmail(): string {
    return this.selectedClient?.email || '';
  }

  get showClientValidationError(): boolean {
    return (this.createSubmitAttempted || this.clientSearchTouched) && !this.createForm.clientId && !this.createForm.isWalkIn;
  }

  get primarySelectedService(): CreateFormService | undefined {
    return this.createForm.services.find(s => !!s.name && !!s.serviceId) || this.createForm.services.find(s => !!s.name);
  }

  get primarySelectedServiceName(): string {
    return this.primarySelectedService?.name || '';
  }

  get primarySelectedServiceMeta(): string {
    const svc = this.primarySelectedService;
    if (!svc) return '';
    const catalog = svc.serviceId ? this.serviceList.find(s => s.id === svc.serviceId) : null;
    const category = catalog?.category?.name ? ` / ${catalog.category.name}` : '';
    return `Price: ${Number(svc.price) || 0} / ${Number(svc.durationMin) || 0} min${category}`;
  }

  get showServiceValidationError(): boolean {
    return this.createSubmitAttempted && this.createForm.services.filter(s => s.name && s.durationMin > 0).length === 0;
  }

  selectClient(c: ClientOption) {
    this.createForm.clientId = c.id;
    this.clientSearchQuery = '';
    this.filteredClientList = [];
    this.clientLookupError = '';
    this.clientSearchTouched = true;
    if (this.createError.includes('client')) this.createError = '';
  }

  clearSelectedClient() {
    this.createForm.clientId = '';
    this.clientSearchTouched = true;
  }

  openAddClientFromSearch() {
    const q = this.clientSearchQuery.trim();
    const phoneLike = /^[+\d\s()-]{6,}$/.test(q);
    this.newClientForm = { fullName: phoneLike ? '' : q, phone: phoneLike ? q : '', email: '' };
    this.newClientError = '';
    this.showAddClientForm = true;
  }

  cancelAddClient() {
    this.showAddClientForm = false;
    this.newClientError = '';
  }

  createClientFromDrawer() {
    const fullName = this.newClientForm.fullName.trim();
    if (!fullName) {
      this.newClientError = 'Client name is required.';
      return;
    }
    this.newClientBusy = true;
    this.newClientError = '';
    this.clientsApi.createClient({
      fullName,
      phone: this.newClientForm.phone.trim() || null,
      email: this.newClientForm.email.trim() || null,
    }).subscribe({
      next: (client) => {
        const option = this.normalizeClient(client);
        this.clientList = this.mergeClients(this.clientList, [option]);
        this.selectClient(option);
        this.showAddClientForm = false;
        this.newClientBusy = false;
      },
      error: (e) => {
        this.newClientBusy = false;
        this.newClientError = e.error?.message || 'Could not add client.';
      },
    });
  }

  openWalkinFromCreate() {
    this.closeCreate();
    this.openWalkin();
  }

  selectPrimaryService(svc: ServiceOption) {
    if (!this.createForm.services.length) this.addService();
    this.applyServiceToLine(0, svc);
    this.serviceSearchQuery = '';
    this.filteredServiceList = [];
    this.serviceLookupError = '';
    if (this.createError.includes('service')) this.createError = '';
  }

  clearPrimaryService() {
    if (!this.createForm.services.length) return;
    this.createForm.services[0] = { serviceId: '', name: '', durationMin: 0, price: 0, quantity: 1, discountPct: 0 };
    if (!this.createForm.manualDuration) this.createForm.durationMin = this.totalDuration;
  }

  private applyServiceToLine(index: number, svc: ServiceOption) {
    if (!this.createForm.services[index]) this.createForm.services[index] = { serviceId: '', name: '', durationMin: 0, price: 0, quantity: 1 };
    this.createForm.services[index].serviceId = svc.id;
    this.createForm.services[index].name = svc.name;
    this.createForm.services[index].durationMin = Number(svc.durationMin) || 0;
    this.createForm.services[index].price = Number(svc.price) || 0;
    this.createForm.services[index].discountPct = this.createForm.services[index].discountPct || 0;
    if (!this.createForm.title?.trim()) this.createForm.title = svc.name;
    if (!this.createForm.manualDuration) this.createForm.durationMin = this.totalDuration;
  }

  private searchClients(query: string) {
    const search = query.trim();
    this.clientLookupError = '';
    if (!search) {
      this.filteredClientList = [];
      this.clientLookupBusy = false;
      return;
    }
    this.clientLookupBusy = true;
    this.clientsApi.getClients({ search, page: 1, limit: 20 }).subscribe({
      next: (res) => {
        const matches = this.normalizeClients(res.items || []);
        this.clientList = this.mergeClients(this.clientList, matches);
        this.filteredClientList = matches;
        this.clientLookupBusy = false;
      },
      error: () => {
        this.filteredClientList = this.filterLocalClients(search);
        this.clientLookupError = this.filteredClientList.length ? '' : 'Could not load clients.';
        this.clientLookupBusy = false;
      },
    });
  }

  private searchServices(query: string) {
    const search = query.trim();
    this.serviceLookupError = '';
    if (!search) {
      this.filteredServiceList = [];
      this.serviceLookupBusy = false;
      return;
    }
    this.serviceLookupBusy = true;
    this.servicesApi.getAll({ search, isActive: true }).subscribe({
      next: (services) => {
        const matches = this.normalizeServices(services);
        this.serviceList = this.mergeServices(this.serviceList, matches);
        this.filteredServiceList = matches;
        this.serviceLookupBusy = false;
      },
      error: () => {
        this.filteredServiceList = this.filterLocalServices(search);
        this.serviceLookupError = this.filteredServiceList.length ? '' : 'Could not load services.';
        this.serviceLookupBusy = false;
      },
    });
  }

  private filterLocalClients(search: string): ClientOption[] {
    const q = search.toLowerCase();
    return this.clientList.filter(c =>
      (c.fullName || c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }

  private filterLocalServices(search: string): ServiceOption[] {
    const q = search.toLowerCase();
    return this.serviceList.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.category?.name || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }

  private normalizeClient(client: Client | ClientOption): ClientOption {
    return {
      id: client.id,
      fullName: client.fullName || (client as ClientOption).name || '',
      name: (client as ClientOption).name,
      phone: client.phone || null,
      email: client.email || null,
    };
  }

  private normalizeClients(clients: (Client | ClientOption)[]): ClientOption[] {
    return clients.map(c => this.normalizeClient(c)).filter(c => !!c.id);
  }

  private mergeClients(existing: ClientOption[], incoming: ClientOption[]): ClientOption[] {
    const map = new Map<string, ClientOption>();
    [...existing, ...incoming].forEach(c => map.set(c.id, c));
    return Array.from(map.values());
  }

  private normalizeService(service: SalonService | ServiceOption): ServiceOption {
    return {
      id: service.id,
      name: service.name,
      durationMin: Number(service.durationMin) || 0,
      price: Number(service.price) || 0,
      description: service.description || null,
      categoryId: service.categoryId || null,
      category: service.category || null,
      isActive: service.isActive,
    };
  }

  private normalizeServices(services: (SalonService | ServiceOption)[]): ServiceOption[] {
    return services.map(s => this.normalizeService(s)).filter(s => !!s.id);
  }

  private mergeServices(existing: ServiceOption[], incoming: ServiceOption[]): ServiceOption[] {
    const map = new Map<string, ServiceOption>();
    [...existing, ...incoming].forEach(s => map.set(s.id, s));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private resetCreateLookupState() {
    this.createSubmitAttempted = false;
    this.clientSearchTouched = false;
    this.clientSearchQuery = '';
    this.filteredClientList = [];
    this.clientLookupBusy = false;
    this.clientLookupError = '';
    this.showAddClientForm = false;
    this.newClientForm = { fullName: '', phone: '', email: '' };
    this.newClientBusy = false;
    this.newClientError = '';
    this.serviceSearchQuery = '';
    this.filteredServiceList = [];
    this.serviceLookupBusy = false;
    this.serviceLookupError = '';
  }

  loadClientsAndServices() {
    this.loadClients();
    this.loadServices();
    this.http.get<BranchOption[]>('http://localhost:3000/api/branches').subscribe({
      next: (d) => this.branchList = Array.isArray(d) ? d : [],
    });
  }

  private loadClients() {
    this.clientsApi.getClients({ page: 1, limit: 50, sortBy: 'fullName', sortOrder: 'asc' }).subscribe({
      next: (res) => {
        this.clientList = this.mergeClients(this.clientList, this.normalizeClients(res.items || []));
        this.ensureSelectedClientLoaded();
      },
      error: () => { this.ensureSelectedClientLoaded(); },
    });
  }

  private ensureSelectedClientLoaded() {
    const selectedId = this.createForm.clientId;
    if (!selectedId || this.clientList.some(c => c.id === selectedId)) return;
    this.clientsApi.getClient(selectedId).subscribe({
      next: (client) => { this.clientList = this.mergeClients(this.clientList, [this.normalizeClient(client)]); },
      error: () => {},
    });
  }

  private loadServices() {
    this.servicesApi.getAll({ isActive: true }).subscribe({
      next: (services) => {
        this.serviceList = this.mergeServices(this.serviceList, this.normalizeServices(services));
        this.hydrateSelectedServices();
      },
      error: () => {},
    });
  }

  private hydrateSelectedServices() {
    this.createForm.services.forEach((line, index) => {
      if (!line.serviceId) return;
      const svc = this.serviceList.find(s => s.id === line.serviceId);
      if (svc) this.applyServiceToLine(index, svc);
    });
  }
}
