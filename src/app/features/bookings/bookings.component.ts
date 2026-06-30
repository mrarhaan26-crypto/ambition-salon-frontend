import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BookingsService, BookingQueryParams } from './bookings.service';
import type { BookingListItem, BookingFilterState, CreateBookingForm, BookingServiceFormLine, BookingStatus, ClientOption, StaffOption, BranchOption, ServiceOption } from './bookings.models';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <ng-container *ngIf="selectedBooking; else noBooking">
            <div class="drawer-header">
              <div class="drawer-header-info">
                <h2>{{ selectedBooking.title }}</h2>
                <span class="header-subtitle">{{ selectedBooking.client?.fullName || 'Unknown Client' }}</span>
              </div>
              <span class="status-badge drawer-badge" [class]="'badge-' + (selectedBooking.status || '').toLowerCase()">{{ selectedBooking.status }}</span>
              <button class="close-btn" (click)="closeDetail()">&times;</button>
            </div>
            <div class="drawer-body">
              <div class="drawer-section">
                <h3>Date & Time</h3>
                <div class="datetime-block">
                  <span class="dt-date">{{ selectedBooking.startTime | date:'EEEE, MMMM dd, yyyy' }}</span>
                  <span class="dt-time">{{ selectedBooking.startTime | date:'h:mm a' }} — {{ selectedBooking.endTime | date:'h:mm a' }}</span>
                  <span class="dt-duration">{{ getDurationMin(selectedBooking) }} minutes</span>
                </div>
              </div>

              <div class="drawer-section">
                <h3>Staff & Location</h3>
                <div class="info-row"><span>Staff</span><span>{{ selectedBooking.staff?.fullName || 'Unassigned' }}</span></div>
                <div class="info-row" *ngIf="selectedBooking.branch?.name"><span>Branch</span><span>{{ selectedBooking.branch.name }}</span></div>
                <div class="info-row" *ngIf="selectedBooking.resource?.name"><span>Resource</span><span>{{ selectedBooking.resource.name }}</span></div>
              </div>

              <div class="drawer-section" *ngIf="selectedBooking.client">
                <h3>Client</h3>
                <div class="client-card">
                  <div class="client-avatar">{{ (selectedBooking.client.fullName || '?').charAt(0) }}</div>
                  <div class="client-info">
                    <span class="client-name">{{ selectedBooking.client.fullName }}</span>
                    <span class="client-contact" *ngIf="selectedBooking.client.phone">{{ selectedBooking.client.phone }}</span>
                    <span class="client-contact" *ngIf="selectedBooking.client.email">{{ selectedBooking.client.email }}</span>
                    <span class="client-history" *ngIf="clientBookingCount > 0">{{ clientBookingCount }} booking{{ clientBookingCount === 1 ? '' : 's' }} total</span>
                  </div>
                  <a routerLink="/app/clients" class="client-crm-link" title="View in CRM">CRM</a>
                </div>
              </div>

              <div class="drawer-section" *ngIf="selectedBooking.services?.length">
                <h3>Services ({{ selectedBooking.services.length }})</h3>
                <div class="svc-line" *ngFor="let s of selectedBooking.services">
                  <span class="svc-name">{{ s.name }}</span>
                  <span class="svc-meta">{{ s.durationMin }} min</span>
                  <span class="svc-price">{{ s.price | currency }}</span>
                </div>
                <div class="svc-total">
                  <span>Total</span>
                  <span>{{ (selectedBooking.totalAmount || 0) | currency }}</span>
                </div>
              </div>

              <div class="drawer-section" *ngIf="selectedBooking.notes">
                <h3>Notes</h3>
                <p class="notes-text">{{ selectedBooking.notes }}</p>
              </div>

              <div class="drawer-actions" *ngIf="isTerminalStatus(selectedBooking.status); else actionButtons">
                <div class="no-actions">
                  <span class="terminal-msg">{{ selectedBooking.status === 'COMPLETED' ? 'This booking is completed.' : selectedBooking.status === 'CANCELLED' ? 'This booking was cancelled.' : 'This booking was marked as no-show.' }}</span>
                </div>
              </div>
              <ng-template #actionButtons>
                <div class="drawer-actions" *ngIf="!isTerminalStatus(selectedBooking.status)">
                  <ng-container *ngIf="!cancelConfirm; else cancelConfirmBlock">
                    <button *ngIf="canCancel(selectedBooking)" class="btn-danger" (click)="cancelConfirm = true" [disabled]="drawerBusy">Cancel Booking</button>
                    <button *ngIf="selectedBooking.status === 'CONFIRMED'" class="btn-primary" (click)="doStatus(selectedBooking, 'CHECKED_IN')" [disabled]="drawerBusy">Check In</button>
                    <button *ngIf="selectedBooking.status === 'CHECKED_IN'" class="btn-primary" (click)="doStatus(selectedBooking, 'COMPLETED')" [disabled]="drawerBusy">Complete</button>
                  </ng-container>
                  <ng-template #cancelConfirmBlock>
                    <div class="cancel-confirm">
                      <span class="confirm-msg">Cancel this booking?</span>
                      <div class="confirm-btns">
                        <button class="btn-danger" (click)="doCancel(selectedBooking)" [disabled]="drawerBusy">{{ drawerBusy ? 'Cancelling...' : 'Yes, Cancel' }}</button>
                        <button class="btn-secondary" (click)="cancelConfirm = false" [disabled]="drawerBusy">Keep</button>
                      </div>
                    </div>
                  </ng-template>
                </div>
              </ng-template>

              <div class="drawer-loading" *ngIf="drawerBusy && !cancelConfirm"><div class="spinner"></div><span>Updating...</span></div>
              <div class="drawer-error" *ngIf="drawerError">{{ drawerError }}</div>
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
        <div class="create-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>New Booking</h2>
            <button class="close-btn" (click)="closeCreate()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="create-form">
              <label class="form-label">Client *</label>
              <select [(ngModel)]="createForm.clientId" class="form-select" [class.field-error]="formErrors.clientId">
                <option value="">— Select Client —</option>
                <option *ngFor="let c of clients" [value]="c.id">{{ c.fullName }} <ng-container *ngIf="c.phone">— {{ c.phone }}</ng-container></option>
              </select>
              <span class="field-msg" *ngIf="formErrors.clientId">{{ formErrors.clientId }}</span>

              <label class="form-label">Staff *</label>
              <select [(ngModel)]="createForm.staffId" class="form-select" [class.field-error]="formErrors.staffId">
                <option value="">— Select Staff —</option>
                <option *ngFor="let s of staffList" [value]="s.id">{{ s.fullName }} <ng-container *ngIf="s.specialization">— {{ s.specialization }}</ng-container></option>
              </select>
              <span class="field-msg" *ngIf="formErrors.staffId">{{ formErrors.staffId }}</span>

              <label class="form-label">Branch *</label>
              <select [(ngModel)]="createForm.branchId" class="form-select" [class.field-error]="formErrors.branchId">
                <option value="">— Select Branch —</option>
                <option *ngFor="let b of branches" [value]="b.id">{{ b.name }} <ng-container *ngIf="b.city">— {{ b.city }}</ng-container></option>
              </select>
              <span class="field-msg" *ngIf="formErrors.branchId">{{ formErrors.branchId }}</span>

              <label class="form-label">Title</label>
              <input [(ngModel)]="createForm.title" placeholder="e.g. Birthday haircut & style" class="form-input">

              <label class="form-label">Start Time *</label>
              <div class="time-picker-row">
                <input [(ngModel)]="createDate" type="date" class="form-input time-date" (change)="syncTimeToForm()" [class.field-error]="formErrors.startTime">
                <select [(ngModel)]="createHour" class="form-input time-hour" (change)="syncTimeToForm()">
                  <option *ngFor="let h of [1,2,3,4,5,6,7,8,9,10,11,12]" [value]="h">{{ h }}</option>
                </select>
                <select [(ngModel)]="createMinute" class="form-input time-min" (change)="syncTimeToForm()">
                  <option value="00">:00</option>
                  <option value="15">:15</option>
                  <option value="30">:30</option>
                  <option value="45">:45</option>
                </select>
                <select [(ngModel)]="createAmPm" class="form-input time-ampm" (change)="syncTimeToForm()">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
                <span class="time-12-preview" *ngIf="createForm.startTime">{{ createForm.startTime | date:'h:mm a' }}</span>
              </div>
              <span class="field-msg" *ngIf="formErrors.startTime">{{ formErrors.startTime }}</span>

              <label class="form-label">Services *</label>
              <div class="svc-picker">
                <select #svcSelect class="form-select" (change)="addCatalogService(svcSelect.value); svcSelect.value = ''">
                  <option value="">— Add Service from Catalog —</option>
                  <option *ngFor="let sv of catalogServices" [value]="sv.id" [disabled]="isServiceAdded(sv.id)">{{ sv.name }} ({{ sv.durationMin }} min — {{ sv.price | currency }})</option>
                </select>
              </div>
              <div class="create-services" *ngIf="createForm.services.length > 0">
                <div class="svc-card" *ngFor="let s of createForm.services; let i = index">
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

              <label class="form-label">Notes</label>
              <textarea [(ngModel)]="createForm.notes" placeholder="Optional notes for this booking..." class="form-input form-textarea" rows="2"></textarea>

              <div class="drawer-actions">
                <button (click)="closeCreate()">Cancel</button>
                <button class="btn-primary" (click)="doCreate()" [disabled]="createBusy">{{ createBusy ? 'Creating...' : 'Create Booking' }}</button>
              </div>
            </div>
            <div class="drawer-loading" *ngIf="createBusy"><div class="spinner"></div><span>Creating...</span></div>
            <div class="drawer-error" *ngIf="createError">{{ createError }}</div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:20px;max-width:1200px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0;font-size:14px}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white;font-size:14px;white-space:nowrap;transition:opacity .2s}
    .primary:hover{opacity:.85}
    .toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .filter-input{flex:1;min-width:180px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;transition:border-color .2s}
    .filter-input:focus{border-color:#0b0b0b}
    .filter-select{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;background:white;outline:none;cursor:pointer;transition:border-color .2s}
    .filter-select:focus{border-color:#0b0b0b}
    .filter-date{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;transition:border-color .2s}
    .filter-date:focus{border-color:#0b0b0b}
    .clear-btn{border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer;background:white;font-size:13px;transition:all .2s}
    .clear-btn:hover{border-color:#dc2626;color:#dc2626}
    .client-filter-banner{display:flex;align-items:center;gap:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:10px 16px;font-size:14px;color:#1e40af}
    .client-filter-banner strong{font-weight:800}
    .clear-client-filter{border:1px solid #bfdbfe;background:white;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;color:#1e40af;transition:all .2s;margin-left:auto}
    .clear-client-filter:hover{background:#dbeafe}
    .summary{padding:4px 2px}
    .count{font-size:13px;color:#6b7280;font-weight:600}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d;margin:8px 0}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px 24px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .empty-icon{font-size:40px;margin-bottom:12px}
    .empty p{font-size:16px;font-weight:600;margin:0 0 6px}
    .empty-hint{font-size:13px;color:#9ca3af}
    .empty-hint a{color:#0b0b0b;text-decoration:underline;cursor:pointer}
    .bookings-list{display:grid;gap:6px}
    .list-section-label{font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.06em;padding:12px 4px 4px;margin-top:8px;border-top:1px solid #f3f4f6}
    .list-section-label:first-child{border-top:0;margin-top:0}
    .booking-row{display:flex;align-items:center;gap:16px;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:14px 18px;border-left:4px solid #e5e7eb;transition:box-shadow .2s;cursor:pointer}
    .booking-row:hover{box-shadow:0 8px 25px rgba(15,23,42,.08)}
    .booking-row.status-confirmed{border-left-color:#3b82f6}
    .booking-row.status-completed{border-left-color:#16a34a}
    .booking-row.status-pending{border-left-color:#eab308}
    .booking-row.status-cancelled{border-left-color:#dc2626;opacity:.65}
    .booking-row.status-no_show{border-left-color:#6b7280;opacity:.65}
    .booking-row.status-checked_in{border-left-color:#8b5cf6}
    .booking-main{flex:2;display:grid;gap:6px;min-width:0}
    .booking-client strong{display:block;font-size:15px;line-height:1.3}
    .booking-title{font-size:13px;color:#374151;display:block}
    .booking-datetime{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#6b7280}
    .booking-datetime .date{font-weight:600}
    .booking-datetime .time{color:#4b5563}
    .booking-datetime .duration{background:#f3f4f6;padding:1px 8px;border-radius:8px;font-weight:600;color:#374151}
    .booking-services{display:flex;flex-wrap:wrap;gap:4px}
    .svc-tag{font-size:11px;background:#f3f4f6;color:#4b5563;padding:2px 8px;border-radius:8px;font-weight:600}
    .booking-side{flex-shrink:0;text-align:right;display:grid;gap:3px;align-items:end}
    .status-badge{display:inline-block;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.03em}
    .badge-confirmed{background:#dbeafe;color:#1d4ed8}
    .badge-completed{background:#f0fdf4;color:#16a34a}
    .badge-pending{background:#fefce8;color:#a16207}
    .badge-cancelled{background:#fef2f2;color:#dc2626}
    .badge-no_show{background:#f3f4f6;color:#6b7280}
    .badge-checked_in{background:#f3e8ff;color:#7c3aed}
    .staff-name{font-size:12px;color:#6b7280;font-weight:600}
    .branch-name{font-size:11px;color:#9ca3af}
    .amount{font-size:16px;font-weight:800}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    .create-panel{background:white;border-radius:24px;width:min(520px,90%);max-height:90vh;overflow-y:auto;animation:fadeIn .2s ease}
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
    .client-avatar{width:40px;height:40px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0}
    .client-info{flex:1;min-width:0;display:grid;gap:2px}
    .client-name{font-weight:700;font-size:14px;color:#111827}
    .client-contact{font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .client-history{font-size:11px;color:#9ca3af;font-weight:600}
    .client-crm-link{flex-shrink:0;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;text-decoration:none;transition:all .2s}
    .client-crm-link:hover{background:#e5e7eb;border-color:#d1d5db}
    .datetime-block{display:grid;gap:4px;padding:4px 0}
    .datetime-block .dt-date{font-weight:700;font-size:15px}
    .datetime-block .dt-time{font-size:14px;color:#374151}
    .datetime-block .dt-duration{font-size:12px;color:#6b7280;background:#f3f4f6;padding:2px 10px;border-radius:8px;display:inline-block;width:fit-content}
    .svc-line{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
    .svc-name{flex:1;font-weight:600}
    .svc-meta{color:#6b7280;font-size:12px}
    .svc-price{font-weight:800;text-align:right}
    .svc-total{display:flex;justify-content:space-between;padding:10px 0 0;font-weight:800;font-size:14px;border-top:2px solid #e5e7eb;margin-top:4px}
    .notes-text{font-size:14px;color:#374151;margin:0;line-height:1.5;padding:4px 0}
    .drawer-actions{display:flex;gap:10px;flex-wrap:wrap}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px;transition:opacity .2s}
    .drawer-actions button:hover:not(:disabled){opacity:.85}
    .drawer-actions button:disabled{opacity:.4;cursor:not-allowed}
    .btn-primary{background:#0b0b0b;color:white}
    .btn-secondary{background:#f3f4f6;color:#374151}
    .btn-danger{background:#fee2e2;color:#991b1b}
    .cancel-confirm{flex:1;display:grid;gap:8px;padding:12px;background:#fefce8;border:1px solid #fde68a;border-radius:12px;text-align:center}
    .confirm-msg{font-weight:700;font-size:14px;color:#92400e}
    .confirm-btns{display:flex;gap:8px}
    .confirm-btns button{flex:1}
    .no-actions{flex:1;text-align:center;padding:12px;background:#f3f4f6;border-radius:12px}
    .terminal-msg{font-size:13px;color:#6b7280;font-weight:600}
    .empty-drawer{padding:48px 24px;text-align:center;color:#6b7280}
    .empty-drawer button{margin-top:12px}
    .drawer-loading{display:flex;align-items:center;gap:10px;justify-content:center;padding:12px;color:#6b7280;font-size:13px}
    .drawer-error{background:#fef2f2;color:#991b1b;padding:12px;border-radius:12px;font-size:13px;text-align:center}
    .create-form{display:grid;gap:10px}
    .form-label{font-size:13px;font-weight:700;color:#374151;margin:4px 0 0}
    .form-label:first-child{margin-top:0}
    .form-input,.form-select{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;background:white;transition:border-color .2s}
    .form-input:focus,.form-select:focus{border-color:#0b0b0b}
    .field-error{border-color:#dc2626!important}
    .field-msg{font-size:12px;color:#dc2626;margin:-4px 0 0}
    .svc-picker{margin-bottom:4px}
    .create-services{display:grid;gap:6px}
    .svc-card{display:flex;align-items:center;gap:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px}
    .svc-card-info{flex:1;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .svc-card-name{font-weight:700;font-size:14px;flex:1;min-width:80px}
    .svc-card-meta{color:#6b7280;font-size:12px}
    .svc-card-price{font-weight:800;font-size:14px;text-align:right}
    .svc-summary{display:flex;justify-content:space-between;padding:8px 4px 0;font-size:14px;border-top:1px solid #e5e7eb;margin-top:2px}
    .remove-btn{border:0;background:#fee2e2;color:#991b1b;border-radius:8px;width:32px;height:32px;font-weight:900;cursor:pointer;font-size:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:opacity .2s}
    .remove-btn:hover{opacity:.7}
    .time-picker-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    .time-picker-row select.form-input{padding:12px 6px;min-width:52px;text-align:center;font-size:14px;appearance:auto}
    .time-date{flex:1;min-width:140px}
    .time-hour{width:56px}
    .time-min{width:60px}
    .time-ampm{width:68px}
    .time-12-preview{font-size:13px;color:#4b5563;font-weight:600;background:#f3f4f6;padding:6px 10px;border-radius:8px}
    .duration-hint{display:flex;justify-content:space-between;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 12px;font-size:12px;color:#15803d}
    .duration-hint strong{font-weight:800}
    .form-textarea{resize:vertical;font-family:inherit;min-height:50px}
    @media(max-width:900px){.drawer-panel{width:100%}.booking-row{flex-direction:column;align-items:stretch;gap:10px}.booking-side{text-align:left;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.toolbar{flex-direction:column}.toolbar .filter-input{min-width:0}}
  `]
})
export class BookingsComponent {
  private api = inject(BookingsService);
  private route = inject(ActivatedRoute);

  bookings: BookingListItem[] = [];
  filters: BookingFilterState = { search: '', status: '', date: '' };
  loading = true;
  error = '';

  showDetail = false;
  selectedBooking: BookingListItem | null = null;
  drawerBusy = false;
  drawerError = '';
  cancelConfirm = false;
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

    this.route.queryParams.subscribe((params) => {
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
    this.api.getClients().subscribe({ next: (d) => this.clients = d });
    this.api.getStaff().subscribe({ next: (d) => this.staffList = d });
    this.api.getBranches().subscribe({ next: (d) => this.branches = d });
    this.api.getServices().subscribe({ next: (d) => this.catalogServices = d });
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
    this.cancelConfirm = false;
    this.clientBookingCount = 0;
    if (b.client?.id) {
      this.api.getClientBookingCount(b.client.id).subscribe({ next: (c) => this.clientBookingCount = c });
    }
  }

  closeDetail() { this.showDetail = false; }
  closeCreate() { this.showCreate = false; }

  canCancel(b: BookingListItem | null): boolean {
    return !!b && (['PENDING', 'CONFIRMED', 'CHECKED_IN'] as BookingStatus[]).includes(b.status);
  }

  doCancel(b: BookingListItem) {
    this.drawerBusy = true; this.drawerError = '';
    this.api.cancel(b.id).subscribe({
      next: () => { this.drawerBusy = false; this.closeDetail(); this.load(); },
      error: (e) => { this.drawerBusy = false; this.drawerError = e.error?.message || 'Cancel failed.'; },
    });
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
    this.createForm.services.push({ name: svc.name, durationMin: svc.durationMin, price: svc.price });
  }

  isServiceAdded(serviceId: string): boolean {
    const svc = this.catalogServices.find((s) => s.id === serviceId);
    if (!svc) return false;
    return this.createForm.services.some((s) => s.name === svc.name);
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
}
