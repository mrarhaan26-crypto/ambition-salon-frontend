import { CommonModule } from '@angular/common';
import { Component, inject, HostListener, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BookingsService, BookingQueryParams } from './bookings.service';
import { Client360Component } from '../client-360/client-360.component';
import { environment } from '../../../environments/environment';
import type { BookingListItem, BookingFilterState, CreateBookingForm, BookingServiceFormLine, BookingStatus, ClientOption, StaffOption, BranchOption, ServiceOption, ViewBillData, PaymentInfo, ClientDetail, ActivityLogEntry, AddPaymentForm } from './bookings.models';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Client360Component],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Bookings</h1>
          <p>Manage all salon appointments.</p>
        </div>
        <button class="primary" (click)="openCreateForm()">+ New Booking</button>
      </div>

      <div class="toolbar">
        <input [(ngModel)]="filters.search" (input)="onFilterChange()" placeholder="Search client or title..." class="filter-input">
        <select [(ngModel)]="filters.status" (change)="onFilterChange()" class="filter-select">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NO_SHOW">No Show</option>
        </select>
        <input type="date" [(ngModel)]="filters.date" (change)="onFilterChange()" class="filter-date">
        <button class="clear-btn" *ngIf="hasActiveFilters" (click)="clearFilters()">Clear</button>
      </div>

      <div class="client-filter-banner" *ngIf="filterClientName">
        <span>Viewing bookings for <strong>{{ filterClientName }}</strong></span>
        <button class="clear-client-filter" (click)="clearClientFilter()">Clear filter</button>
      </div>

      <div class="summary" *ngIf="!loading && !error && bookings.length > 0">
        <span class="count">{{ bookings.length }} booking{{ bookings.length === 1 ? '' : 's' }}</span>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading bookings...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load bookings.</strong><p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && bookings.length === 0">
        <div class="empty-icon">📅</div>
        <p>No bookings found.</p>
        <span class="empty-hint" *ngIf="hasActiveFilters">Try adjusting your filters or <a href="#" (click)="clearFilters(); $event.preventDefault()">clear them</a>.</span>
        <span class="empty-hint" *ngIf="!hasActiveFilters">Create your first booking to get started.</span>
      </div>

      <div class="bookings-list" *ngIf="!loading && !error && bookings.length > 0">
        <ng-container *ngIf="todayBookings.length > 0">
          <div class="list-section-label">Today</div>
          <div class="booking-row" *ngFor="let b of todayBookings" [class]="'status-' + (b.status || '').toLowerCase()" (click)="openDetail(b)">
            <div class="booking-main">
              <div class="booking-client">
                <strong>{{ b.client?.fullName || 'Unknown Client' }}</strong>
                <span class="booking-title">{{ b.title }}</span>
              </div>
              <div class="booking-datetime">
                <span class="time">{{ b.startTime | date:'h:mm a' }} — {{ b.endTime | date:'h:mm a' }}</span>
                <span class="duration" *ngIf="getDurationMin(b) as dur">{{ dur }} min</span>
              </div>
              <div class="booking-services" *ngIf="b.services?.length">
                <span class="svc-tag" *ngFor="let s of b.services">{{ s.name }}</span>
              </div>
            </div>
            <div class="booking-side">
              <span class="status-badge" [class]="'badge-' + (b.status || '').toLowerCase()">{{ b.status | titlecase | slice:0:4 }}</span>
              <span class="staff-name">{{ b.staff?.fullName || 'Unassigned' }}</span>
              <span class="branch-name" *ngIf="b.branch?.name">{{ b.branch.name }}</span>
              <b class="amount">{{ (b.totalAmount || 0) | currency }}</b>
            </div>
          </div>
        </ng-container>
        <ng-container *ngIf="upcomingBookings.length > 0">
          <div class="list-section-label" *ngIf="todayBookings.length > 0">Upcoming</div>
          <div class="booking-row" *ngFor="let b of upcomingBookings" [class]="'status-' + (b.status || '').toLowerCase()" (click)="openDetail(b)">
            <div class="booking-main">
              <div class="booking-client">
                <strong>{{ b.client?.fullName || 'Unknown Client' }}</strong>
                <span class="booking-title">{{ b.title }}</span>
              </div>
              <div class="booking-datetime">
                <span class="date">{{ b.startTime | date:'MMM dd' }}</span>
                <span class="time">{{ b.startTime | date:'h:mm a' }} — {{ b.endTime | date:'h:mm a' }}</span>
                <span class="duration" *ngIf="getDurationMin(b) as dur">{{ dur }} min</span>
              </div>
              <div class="booking-services" *ngIf="b.services?.length">
                <span class="svc-tag" *ngFor="let s of b.services">{{ s.name }}</span>
              </div>
            </div>
            <div class="booking-side">
              <span class="status-badge" [class]="'badge-' + (b.status || '').toLowerCase()">{{ b.status | titlecase | slice:0:4 }}</span>
              <span class="staff-name">{{ b.staff?.fullName || 'Unassigned' }}</span>
              <span class="branch-name" *ngIf="b.branch?.name">{{ b.branch.name }}</span>
              <b class="amount">{{ (b.totalAmount || 0) | currency }}</b>
            </div>
          </div>
        </ng-container>
      </div>

      <div class="drawer-overlay" *ngIf="showDetail" (click)="closeDetail()">
        <div class="drawer-panel luxe-drawer" (click)="$event.stopPropagation()">
          <ng-container *ngIf="selectedBooking; else noBooking">
            <div class="drawer-header luxe-header">
              <div class="dh-left">
                <span class="dh-eyebrow">Salon Booking</span>
                <h2>{{ selectedBooking.client?.fullName || 'Booking' }}</h2>
                <span class="dh-subtitle">{{ selectedBooking.title }}</span>
              </div>
              <div class="dh-right">
                <span class="status-badge" [class]="'badge-' + (selectedBooking.status || '').toLowerCase()">{{ getStatusLabel(selectedBooking.status) }}</span>
                <div class="action-menu-wrapper" (click)="$event.stopPropagation()">
                  <button class="action-menu-trigger" (click)="toggleActionMenu()">&#x22EE;</button>
                  <div class="action-menu-dropdown" *ngIf="showActionMenu" (click)="$event.stopPropagation()">
                    <button (click)="closeActionMenu(); openEditForm(selectedBooking)"><span class="am-icon">&#x270E;</span> Edit Booking</button>
                    <button *ngIf="selectedBooking.status !== 'COMPLETED' && selectedBooking.status !== 'CANCELLED' && selectedBooking.status !== 'NO_SHOW'" (click)="closeActionMenu(); openRescheduleForm(selectedBooking)"><span class="am-icon">&#x1F552;</span> Reschedule Booking</button>
                    <button (click)="closeActionMenu(); openAddPayment()"><span class="am-icon">&#x1F4B3;</span> Add Payment</button>
                    <button (click)="closeActionMenu(); openAddTip()"><span class="am-icon">&#x1F381;</span> Add Tip</button>
                    <button (click)="closeActionMenu(); doRebook()"><span class="am-icon">&#x1F504;</span> Rebook</button>
                    <button (click)="closeActionMenu(); printBill()"><span class="am-icon">&#x1F5A8;</span> Print</button>
                    <button (click)="closeActionMenu(); viewClientProfile()"><span class="am-icon">&#x1F464;</span> View Client</button>
                  </div>
                </div>
                <button class="close-btn" (click)="closeDetail()">&times;</button>
              </div>
            </div>
            <div class="drawer-body">
              <ng-container *ngIf="viewBillData && !viewBillLoading && viewBillActiveTab === 'details'; else mainTabs">
                <div class="bill-tabs">
                  <button [class.active]="viewBillActiveTab==='details'" (click)="viewBillActiveTab='details'">Bill Details</button>
                  <button [class.active]="viewBillActiveTab==='activity'" (click)="viewBillActiveTab='activity'">Activity Log</button>
                </div>

                <div class="luxe-card glass lx-client">
                  <div class="lx-accent"></div>
                  <div class="cs-avatar luxe-avatar">{{ (selectedBooking.client?.fullName || '?').charAt(0) }}</div>
                  <div class="cs-info">
                    <span class="cs-name">{{ selectedBooking.client?.fullName || 'Walk-in Client' }}</span>
                    <span class="cs-contact" *ngIf="selectedBooking.client?.phone">{{ selectedBooking.client.phone }}</span>
                    <span class="cs-contact" *ngIf="selectedBooking.client?.email">{{ selectedBooking.client.email }}</span>
                    <span class="cs-history" *ngIf="clientBookingCount">Past visits: <strong>{{ clientBookingCount }}</strong></span>
                  </div>
                  <div class="cs-wallet" *ngIf="viewBillData.clientDetail && viewBillData.clientDetail.walletBalance !== undefined">
                    <span class="wl-label">Wallet</span>
                    <span class="wl-amount">{{ viewBillData.clientDetail.walletBalance | currency }}</span>
                  </div>
                </div>

                <div class="luxe-grid">
                  <div class="luxe-card glass lx-mini" *ngIf="selectedBooking.staff">
                    <span class="lx-ico">&#x1F464;</span>
                    <span class="lx-k">Staff</span>
                    <span class="lx-v">{{ selectedBooking.staff?.fullName || 'Unassigned' }}</span>
                  </div>
                  <div class="luxe-card glass lx-mini" *ngIf="selectedBooking.resource?.name">
                    <span class="lx-ico">&#x1F4E6;</span>
                    <span class="lx-k">Resource</span>
                    <span class="lx-v">{{ selectedBooking.resource.name }}<em *ngIf="selectedBooking.resource.type"> ({{ selectedBooking.resource.type }})</em></span>
                  </div>
                  <div class="luxe-card glass lx-mini" *ngIf="selectedBooking.branch?.name">
                    <span class="lx-ico">&#x1F3E2;</span>
                    <span class="lx-k">Branch</span>
                    <span class="lx-v">{{ selectedBooking.branch.name }}</span>
                  </div>
                </div>

                <div class="luxe-card glass lx-date">
                  <div class="lx-date-row">
                    <span class="lx-ico">&#x1F4C5;</span>
                    <div class="lx-date-main">
                      <span class="lx-date-day">{{ selectedBooking.startTime | date:'EEE, MMM dd, yyyy' }}</span>
                      <span class="lx-date-time">{{ selectedBooking.startTime | date:'h:mm a' }} – {{ selectedBooking.endTime | date:'h:mm a' }}</span>
                    </div>
                    <span class="lx-duration" *ngIf="getDurationMin(selectedBooking) as dur">{{ dur }} min</span>
                  </div>
                </div>

                <div class="luxe-card glass drawer-section lx-services" *ngIf="selectedBooking.services?.length">
                  <h3>Services ({{ selectedBooking.services.length }})</h3>
                  <div class="lx-svc" *ngFor="let s of selectedBooking.services">
                    <div class="lx-svc-top">
                      <span class="lx-svc-name">{{ s.name }}</span>
                      <span class="lx-svc-price">{{ s.price | currency }}</span>
                    </div>
                    <div class="lx-svc-sub">
                      <span class="lx-svc-dur">{{ s.durationMin }} min</span>
                      <span class="lx-svc-qty">Qty 1</span>
                    </div>
                  </div>
                  <div class="bill-divider"></div>
                  <div class="bill-summary">
                    <div class="bl-row"><span>Subtotal</span><span>{{ viewBillData.subtotal | currency }}</span></div>
                    <div class="bl-row" *ngIf="viewBillData.discount > 0"><span>Discount</span><span class="bl-discount">-{{ viewBillData.discount | currency }}</span></div>
                    <div class="bl-row" *ngIf="viewBillData.tax > 0"><span>Tax/GST ({{ viewBillData.taxRate }}%)</span><span>{{ viewBillData.tax | currency }}</span></div>
                    <div class="bl-row bl-total"><span>Total</span><span>{{ viewBillData.total | currency }}</span></div>
                    <div class="bl-row bl-paid"><span>Paid</span><span class="bl-paid-amt">{{ viewBillData.paid | currency }}</span></div>
                    <div class="bl-row bl-due" *ngIf="viewBillData.due > 0"><span>Due</span><span class="bl-due-amt">{{ viewBillData.due | currency }}</span></div>
                  </div>
                  <div class="bill-payment-mode" *ngIf="viewBillData.paymentMethod">
                    <span>Payment Mode: <strong>{{ viewBillData.paymentMethod }}</strong></span>
                  </div>
                </div>

                <div class="luxe-card glass drawer-section lx-notes" *ngIf="selectedBooking.notes || viewBillData.staffAlert">
                  <h3>Notes & Alerts</h3>
                  <div class="notes-content" *ngIf="selectedBooking.notes">
                    <span class="notes-label">Notes:</span>
                    <p>{{ selectedBooking.notes }}</p>
                  </div>
                  <div class="staff-alert" *ngIf="viewBillData.staffAlert">
                    <span class="alert-icon">&#x26A0;</span>
                    <span>{{ viewBillData.staffAlert }}</span>
                  </div>
                </div>

                <div class="drawer-section bill-actions">
                  <button class="btn-print luxe-print" (click)="printBill()">&#x1F5A8; Print Bill</button>
                </div>
              </ng-container>

              <ng-template #mainTabs>
                <div class="bill-tabs" *ngIf="selectedBooking">
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

              <div class="drawer-loading" *ngIf="viewBillLoading"><div class="spinner"></div><span>Loading bill details...</span></div>

              <div class="status-workflow luxe-card glass" *ngIf="selectedBooking && !showReschedule && !showCancelForm && !showEditForm && !showAddPayment && !showAddTip">
                <div class="sw-label">Status Workflow</div>
                <div class="sw-buttons">
                  <button class="sw-btn sw-confirmed" [class.sw-active]="selectedBooking.status==='CONFIRMED'" [disabled]="selectedBooking.status==='CONFIRMED'" (click)="doStatus(selectedBooking, 'CONFIRMED')">Confirmed</button>
                  <button class="sw-btn sw-arrived" [class.sw-active]="selectedBooking.status==='CHECKED_IN'" [disabled]="!canTransitionTo('CHECKED_IN')" (click)="doStatus(selectedBooking, 'CHECKED_IN')">Arrived</button>
                  <button class="sw-btn sw-start" [class.sw-active]="selectedBooking.status==='CHECKED_IN'" [disabled]="!canTransitionTo('CHECKED_IN')" (click)="doStatus(selectedBooking, 'CHECKED_IN')">Start</button>
                  <button class="sw-btn sw-completed" [class.sw-active]="selectedBooking.status==='COMPLETED'" [disabled]="selectedBooking.status==='COMPLETED'" (click)="doStatus(selectedBooking, 'COMPLETED')">Completed</button>
                  <button class="sw-btn sw-cancel" [disabled]="!canCancel(selectedBooking)" (click)="openCancelForm()">Cancel</button>
                  <button class="sw-btn sw-notcame" [disabled]="selectedBooking.status==='NO_SHOW'" (click)="doStatus(selectedBooking, 'NO_SHOW')">Not Came</button>
                </div>
              </div>

              <div class="reschedule-form luxe-card glass" *ngIf="showReschedule">
                <h3>Reschedule Booking</h3>
                <label>Staff</label>
                <select [(ngModel)]="rescheduleForm.staffId">
                  <option *ngFor="let s of staffList" [value]="s.id">{{ s.fullName }}</option>
                </select>
                <label>Resource</label>
                <select [(ngModel)]="rescheduleForm.resourceId">
                  <option value="">None</option>
                  <option *ngFor="let r of resourceList" [value]="r.id">{{ r.name }}</option>
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

              <div class="cancel-form luxe-card glass" *ngIf="showCancelForm">
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
                  <button class="btn-danger" (click)="doCancel(selectedBooking)" [disabled]="!cancelReason || drawerBusy">{{ drawerBusy ? 'Cancelling...' : 'Confirm Cancellation' }}</button>
                </div>
                <div class="drawer-loading" *ngIf="drawerBusy"><div class="spinner"></div><span>Cancelling...</span></div>
                <div class="drawer-error" *ngIf="drawerError">{{ drawerError }}</div>
              </div>

              <div class="edit-form luxe-card glass" *ngIf="showEditForm">
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

              <div class="payment-form luxe-card glass" *ngIf="showAddPayment">
                <h3>Add Payment</h3>
                <label>Amount</label>
                <input [(ngModel)]="addPaymentForm.amount" type="number" min="0" step="0.01" placeholder="0.00">
                <label>Payment Method</label>
                <select [(ngModel)]="addPaymentForm.method">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="WALLET">Wallet</option>
                </select>
                <div class="drawer-actions">
                  <button (click)="closeAddPayment()">Back</button>
                  <button class="btn-primary" (click)="doAddPayment()" [disabled]="addPaymentBusy || !addPaymentForm.amount">{{ addPaymentBusy ? 'Processing...' : 'Pay' }}</button>
                </div>
                <div class="drawer-error" *ngIf="addPaymentError">{{ addPaymentError }}</div>
              </div>

              <div class="payment-form luxe-card glass" *ngIf="showAddTip">
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

              <div class="luxe-footer" *ngIf="selectedBooking.status && !showReschedule && !showCancelForm && !showEditForm && !showAddPayment && !showAddTip">
                <button class="btn-secondary luxe-btn" (click)="openEditForm(selectedBooking)">Edit Details</button>
                <button *ngIf="selectedBooking.status !== 'COMPLETED' && selectedBooking.status !== 'CANCELLED' && selectedBooking.status !== 'NO_SHOW'" class="btn-secondary luxe-btn" (click)="openRescheduleForm(selectedBooking)">Reschedule</button>
                <button *ngIf="canCancel(selectedBooking)" class="btn-danger luxe-btn" (click)="openCancelForm()">Cancel Booking</button>
              </div>

              <div class="drawer-loading" *ngIf="drawerBusy && !showReschedule && !showCancelForm && !showEditForm && !showAddPayment && !showAddTip"><div class="spinner"></div><span>Updating...</span></div>
              <div class="drawer-error" *ngIf="drawerError && !showReschedule && !showCancelForm && !showEditForm && !showAddPayment && !showAddTip">{{ drawerError }}</div>
            </div>
          </ng-container>
          <ng-template #noBooking>
            <div class="drawer-body">
              <div class="empty-drawer">
                <p>Booking information is not available.</p>
                <button class="btn-primary" (click)="closeDetail()">Close</button>
              </div>
            </div>
          </ng-template>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showCreate" (click)="closeCreate()">
        <div class="create-panel luxe-create" (click)="$event.stopPropagation()">
          <div class="drawer-header luxe-header">
            <div class="dh-left">
              <span class="dh-eyebrow">New Appointment</span>
              <h2>New Booking</h2>
            </div>
            <button class="close-btn" (click)="closeCreate()">&times;</button>
          </div>
          <div class="drawer-body luxe-body">
            <div class="create-form luxe-form">
              <label class="form-label luxe-label">Client *</label>
              <select [(ngModel)]="createForm.clientId" class="form-select luxe-input" [class.field-error]="formErrors.clientId">
                <option value="">— Select Client —</option>
                <option *ngFor="let c of clients" [value]="c.id">{{ c.fullName }} <ng-container *ngIf="c.phone">— {{ c.phone }}</ng-container></option>
              </select>
              <span class="field-msg" *ngIf="formErrors.clientId">{{ formErrors.clientId }}</span>

              <label class="form-label luxe-label">Staff *</label>
              <select [(ngModel)]="createForm.staffId" class="form-select luxe-input" [class.field-error]="formErrors.staffId">
                <option value="">— Select Staff —</option>
                <option *ngFor="let s of staffList" [value]="s.id">{{ s.fullName }} <ng-container *ngIf="s.specialization">— {{ s.specialization }}</ng-container></option>
              </select>
              <span class="field-msg" *ngIf="formErrors.staffId">{{ formErrors.staffId }}</span>

              <label class="form-label luxe-label">Branch *</label>
              <select [(ngModel)]="createForm.branchId" class="form-select luxe-input" [class.field-error]="formErrors.branchId">
                <option value="">— Select Branch —</option>
                <option *ngFor="let b of branches" [value]="b.id">{{ b.name }} <ng-container *ngIf="b.city">— {{ b.city }}</ng-container></option>
              </select>
              <span class="field-msg" *ngIf="formErrors.branchId">{{ formErrors.branchId }}</span>

              <label class="form-label luxe-label">Title</label>
              <input [(ngModel)]="createForm.title" placeholder="e.g. Birthday haircut & style" class="form-input luxe-input">

              <label class="form-label luxe-label">Start Time *</label>
              <div class="time-picker-row luxe-date-picker">
                <input [(ngModel)]="createDate" type="date" class="form-input time-date luxe-time-input" (change)="syncTimeToForm()" [class.field-error]="formErrors.startTime">
                <select [(ngModel)]="createHour" class="form-input time-hour luxe-time-input" (change)="syncTimeToForm()">
                  <option *ngFor="let h of [1,2,3,4,5,6,7,8,9,10,11,12]" [value]="h">{{ h }}</option>
                </select>
                <select [(ngModel)]="createMinute" class="form-input time-min luxe-time-input" (change)="syncTimeToForm()">
                  <option value="00">:00</option>
                  <option value="15">:15</option>
                  <option value="30">:30</option>
                  <option value="45">:45</option>
                </select>
                <select [(ngModel)]="createAmPm" class="form-input time-ampm luxe-time-input" (change)="syncTimeToForm()">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
                <span class="time-12-preview" *ngIf="createForm.startTime">{{ createForm.startTime | date:'h:mm a' }}</span>
              </div>
              <span class="field-msg" *ngIf="formErrors.startTime">{{ formErrors.startTime }}</span>

              <label class="form-label luxe-label">Services *</label>
              <div class="svc-picker">
                <select #svcSelect class="form-select luxe-input" (change)="addCatalogService(svcSelect.value); svcSelect.value = ''">
                  <option value="">— Add Service from Catalog —</option>
                  <option *ngFor="let sv of catalogServices" [value]="sv.id" [disabled]="isServiceAdded(sv.id)">{{ sv.name }} ({{ sv.durationMin }} min — {{ sv.price | currency }})</option>
                </select>
              </div>
              <div class="create-services" *ngIf="createForm.services.length > 0">
                <div class="svc-card luxe-svc-card" *ngFor="let s of createForm.services; let i = index">
                  <div class="svc-card-info">
                    <span class="svc-card-name">{{ s.name }}</span>
                    <span class="svc-card-meta">{{ s.durationMin }} min</span>
                    <span class="svc-card-price">{{ s.price | currency }}</span>
                  </div>
                  <button class="remove-btn" (click)="removeService(i)">&times;</button>
                </div>
                <div class="svc-summary">
                  <span>Total: <strong>{{ getFormDuration() }} min</strong></span>
                  <span><strong>{{ getFormTotal() | currency }}</strong></span>
                </div>
              </div>
              <span class="field-msg" *ngIf="formErrors.services">{{ formErrors.services }}</span>

              <div class="duration-hint" *ngIf="createForm.services.length > 0 && createForm.startTime">
                <span>Scheduled: <strong>{{ createForm.startTime | date:'h:mm a' }}</strong> – <strong>{{ getEstimatedEndTime() | date:'h:mm a' }}</strong></span>
                <span>({{ getFormDuration() }} min total)</span>
              </div>

              <label class="form-label luxe-label">Notes</label>
              <textarea [(ngModel)]="createForm.notes" placeholder="Optional notes for this booking..." class="form-input form-textarea luxe-input" rows="2"></textarea>

              <div class="drawer-actions">
                <button (click)="closeCreate()">Cancel</button>
                <button class="btn-primary luxe-btn-primary" (click)="doCreate()" [disabled]="createBusy">{{ createBusy ? 'Creating...' : 'Create Booking' }}</button>
              </div>
            </div>
            <div class="drawer-loading" *ngIf="createBusy"><div class="spinner"></div><span>Creating...</span></div>
            <div class="drawer-error" *ngIf="createError">{{ createError }}</div>
          </div>
        </div>
      </div>

      <app-client-360 *ngIf="showClient360 && client360ClientId" [clientId]="client360ClientId" (close)="closeClient360()"></app-client-360>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:20px;max-width:1200px;background:radial-gradient(800px 400px at 0% 0%,rgba(201,162,39,.08),transparent 60%),radial-gradient(600px 400px at 100% 100%,rgba(28,21,48,.06),transparent 55%)}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:rgba(255,255,255,.8);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.9);border-radius:20px;padding:18px 22px;box-shadow:0 8px 28px rgba(15,23,42,.06)}
    h1{font-size:34px;margin:0;background:linear-gradient(135deg,#1c1530,#5b4a8a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    p{color:#6b7280;margin:6px 0 0;font-size:14px}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#c9a227,#8a6d1f);color:white;font-size:14px;white-space:nowrap;box-shadow:0 8px 20px rgba(201,162,39,.3);transition:all .2s}
    .primary:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(201,162,39,.45)}
    .toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:rgba(255,255,255,.55);backdrop-filter:blur(10px);border-radius:16px;padding:14px 18px;border:1px solid rgba(255,255,255,.7)}
    .filter-input{flex:1;min-width:180px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;background:rgba(255,255,255,.85);transition:border-color .2s,box-shadow .2s}
    .filter-input:focus{border-color:#c9a227;box-shadow:0 0 0 3px rgba(201,162,39,.15)}
    .filter-select{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;background:rgba(255,255,255,.85);outline:none;cursor:pointer;transition:border-color .2s,box-shadow .2s}
    .filter-select:focus{border-color:#c9a227;box-shadow:0 0 0 3px rgba(201,162,39,.15)}
    .filter-date{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;background:rgba(255,255,255,.85);outline:none;transition:border-color .2s,box-shadow .2s}
    .filter-date:focus{border-color:#c9a227;box-shadow:0 0 0 3px rgba(201,162,39,.15)}
    .clear-btn{border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.85);font-size:13px;transition:all .2s}
    .clear-btn:hover{border-color:#dc2626;color:#dc2626}
    .client-filter-banner{display:flex;align-items:center;gap:12px;background:rgba(201,162,39,.08);border:1px solid rgba(201,162,39,.25);border-radius:12px;padding:10px 16px;font-size:14px;color:#8a6d1f;backdrop-filter:blur(8px)}
    .client-filter-banner strong{font-weight:800}
    .clear-client-filter{border:1px solid rgba(201,162,39,.25);background:rgba(255,255,255,.9);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;color:#8a6d1f;transition:all .2s;margin-left:auto}
    .clear-client-filter:hover{background:rgba(201,162,39,.12)}
    .summary{padding:4px 2px}
    .count{font-size:13px;color:#6b7280;font-weight:600}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280;background:rgba(255,255,255,.7);backdrop-filter:blur(12px);border-radius:20px;border:1px solid rgba(255,255,255,.8);box-shadow:0 8px 28px rgba(15,23,42,.06)}
    .spinner{width:26px;height:26px;border:3px solid rgba(201,162,39,.15);border-top-color:#c9a227;border-right-color:#8a6d1f;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:linear-gradient(135deg,rgba(254,242,242,.9),rgba(254,226,226,.9));border:1px solid rgba(239,68,68,.2);border-radius:20px;padding:24px;text-align:center;backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(239,68,68,.1)}
    .error strong{color:#991b1b}.error p{color:#7f1d1d;margin:8px 0}
    .error button{margin-top:12px;background:linear-gradient(135deg,#c9a227,#8a6d1f);color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(201,162,39,.3)}
    .empty{padding:48px 24px;text-align:center;background:rgba(255,255,255,.7);backdrop-filter:blur(12px);border-radius:20px;border:1px solid rgba(255,255,255,.8);box-shadow:0 8px 28px rgba(15,23,42,.06)}
    .empty-icon{font-size:40px;margin-bottom:12px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.1))}
    .empty p{font-size:16px;font-weight:600;margin:0 0 6px;color:#374151}
    .empty-hint{font-size:13px;color:#9ca3af}
    .empty-hint a{color:#c9a227;text-decoration:underline;cursor:pointer;font-weight:700}
    .bookings-list{display:grid;gap:6px}
    .list-section-label{font-size:12px;font-weight:800;text-transform:uppercase;color:#8a6d1f;letter-spacing:.08em;padding:14px 4px 6px;margin-top:8px;border-top:1px solid rgba(201,162,39,.12)}
    .list-section-label:first-child{border-top:0;margin-top:0}
    .booking-row{display:flex;align-items:center;gap:16px;background:rgba(255,255,255,.82);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.9);border-radius:18px;padding:14px 18px;border-left:5px solid #e5e7eb;box-shadow:0 4px 16px rgba(15,23,42,.06);transition:all .25s cubic-bezier(.4,0,.2,1);cursor:pointer}
    .booking-row:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(15,23,42,.12),0 0 0 1px rgba(201,162,39,.15)}
    .booking-row.status-confirmed{border-left-color:#3b82f6}
    .booking-row.status-completed{border-left-color:#16a34a}
    .booking-row.status-pending{border-left-color:#eab308}
    .booking-row.status-cancelled{border-left-color:#dc2626;opacity:.65}
    .booking-row.status-no_show{border-left-color:#6b7280;opacity:.65}
    .booking-row.status-checked_in{border-left-color:#8b5cf6}
    .booking-main{flex:2;display:grid;gap:6px;min-width:0}
    .booking-client strong{display:block;font-size:15px;line-height:1.3;color:#1c1530}
    .booking-title{font-size:13px;color:#6b7280;display:block}
    .booking-datetime{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#6b7280}
    .booking-datetime .date{font-weight:700;color:#8a6d1f}
    .booking-datetime .time{color:#4b5563;font-weight:600}
    .booking-datetime .duration{background:rgba(201,162,39,.1);padding:1px 8px;border-radius:8px;font-weight:700;color:#8a6d1f}
    .booking-services{display:flex;flex-wrap:wrap;gap:4px}
    .svc-tag{font-size:11px;background:rgba(201,162,39,.1);color:#8a6d1f;padding:2px 8px;border-radius:8px;font-weight:700}
    .booking-side{flex-shrink:0;text-align:right;display:grid;gap:3px;align-items:end}
    .status-badge{display:inline-block;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.03em;box-shadow:0 2px 6px rgba(0,0,0,.08)}
    .badge-confirmed{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1d4ed8}
    .badge-completed{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46}
    .badge-pending{background:linear-gradient(135deg,#fef9c3,#fef3c7);color:#92400e}
    .badge-cancelled{background:linear-gradient(135deg,#fee2e2,#fecdd3);color:#991b1b}
    .badge-no_show{background:linear-gradient(135deg,#f3f4f6,#e5e7eb);color:#6b7280}
    .badge-checked_in{background:linear-gradient(135deg,#ede9fe,#ddd6fe);color:#6d28d9}
    .staff-name{font-size:12px;color:#6b7280;font-weight:600}
    .branch-name{font-size:11px;color:#9ca3af}
    .amount{font-size:16px;font-weight:800;color:#1c1530}
    .drawer-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(2px);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:linear-gradient(160deg,#ffffff 0%,#fbfaff 100%);width:min(460px,100%);max-height:100vh;overflow-y:auto;border-left:4px solid #c9a227;box-shadow:-30px 0 80px rgba(15,23,42,.18);border-top-left-radius:22px;border-bottom-left-radius:22px;animation:slideIn .25s ease}
    .create-panel{background:linear-gradient(160deg,#ffffff 0%,#fbfaff 100%);border-radius:24px;width:min(520px,90%);max-height:90vh;overflow-y:auto;box-shadow:0 30px 80px rgba(15,23,42,.25);animation:fadeIn .2s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white;z-index:1;gap:12px}
    .drawer-header-info{flex:1;min-width:0}
    .drawer-header-info h2{margin:0;font-size:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .header-subtitle{font-size:13px;color:#6b7280;display:block;margin-top:2px}
    .drawer-badge{flex-shrink:0;font-size:12px;padding:4px 12px}
    .close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280;padding:0;line-height:1;flex-shrink:0}
    .drawer-body{padding:24px 28px;display:grid;gap:20px}
    .drawer-section h3{font-size:13px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em}
    .info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
    .info-row span:first-child{color:#6b7280;font-weight:600}
    .info-row span:last-child{text-align:right;max-width:60%}
    .client-card{display:flex;align-items:center;gap:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:12px 14px;transition:border-color .2s}
    .client-card:hover{border-color:#d1d5db}
    .client-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#c9a227,#8a6d1f);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0;box-shadow:0 4px 10px rgba(201,162,39,.3)}
    .client-info{flex:1;min-width:0;display:grid;gap:2px}
    .client-name{font-weight:700;font-size:14px;color:#111827}
    .client-contact{font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .client-history{font-size:11px;color:#9ca3af;font-weight:600}
    .client-crm-link{flex-shrink:0;background:rgba(201,162,39,.1);color:#8a6d1f;border:1px solid rgba(201,162,39,.2);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;text-decoration:none;transition:all .2s}
    .client-crm-link:hover{background:rgba(201,162,39,.18);border-color:rgba(201,162,39,.35)}
    .datetime-block{display:grid;gap:4px;padding:4px 0}
    .datetime-block .dt-date{font-weight:700;font-size:15px}
    .datetime-block .dt-time{font-size:14px;color:#374151}
    .datetime-block .dt-duration{font-size:12px;color:#8a6d1f;background:rgba(201,162,39,.1);padding:2px 10px;border-radius:8px;display:inline-block;width:fit-content;font-weight:700}
    .svc-line{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
    .svc-name{flex:1;font-weight:600}
    .svc-meta{color:#6b7280;font-size:12px}
    .svc-price{font-weight:800;text-align:right}
    .svc-total{display:flex;justify-content:space-between;padding:10px 0 0;font-weight:800;font-size:14px;border-top:2px solid #e5e7eb;margin-top:4px}
    .notes-text{font-size:14px;color:#374151;margin:0;line-height:1.5;padding:4px 0}
    .drawer-actions{display:flex;gap:10px;flex-wrap:wrap}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px;transition:all .2s}
    .drawer-actions button:hover:not(:disabled){opacity:.85}
    .drawer-actions button:disabled{opacity:.4;cursor:not-allowed}
    .drawer-actions button:focus-visible{outline:2px solid #c9a227;outline-offset:2px}
    .btn-primary{background:linear-gradient(135deg,#c9a227,#8a6d1f);color:#fff;box-shadow:0 10px 24px rgba(201,162,39,.35);border:0}
    .btn-primary:hover{opacity:1;box-shadow:0 14px 30px rgba(201,162,39,.45);transform:translateY(-1px)}
    .btn-secondary{background:rgba(201,162,39,.1);color:#8a6d1f;border:1px solid rgba(201,162,39,.2)}
    .btn-secondary:hover{background:rgba(201,162,39,.18)}
    .btn-danger{background:rgba(220,38,38,.1);color:#991b1b;border:1px solid rgba(220,38,38,.15)}
    .btn-danger:hover{background:rgba(220,38,38,.16)}
    .cancel-confirm{flex:1;display:grid;gap:8px;padding:12px;background:rgba(254,243,199,.8);border:1px solid rgba(245,158,11,.25);border-radius:12px;text-align:center;backdrop-filter:blur(8px)}
    .confirm-msg{font-weight:700;font-size:14px;color:#92400e}
    .confirm-btns{display:flex;gap:8px}
    .confirm-btns button{flex:1}
    .no-actions{flex:1;text-align:center;padding:12px;background:rgba(243,244,246,.7);border-radius:12px}
    .terminal-msg{font-size:13px;color:#6b7280;font-weight:600}
    .empty-drawer{padding:48px 24px;text-align:center;color:#6b7280}
    .empty-drawer button{margin-top:12px}
    .drawer-loading{display:flex;align-items:center;gap:10px;justify-content:center;padding:12px;color:#8a6d1f;font-size:13px;font-weight:600}
    .drawer-error{background:linear-gradient(135deg,rgba(254,242,242,.9),rgba(254,226,226,.9));color:#991b1b;padding:12px;border-radius:12px;font-size:13px;text-align:center;border:1px solid rgba(239,68,68,.1)}
    .create-form{display:grid;gap:10px}
    .form-label{font-size:13px;font-weight:700;color:#374151;margin:4px 0 0}
    .form-label:first-child{margin-top:0}
    .form-input,.form-select{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;background:rgba(255,255,255,.85);transition:border-color .2s,box-shadow .2s}
    .form-input:focus,.form-select:focus{border-color:#c9a227;box-shadow:0 0 0 3px rgba(201,162,39,.15)}
    .field-error{border-color:#dc2626!important}
    .field-msg{font-size:12px;color:#dc2626;margin:-4px 0 0}
    .svc-picker{margin-bottom:4px}
    .create-services{display:grid;gap:6px}
    .svc-card{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.8);border:1px solid rgba(15,23,42,.06);border-radius:14px;padding:10px 12px;box-shadow:0 4px 14px rgba(15,23,42,.05)}
    .svc-card-info{flex:1;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .svc-card-name{font-weight:700;font-size:14px;flex:1;min-width:80px}
    .svc-card-meta{color:#6b7280;font-size:12px}
    .svc-card-price{font-weight:800;font-size:14px;text-align:right;color:#8a6d1f}
    .svc-summary{display:flex;justify-content:space-between;padding:8px 4px 0;font-size:14px;border-top:1px solid rgba(201,162,39,.12);margin-top:2px;color:#1c1530}
    .svc-summary strong{color:#8a6d1f}
    .remove-btn{border:0;background:rgba(220,38,38,.1);color:#991b1b;border-radius:8px;width:32px;height:32px;font-weight:900;cursor:pointer;font-size:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s}
    .remove-btn:hover{background:rgba(220,38,38,.2)}
    .time-picker-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;background:rgba(201,162,39,.06);border:1px solid rgba(201,162,39,.2);border-radius:16px;padding:12px}
    .time-picker-row select.form-input{padding:10px 6px;min-width:52px;text-align:center;font-size:14px;appearance:auto;background:white;border-radius:10px}
    .time-date{flex:1;min-width:140px}
    .time-hour{width:56px}
    .time-min{width:60px}
    .time-ampm{width:68px}
    .time-12-preview{font-size:13px;color:#8a6d1f;font-weight:700;background:rgba(201,162,39,.1);padding:6px 10px;border-radius:8px}
    .duration-hint{display:flex;justify-content:space-between;background:rgba(209,250,229,.7);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:8px 12px;font-size:12px;color:#15803d;backdrop-filter:blur(8px)}
    .duration-hint strong{font-weight:800}
    .form-textarea{resize:vertical;font-family:inherit;min-height:50px}
    .dh-left{flex:1;min-width:0}
    .dh-left h2{margin:0;font-size:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dh-subtitle{font-size:13px;color:#6b7280;display:block;margin-top:2px}
    .dh-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
    .action-menu-wrapper{position:relative}
    .action-menu-trigger{border:0;background:rgba(243,244,246,.8);border-radius:8px;width:36px;height:36px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#374151;transition:background .12s}
    .action-menu-trigger:hover{background:#e5e7eb}
    .action-menu-dropdown{position:absolute;right:0;top:calc(100% + 4px);background:rgba(255,255,255,.98);border:1px solid rgba(201,162,39,.15);border-radius:12px;box-shadow:0 12px 32px rgba(15,23,42,.15);z-index:10;min-width:200px;padding:6px;display:grid;gap:2px;animation:fadeIn .15s ease;backdrop-filter:blur(10px)}
    .action-menu-dropdown button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;text-align:left;transition:background .12s}
    .action-menu-dropdown button:hover{background:rgba(201,162,39,.1);color:#8a6d1f}
    .action-menu-dropdown button:focus-visible{outline:2px solid #c9a227;outline-offset:-2px;border-radius:6px}
    .am-icon{font-size:14px;width:20px;text-align:center;flex-shrink:0}
    .client-summary-card{display:flex;align-items:center;gap:14px}
    .cs-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#c9a227,#8a6d1f);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0;box-shadow:0 4px 12px rgba(201,162,39,.35)}
    .cs-info{flex:1;min-width:0;display:grid;gap:2px}
    .cs-name{font-weight:700;font-size:15px;color:#111827}
    .cs-contact{font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cs-wallet{text-align:right;background:rgba(209,250,229,.8);padding:6px 12px;border-radius:10px;border:1px solid rgba(16,185,129,.2);flex-shrink:0}
    .wl-label{display:block;font-size:9px;font-weight:700;text-transform:uppercase;color:#16a34a;letter-spacing:.04em}
    .wl-amount{font-size:15px;font-weight:800;color:#15803d}
    .bill-tabs{display:flex;gap:4px;padding:2px 0}
    .bill-tabs button{border:0;background:transparent;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;color:#6b7280;transition:all .12s}
    .bill-tabs button.active{background:linear-gradient(135deg,#c9a227,#8a6d1f);color:#fff;box-shadow:0 6px 16px rgba(201,162,39,.3)}
    .bill-tabs button:hover:not(.active){color:#374151}
    .bill-tabs button:focus-visible{outline:2px solid #c9a227;outline-offset:2px;border-radius:4px}
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
    .bill-divider{height:1px;background:rgba(201,162,39,.15);margin:4px 0}
    .bill-summary{display:grid;gap:6px;padding:4px 0}
    .bl-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
    .bl-row span:first-child{color:#6b7280;font-weight:600}
    .bl-row span:last-child{font-weight:700;color:#374151}
    .bl-discount{color:#16a34a!important}
    .bl-total{border-top:2px solid rgba(201,162,39,.2);padding-top:8px;margin-top:4px}
    .bl-total span:last-child{font-size:16px;color:#1c1530}
    .bl-paid span:last-child{color:#16a34a}
    .bl-paid-amt{color:#16a34a}
    .bl-due span:last-child{color:#dc2626}
    .bl-due-amt{color:#dc2626}
    .bill-payment-mode{font-size:12px;color:#6b7280;padding:6px 0 0;border-top:1px solid rgba(201,162,39,.1);margin-top:6px}
    .notes-content{padding:4px 0}
    .notes-label{font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px}
    .notes-content p{margin:0;font-size:13px;color:#374151;line-height:1.5}
    .staff-alert{display:flex;align-items:center;gap:8px;background:rgba(255,243,224,.8);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:8px 12px;font-size:12px;color:#92400e;margin-top:8px;backdrop-filter:blur(8px)}
    .alert-icon{font-size:14px;flex-shrink:0}
    .bill-actions button{width:100%;border:0;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;font-size:13px;transition:all .2s}
    .btn-print{background:linear-gradient(135deg,#1c1530,#5b4a8a);color:#fff;box-shadow:0 8px 20px rgba(28,21,48,.3)}
    .btn-print:hover{background:linear-gradient(135deg,#3a2d5c,#5b4a8a);transform:translateY(-1px)}
    .status-workflow{background:rgba(249,250,251,.7);border:1px solid rgba(201,162,39,.12);border-radius:16px;padding:14px 16px;backdrop-filter:blur(8px)}
    .sw-label{font-size:11px;font-weight:800;text-transform:uppercase;color:#8a6d1f;letter-spacing:.08em;margin-bottom:10px}
    .sw-buttons{display:flex;flex-wrap:wrap;gap:6px}
    .sw-btn{border:1px solid rgba(201,162,39,.15);border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.85);color:#374151;transition:all .15s;flex:1;min-width:80px;text-align:center}
    .sw-btn:hover:not(:disabled){background:rgba(201,162,39,.08);border-color:rgba(201,162,39,.25)}
    .sw-btn:disabled{opacity:.4;cursor:default}
    .sw-btn.sw-active{background:linear-gradient(135deg,#c9a227,#8a6d1f);color:white;border-color:#c9a227;box-shadow:0 4px 12px rgba(201,162,39,.3)}
    .sw-btn:focus-visible{outline:2px solid #c9a227;outline-offset:2px;border-radius:8px}
    .sw-confirmed.sw-active{background:linear-gradient(135deg,#2563eb,#3b82f6);border-color:#3b82f6;box-shadow:0 4px 12px rgba(59,130,246,.3)}
    .sw-arrived.sw-active{background:linear-gradient(135deg,#7c3aed,#a78bfa);border-color:#7c3aed;box-shadow:0 4px 12px rgba(124,58,237,.3)}
    .sw-start.sw-active{background:linear-gradient(135deg,#7c3aed,#a78bfa);border-color:#7c3aed;box-shadow:0 4px 12px rgba(124,58,237,.3)}
    .sw-completed.sw-active{background:linear-gradient(135deg,#16a34a,#22c55e);border-color:#16a34a;box-shadow:0 4px 12px rgba(22,163,74,.3)}
    .sw-cancel.sw-active{background:linear-gradient(135deg,#dc2626,#f87171);border-color:#dc2626;box-shadow:0 4px 12px rgba(220,38,38,.3)}
    .sw-notcame.sw-active{background:linear-gradient(135deg,#6b7280,#9ca3af);border-color:#6b7280;box-shadow:0 4px 12px rgba(107,114,128,.3)}
    .reschedule-form,.cancel-form,.edit-form{display:grid;gap:12px;padding:18px;background:rgba(255,255,255,.72);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.6);border-radius:18px;box-shadow:0 10px 30px rgba(15,23,42,.08)}
    .reschedule-form h3,.cancel-form h3,.edit-form h3{margin:0;font-size:14px;font-weight:700;color:#1c1530}
    .reschedule-form label,.cancel-form label,.edit-form label{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#8a6d1f;margin-bottom:-8px}
    .reschedule-form input,.reschedule-form select,.cancel-form select,.edit-form input,.edit-form textarea{padding:12px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;font-family:inherit;background:rgba(255,255,255,.85);transition:border-color .2s,box-shadow .2s}
    .reschedule-form input:focus,.reschedule-form select:focus,.cancel-form select:focus,.edit-form input:focus,.edit-form textarea:focus{border-color:#c9a227;box-shadow:0 0 0 3px rgba(201,162,39,.15);outline:none}
    .cancel-custom-row{display:grid;gap:4px}
    .cancel-custom-row input{padding:12px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px}
    .payment-form{display:grid;gap:12px;padding:18px;background:rgba(255,255,255,.72);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.6);border-radius:18px;box-shadow:0 10px 30px rgba(15,23,42,.08)}
    .payment-form h3{margin:0;font-size:14px;font-weight:700;color:#1c1530}
    .payment-form label{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#8a6d1f;margin-bottom:-8px}
    .payment-form input,.payment-form select{padding:12px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;background:rgba(255,255,255,.85);transition:border-color .2s,box-shadow .2s}
    .payment-form input:focus,.payment-form select:focus{border-color:#c9a227;box-shadow:0 0 0 3px rgba(201,162,39,.15);outline:none}
    .tip-presets{display:flex;gap:8px}
    .tip-presets button{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:10px;font-size:14px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.85);color:#374151;transition:all .12s}
    .tip-presets button.active{background:rgba(209,250,229,.8);border-color:#16a34a;color:#16a34a}
    .tip-presets button:hover:not(.active){background:rgba(201,162,39,.08)}
    .tip-presets button:focus-visible{outline:2px solid #c9a227;outline-offset:2px}
    .activity-log-section .al-entry{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f3f4f6}
    .activity-log-section .al-entry:last-child{border-bottom:0}
    .al-dot{width:8px;height:8px;border-radius:50%;background:#c9a227;margin-top:6px;flex-shrink:0;box-shadow:0 0 6px rgba(201,162,39,.4)}
    .al-content{display:grid;gap:2px}
    .al-action{font-size:13px;font-weight:600;color:#111827}
    .al-time{font-size:11px;color:#6b7280}
    .al-user{font-size:11px;color:#8a6d1f;font-weight:600}
    .al-details{font-size:12px;color:#4b5563}
    .al-empty{padding:16px;text-align:center;color:#9ca3af;font-size:13px}
    .glass{background:rgba(255,255,255,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.6);box-shadow:0 10px 30px rgba(15,23,42,.08)}
    .luxe-header{background:linear-gradient(120deg,#1c1530 0%,#3a2d5c 55%,#5b4a8a 100%);border-bottom:0;padding:22px 26px}
    .luxe-header .dh-left{flex:1;min-width:0}
    .luxe-header h2{color:#fff;font-size:20px;margin:2px 0 0}
    .dh-eyebrow{display:block;font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#e7c873}
    .luxe-header .dh-subtitle{color:rgba(255,255,255,.72)}
    .luxe-header .close-btn,.luxe-header .action-menu-trigger{color:rgba(255,255,255,.85);background:rgba(255,255,255,.12)}
    .luxe-header .action-menu-trigger:hover{background:rgba(255,255,255,.22)}
    .luxe-badge{box-shadow:0 4px 12px rgba(0,0,0,.18)}
    .luxe-body{gap:16px;padding:20px 22px}
    .luxe-card{position:relative;border-radius:18px;padding:18px 18px 18px 22px;overflow:hidden}
    .luxe-card h3{margin:0 0 12px}
    .lx-accent{position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#c9a227,#e7c873);border-radius:18px 0 0 18px}
    .lx-client{display:flex;align-items:center;gap:14px}
    .luxe-avatar{width:52px;height:52px;font-size:22px;background:linear-gradient(135deg,#c9a227,#8a6d1f);box-shadow:0 6px 16px rgba(201,162,39,.4)}
    .cs-history{font-size:11px;color:#9ca3af;font-weight:600}
    .cs-history strong{color:#6b7280}
    .luxe-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .lx-mini{display:flex;flex-direction:column;gap:6px;padding:14px}
    .lx-ico{font-size:22px;line-height:1}
    .lx-k{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af}
    .lx-v{font-size:14px;font-weight:700;color:#1f2937}
    .lx-v em{font-style:normal;color:#6b7280;font-weight:600;font-size:12px}
    .lx-date-row{display:flex;align-items:center;gap:14px}
    .lx-date-main{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
    .lx-date-day{font-size:16px;font-weight:800;color:#1f2937}
    .lx-date-time{font-size:13px;color:#6b7280}
    .lx-duration{font-size:12px;font-weight:700;color:#8a6d1f;background:rgba(201,162,39,.14);padding:4px 12px;border-radius:20px;white-space:nowrap}
    .lx-services .lx-svc{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.65);border:1px solid rgba(15,23,42,.05);margin-bottom:8px}
    .lx-svc-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
    .lx-svc-name{font-weight:700;font-size:14px;color:#111827}
    .lx-svc-price{font-weight:800;font-size:14px;color:#8a6d1f}
    .lx-svc-sub{display:flex;gap:12px;font-size:12px;color:#6b7280}
    .lx-svc-sub .lx-svc-qty{margin-left:auto;font-weight:600}
    .lx-notes .staff-alert{margin-top:0}
    .luxe-print{background:linear-gradient(135deg,#1c1530,#5b4a8a);color:#fff;box-shadow:0 8px 20px rgba(28,21,48,.3)}
    .luxe-print:hover{background:linear-gradient(135deg,#3a2d5c,#5b4a8a);opacity:1}
    .luxe-footer{position:sticky;bottom:0;display:flex;gap:10px;flex-wrap:wrap;padding:14px 16px;background:rgba(255,255,255,.85);backdrop-filter:blur(12px);border-top:1px solid rgba(15,23,42,.06);border-radius:0 0 22px 22px;margin:0 -22px -20px}
    .luxe-footer .luxe-btn{flex:1;border:0;border-radius:14px;padding:14px;font-weight:800;cursor:pointer;font-size:13px;transition:transform .12s,box-shadow .12s}
    .luxe-footer .luxe-btn:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(15,23,42,.14)}
    .luxe-footer .luxe-btn.btn-secondary{background:rgba(201,162,39,.12);color:#8a6d1f}
    .luxe-footer .luxe-btn.btn-danger{background:rgba(220,38,38,.1);color:#991b1b}
    .luxe-footer .luxe-btn.btn-danger:hover{box-shadow:0 10px 22px rgba(220,38,38,.18)}
    .btn-ghost{background:transparent;border:1px solid #e5e7eb;color:#6b7280;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px;flex:1;transition:all .2s}
    .btn-ghost:hover{border-color:#9ca3af;color:#374151}
    .luxe-form .luxe-label{font-size:12px;font-weight:800;letter-spacing:.04em;color:#6b7280;text-transform:uppercase}
    .luxe-input{background:rgba(255,255,255,.8);border:1px solid #e5e7eb;border-radius:14px;transition:border-color .2s,box-shadow .2s}
    .luxe-input:focus{border-color:#c9a227;box-shadow:0 0 0 3px rgba(201,162,39,.15)}
    .luxe-date-picker{background:rgba(201,162,39,.06);border:1px solid rgba(201,162,39,.2);border-radius:16px;padding:12px;gap:8px}
    .luxe-time-input{border-radius:12px!important;background:white;border:1px solid #e5e7eb}
    .luxe-svc-card{background:rgba(255,255,255,.8);border:1px solid rgba(15,23,42,.06);border-radius:14px;box-shadow:0 4px 14px rgba(15,23,42,.05)}
    .status-workflow{background:rgba(249,250,251,.7)!important}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
    @media(max-width:900px){.drawer-panel{width:100%}.booking-row{flex-direction:column;align-items:stretch;gap:10px}.booking-side{text-align:left;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.toolbar{flex-direction:column}.toolbar .filter-input{min-width:0}
      .sw-buttons{gap:4px}.sw-btn{min-width:60px;padding:4px 10px;font-size:11px}
      .bill-svc-header{font-size:9px}.bill-svc-row{font-size:11px}
      .bsh-price,.bsh-total,.bsr-price,.bsr-total{width:56px}
      .cs-wallet{padding:4px 8px}.wl-amount{font-size:13px}
      .action-menu-dropdown{right:auto;left:0}
      .tip-presets button{padding:8px;font-size:13px}
    }
    @media(max-width:640px){
      .luxe-grid{grid-template-columns:1fr}
      .luxe-header{padding:18px 18px}
      .luxe-create{width:94%}
    }
  `]
})
export class BookingsComponent implements OnDestroy {
  private api = inject(BookingsService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  bookings: BookingListItem[] = [];
  filters: BookingFilterState = { search: '', status: '', date: '' };
  loading = true;
  error = '';

  showDetail = false;
  selectedBooking: BookingListItem | null = null;
  drawerBusy = false;
  drawerError = '';
  clientBookingCount = 0;

  showCreate = false;
  createBusy = false;
  createError = '';
  createForm: CreateBookingForm = { clientId: '', staffId: '', title: '', startTime: '', branchId: '', notes: '', services: [] };
  formErrors: Record<string, string> = {};

  filterClientId = '';
  filterClientName = '';
  createDate = '';
  createHour = 9;
  createMinute = '00';
  createAmPm = 'AM';

  clients: ClientOption[] = [];
  staffList: StaffOption[] = [];
  branches: BranchOption[] = [];
  catalogServices: ServiceOption[] = [];

  viewBillData: ViewBillData | null = null;
  viewBillLoading = false;
  viewBillActiveTab: 'details' | 'activity' = 'details';

  showActionMenu = false;

  showAddPayment = false;
  addPaymentForm: AddPaymentForm = { amount: 0, method: 'CASH' };
  addPaymentBusy = false;
  addPaymentError = '';

  showAddTip = false;
  addTipAmount = 0;
  addTipBusy = false;
  addTipError = '';

  showClient360 = false;
  client360ClientId = '';

  showReschedule = false;
  rescheduleBusy = false;
  rescheduleError = '';
  rescheduleForm: { staffId: string; resourceId: string; startTime: string } = { staffId: '', resourceId: '', startTime: '' };
  resourceList: any[] = [];

  showCancelForm = false;
  cancelReason = '';
  cancelCustomReason = '';
  cancelReasonOptions = ['Client changed mind', 'Client no-show', 'Double booking', 'Staff unavailable', 'Emergency', 'Other'];

  showEditForm = false;
  editBusy = false;
  editForm: { title: string; notes: string } = { title: '', notes: '' };

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.status || this.filters.date);
  }

  get filteredBookings(): BookingListItem[] {
    let list = this.bookings;
    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      list = list.filter(b =>
        (b.client?.fullName || '').toLowerCase().includes(q) ||
        (b.title || '').toLowerCase().includes(q) ||
        (b.staff?.fullName || '').toLowerCase().includes(q)
      );
    }
    if (this.filters.date) {
      list = list.filter(b => b.startTime.startsWith(this.filters.date!));
    }
    return list;
  }

  get todayBookings(): BookingListItem[] {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    return this.filteredBookings.filter(b => b.startTime.startsWith(todayStr));
  }

  get upcomingBookings(): BookingListItem[] {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    return this.filteredBookings.filter(b => !b.startTime.startsWith(todayStr));
  }

  ngOnInit() {
    this.load();
    this.loadPickers();

    this.queryParamSub = this.route.queryParams.subscribe((params) => {
      const clientId = params['clientId'];
      if (clientId) {
        this.filterClientId = clientId;
        const sub = this.api.getClients().subscribe({
          next: (clients) => {
            const match = clients.find((c) => c.id === clientId);
            if (match) {
              this.filterClientName = match.fullName;
              this.openCreateForm();
              this.createForm.clientId = match.id;
              setTimeout(() => {
                const sel = document.querySelector<HTMLSelectElement>('.create-form select.form-select');
                if (sel) sel.value = match.id;
              });
            }
            sub.unsubscribe();
            this.load();
          },
        });
      }
    });
  }

  loadPickers() {
    this.api.getClients().subscribe({ next: (d) => this.clients = d, error: () => {} });
    this.api.getStaff().subscribe({ next: (d) => this.staffList = d, error: () => {} });
    this.api.getBranches().subscribe({ next: (d) => this.branches = d, error: () => {} });
    this.api.getServices().subscribe({ next: (d) => this.catalogServices = d, error: () => {} });
  }

  load() {
    this.loading = true;
    this.error = '';
    const params: BookingQueryParams = {};
    if (this.filters.search) params.search = this.filters.search;
    if (this.filters.status) params.status = this.filters.status;
    if (this.filters.date) params.startTime = this.filters.date;
    if (this.filterClientId) params.clientId = this.filterClientId;
    this.api.getAll(params).subscribe({
      next: (d) => { this.bookings = d; this.loading = false; },
      error: () => { this.error = 'Bookings data unavailable.'; this.loading = false; },
    });
  }

  onFilterChange() { this.load(); }

  clearFilters() {
    this.filters = { search: '', status: '', date: '' };
    if (!this.filterClientId) this.load(); else this.load();
  }

  clearClientFilter() {
    this.filterClientId = '';
    this.filterClientName = '';
    this.load();
  }

  getDurationMin(b: BookingListItem | null): number {
    if (!b?.services?.length) return 0;
    return b.services.reduce((sum, s) => sum + (s.durationMin || 0), 0);
  }

  isTerminalStatus(status: string): boolean {
    return ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status);
  }

  openDetail(b: BookingListItem) {
    this.selectedBooking = b;
    this.showDetail = true;
    this.drawerBusy = false;
    this.drawerError = '';
    this.cancelReason = '';
    this.cancelCustomReason = '';
    this.showReschedule = false;
    this.showCancelForm = false;
    this.showEditForm = false;
    this.showAddPayment = false;
    this.showAddTip = false;
    this.showActionMenu = false;
    this.viewBillActiveTab = 'details';
    this.clientBookingCount = 0;
    if (b.client?.id) {
      this.api.getClientBookingCount(b.client.id).subscribe({ next: (c) => this.clientBookingCount = c });
    }
    this.loadViewBillData(b);
  }

  closeDetail() { this.showDetail = false; }
  closeCreate() { this.showCreate = false; }

  canCancel(b: BookingListItem | null): boolean {
    return !!b && (['PENDING', 'CONFIRMED', 'CHECKED_IN'] as BookingStatus[]).includes(b.status);
  }

  doStatus(b: BookingListItem, status: string) {
    this.drawerBusy = true; this.drawerError = '';
    this.api.updateStatus(b.id, status).subscribe({
      next: () => { this.drawerBusy = false; this.closeDetail(); this.load(); },
      error: (e) => { this.drawerBusy = false; this.drawerError = e.error?.message || 'Update failed.'; },
    });
  }

  openCreateForm() {
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    this.formErrors = {};
    this.createForm = { clientId: '', staffId: '', title: '', startTime: '', branchId: '', notes: '', services: [] };
    this.createDate = '';
    this.createHour = 9;
    this.createMinute = '00';
    this.createAmPm = 'AM';
  }

  addCatalogService(serviceId: string) {
    if (!serviceId) return;
    const svc = this.catalogServices.find((s) => s.id === serviceId);
    if (!svc || this.isServiceAdded(serviceId)) return;
    this.createForm.services.push({ serviceId: svc.id, name: svc.name, durationMin: svc.durationMin, price: svc.price });
  }

  isServiceAdded(serviceId: string): boolean {
    return this.createForm.services.some((s) => s.serviceId === serviceId);
  }

  removeService(i: number) { this.createForm.services.splice(i, 1); }

  syncTimeToForm() {
    if (!this.createDate || !this.createHour || !this.createMinute || !this.createAmPm) {
      this.createForm.startTime = '';
      return;
    }
    let h24 = this.createHour;
    if (this.createAmPm === 'PM' && h24 !== 12) h24 += 12;
    if (this.createAmPm === 'AM' && h24 === 12) h24 = 0;
    this.createForm.startTime = `${this.createDate}T${String(h24).padStart(2, '0')}:${this.createMinute}`;
  }

  getFormDuration(): number {
    return this.createForm.services.reduce((sum, s) => sum + (s.durationMin || 0), 0);
  }

  getFormTotal(): number {
    return this.createForm.services.reduce((sum, s) => sum + (s.price || 0), 0);
  }

  getEstimatedEndTime(): string {
    if (!this.createForm.startTime) return '';
    const start = new Date(this.createForm.startTime);
    const dur = this.getFormDuration();
    return new Date(start.getTime() + dur * 60000).toISOString();
  }

  private validateForm(): boolean {
    this.formErrors = {};
    if (!this.createForm.clientId) this.formErrors['clientId'] = 'Please select a client.';
    if (!this.createForm.staffId) this.formErrors['staffId'] = 'Please select a staff member.';
    if (!this.createForm.branchId) this.formErrors['branchId'] = 'Please select a branch.';
    if (!this.createForm.startTime) this.formErrors['startTime'] = 'Please select a start time.';
    if (!this.createForm.services.length) this.formErrors['services'] = 'Please add at least one service.';
    return Object.keys(this.formErrors).length === 0;
  }

  doCreate() {
    this.createError = '';
    if (!this.validateForm()) return;
    this.createBusy = true;
    this.api.create(this.createForm).subscribe({
      next: () => { this.createBusy = false; this.showCreate = false; this.load(); },
      error: (e) => { this.createBusy = false; this.createError = e.error?.message || 'Create failed.'; },
    });
  }

  private queryParamSub: Subscription | null = null;

  ngOnDestroy() {
    if (this.queryParamSub) {
      this.queryParamSub.unsubscribe();
      this.queryParamSub = null;
    }
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
    if (!this.selectedBooking) return false;
    if (this.selectedBooking.status === 'COMPLETED' || this.selectedBooking.status === 'CANCELLED' || this.selectedBooking.status === 'NO_SHOW') return false;
    if (status === 'CHECKED_IN') return this.selectedBooking.status === 'CONFIRMED' || this.selectedBooking.status === 'PENDING';
    if (status === 'COMPLETED') return this.selectedBooking.status === 'CHECKED_IN';
    if (status === 'NO_SHOW') return !['COMPLETED','CANCELLED'].includes(this.selectedBooking.status);
    return true;
  }

  toggleActionMenu() { this.showActionMenu = !this.showActionMenu; }
  closeActionMenu() { this.showActionMenu = false; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showActionMenu) {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-menu-wrapper')) {
        this.showActionMenu = false;
      }
    }
  }

  openAddPayment() {
    this.showAddPayment = true;
    this.addPaymentForm = { amount: this.viewBillData?.due || 0, method: 'CASH' };
    this.addPaymentBusy = false;
    this.addPaymentError = '';
    this.showReschedule = false; this.showCancelForm = false; this.showEditForm = false;
  }
  closeAddPayment() { this.showAddPayment = false; this.addPaymentError = ''; }

  doAddPayment() {
    if (!this.addPaymentForm.amount || !this.selectedBooking) return;
    this.addPaymentBusy = true; this.addPaymentError = '';
    this.api.addPayment(this.selectedBooking.id, this.addPaymentForm).subscribe({
      next: () => { this.addPaymentBusy = false; this.closeAddPayment(); this.closeDetail(); this.load(); },
      error: (e) => { this.addPaymentBusy = false; this.addPaymentError = e.error?.message || 'Payment failed.'; },
    });
  }

  openAddTip() {
    this.showAddTip = true;
    this.addTipAmount = 0;
    this.addTipBusy = false;
    this.addTipError = '';
    this.showReschedule = false; this.showCancelForm = false; this.showEditForm = false;
  }
  closeAddTip() { this.showAddTip = false; this.addTipError = ''; }

  doAddTip() {
    if (!this.addTipAmount || !this.selectedBooking) return;
    this.addTipBusy = true; this.addTipError = '';
    this.api.addPayment(this.selectedBooking.id, { amount: this.addTipAmount, method: 'TIP' }).subscribe({
      next: () => { this.addTipBusy = false; this.closeAddTip(); this.closeDetail(); this.load(); },
      error: (e) => { this.addTipBusy = false; this.addTipError = e.error?.message || 'Tip failed.'; },
    });
  }

  openRescheduleForm(b: BookingListItem) {
    this.showEditForm = false;
    this.showCancelForm = false;
    this.showReschedule = true;
    this.rescheduleBusy = false;
    this.rescheduleError = '';
    this.http.get<any[]>(`${environment.apiUrl}/resources`).subscribe({
      next: (d) => this.resourceList = Array.isArray(d) ? d : [],
    });
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
    const b = this.selectedBooking;
    if (!b) return;
    const payload: Record<string, any> = { startTime: this.rescheduleForm.startTime };
    if (this.rescheduleForm.resourceId !== (b.resourceId || '')) {
      payload.resourceId = this.rescheduleForm.resourceId || null;
    }
    this.api.reschedule(b.id, payload as { startTime: string; resourceId?: string }).subscribe({
      next: () => { this.rescheduleBusy = false; this.closeDetail(); this.load(); },
      error: (e) => { this.rescheduleBusy = false; this.rescheduleError = e.error?.message || 'Reschedule failed.'; },
    });
  }

  openCancelForm() {
    this.showCancelForm = true;
    this.cancelReason = '';
    this.cancelCustomReason = '';
    this.drawerBusy = false;
    this.drawerError = '';
    this.showReschedule = false; this.showEditForm = false; this.showAddPayment = false; this.showAddTip = false;
  }
  closeCancelForm() { this.showCancelForm = false; this.drawerError = ''; }

  doCancel(b: BookingListItem) {
    this.drawerBusy = true; this.drawerError = '';
    const reason = this.cancelCustomReason?.trim() || this.cancelReason || undefined;
    this.api.cancel(b.id, { reason }).subscribe({
      next: () => { this.drawerBusy = false; this.closeDetail(); this.load(); },
      error: (e) => { this.drawerBusy = false; this.drawerError = e.error?.message || 'Cancel failed.'; },
    });
  }

  openEditForm(b: BookingListItem) {
    this.showEditForm = true;
    this.editBusy = false;
    this.drawerError = '';
    this.editForm = { title: b.title || '', notes: b.notes || '' };
    this.showReschedule = false; this.showCancelForm = false; this.showAddPayment = false; this.showAddTip = false;
  }
  closeEditForm() { this.showEditForm = false; this.drawerError = ''; }

  doEdit() {
    if (!this.selectedBooking) return;
    this.editBusy = true; this.drawerError = '';
    this.api.update(this.selectedBooking.id, { title: this.editForm.title, notes: this.editForm.notes } as any).subscribe({
      next: () => { this.editBusy = false; this.closeDetail(); this.load(); },
      error: (e) => { this.editBusy = false; this.drawerError = e.error?.message || 'Update failed.'; },
    });
  }

  doRebook() {
    if (!this.selectedBooking) return;
    this.closeDetail();
    const start = new Date();
    start.setHours(start.getHours() + 1, 0, 0, 0);
    this.showCreate = true;
    this.createBusy = false;
    this.createError = '';
    this.createForm = {
      clientId: this.selectedBooking.clientId || '',
      staffId: this.selectedBooking.staffId || '',
      title: this.selectedBooking.title || 'Rebook',
      startTime: start.toISOString().slice(0, 16),
      branchId: this.selectedBooking.branchId || '',
      notes: this.selectedBooking.notes || '',
      services: (this.selectedBooking.services || []).map(s => ({
        serviceId: s.serviceId || null,
        name: s.name,
        durationMin: s.durationMin,
        price: s.price,
      })),
    };
    const date = new Date(start);
    this.createDate = date.toISOString().slice(0, 10);
    let h = date.getHours();
    this.createAmPm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    this.createHour = h;
    this.createMinute = String(date.getMinutes()).padStart(2, '0');
  }

  printBill() {
    this.closeActionMenu();
    const printContent = document.querySelector('.drawer-panel')?.cloneNode(true) as HTMLElement;
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const styles = Array.from(document.styleSheets).map(sheet => {
      try { return Array.from(sheet.cssRules || []).map(r => r.cssText).join(''); }
      catch(e) { return ''; }
    }).join('');
    win.document.write(`<html><head><title>Bill - ${this.selectedBooking?.client?.fullName || 'Booking'}</title><style>${styles} body{padding:24px} .action-menu-wrapper,.action-menu-trigger,.close-btn,.sw-buttons,.status-workflow,.drawer-actions,.bill-actions{display:none!important}</style></head><body>${printContent.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  }

  viewClientProfile() {
    if (!this.selectedBooking?.clientId) return;
    this.client360ClientId = this.selectedBooking.clientId;
    this.showClient360 = true;
  }

  closeClient360() {
    this.showClient360 = false;
    this.client360ClientId = '';
  }

  private loadViewBillData(b: BookingListItem) {
    this.viewBillLoading = true;
    this.viewBillData = null;
    const svcTotal = (b.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
    const baseData: ViewBillData = {
      booking: b,
      payments: [],
      subtotal: svcTotal,
      discount: 0,
      tax: 0,
      taxRate: 0,
      total: b.totalAmount || svcTotal,
      paid: 0,
      due: b.totalAmount || svcTotal,
      paymentMethod: '',
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
            baseData.due = Math.max(0, baseData.total - paid);
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

  private buildActivityLog(b: BookingListItem): ActivityLogEntry[] {
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
}


