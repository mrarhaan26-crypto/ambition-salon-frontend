import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter, HostListener, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { BookingEngineService } from './booking-engine.service';
import { BookingsService } from './bookings.service';
import { BookingStatusService, BookingStatus } from './booking-status.service';
import { BookingOperationsService } from './booking-operations.service';
import { CalendarService } from '../calendar/calendar.service';
import type { CalendarResource } from '../calendar/calendar.models';
import type { ClientOption, StaffOption, ServiceOption, BranchOption, BookingListItem, CreateBookingForm } from './bookings.models';
import type {
  BookingDrawerMode, BookingDrawerDraft, BookingDrawerCustomer, BookingDrawerService,
  BookingDrawerProduct, BookingDrawerPackage, BookingDrawerSchedule, BookingStep,
  BookingConflictInfo, BookingFreeSlot, BookingDrawerSummary, BookingCategory,
  BookingStaffResource, BookingResourceItem, AlternativeStaff, CustomerProfile,
  ServiceWithFavorites, RecurringBookingPattern, BookingHistoryEntry, SearchResult,
  BookingSource, TimelineEntry, BookingHeaderInfo, PreferredStaff,
} from './booking-drawer.models';
import { EMPTY_DRAFT, GENDER_OPTIONS, BOOKING_MODES, BOOKING_SOURCES } from './booking-drawer.models';

@Component({
  selector: 'app-booking-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bd-backdrop" *ngIf="visible" (click)="onBackdropClick()"></div>
    <div class="bd-drawer" *ngIf="visible" [class.bd-open]="visible">
      <div class="bd-drawer-inner">
        <div class="bd-header">
          <div class="bd-header-left">
            <h2 class="bd-title">{{ drawerTitle }}</h2>
            <span class="bd-id" *ngIf="draft.bookingNumber">#{{ draft.bookingNumber }}</span>
            <span class="bd-id" *ngIf="!draft.bookingNumber && draft.editBookingId">#{{ draft.editBookingId | slice:0:8 }}</span>
            <span class="bd-badge-status" [style.background]="statusService.getColor(bookingStatus)" [style.color]="'#fff'">{{ statusService.getLabel(bookingStatus) }}</span>
          </div>
          <div class="bd-header-right">
            <div class="bd-source-selector" [class.bd-source-open]="showSourceMenu" (click)="showSourceMenu = !showSourceMenu">
              <span class="bd-source-current">{{ draft.schedule.source | titlecase }}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <div class="bd-source-menu" *ngIf="showSourceMenu">
                <button class="bd-source-option" *ngFor="let src of availableSources" (click)="setSource(src.value); showSourceMenu = false">{{ src.label }}</button>
              </div>
            </div>
            <button class="bd-btn-icon bd-btn-icon-sm" (click)="toggleRightPanel()" title="Toggle info panel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            </button>
            <button class="bd-close" (click)="onCancel()" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="bd-header-meta" *ngIf="draft.schedule.branchName || draft.schedule.staffName">
          <span class="bd-hm-item" *ngIf="draft.schedule.branchName">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {{ draft.schedule.branchName }}
          </span>
          <span class="bd-hm-item" *ngIf="draft.schedule.staffName">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {{ draft.schedule.staffName }}
          </span>
          <span class="bd-hm-item" *ngIf="draft.createdBy">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {{ draft.createdBy }}
          </span>
        </div>

        <div class="bd-stepper">
          <div class="bd-step-item" [class.bd-step-done]="step > 1" [class.bd-step-current]="step === 1" (click)="goToStep(1)">
            <div class="bd-step-circle"><span *ngIf="step > 1">&#10003;</span><span *ngIf="step <= 1">1</span></div>
            <span class="bd-step-label">Customer</span>
          </div>
          <div class="bd-step-line" [class.bd-step-line-done]="step > 1"></div>
          <div class="bd-step-item" [class.bd-step-done]="step > 2" [class.bd-step-current]="step === 2" (click)="goToStep(2)">
            <div class="bd-step-circle"><span *ngIf="step > 2">&#10003;</span><span *ngIf="step <= 2">2</span></div>
            <span class="bd-step-label">Services</span>
          </div>
          <div class="bd-step-line" [class.bd-step-line-done]="step > 2"></div>
          <div class="bd-step-item" [class.bd-step-done]="step > 3" [class.bd-step-current]="step === 3" (click)="goToStep(3)">
            <div class="bd-step-circle"><span *ngIf="step > 3">&#10003;</span><span *ngIf="step <= 3">3</span></div>
            <span class="bd-step-label">Schedule</span>
          </div>
          <div class="bd-step-line" [class.bd-step-line-done]="step > 3"></div>
          <div class="bd-step-item" [class.bd-step-done]="step > 4" [class.bd-step-current]="step === 4" (click)="goToStep(4)">
            <div class="bd-step-circle"><span *ngIf="step > 4">&#10003;</span><span *ngIf="step <= 4">4</span></div>
            <span class="bd-step-label">Summary</span>
          </div>
        </div>

        <div class="bd-body">
          <ng-container [ngSwitch]="step">

            <div class="bd-step-content" *ngSwitchCase="1">
              <div class="bd-section">
                <label class="bd-label">Quick Search</label>
                <div class="bd-search-wrap">
                  <svg class="bd-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input class="bd-input bd-search-input" type="text" [(ngModel)]="globalQuery" (input)="onGlobalSearchInput()" (focus)="globalSearchOpen = true" placeholder="Search customers, bookings..." autocomplete="off">
                  <button class="bd-search-clear" *ngIf="globalQuery" (click)="clearGlobalSearch()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div class="bd-global-search-results" *ngIf="globalSearchOpen && globalQuery.length >= 2 && globalSearchResults.length > 0">
                  <div class="bd-gsr-item" *ngFor="let r of globalSearchResults" (click)="selectGlobalResult(r)">
                    <span class="bd-gsr-type" [class.bd-gsr-customer]="r.type === 'customer'" [class.bd-gsr-booking]="r.type === 'booking'">{{ r.type === 'customer' ? 'C' : 'B' }}</span>
                    <div class="bd-gsr-info">
                      <span class="bd-gsr-label">{{ r.label }}</span>
                      <span class="bd-gsr-sublabel" *ngIf="r.subLabel">{{ r.subLabel }}</span>
                    </div>
                  </div>
                </div>
                <div class="bd-search-empty" *ngIf="globalSearchOpen && globalQuery.length >= 2 && globalSearchResults.length === 0 && !globalSearching">
                  <span>No results found.</span>
                </div>
              </div>
              <div class="bd-section">
                <label class="bd-label">Search Customer</label>
                <div class="bd-search-wrap">
                  <svg class="bd-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input class="bd-input bd-search-input" type="text" [(ngModel)]="customerSearch" (input)="onCustomerSearchInput()" (focus)="onCustomerSearchFocus()" placeholder="Search by name, phone or email..." autocomplete="off">
                  <button class="bd-search-clear" *ngIf="customerSearch" (click)="clearCustomerSearch()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <div class="bd-recent-customers" *ngIf="!customerSearch && recentCustomers.length > 0 && !draft.customer.id">
                  <label class="bd-label-sm">Recent Customers</label>
                  <div class="bd-recent-list">
                    <div class="bd-recent-item" *ngFor="let c of recentCustomers" (click)="selectCustomer(c)">
                      <div class="bd-si-avatar">{{ c.fullName.charAt(0) }}</div>
                      <div class="bd-si-info">
                        <span class="bd-si-name">{{ c.fullName }}</span>
                        <span class="bd-si-phone">{{ c.phone || 'No phone' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="bd-search-results" *ngIf="customerResults.length > 0">
                  <div class="bd-search-item" *ngFor="let c of customerResults" (click)="selectCustomer(c)">
                    <div class="bd-si-avatar">{{ c.fullName.charAt(0) }}</div>
                    <div class="bd-si-info">
                      <span class="bd-si-name">{{ c.fullName }}</span>
                      <span class="bd-si-phone">{{ c.phone || 'No phone' }}</span>
                      <span class="bd-si-email" *ngIf="c.email">{{ c.email }}</span>
                    </div>
                    <svg class="bd-si-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </div>
                <div class="bd-search-empty" *ngIf="customerSearch.length > 1 && customerResults.length === 0 && !searching">
                  <span>No customers found.</span>
                  <button class="bd-btn bd-btn-link" (click)="openNewCustomerForm()">Add new customer</button>
                </div>
              </div>

              <div class="bd-customer-profile" *ngIf="draft.customer.id && !showCustomerEdit">
                <div class="bd-cp-header">
                  <div class="bd-cp-avatar">{{ draft.customer.fullName.charAt(0) }}</div>
                  <div class="bd-cp-info">
                    <span class="bd-cp-name">{{ draft.customer.fullName }}
                      <span class="bd-cp-badge-vip" *ngIf="draft.customer.isVIP">VIP</span>
                    </span>
                    <span class="bd-cp-meta">{{ draft.customer.mobile }}</span>
                    <span class="bd-cp-meta" *ngIf="draft.customer.email">{{ draft.customer.email }}</span>
                  </div>
                  <div class="bd-cp-actions">
                    <button class="bd-btn-icon" (click)="showCustomerEdit = true" title="Edit customer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="bd-btn-icon" (click)="clearCustomerSelection()" title="Change customer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
                <div class="bd-cp-details">
                  <div class="bd-cp-detail-row">
                    <span class="bd-cp-detail-label">Wallet</span>
                    <span class="bd-cp-detail-value">{{ draft.customer.walletBalance | currency:'INR':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="bd-cp-detail-row">
                    <span class="bd-cp-detail-label">Loyalty</span>
                    <span class="bd-cp-detail-value">{{ draft.customer.loyaltyPoints }} pts</span>
                  </div>
                  <div class="bd-cp-detail-row" *ngIf="draft.customer.membershipName">
                    <span class="bd-cp-detail-label">Membership</span>
                    <span class="bd-cp-detail-value">{{ draft.customer.membershipName }}</span>
                  </div>
                  <div class="bd-cp-detail-row">
                    <span class="bd-cp-detail-label">Visits</span>
                    <span class="bd-cp-detail-value">{{ draft.customer.visitCount }}</span>
                  </div>
                  <div class="bd-cp-detail-row">
                    <span class="bd-cp-detail-label">Lifetime</span>
                    <span class="bd-cp-detail-value">{{ draft.customer.lifetimeSpend | currency:'INR':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="bd-cp-detail-row" *ngIf="draft.customer.lastVisit">
                    <span class="bd-cp-detail-label">Last Visit</span>
                    <span class="bd-cp-detail-value">{{ draft.customer.lastVisit | date:'mediumDate' }}</span>
                  </div>
                </div>
                <div class="bd-cp-flags" *ngIf="draft.customer.allergies || draft.customer.preferences">
                  <div class="bd-cp-flag" *ngIf="draft.customer.allergies">
                    <span class="bd-cp-flag-label">Allergies</span>
                    <span class="bd-cp-flag-value">{{ draft.customer.allergies }}</span>
                  </div>
                  <div class="bd-cp-flag" *ngIf="draft.customer.preferences">
                    <span class="bd-cp-flag-label">Preferences</span>
                    <span class="bd-cp-flag-value">{{ draft.customer.preferences }}</span>
                  </div>
                </div>
                <div class="bd-cp-actions-row">
                  <button class="bd-btn bd-btn-outline bd-btn-small" (click)="showCustomerEdit = true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                  <button class="bd-btn bd-btn-outline bd-btn-small" disabled title="Coming soon">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>
                    Merge
                  </button>
                </div>
              </div>

              <div class="bd-customer-history" *ngIf="draft.customer.id && !showCustomerEdit">
                <div class="bd-ch-tabs">
                  <button class="bd-ch-tab" [class.bd-ch-tab-active]="customerHistoryTab === 'visits'" (click)="customerHistoryTab = 'visits'; cdr.markForCheck()">Visit History</button>
                  <button class="bd-ch-tab" [class.bd-ch-tab-active]="customerHistoryTab === 'upcoming'" (click)="customerHistoryTab = 'upcoming'; cdr.markForCheck()">Upcoming</button>
                  <button class="bd-ch-tab" [class.bd-ch-tab-active]="customerHistoryTab === 'cancelled'" (click)="customerHistoryTab = 'cancelled'; cdr.markForCheck()">Cancelled / No-Show</button>
                </div>
                <div class="bd-ch-content">
                  <div *ngIf="customerHistoryLoading" class="bd-ch-loading">Loading...</div>
                  <div *ngIf="!customerHistoryLoading && filteredHistory.length === 0" class="bd-ch-empty">No {{ customerHistoryTab === 'visits' ? 'visit history' : customerHistoryTab === 'upcoming' ? 'upcoming appointments' : 'cancelled/no-show records' }}.</div>
                  <div class="bd-ch-list" *ngIf="!customerHistoryLoading && filteredHistory.length > 0">
                    <div class="bd-ch-item" *ngFor="let h of filteredHistory">
                      <span class="bd-ch-date">{{ h.date }}</span>
                      <span class="bd-ch-time">{{ h.startTime?.slice(11, 16) || h.startTime?.slice(0, 5) || '' }}</span>
                      <span class="bd-ch-service">{{ h.services?.join(', ') || '' }}</span>
                      <span class="bd-ch-status" [style.color]="statusService.getColor(h.status)">{{ statusService.getLabel(h.status) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bd-section-divider" *ngIf="!draft.customer.id || showCustomerEdit">
                <span class="bd-divider-text">{{ showCustomerEdit ? 'Edit Customer Details' : 'Add New Customer' }}</span>
              </div>

              <div class="bd-form" *ngIf="!draft.customer.id || showCustomerEdit">
                <div class="bd-form-row">
                  <div class="bd-form-group bd-form-group-half">
                    <label class="bd-label">Mobile <span class="bd-required">*</span></label>
                    <input class="bd-input" type="tel" [(ngModel)]="draft.customer.mobile" placeholder="+91 9876543210">
                  </div>
                  <div class="bd-form-group bd-form-group-half">
                    <label class="bd-label">Full Name <span class="bd-required">*</span></label>
                    <input class="bd-input" type="text" [(ngModel)]="draft.customer.fullName" placeholder="Enter full name">
                  </div>
                </div>
                <div class="bd-form-row">
                  <div class="bd-form-group bd-form-group-third">
                    <label class="bd-label">Gender</label>
                    <select class="bd-input bd-select" [(ngModel)]="draft.customer.gender">
                      <option value="">Select</option>
                      <option *ngFor="let g of genderOptions" [value]="g">{{ g }}</option>
                    </select>
                  </div>
                  <div class="bd-form-group bd-form-group-third">
                    <label class="bd-label">Date of Birth</label>
                    <input class="bd-input" type="date" [(ngModel)]="draft.customer.dob">
                  </div>
                  <div class="bd-form-group bd-form-group-third">
                    <label class="bd-label">Anniversary</label>
                    <input class="bd-input" type="date" [(ngModel)]="draft.customer.anniversary">
                  </div>
                </div>
                <div class="bd-form-row">
                  <div class="bd-form-group bd-form-group-half">
                    <label class="bd-label">Email</label>
                    <input class="bd-input" type="email" [(ngModel)]="draft.customer.email" placeholder="email@example.com">
                  </div>
                  <div class="bd-form-group bd-form-group-half">
                    <label class="bd-label">Address</label>
                    <input class="bd-input" type="text" [(ngModel)]="draft.customer.address" placeholder="Address">
                  </div>
                </div>
                <div class="bd-form-row bd-form-row-toggles">
                  <label class="bd-toggle">
                    <input type="checkbox" [(ngModel)]="draft.customer.isVIP">
                    <span class="bd-toggle-track"><span class="bd-toggle-thumb"></span></span>
                    <span class="bd-toggle-label">VIP</span>
                  </label>
                  <div class="bd-form-group bd-form-group-half">
                    <label class="bd-label">Membership</label>
                    <select class="bd-input bd-select" [(ngModel)]="draft.customer.membershipId">
                      <option value="">None</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </div>
                  <div class="bd-form-group bd-form-group-small">
                    <label class="bd-label">Loyalty Points</label>
                    <input class="bd-input" type="number" [(ngModel)]="draft.customer.loyaltyPoints">
                  </div>
                </div>
                <div class="bd-form-row">
                  <div class="bd-form-group bd-form-group-half">
                    <label class="bd-label">Allergies</label>
                    <input class="bd-input" type="text" [(ngModel)]="draft.customer.allergies" placeholder="e.g. Latex, fragrance">
                  </div>
                  <div class="bd-form-group bd-form-group-half">
                    <label class="bd-label">Preferences</label>
                    <input class="bd-input" type="text" [(ngModel)]="draft.customer.preferences" placeholder="e.g. Preferred stylist, quiet room">
                  </div>
                </div>
                <div class="bd-form-group">
                  <label class="bd-label">Notes</label>
                  <textarea class="bd-input bd-textarea" [(ngModel)]="draft.customer.notes" rows="2" placeholder="Any notes about this customer..."></textarea>
                </div>
                <div class="bd-form-group">
                  <label class="bd-label">Customer Tags</label>
                  <div class="bd-inline-tools">
                    <input class="bd-input" [(ngModel)]="newCustomerTag" placeholder="VIP bride, sensitive skin, color client..." (keyup.enter)="addCustomerTag()">
                    <button class="bd-btn bd-btn-outline bd-btn-small" type="button" (click)="addCustomerTag()">Add Tag</button>
                  </div>
                  <div class="bd-chip-list" *ngIf="draft.customerTags.length > 0">
                    <span class="bd-chip" *ngFor="let tag of draft.customerTags; let ti = index" [style.border-color]="tag.color">
                      {{ tag.name }}
                      <button type="button" (click)="removeCustomerTag(ti)">&times;</button>
                    </span>
                  </div>
                </div>
              </div>

              <div class="bd-errors" *ngIf="stepErrors.length > 0">
                <div class="bd-error-item" *ngFor="let e of stepErrors">{{ e }}</div>
              </div>
            </div>

            <div class="bd-step-content" *ngSwitchCase="2">
              <div class="bd-section">
                <label class="bd-label">Select Services</label>
                <div class="bd-search-wrap bd-svc-search">
                  <svg class="bd-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input class="bd-input bd-search-input" type="text" [(ngModel)]="serviceSearch" (input)="onServiceSearchInput()" placeholder="Search services..." autocomplete="off">
                </div>
                <div class="bd-category-row">
                  <button class="bd-cat-pill" [class.bd-cat-active]="!selectedCategory" (click)="selectedCategory = ''; filterServices()">All</button>
                  <button class="bd-cat-pill" *ngFor="let cat of categories" [class.bd-cat-active]="selectedCategory === cat.id" (click)="selectedCategory = cat.id; filterServices()">{{ cat.name }}</button>
                </div>
                <div class="bd-service-list">
                  <div class="bd-service-item" *ngFor="let svc of filteredServices" (click)="toggleService(svc)" [class.bd-svc-selected]="isServiceSelected(svc.id)">
                    <button class="bd-fav-btn" (click)="$event.stopPropagation(); toggleFavorite(svc)" [class.bd-fav-active]="svc.isFavorite" title="Toggle favorite">
                      <svg width="12" height="12" viewBox="0 0 24 24" [attr.fill]="svc.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                    <div class="bd-svc-info">
                      <span class="bd-svc-name">{{ svc.name }}</span>
                      <span class="bd-svc-meta">{{ svc.durationMin }} min &middot; {{ svc.price | currency:'INR':'symbol':'1.0-0' }}</span>
                    </div>
                    <div class="bd-svc-check" [class.bd-svc-checked]="isServiceSelected(svc.id)">
                      <svg *ngIf="isServiceSelected(svc.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                </div>
                <div class="bd-service-empty" *ngIf="filteredServices.length === 0">
                  <span>No services found</span>
                </div>
              </div>

              <div class="bd-section" *ngIf="draft.services.length > 0">
                <label class="bd-label">Selected Services ({{ draft.services.length }})</label>
                <div class="bd-svc-selected-list">
                  <div class="bd-svc-selected-row" *ngFor="let s of draft.services; let si = index"
                    draggable="true"
                    (dragstart)="onDragStart(si)"
                    (dragover)="onDragOver($event, si)"
                    (dragend)="onDragEnd()"
                    [class.bd-dragging]="dragIndex === si">
                    <div class="bd-ssr-drag">
                      <button class="bd-drag-btn" (click)="moveServiceUp(si)" [disabled]="si === 0" title="Move up">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button class="bd-drag-btn" (click)="moveServiceDown(si)" [disabled]="si === draft.services.length - 1" title="Move down">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>
                    <div class="bd-svc-color-dot" *ngIf="s.color" [style.background]="s.color"></div>
                    <div class="bd-ssr-info" (click)="toggleServiceOverride(si)">
                      <span class="bd-ssr-name">{{ s.name }}</span>
                      <span class="bd-ssr-duration">{{ s.durationMin }} min</span>
                    </div>
                    <div class="bd-ssr-price">
                      <span class="bd-ssr-amount">{{ s.price | currency:'INR':'symbol':'1.0-0' }}</span>
                      <button class="bd-ssr-act-btn" (click)="duplicateService(si)" title="Duplicate">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      <button class="bd-ssr-remove" (click)="removeService(si)" title="Remove">&times;</button>
                    </div>
                  </div>
                  <div class="bd-svc-override-panel" *ngFor="let s of draft.services; let si = index" [class.bd-override-open]="overrideIndex === si">
                    <div class="bd-override-row">
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Discount</label>
                        <input class="bd-input bd-input-sm" type="number" [(ngModel)]="s.discount" (ngModelChange)="recalcService(si)" min="0" placeholder="0">
                      </div>
                      <div class="bd-form-group bd-form-group-sixth">
                        <label class="bd-label-sm">Type</label>
                        <select class="bd-input bd-select bd-input-sm" [(ngModel)]="s.discountType" (ngModelChange)="recalcService(si)">
                          <option value="percent">%</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </div>
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Tax %</label>
                        <input class="bd-input bd-input-sm" type="number" [(ngModel)]="s.taxRate" (ngModelChange)="recalcService(si)" min="0" max="100" placeholder="0">
                      </div>
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Commission</label>
                        <input class="bd-input bd-input-sm" type="number" [(ngModel)]="s.commission" min="0" placeholder="0">
                      </div>
                      <div class="bd-form-group bd-form-group-sixth">
                        <label class="bd-label-sm">Type</label>
                        <select class="bd-input bd-select bd-input-sm" [(ngModel)]="s.commissionType">
                          <option value="percent">%</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </div>
                    </div>
                    <div class="bd-override-row">
                      <div class="bd-form-group bd-form-group-half">
                        <label class="bd-label-sm">Staff</label>
                        <select class="bd-input bd-select bd-input-sm" [(ngModel)]="s.staffId" (ngModelChange)="onServiceStaffChange(si)">
                          <option value="">Default</option>
                          <option *ngFor="let st of staffOptions" [value]="st.id">{{ st.fullName }}</option>
                        </select>
                      </div>
                      <div class="bd-form-group bd-form-group-half">
                        <label class="bd-label-sm">Multiple Staff</label>
                        <select class="bd-input bd-select bd-input-sm" multiple [(ngModel)]="s.staffIds">
                          <option *ngFor="let st of staffOptions" [value]="st.id">{{ st.fullName }}</option>
                        </select>
                      </div>
                    </div>
                    <div class="bd-override-row">
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Primary Chair</label>
                        <select class="bd-input bd-select bd-input-sm" [(ngModel)]="s.chairId">
                          <option value="">Default</option>
                          <option *ngFor="let ch of chairs" [value]="ch.id">{{ ch.name }}</option>
                        </select>
                      </div>
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Primary Room</label>
                        <select class="bd-input bd-select bd-input-sm" [(ngModel)]="s.roomId">
                          <option value="">Default</option>
                          <option *ngFor="let rm of rooms" [value]="rm.id">{{ rm.name }}</option>
                        </select>
                      </div>
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Cabin</label>
                        <select class="bd-input bd-select bd-input-sm" multiple [(ngModel)]="s.resourceIds">
                          <option *ngFor="let cb of cabins" [value]="cb.id">{{ cb.name }}</option>
                        </select>
                      </div>
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Equipment</label>
                        <select class="bd-input bd-select bd-input-sm" multiple [(ngModel)]="s.equipmentIds">
                          <option *ngFor="let eq of equipment" [value]="eq.id">{{ eq.name }}</option>
                        </select>
                      </div>
                    </div>
                    <div class="bd-override-row">
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Color</label>
                        <input class="bd-input bd-input-sm bd-color-input" type="color" [(ngModel)]="s.color" (ngModelChange)="onServiceColorChange(si)">
                      </div>
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Buffer Before</label>
                        <input class="bd-input bd-input-sm" type="number" [(ngModel)]="s.bufferBefore" (ngModelChange)="onServiceBufferChange(si)" min="0" placeholder="0">
                      </div>
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Buffer After</label>
                        <input class="bd-input bd-input-sm" type="number" [(ngModel)]="s.bufferAfter" (ngModelChange)="onServiceBufferChange(si)" min="0" placeholder="0">
                      </div>
                      <div class="bd-form-group bd-form-group-quarter">
                        <label class="bd-label-sm">Start Time</label>
                        <input class="bd-input bd-input-sm" type="time" [(ngModel)]="s.customStartTime" (ngModelChange)="onServiceCustomTimeChange(si)">
                      </div>
                    </div>
                    <div class="bd-override-row">
                      <div class="bd-form-group">
                        <label class="bd-label-sm">Service Notes</label>
                        <input class="bd-override-notes" type="text" [(ngModel)]="s.notes" placeholder="Notes for this service...">
                      </div>
                    </div>
                  </div>
                </div>
                <div class="bd-svc-totals">
                  <span class="bd-svc-total-label">Total Duration</span>
                  <span class="bd-svc-total-value">{{ totalDuration }} min</span>
                  <span class="bd-svc-total-label">Subtotal</span>
                  <span class="bd-svc-total-value">{{ subtotal | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
              </div>

              <div class="bd-section" *ngIf="draft.products.length > 0">
                <label class="bd-label">Products ({{ draft.products.length }})</label>
                <div class="bd-product-list">
                  <div class="bd-product-row" *ngFor="let p of draft.products; let pi = index">
                    <span class="bd-product-name">{{ p.name }} x{{ p.quantity }}</span>
                    <span class="bd-product-price">{{ p.totalPrice | currency:'INR':'symbol':'1.0-0' }}</span>
                    <button class="bd-ssr-remove" (click)="removeProduct(pi)">&times;</button>
                  </div>
                </div>
              </div>

              <div class="bd-section" *ngIf="draft.packages.length > 0">
                <label class="bd-label">Packages ({{ draft.packages.length }})</label>
                <div class="bd-product-list">
                  <div class="bd-product-row" *ngFor="let p of draft.packages; let pi = index">
                    <span class="bd-product-name">{{ p.name }} x{{ p.quantity }}</span>
                    <span class="bd-product-price">{{ p.totalPrice | currency:'INR':'symbol':'1.0-0' }}</span>
                    <button class="bd-ssr-remove" (click)="removePackage(pi)">&times;</button>
                  </div>
                </div>
              </div>

              <div class="bd-section">
                <label class="bd-label">Assign Staff <span class="bd-required">*</span></label>
                <select class="bd-input bd-select" [(ngModel)]="selectedStaffId" (ngModelChange)="onStaffChange()">
                  <option value="">Select Staff</option>
                  <option *ngFor="let st of staffOptions" [value]="st.id">{{ st.fullName }}{{ st.specialization ? ' - ' + st.specialization : '' }}</option>
                </select>
              </div>

              <div class="bd-section bd-section-inline">
                <div class="bd-form-group bd-form-group-half">
                  <label class="bd-label">Chair</label>
                  <select class="bd-input bd-select" [(ngModel)]="draft.schedule.chairId" (ngModelChange)="onChairChange()">
                    <option value="">Not assigned</option>
                    <option *ngFor="let ch of chairs" [value]="ch.id">{{ ch.name }}</option>
                  </select>
                </div>
                <div class="bd-form-group bd-form-group-half">
                  <label class="bd-label">Room</label>
                  <select class="bd-input bd-select" [(ngModel)]="draft.schedule.roomId" (ngModelChange)="onRoomChange()">
                    <option value="">Not assigned</option>
                    <option *ngFor="let rm of rooms" [value]="rm.id">{{ rm.name }}</option>
                  </select>
                </div>
              </div>

              <div class="bd-section bd-section-inline">
                <div class="bd-form-group bd-form-group-half">
                  <label class="bd-label">Multiple Chairs</label>
                  <select class="bd-input bd-select" multiple [(ngModel)]="selectedChairIds" (ngModelChange)="onMultipleChairChange()">
                    <option *ngFor="let ch of chairs" [value]="ch.id">{{ ch.name }}</option>
                  </select>
                </div>
                <div class="bd-form-group bd-form-group-half">
                  <label class="bd-label">Multiple Rooms</label>
                  <select class="bd-input bd-select" multiple [(ngModel)]="selectedRoomIds" (ngModelChange)="onMultipleRoomChange()">
                    <option *ngFor="let rm of rooms" [value]="rm.id">{{ rm.name }}</option>
                  </select>
                </div>
              </div>

              <div class="bd-section bd-section-inline">
                <div class="bd-form-group bd-form-group-half">
                  <label class="bd-label">Cabin Selection</label>
                  <select class="bd-input bd-select" [(ngModel)]="selectedCabinId" (ngModelChange)="onCabinChange()">
                    <option value="">No cabin</option>
                    <option *ngFor="let cb of cabins" [value]="cb.id">{{ cb.name }}</option>
                  </select>
                </div>
                <div class="bd-form-group bd-form-group-half">
                  <label class="bd-label">Equipment Selection</label>
                  <select class="bd-input bd-select" multiple [(ngModel)]="selectedEquipmentIds" (ngModelChange)="onEquipmentChange()">
                    <option *ngFor="let eq of equipment" [value]="eq.id">{{ eq.name }}</option>
                  </select>
                </div>
              </div>

              <div class="bd-section">
                <div class="bd-form-row">
                  <div class="bd-form-group bd-form-group-third">
                    <label class="bd-label">Discount</label>
                    <input class="bd-input" type="number" [(ngModel)]="globalDiscount" (ngModelChange)="onGlobalDiscountChange()" placeholder="0" min="0">
                  </div>
                  <div class="bd-form-group bd-form-group-third">
                    <label class="bd-label">Type</label>
                    <select class="bd-input bd-select" [(ngModel)]="globalDiscountType" (ngModelChange)="onGlobalDiscountChange()">
                      <option value="percent">Percent</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div class="bd-form-group bd-form-group-third">
                    <label class="bd-label">Tax Rate (%)</label>
                    <input class="bd-input" type="number" [(ngModel)]="globalTaxRate" (ngModelChange)="onGlobalTaxChange()" placeholder="0" min="0" max="100">
                  </div>
                </div>
              </div>

              <div class="bd-section">
                <label class="bd-label">Split Services</label>
                <div class="bd-mini-grid">
                  <div class="bd-mini-card" *ngFor="let segment of draft.splitSegments; let segi = index">
                    <strong>{{ getServiceDraftName(segment.serviceDraftId) }}</strong>
                    <span>{{ segment.startTime || 'Start' }} - {{ segment.endTime || 'End' }}</span>
                    <small>{{ getStaffName(segment.staffId) || 'Unassigned staff' }}</small>
                    <button type="button" class="bd-link-danger" (click)="removeSplitSegment(segi)">Remove</button>
                  </div>
                </div>
                <button class="bd-btn bd-btn-outline bd-btn-small" type="button" (click)="addSplitSegment()" [disabled]="draft.services.length === 0">Add Split Segment</button>
              </div>

              <div class="bd-section">
                <div class="bd-form-row">
                  <button class="bd-btn bd-btn-outline bd-btn-small" (click)="onAddProduct()">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Product
                  </button>
                  <button class="bd-btn bd-btn-outline bd-btn-small" (click)="onAddPackage()">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                    Add Package
                  </button>
                </div>
              </div>

              <div class="bd-errors" *ngIf="stepErrors.length > 0">
                <div class="bd-error-item" *ngFor="let e of stepErrors">{{ e }}</div>
              </div>
            </div>

            <div class="bd-step-content" *ngSwitchCase="3">
              <div class="bd-section">
                <label class="bd-label">Date & Time</label>
                <div class="bd-form-row">
                  <div class="bd-form-group bd-form-group-half">
                    <label class="bd-label-sm">Date <span class="bd-required">*</span></label>
                    <input class="bd-input" type="date" [(ngModel)]="draft.schedule.date" (ngModelChange)="onScheduleChange()">
                  </div>
                  <div class="bd-form-group bd-form-group-quarter">
                    <label class="bd-label-sm">Start <span class="bd-required">*</span></label>
                    <input class="bd-input" type="time" [(ngModel)]="draft.schedule.startTime" (ngModelChange)="onScheduleChange()">
                  </div>
                  <div class="bd-form-group bd-form-group-quarter">
                    <label class="bd-label-sm">End</label>
                    <input class="bd-input" type="time" [(ngModel)]="draft.schedule.endTime" readonly>
                  </div>
                </div>
              </div>

              <div class="bd-section">
                <div class="bd-info-card">
                  <div class="bd-info-row"><span class="bd-info-label">Duration</span><span class="bd-info-value">{{ totalDuration }} min</span></div>
                  <div class="bd-info-row"><span class="bd-info-label">Auto-calculated end</span><span class="bd-info-value bd-info-auto">{{ autoEndTime || 'Set start time' }}</span></div>
                  <div class="bd-info-row" *ngIf="draft.schedule.staffId"><span class="bd-info-label">Staff</span><span class="bd-info-value">{{ getStaffName(draft.schedule.staffId) }}</span></div>
                  <div class="bd-info-row" *ngIf="draft.schedule.chairId"><span class="bd-info-label">Chair</span><span class="bd-info-value">{{ getChairName(draft.schedule.chairId) }}</span></div>
                  <div class="bd-info-row" *ngIf="draft.schedule.roomId"><span class="bd-info-label">Room</span><span class="bd-info-value">{{ getRoomName(draft.schedule.roomId) }}</span></div>
                </div>
              </div>

              <div class="bd-section" *ngIf="conflicts.length > 0">
                <label class="bd-label bd-label-danger">Conflicts Detected</label>
                <div class="bd-conflict-item" *ngFor="let c of conflicts">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{{ c.message }}</span>
                </div>
              </div>

              <div class="bd-section" *ngIf="alternativeStaff.length > 0">
                <label class="bd-label">Alternative Staff</label>
                <div class="bd-alt-staff-list">
                  <div class="bd-alt-staff-item" *ngFor="let alt of alternativeStaff" (click)="selectAlternativeStaff(alt)" [class.bd-alt-disabled]="!alt.available">
                    <div class="bd-alt-avatar">{{ alt.staffName.charAt(0) }}</div>
                    <div class="bd-alt-info">
                      <span class="bd-alt-name">{{ alt.staffName }}</span>
                      <span class="bd-alt-spec">{{ alt.specialization || alt.role || 'Staff' }}</span>
                    </div>
                    <span class="bd-alt-status" [class.bd-alt-avail]="alt.available" [class.bd-alt-busy]="!alt.available">
                      {{ alt.available ? 'Available' : 'Busy' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="bd-section bd-section-slot-actions" *ngIf="draft.schedule.staffId && draft.schedule.date && draft.schedule.startTime">
                <button class="bd-btn bd-btn-outline bd-btn-small" (click)="selectNearestSlotBefore()" [disabled]="!nearestSlotBefore">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Earlier Slot {{ nearestSlotBefore ? '(' + nearestSlotBefore.startTime + ')' : '' }}
                </button>
                <button class="bd-btn bd-btn-outline bd-btn-small" (click)="selectNearestSlotAfter()" [disabled]="!nearestSlotAfter">
                  Later Slot {{ nearestSlotAfter ? '(' + nearestSlotAfter.startTime + ')' : '' }}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              <div class="bd-section" *ngIf="freeSlots.length > 0">
                <label class="bd-label">Free Slot Suggestions</label>
                <div class="bd-slot-list">
                  <div class="bd-slot-item" *ngFor="let s of freeSlots" (click)="selectFreeSlot(s)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>{{ s.startTime }} - {{ s.endTime }}</span>
                  </div>
                </div>
              </div>

              <div class="bd-section" *ngIf="mode === 'repeat' || showRecurring">
                <label class="bd-label">Recurring Booking</label>
                <div class="bd-recurring-row">
                  <div class="bd-form-group bd-form-group-third">
                    <label class="bd-label-sm">Frequency</label>
                    <select class="bd-input bd-select" [(ngModel)]="recurringFrequency" (ngModelChange)="onRecurringChange()">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div class="bd-form-group bd-form-group-third">
                    <label class="bd-label-sm">Interval</label>
                    <input class="bd-input" type="number" [(ngModel)]="recurringInterval" (ngModelChange)="onRecurringChange()" min="1" placeholder="1">
                  </div>
                  <div class="bd-form-group bd-form-group-third">
                    <label class="bd-label-sm">Occurrences</label>
                    <input class="bd-input" type="number" [(ngModel)]="recurringOccurrences" (ngModelChange)="onRecurringChange()" min="1" max="52" placeholder="4">
                  </div>
                </div>
              </div>

              <div class="bd-errors" *ngIf="stepErrors.length > 0">
                <div class="bd-error-item" *ngFor="let e of stepErrors">{{ e }}</div>
              </div>
            </div>

            <div class="bd-step-content" *ngSwitchCase="4">
              <div class="bd-summary-card">
                <h4 class="bd-sc-title">Customer</h4>
                <div class="bd-sc-body">
                  <div class="bd-sc-avatar">{{ (draft.customer.fullName || '?').charAt(0) }}</div>
                  <div class="bd-sc-info">
                    <span class="bd-sc-name">{{ draft.customer.fullName || 'Not selected' }}</span>
                    <span class="bd-sc-meta">{{ draft.customer.mobile || 'No phone' }}</span>
                    <span class="bd-sc-meta" *ngIf="draft.customer.email">{{ draft.customer.email }}</span>
                  </div>
                  <span class="bd-sc-badge" *ngIf="draft.customer.isVIP">VIP</span>
                </div>
              </div>

              <div class="bd-summary-card">
                <h4 class="bd-sc-title">Services ({{ draft.services.length }}) <span class="bd-sc-total-dur">{{ totalDuration }} min</span></h4>
                <div class="bd-sc-row" *ngFor="let s of draft.services">
                  <span class="bd-scr-name">{{ s.name }}</span>
                  <span class="bd-scr-dur">{{ s.durationMin }}m</span>
                  <span class="bd-scr-price">{{ s.price | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="bd-sc-divider"></div>
                <div class="bd-sc-row bd-sc-row-total">
                  <span class="bd-scr-name">Subtotal</span>
                  <span class="bd-scr-price">{{ summary.subtotal | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="bd-sc-row" *ngIf="summary.discountTotal > 0">
                  <span class="bd-scr-name">Discount</span>
                  <span class="bd-scr-price bd-scr-discount">-{{ summary.discountTotal | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="bd-sc-row" *ngIf="summary.taxTotal > 0">
                  <span class="bd-scr-name">Tax</span>
                  <span class="bd-scr-price">{{ summary.taxTotal | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
              </div>

              <div class="bd-summary-card" *ngIf="draft.products.length > 0">
                <h4 class="bd-sc-title">Products</h4>
                <div class="bd-sc-row" *ngFor="let p of draft.products">
                  <span class="bd-scr-name">{{ p.name }} x{{ p.quantity }}</span>
                  <span class="bd-scr-price">{{ p.totalPrice | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
              </div>

              <div class="bd-summary-card" *ngIf="draft.packages.length > 0">
                <h4 class="bd-sc-title">Packages</h4>
                <div class="bd-sc-row" *ngFor="let p of draft.packages">
                  <span class="bd-scr-name">{{ p.name }} x{{ p.quantity }}</span>
                  <span class="bd-scr-price">{{ p.totalPrice | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
              </div>

              <div class="bd-summary-card bd-summary-total">
                <div class="bd-sc-row">
                  <span class="bd-scr-name">Coupon</span>
                  <input class="bd-input bd-input-sm" [(ngModel)]="draft.couponCode" placeholder="Coupon code">
                  <input class="bd-input bd-input-sm" type="number" [(ngModel)]="draft.couponDiscount" min="0" placeholder="Discount">
                </div>
                <div class="bd-sc-row">
                  <span class="bd-scr-name">Gift Card</span>
                  <input class="bd-input bd-input-sm" [(ngModel)]="draft.giftCardCode" placeholder="Gift card code">
                  <input class="bd-input bd-input-sm" type="number" [(ngModel)]="draft.giftCardAmount" min="0" placeholder="Amount">
                </div>
                <div class="bd-sc-row">
                  <span class="bd-scr-name">Wallet</span>
                  <input class="bd-input bd-input-sm" type="number" [(ngModel)]="draft.walletUsed" min="0" [max]="draft.customer.walletBalance" placeholder="Use wallet">
                </div>
                <div class="bd-sc-row">
                  <span class="bd-scr-name">Deposit</span>
                  <input class="bd-input bd-input-sm" type="number" [(ngModel)]="draft.depositAmount" min="0" placeholder="Deposit">
                </div>
                <div class="bd-sc-row bd-sc-row-grand">
                  <span class="bd-scr-name">Grand Total</span>
                  <span class="bd-scr-price bd-scr-grand">{{ summary.grandTotal | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="bd-sc-row">
                  <span class="bd-scr-name">Balance Due</span>
                  <span class="bd-scr-price bd-scr-balance">{{ summary.balanceDue | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="bd-sc-row" *ngIf="draft.customer.walletBalance > 0">
                  <span class="bd-scr-name">Wallet Balance</span>
                  <span class="bd-scr-price">{{ draft.customer.walletBalance | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
              </div>

              <div class="bd-summary-card" *ngIf="draft.notes">
                <h4 class="bd-sc-title">Notes</h4>
                <p class="bd-sc-notes">{{ draft.notes }}</p>
              </div>

              <div class="bd-section" *ngIf="mode === 'edit'">
                <label class="bd-label">Booking Status</label>
                <div class="bd-status-bar">
                  <span class="bd-status-current" [style.background]="statusService.getColor(bookingStatus)" [style.color]="'#fff'">{{ statusService.getLabel(bookingStatus) }}</span>
                  <div class="bd-status-actions">
                    <button class="bd-btn bd-btn-small bd-btn-outline" *ngFor="let t of statusService.getAvailableTransitions(bookingStatus)" (click)="changeBookingStatus(t)" [style.--bd-accent]="statusService.getColor(t)">
                      {{ statusService.getLabel(t) }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="bd-section">
                <label class="bd-label">Booking Notes</label>
                <textarea class="bd-input bd-textarea" [(ngModel)]="draft.notes" rows="3" placeholder="Any additional notes for this booking..."></textarea>
              </div>

              <div class="bd-section">
                <label class="bd-label">Internal Notes</label>
                <textarea class="bd-input bd-textarea" [(ngModel)]="draft.internalNotes" rows="3" placeholder="Private team notes, allergies, service prep, escalation..."></textarea>
              </div>

              <div class="bd-section">
                <label class="bd-label">Attachments / Photos / Documents</label>
                <input class="bd-input" type="file" multiple (change)="onAttachmentSelected($event)">
                <div class="bd-chip-list" *ngIf="draft.attachments.length > 0">
                  <span class="bd-chip" *ngFor="let file of draft.attachments; let fi = index">{{ file.name }} <button type="button" (click)="removeAttachment(fi)">&times;</button></span>
                </div>
              </div>

              <div class="bd-errors" *ngIf="stepErrors.length > 0">
                <div class="bd-error-item" *ngFor="let e of stepErrors">{{ e }}</div>
              </div>
            </div>

          </ng-container>
        </div>

        <!-- Live Price Panel -->
        <div class="bd-live-price" *ngIf="showLivePrice">
          <div class="bd-lp-row">
            <span class="bd-lp-label">Services</span>
            <span class="bd-lp-value">{{ summary.subtotal | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="summary.productsTotal > 0">
            <span class="bd-lp-label">Products</span>
            <span class="bd-lp-value">{{ summary.productsTotal | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="summary.packagesTotal > 0">
            <span class="bd-lp-label">Packages</span>
            <span class="bd-lp-value">{{ summary.packagesTotal | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="summary.membershipDiscount > 0">
            <span class="bd-lp-label">Membership</span>
            <span class="bd-lp-value bd-lp-neg">-{{ summary.membershipDiscount | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="draft.couponCode">
            <span class="bd-lp-label">Coupon ({{ draft.couponCode }})</span>
            <span class="bd-lp-value bd-lp-neg">-{{ summary.couponDiscount | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="summary.manualDiscount > 0">
            <span class="bd-lp-label">Manual Discount</span>
            <span class="bd-lp-value bd-lp-neg">-{{ summary.manualDiscount | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="summary.taxTotal > 0">
            <span class="bd-lp-label">Tax</span>
            <span class="bd-lp-value">{{ summary.taxTotal | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="summary.walletUsed > 0">
            <span class="bd-lp-label">Wallet</span>
            <span class="bd-lp-value bd-lp-neg">-{{ summary.walletUsed | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="summary.giftCardAmount > 0">
            <span class="bd-lp-label">Gift Card</span>
            <span class="bd-lp-value bd-lp-neg">-{{ summary.giftCardAmount | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="summary.advancePaid > 0">
            <span class="bd-lp-label">Advance</span>
            <span class="bd-lp-value bd-lp-neg">-{{ summary.advancePaid | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row" *ngIf="summary.depositAmount > 0">
            <span class="bd-lp-label">Deposit</span>
            <span class="bd-lp-value bd-lp-neg">-{{ summary.depositAmount | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-divider"></div>
          <div class="bd-lp-row bd-lp-grand">
            <span class="bd-lp-label">Grand Total</span>
            <span class="bd-lp-value bd-lp-grand-value">{{ summary.grandTotal | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bd-lp-row bd-lp-balance">
            <span class="bd-lp-label">Balance Due</span>
            <span class="bd-lp-value bd-lp-balance-value">{{ summary.balanceDue | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
        </div>

        <div class="bd-footer">
          <div class="bd-footer-left">
            <button class="bd-btn bd-btn-ghost" (click)="onCancel()">Cancel</button>
          </div>
          <div class="bd-footer-right">
            <button class="bd-btn bd-btn-outline" (click)="onSaveDraft()" *ngIf="step < 4">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save Draft
            </button>
            <button class="bd-btn bd-btn-secondary" (click)="onPrev()" *ngIf="canGoPrev">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Previous
            </button>
            <button class="bd-btn bd-btn-primary" (click)="onNext()" *ngIf="canGoNext && step < 4" [disabled]="!isStepValid">
              Next
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="bd-btn bd-btn-outline" (click)="onReserveSlot()" *ngIf="engine.canShowSaveActions(step, draft) && step === 4" [disabled]="!isStepValid">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Reserve
            </button>
            <button class="bd-btn bd-btn-success" (click)="onConfirmBooking()" *ngIf="step === 4" [disabled]="!isStepValid">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {{ mode === 'edit' ? 'Update' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Right Information Panel -->
      <div class="bd-right-panel" *ngIf="showRightPanel" [class.bd-rp-open]="showRightPanel">
        <div class="bd-rp-header">
          <h3 class="bd-rp-title">Booking Info</h3>
          <button class="bd-close" (click)="toggleRightPanel()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="bd-rp-body">
          <!-- Timeline -->
          <div class="bd-rp-section" *ngIf="timeline.length > 0">
            <h4 class="bd-rp-section-title">Timeline</h4>
            <div class="bd-timeline">
              <div class="bd-tl-entry" *ngFor="let t of timeline" [class.bd-tl-service]="t.type === 'service'" [class.bd-tl-buffer]="t.type === 'buffer'">
                <div class="bd-tl-dot" [style.background]="t.serviceColor || (t.type === 'service' ? 'var(--bd-primary)' : 'var(--bd-gray)')"></div>
                <div class="bd-tl-content">
                  <span class="bd-tl-time">{{ t.time }}</span>
                  <span class="bd-tl-label">{{ t.label }}</span>
                  <span class="bd-tl-dur">{{ t.durationMin }}m</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Customer History -->
          <div class="bd-rp-section" *ngIf="customerHistory.length > 0">
            <h4 class="bd-rp-section-title">Customer History</h4>
            <div class="bd-rp-history-list">
              <div class="bd-rp-history-item" *ngFor="let h of customerHistory.slice(0, 5)">
                <span class="bd-rph-date">{{ h.date }}</span>
                <span class="bd-rph-service">{{ h.services?.join(', ') || '' }}</span>
                <span class="bd-rph-status" [style.color]="statusService.getColor(h.status)">{{ statusService.getLabel(h.status) }}</span>
              </div>
            </div>
          </div>

          <div class="bd-rp-section" *ngIf="draft.previousBills.length > 0">
            <h4 class="bd-rp-section-title">Previous Bills</h4>
            <div class="bd-rp-history-list">
              <div class="bd-rp-history-item" *ngFor="let bill of draft.previousBills">
                <span class="bd-rph-date">{{ bill.date }}</span>
                <span class="bd-rph-service">{{ bill.totalAmount | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="bd-rph-status">{{ bill.status }}</span>
              </div>
            </div>
          </div>

          <div class="bd-rp-section" *ngIf="visitTimeline.length > 0">
            <h4 class="bd-rp-section-title">Visit Timeline</h4>
            <div class="bd-timeline">
              <div class="bd-tl-entry" *ngFor="let item of visitTimeline">
                <div class="bd-tl-dot"></div>
                <div class="bd-tl-content"><span class="bd-tl-time">{{ item.date }}</span><span class="bd-tl-label">{{ item.label }}</span></div>
              </div>
            </div>
          </div>

          <!-- Previous Services -->
          <div class="bd-rp-section" *ngIf="previousServices.length > 0">
            <h4 class="bd-rp-section-title">Previous Services</h4>
            <div class="bd-rp-tags">
              <span class="bd-rp-tag" *ngFor="let svc of previousServices">{{ svc }}</span>
            </div>
          </div>

          <!-- Favourite Staff -->
          <div class="bd-rp-section" *ngIf="favoriteStaff.length > 0">
            <h4 class="bd-rp-section-title">Favourite Staff</h4>
            <div class="bd-rp-staff-list">
              <div class="bd-rp-staff-item" *ngFor="let fs of favoriteStaff">
                <span class="bd-rps-name">{{ fs.staffName }}</span>
                <span class="bd-rps-count">{{ fs.bookingCount }} visits</span>
              </div>
            </div>
          </div>

          <!-- Recent Products -->
          <div class="bd-rp-section" *ngIf="recentProducts.length > 0">
            <h4 class="bd-rp-section-title">Recent Products</h4>
            <div class="bd-rp-tags">
              <span class="bd-rp-tag" *ngFor="let p of recentProducts">{{ p }}</span>
            </div>
          </div>

          <div class="bd-rp-section" *ngIf="draft.recommendations.length > 0 || draft.upsellSuggestions.length > 0 || draft.aiSuggestions.length > 0">
            <h4 class="bd-rp-section-title">Recommendations</h4>
            <div class="bd-mini-grid">
              <button class="bd-suggestion" type="button" *ngFor="let rec of draft.recommendations" (click)="applySuggestion(rec)"><strong>{{ rec.title }}</strong><span>{{ rec.reason }}</span></button>
              <button class="bd-suggestion upsell" type="button" *ngFor="let rec of draft.upsellSuggestions" (click)="applySuggestion(rec)"><strong>{{ rec.title }}</strong><span>{{ rec.reason }}</span></button>
              <button class="bd-suggestion ai" type="button" *ngFor="let rec of draft.aiSuggestions" (click)="applySuggestion(rec)"><strong>{{ rec.title }}</strong><span>{{ rec.reason }}</span></button>
            </div>
          </div>

          <!-- Membership -->
          <div class="bd-rp-section" *ngIf="draft.customer.membershipName">
            <h4 class="bd-rp-section-title">Membership</h4>
            <div class="bd-rp-membership">
              <span class="bd-rpm-name">{{ draft.customer.membershipName }}</span>
              <span class="bd-rpm-points">{{ draft.customer.loyaltyPoints }} pts</span>
            </div>
          </div>

          <!-- Wallet & Loyalty -->
          <div class="bd-rp-section" *ngIf="draft.customer.walletBalance > 0 || draft.customer.loyaltyPoints > 0">
            <h4 class="bd-rp-section-title">Wallet & Loyalty</h4>
            <div class="bd-rp-wallet-row">
              <span>Wallet</span>
              <span class="bd-rp-wallet-value">{{ draft.customer.walletBalance | currency:'INR':'symbol':'1.0-0' }}</span>
            </div>
            <div class="bd-rp-wallet-row">
              <span>Loyalty</span>
              <span class="bd-rp-wallet-value">{{ draft.customer.loyaltyPoints }} pts</span>
            </div>
          </div>

          <!-- Upcoming Appointments -->
          <div class="bd-rp-section" *ngIf="upcomingAppointments.length > 0">
            <h4 class="bd-rp-section-title">Upcoming Appointments</h4>
            <div class="bd-rp-history-list">
              <div class="bd-rp-history-item" *ngFor="let h of upcomingAppointments.slice(0, 3)">
                <span class="bd-rph-date">{{ h.date }}</span>
                <span class="bd-rph-service">{{ h.services?.join(', ') || '' }}</span>
                <span class="bd-rph-status" [style.color]="statusService.getColor(h.status)">{{ statusService.getLabel(h.status) }}</span>
              </div>
              <div class="bd-rp-empty" *ngIf="upcomingAppointments.length === 0">No upcoming appointments</div>
            </div>
          </div>
        </div>
      </div>

      <div class="bd-confirm-overlay" *ngIf="showDiscardConfirm">
        <div class="bd-confirm-dialog">
          <h3 class="bd-confirm-title">Discard Changes?</h3>
          <p class="bd-confirm-text">You have unsaved changes. Are you sure you want to discard them?</p>
          <div class="bd-confirm-actions">
            <button class="bd-btn bd-btn-secondary" (click)="showDiscardConfirm = false">Keep Editing</button>
            <button class="bd-btn bd-btn-danger" (click)="confirmDiscard()">Discard</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { --bd-bg: #F6F8FC; --bd-card: #FFFFFF; --bd-border: #E8EDF5; --bd-radius: 12px; --bd-primary: #4F46E5; --bd-success: #10B981; --bd-danger: #EF4444; --bd-warning: #F59E0B; --bd-gray: #64748B; --bd-text: #0F172A; font-family: 'Inter', -apple-system, sans-serif; }
    .bd-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.25); z-index: 999; animation: bd-fade-in .15s ease; }
    @keyframes bd-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes bd-slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .bd-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--bd-border); flex-shrink: 0; }
    .bd-header-left { display: flex; align-items: center; gap: 10px; }
    .bd-title { margin: 0; font-size: 17px; font-weight: 700; color: var(--bd-text); letter-spacing: -.02em; }
    .bd-id { font-size: 11px; font-weight: 600; color: var(--bd-gray); background: var(--bd-bg); padding: 2px 8px; border-radius: 6px; }
    .bd-badge-mode { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: #EEF2FF; color: var(--bd-primary); text-transform: uppercase; letter-spacing: .03em; }
    .bd-badge-repeat { background: #FEF3C7; color: #D97706; }
    .bd-close { width: 32px; height: 32px; border: none; border-radius: 8px; background: transparent; color: var(--bd-gray); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
    .bd-close:hover { background: var(--bd-bg); color: var(--bd-text); }
    .bd-stepper { display: flex; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--bd-border); background: var(--bd-card); flex-shrink: 0; position: sticky; top: 0; z-index: 5; }
    .bd-step-item { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .bd-step-circle { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; background: var(--bd-bg); color: var(--bd-gray); border: 2px solid var(--bd-border); transition: all .2s; flex-shrink: 0; }
    .bd-step-done .bd-step-circle { background: var(--bd-success); color: #fff; border-color: var(--bd-success); }
    .bd-step-current .bd-step-circle { background: var(--bd-primary); color: #fff; border-color: var(--bd-primary); box-shadow: 0 0 0 3px rgba(79,70,229,.12); }
    .bd-step-label { font-size: 11px; font-weight: 600; color: var(--bd-gray); white-space: nowrap; transition: color .2s; }
    .bd-step-done .bd-step-label, .bd-step-current .bd-step-label { color: var(--bd-text); }
    .bd-step-line { flex: 1; height: 2px; background: var(--bd-border); margin: 0 8px; border-radius: 1px; transition: background .2s; }
    .bd-step-line-done { background: var(--bd-success); }
    .bd-body { flex: 1; overflow-y: auto; padding: 0; }
    .bd-step-content { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 20px; }
    .bd-section { display: flex; flex-direction: column; gap: 8px; }
    .bd-section-inline { flex-direction: row; gap: 12px; }
    .bd-label { font-size: 12px; font-weight: 700; color: var(--bd-text); text-transform: uppercase; letter-spacing: .03em; }
    .bd-label-sm { font-size: 11px; font-weight: 600; color: var(--bd-gray); }
    .bd-label-danger { color: var(--bd-danger); }
    .bd-required { color: var(--bd-danger); }
    .bd-input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid var(--bd-border); border-radius: var(--bd-radius); font-size: 13px; font-family: inherit; color: var(--bd-text); background: var(--bd-card); outline: none; transition: all .15s; box-sizing: border-box; }
    .bd-input:focus { border-color: var(--bd-primary); box-shadow: 0 0 0 3px rgba(79,70,229,.08); }
    .bd-input::placeholder { color: #94A3B8; }
    .bd-input-sm { height: 34px; font-size: 12px; }
    .bd-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2364748B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; cursor: pointer; }
    .bd-textarea { height: auto; padding: 10px 12px; resize: vertical; min-height: 60px; line-height: 1.5; }
    .bd-form { display: flex; flex-direction: column; gap: 12px; }
    .bd-form-row { display: flex; gap: 12px; align-items: flex-end; }
    .bd-form-row-toggles { align-items: flex-end; }
    .bd-form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .bd-form-group-half { flex: 1 1 50%; }
    .bd-form-group-third { flex: 1 1 33%; }
    .bd-form-group-quarter { flex: 1 1 25%; }
    .bd-form-group-small { flex: 0 0 100px; }
    .bd-search-wrap { position: relative; }
    .bd-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
    .bd-search-input { padding-left: 34px; }
    .bd-search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border: none; border-radius: 6px; background: transparent; color: #94A3B8; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .bd-search-clear:hover { background: var(--bd-bg); color: var(--bd-text); }
    .bd-svc-search { margin-bottom: 4px; }
    .bd-recent-customers { display: flex; flex-direction: column; gap: 6px; }
    .bd-recent-list { display: flex; flex-direction: column; border: 1px solid var(--bd-border); border-radius: var(--bd-radius); overflow: hidden; }
    .bd-recent-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; transition: background .1s; border-bottom: 1px solid var(--bd-border); }
    .bd-recent-item:last-child { border-bottom: none; }
    .bd-recent-item:hover { background: var(--bd-bg); }
    .bd-search-results { border: 1px solid var(--bd-border); border-radius: var(--bd-radius); max-height: 200px; overflow-y: auto; margin-top: 4px; box-shadow: 0 4px 12px rgba(15,23,42,.06); }
    .bd-search-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; transition: background .1s; }
    .bd-search-item:hover { background: var(--bd-bg); }
    .bd-si-avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--bd-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .bd-si-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .bd-si-name { font-size: 13px; font-weight: 600; color: var(--bd-text); }
    .bd-si-phone { font-size: 11px; color: var(--bd-gray); }
    .bd-si-email { font-size: 11px; color: var(--bd-gray); }
    .bd-si-check { color: var(--bd-success); flex-shrink: 0; opacity: 0; }
    .bd-search-item:hover .bd-si-check { opacity: 1; }
    .bd-search-empty { padding: 12px; text-align: center; font-size: 12px; color: var(--bd-gray); background: var(--bd-bg); border-radius: var(--bd-radius); margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .bd-btn-link { background: none; border: none; color: var(--bd-primary); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 0; text-decoration: underline; }
    .bd-section-divider { display: flex; align-items: center; gap: 12px; }
    .bd-section-divider::before, .bd-section-divider::after { content: ''; flex: 1; height: 1px; background: var(--bd-border); }
    .bd-divider-text { font-size: 11px; font-weight: 600; color: var(--bd-gray); white-space: nowrap; }
    .bd-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; padding-bottom: 4px; }
    .bd-toggle input { display: none; }
    .bd-toggle-track { width: 36px; height: 20px; border-radius: 10px; background: var(--bd-border); position: relative; transition: background .2s; flex-shrink: 0; }
    .bd-toggle input:checked + .bd-toggle-track { background: var(--bd-primary); }
    .bd-toggle-thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .bd-toggle input:checked + .bd-toggle-track .bd-toggle-thumb { transform: translateX(16px); }
    .bd-toggle-label { font-size: 13px; font-weight: 600; color: var(--bd-text); }
    .bd-customer-profile { background: var(--bd-bg); border-radius: var(--bd-radius); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .bd-cp-header { display: flex; align-items: flex-start; gap: 12px; }
    .bd-cp-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--bd-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
    .bd-cp-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .bd-cp-name { font-size: 15px; font-weight: 700; color: var(--bd-text); display: flex; align-items: center; gap: 8px; }
    .bd-cp-badge-vip { font-size: 9px; font-weight: 700; padding: 1px 8px; border-radius: 10px; background: var(--bd-warning); color: #fff; text-transform: uppercase; letter-spacing: .03em; }
    .bd-cp-meta { font-size: 12px; color: var(--bd-gray); }
    .bd-cp-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .bd-btn-icon { width: 30px; height: 30px; border: 1px solid var(--bd-border); border-radius: 8px; background: var(--bd-card); color: var(--bd-gray); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
    .bd-btn-icon:hover { background: var(--bd-bg); color: var(--bd-text); border-color: #CBD5E1; }
    .bd-cp-details { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .bd-cp-detail-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 12px; }
    .bd-cp-detail-label { color: var(--bd-gray); font-weight: 500; }
    .bd-cp-detail-value { font-weight: 700; color: var(--bd-text); }
    .bd-cp-flags { display: flex; flex-direction: column; gap: 4px; }
    .bd-cp-flag { display: flex; gap: 6px; font-size: 12px; }
    .bd-cp-flag-label { font-weight: 600; color: var(--bd-gray); flex-shrink: 0; }
    .bd-cp-flag-value { color: var(--bd-text); }
    .bd-cp-actions-row { display: flex; gap: 8px; }
    .bd-category-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .bd-cat-pill { height: 30px; padding: 0 14px; border: 1px solid var(--bd-border); border-radius: 20px; background: var(--bd-card); color: var(--bd-gray); font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; white-space: nowrap; font-family: inherit; }
    .bd-cat-pill:hover { border-color: #CBD5E1; color: var(--bd-text); }
    .bd-cat-active { background: #EEF2FF; border-color: var(--bd-primary); color: var(--bd-primary); }
    .bd-fav-btn { width: 22px; height: 22px; border: none; border-radius: 50%; background: transparent; color: #CBD5E1; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; padding: 0; }
    .bd-fav-btn:hover { color: var(--bd-warning); }
    .bd-fav-active { color: var(--bd-warning); }
    .bd-service-list { display: flex; flex-direction: column; border: 1px solid var(--bd-border); border-radius: var(--bd-radius); overflow: hidden; }
    .bd-service-item { display: flex; align-items: center; gap: 8px; padding: 12px 14px; cursor: pointer; transition: background .1s; border-bottom: 1px solid var(--bd-border); }
    .bd-service-item:last-child { border-bottom: none; }
    .bd-service-item:hover { background: var(--bd-bg); }
    .bd-svc-selected { background: #EEF2FF; }
    .bd-svc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .bd-svc-name { font-size: 13px; font-weight: 600; color: var(--bd-text); }
    .bd-svc-meta { font-size: 11px; color: var(--bd-gray); }
    .bd-svc-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--bd-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .2s; }
    .bd-svc-checked { background: var(--bd-primary); border-color: var(--bd-primary); }
    .bd-svc-checked svg { color: #fff; }
    .bd-service-empty { padding: 16px; text-align: center; font-size: 12px; color: var(--bd-gray); }
    .bd-svc-selected-list { border: 1px solid var(--bd-border); border-radius: var(--bd-radius); overflow: hidden; }
    .bd-svc-selected-row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--bd-border); }
    .bd-svc-selected-row:last-child { border-bottom: none; }
    .bd-ssr-drag { display: flex; flex-direction: column; gap: 1px; flex-shrink: 0; }
    .bd-drag-btn { width: 20px; height: 16px; border: none; border-radius: 4px; background: transparent; color: #CBD5E1; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: all .1s; }
    .bd-drag-btn:hover { color: var(--bd-gray); background: var(--bd-bg); }
    .bd-drag-btn:disabled { opacity: 0.3; cursor: default; }
    .bd-ssr-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; cursor: pointer; }
    .bd-ssr-name { font-size: 13px; font-weight: 600; color: var(--bd-text); }
    .bd-ssr-duration { font-size: 11px; color: var(--bd-gray); }
    .bd-ssr-price { display: flex; align-items: center; gap: 4px; }
    .bd-ssr-amount { font-size: 13px; font-weight: 700; color: var(--bd-text); }
    .bd-ssr-act-btn { width: 24px; height: 24px; border: none; border-radius: 6px; background: transparent; color: var(--bd-gray); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
    .bd-ssr-act-btn:hover { background: var(--bd-bg); color: var(--bd-text); }
    .bd-ssr-remove { width: 24px; height: 24px; border: none; border-radius: 6px; background: transparent; color: var(--bd-gray); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all .15s; line-height: 1; }
    .bd-ssr-remove:hover { background: #FEF2F2; color: var(--bd-danger); }
    .bd-svc-override-panel { max-height: 0; overflow: hidden; transition: max-height .2s ease; }
    .bd-override-open { max-height: 120px; }
    .bd-override-row { display: flex; gap: 8px; padding: 8px 14px 8px 48px; border-top: 1px solid var(--bd-border); background: #FAFBFF; }
    .bd-svc-totals { display: flex; gap: 12px; padding: 10px 14px; background: var(--bd-bg); border-radius: var(--bd-radius); align-items: center; }
    .bd-svc-total-label { font-size: 11px; font-weight: 600; color: var(--bd-gray); }
    .bd-svc-total-value { font-size: 13px; font-weight: 700; color: var(--bd-text); margin-right: auto; }
    .bd-product-list { border: 1px solid var(--bd-border); border-radius: var(--bd-radius); overflow: hidden; }
    .bd-product-row { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border-bottom: 1px solid var(--bd-border); font-size: 12px; }
    .bd-product-row:last-child { border-bottom: none; }
    .bd-product-name { flex: 1; font-weight: 500; color: var(--bd-text); }
    .bd-product-price { font-weight: 700; color: var(--bd-text); }
    .bd-info-card { background: var(--bd-bg); border-radius: var(--bd-radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
    .bd-info-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .bd-info-label { color: var(--bd-gray); font-weight: 600; }
    .bd-info-value { font-weight: 700; color: var(--bd-text); }
    .bd-info-auto { color: var(--bd-primary); }
    .bd-conflict-item { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--bd-radius); font-size: 12px; font-weight: 500; color: #991B1B; }
    .bd-conflict-item svg { flex-shrink: 0; margin-top: 1px; color: var(--bd-danger); }
    .bd-alt-staff-list { display: flex; flex-direction: column; gap: 4px; }
    .bd-alt-staff-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bd-bg); border: 1px solid var(--bd-border); border-radius: var(--bd-radius); cursor: pointer; transition: all .15s; }
    .bd-alt-staff-item:hover { border-color: var(--bd-primary); background: #EEF2FF; }
    .bd-alt-disabled { opacity: 0.5; cursor: not-allowed; }
    .bd-alt-disabled:hover { border-color: var(--bd-border); background: var(--bd-bg); }
    .bd-alt-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--bd-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .bd-alt-info { flex: 1; min-width: 0; }
    .bd-alt-name { font-size: 13px; font-weight: 600; color: var(--bd-text); display: block; }
    .bd-alt-spec { font-size: 11px; color: var(--bd-gray); }
    .bd-alt-status { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
    .bd-alt-avail { color: var(--bd-success); }
    .bd-alt-busy { color: var(--bd-danger); }
    .bd-section-slot-actions { display: flex; flex-direction: row; gap: 8px; }
    .bd-slot-list { display: flex; flex-direction: column; gap: 4px; }
    .bd-slot-item { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--bd-bg); border: 1px solid var(--bd-border); border-radius: var(--bd-radius); cursor: pointer; transition: all .15s; font-size: 12px; font-weight: 600; color: var(--bd-text); }
    .bd-slot-item:hover { border-color: var(--bd-primary); background: #EEF2FF; }
    .bd-slot-item svg { color: var(--bd-primary); flex-shrink: 0; }
    .bd-recurring-row { display: flex; gap: 12px; }
    .bd-errors { display: flex; flex-direction: column; gap: 4px; }
    .bd-error-item { padding: 8px 12px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--bd-radius); font-size: 11px; font-weight: 600; color: #991B1B; }
    .bd-summary-card { background: var(--bd-bg); border-radius: var(--bd-radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
    .bd-sc-title { margin: 0; font-size: 12px; font-weight: 700; color: var(--bd-gray); text-transform: uppercase; letter-spacing: .03em; display: flex; align-items: center; gap: 8px; }
    .bd-sc-total-dur { font-weight: 600; color: var(--bd-gray); text-transform: none; letter-spacing: 0; }
    .bd-sc-body { display: flex; align-items: center; gap: 10px; }
    .bd-sc-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--bd-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
    .bd-sc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .bd-sc-name { font-size: 14px; font-weight: 700; color: var(--bd-text); }
    .bd-sc-meta { font-size: 11px; color: var(--bd-gray); }
    .bd-sc-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--bd-warning); color: #fff; text-transform: uppercase; letter-spacing: .03em; }
    .bd-sc-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .bd-scr-name { flex: 1; font-weight: 500; color: var(--bd-text); }
    .bd-scr-dur { width: 36px; text-align: right; color: var(--bd-gray); font-size: 11px; }
    .bd-scr-price { width: 80px; text-align: right; font-weight: 600; color: var(--bd-text); }
    .bd-scr-discount { color: var(--bd-danger); }
    .bd-scr-grand { font-size: 16px; font-weight: 800; color: var(--bd-text); }
    .bd-scr-balance { color: var(--bd-success); font-weight: 800; }
    .bd-sc-divider { height: 1px; background: var(--bd-border); margin: 4px 0; }
    .bd-sc-row-total { border-top: 1px solid var(--bd-border); padding-top: 8px; margin-top: 4px; }
    .bd-summary-total { border: 2px solid var(--bd-primary); }
    .bd-sc-notes { margin: 0; font-size: 12px; color: var(--bd-text); line-height: 1.6; }
    .bd-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; border-top: 1px solid var(--bd-border); background: var(--bd-card); flex-shrink: 0; gap: 8px; }
    .bd-footer-left, .bd-footer-right { display: flex; align-items: center; gap: 8px; }
    .bd-btn { height: 38px; padding: 0 18px; border: 1px solid var(--bd-border); border-radius: 10px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .bd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .bd-btn-ghost { border-color: transparent; background: transparent; color: var(--bd-gray); }
    .bd-btn-ghost:hover { background: var(--bd-bg); color: var(--bd-text); }
    .bd-btn-outline { background: var(--bd-card); color: var(--bd-text); }
    .bd-btn-outline:hover { background: var(--bd-bg); border-color: #CBD5E1; }
    .bd-btn-secondary { background: var(--bd-bg); color: var(--bd-text); border-color: var(--bd-border); }
    .bd-btn-secondary:hover { background: #E2E8F0; }
    .bd-btn-primary { background: var(--bd-primary); color: #fff; border-color: var(--bd-primary); }
    .bd-btn-primary:hover { background: #4338CA; }
    .bd-btn-success { background: var(--bd-success); color: #fff; border-color: var(--bd-success); }
    .bd-btn-success:hover { background: #059669; }
    .bd-btn-danger { background: var(--bd-danger); color: #fff; border-color: var(--bd-danger); }
    .bd-btn-danger:hover { background: #DC2626; }
    .bd-btn-block { width: 100%; justify-content: center; }
    .bd-btn-small { height: 32px; padding: 0 12px; font-size: 12px; }
    .bd-confirm-overlay { position: absolute; inset: 0; background: rgba(15,23,42,0.4); z-index: 10; display: flex; align-items: center; justify-content: center; animation: bd-fade-in .15s ease; }
    .bd-confirm-dialog { background: var(--bd-card); border-radius: 16px; padding: 24px; max-width: 340px; width: 90%; box-shadow: 0 8px 32px rgba(15,23,42,.15); display: flex; flex-direction: column; gap: 12px; }
    .bd-confirm-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--bd-text); }
    .bd-confirm-text { margin: 0; font-size: 13px; color: var(--bd-gray); line-height: 1.5; }
    .bd-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .bd-badge-status { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: .03em; }
    .bd-global-search-results { border: 1px solid var(--bd-border); border-radius: var(--bd-radius); max-height: 240px; overflow-y: auto; box-shadow: 0 4px 12px rgba(15,23,42,.06); }
    .bd-gsr-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background .1s; }
    .bd-gsr-item:hover { background: var(--bd-bg); }
    .bd-gsr-type { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: #fff; flex-shrink: 0; }
    .bd-gsr-customer { background: var(--bd-primary); }
    .bd-gsr-booking { background: var(--bd-success); }
    .bd-gsr-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .bd-gsr-label { font-size: 13px; font-weight: 600; color: var(--bd-text); }
    .bd-gsr-sublabel { font-size: 11px; color: var(--bd-gray); }
    .bd-customer-history { background: var(--bd-bg); border-radius: var(--bd-radius); overflow: hidden; display: flex; flex-direction: column; }
    .bd-ch-tabs { display: flex; border-bottom: 1px solid var(--bd-border); }
    .bd-ch-tab { flex: 1; height: 34px; border: none; background: transparent; color: var(--bd-gray); font-size: 11px; font-weight: 600; cursor: pointer; transition: all .15s; font-family: inherit; position: relative; }
    .bd-ch-tab:hover { color: var(--bd-text); background: #F1F5F9; }
    .bd-ch-tab-active { color: var(--bd-primary); background: #EEF2FF; }
    .bd-ch-tab-active::after { content: ''; position: absolute; bottom: 0; left: 20%; right: 20%; height: 2px; background: var(--bd-primary); border-radius: 1px; }
    .bd-ch-content { padding: 8px 12px; min-height: 60px; max-height: 160px; overflow-y: auto; }
    .bd-ch-loading, .bd-ch-empty { padding: 16px; text-align: center; font-size: 11px; color: var(--bd-gray); }
    .bd-ch-list { display: flex; flex-direction: column; gap: 4px; }
    .bd-ch-item { display: flex; align-items: center; gap: 6px; padding: 6px 0; font-size: 11px; border-bottom: 1px solid var(--bd-border); }
    .bd-ch-item:last-child { border-bottom: none; }
    .bd-ch-date { width: 70px; font-weight: 600; color: var(--bd-text); flex-shrink: 0; }
    .bd-ch-time { width: 40px; color: var(--bd-gray); flex-shrink: 0; }
    .bd-ch-service { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--bd-text); }
    .bd-ch-status { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .02em; flex-shrink: 0; }
    .bd-status-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .bd-status-current { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 10px; text-transform: uppercase; letter-spacing: .03em; }
    .bd-status-actions { display: flex; gap: 4px; flex-wrap: wrap; }
    .bd-status-actions .bd-btn { border-color: var(--bd-border); }
    .bd-status-actions .bd-btn:hover { border-color: var(--bd-accent, var(--bd-primary)); color: var(--bd-accent, var(--bd-primary)); background: #FAFBFF; }

    /* Phase 4: Enterprise UI */
    .bd-header-right { display: flex; align-items: center; gap: 8px; }
    .bd-btn-icon-sm { width: 28px; height: 28px; border-radius: 6px; }
    .bd-source-selector { position: relative; height: 28px; padding: 0 10px; border: 1px solid var(--bd-border); border-radius: 6px; background: var(--bd-bg); display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 11px; font-weight: 600; color: var(--bd-text); transition: all .15s; }
    .bd-source-selector:hover { border-color: #CBD5E1; background: #F1F5F9; }
    .bd-source-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: var(--bd-card); border: 1px solid var(--bd-border); border-radius: 8px; box-shadow: 0 4px 16px rgba(15,23,42,.08); z-index: 20; min-width: 120px; overflow: hidden; }
    .bd-source-option { display: block; width: 100%; padding: 8px 14px; border: none; background: transparent; font-size: 12px; font-weight: 500; color: var(--bd-text); cursor: pointer; text-align: left; font-family: inherit; transition: background .1s; }
    .bd-source-option:hover { background: var(--bd-bg); }
    .bd-header-meta { display: flex; align-items: center; gap: 16px; padding: 8px 24px; border-bottom: 1px solid var(--bd-border); background: var(--bd-bg); flex-shrink: 0; }
    .bd-hm-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--bd-gray); font-weight: 500; }
    .bd-hm-item svg { opacity: .6; flex-shrink: 0; }

    /* Live Price Panel */
    .bd-live-price { border-top: 1px solid var(--bd-border); padding: 10px 24px; background: #FAFBFF; flex-shrink: 0; max-height: 200px; overflow-y: auto; }
    .bd-lp-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 12px; }
    .bd-lp-label { color: var(--bd-gray); font-weight: 500; }
    .bd-lp-value { font-weight: 600; color: var(--bd-text); }
    .bd-lp-neg { color: var(--bd-danger); }
    .bd-lp-divider { height: 1px; background: var(--bd-border); margin: 4px 0; }
    .bd-lp-grand { padding-top: 4px; }
    .bd-lp-grand-value { font-size: 15px; font-weight: 800; color: var(--bd-text); }
    .bd-lp-balance { }
    .bd-lp-balance-value { font-size: 14px; font-weight: 800; color: var(--bd-success); }

    /* Right Panel */
    .bd-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 560px; max-width: 100vw; z-index: 1000; display: flex; flex-direction: row; animation: bd-slide-in .25s cubic-bezier(.22,1,.36,1); }
    .bd-drawer-inner { display: flex; flex-direction: column; width: 100%; min-width: 0; background: var(--bd-card); box-shadow: -4px 0 24px rgba(15,23,42,.08); position: relative; }
    .bd-right-panel { width: 0; overflow: hidden; background: var(--bd-bg); border-left: 1px solid var(--bd-border); transition: width .25s cubic-bezier(.22,1,.36,1); display: flex; flex-direction: column; }
    .bd-rp-open { width: 280px; min-width: 280px; }
    .bd-rp-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--bd-border); flex-shrink: 0; }
    .bd-rp-title { margin: 0; font-size: 13px; font-weight: 700; color: var(--bd-text); }
    .bd-rp-body { flex: 1; overflow-y: auto; padding: 12px 16px 20px; display: flex; flex-direction: column; gap: 16px; }
    .bd-rp-section { display: flex; flex-direction: column; gap: 6px; }
    .bd-rp-section-title { margin: 0; font-size: 10px; font-weight: 700; color: var(--bd-gray); text-transform: uppercase; letter-spacing: .04em; }
    .bd-timeline { display: flex; flex-direction: column; gap: 2px; padding-left: 8px; border-left: 2px solid var(--bd-border); }
    .bd-tl-entry { display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; }
    .bd-tl-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .bd-tl-content { flex: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .bd-tl-time { font-size: 10px; font-weight: 700; color: var(--bd-gray); min-width: 32px; }
    .bd-tl-label { font-size: 11px; font-weight: 600; color: var(--bd-text); flex: 1; }
    .bd-tl-dur { font-size: 10px; font-weight: 600; color: var(--bd-gray); }
    .bd-rp-history-list { display: flex; flex-direction: column; gap: 4px; }
    .bd-rp-history-item { display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 4px 0; border-bottom: 1px solid var(--bd-border); }
    .bd-rp-history-item:last-child { border-bottom: none; }
    .bd-rph-date { width: 60px; font-weight: 600; color: var(--bd-text); flex-shrink: 0; }
    .bd-rph-service { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--bd-text); }
    .bd-rph-status { font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: .02em; flex-shrink: 0; }
    .bd-rp-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .bd-rp-tag { font-size: 10px; font-weight: 600; padding: 3px 8px; background: var(--bd-card); border: 1px solid var(--bd-border); border-radius: 6px; color: var(--bd-text); }
    .bd-rp-staff-list { display: flex; flex-direction: column; gap: 4px; }
    .bd-rp-staff-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 11px; }
    .bd-rps-name { font-weight: 600; color: var(--bd-text); }
    .bd-rps-count { color: var(--bd-gray); font-size: 10px; }
    .bd-rp-membership { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 11px; }
    .bd-rpm-name { font-weight: 600; color: var(--bd-text); }
    .bd-rpm-points { color: var(--bd-primary); font-weight: 700; }
    .bd-rp-wallet-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 11px; }
    .bd-rp-wallet-value { font-weight: 700; color: var(--bd-text); }
    .bd-rp-empty { font-size: 11px; color: var(--bd-gray); padding: 8px 0; text-align: center; }
    .bd-inline-tools { display: flex; gap: 8px; align-items: center; }
    .bd-chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .bd-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 24px; padding: 3px 8px; border: 1px solid var(--bd-border); border-radius: 999px; background: #F8FAFC; color: var(--bd-text); font-size: 11px; font-weight: 700; }
    .bd-chip button { border: 0; background: transparent; color: var(--bd-gray); cursor: pointer; padding: 0; line-height: 1; font-size: 14px; }
    .bd-mini-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 8px; }
    .bd-mini-card { display: flex; flex-direction: column; gap: 3px; padding: 8px; border: 1px solid var(--bd-border); border-radius: 10px; background: #FAFBFF; font-size: 11px; }
    .bd-mini-card strong { color: var(--bd-text); }
    .bd-mini-card small, .bd-mini-card span { color: var(--bd-gray); }
    .bd-link-danger { align-self: flex-start; border: 0; background: transparent; color: var(--bd-danger); font-size: 10px; font-weight: 700; padding: 0; cursor: pointer; }
    .bd-suggestion { display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 8px; border: 1px solid var(--bd-border); border-radius: 10px; background: var(--bd-card); color: var(--bd-text); cursor: pointer; font-family: inherit; }
    .bd-suggestion span { color: var(--bd-gray); font-size: 10px; }
    .bd-suggestion.upsell { border-color: #F59E0B; background: #FFFBEB; }
    .bd-suggestion.ai { border-color: #7C3AED; background: #F5F3FF; }

    /* Drag Reorder */
    .bd-dragging { opacity: .5; background: #EEF2FF; }
    .bd-drag-over { border-top: 2px solid var(--bd-primary) !important; }

    /* Enhanced Service Override */
    .bd-override-open { max-height: 300px; }
    .bd-override-row { display: flex; gap: 8px; padding: 8px 14px 8px 48px; border-top: 1px solid var(--bd-border); background: #FAFBFF; flex-wrap: wrap; }
    .bd-color-input { width: 28px; height: 28px; padding: 0; border: 1px solid var(--bd-border); border-radius: 6px; cursor: pointer; }
    .bd-override-notes { width: 100%; height: 28px; padding: 0 8px; border: 1px solid var(--bd-border); border-radius: 6px; font-size: 11px; font-family: inherit; }

    /* Customer Quick Actions */
    .bd-cp-quick-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
    .bd-cp-quick-btn { height: 28px; padding: 0 6px; border: 1px solid var(--bd-border); border-radius: 6px; background: var(--bd-card); color: var(--bd-gray); font-size: 10px; font-weight: 600; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: center; gap: 4px; font-family: inherit; }
    .bd-cp-quick-btn:hover { border-color: #CBD5E1; color: var(--bd-text); background: var(--bd-bg); }

    /* Enhanced Summary Timeline */
    .bd-sc-timeline { background: var(--bd-bg); border-radius: var(--bd-radius); padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }

    /* Service Color Dot */
    .bd-svc-color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  `],
})
export class BookingDrawerComponent implements OnInit, OnDestroy {
  private engine = inject(BookingEngineService);
  private bookingsService = inject(BookingsService);
  private statusService = inject(BookingStatusService);
  private operationsService = inject(BookingOperationsService);
  private calendarService = inject(CalendarService);
  private cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  @Input() mode: BookingDrawerMode = 'create';
  @Input() defaultDate = '';
  @Input() defaultTime = '';
  @Input() defaultStaffId = '';
  @Input() defaultBranchId = '';
  @Input() editBooking: BookingListItem | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() bookingCreated = new EventEmitter<BookingListItem>();

  step: BookingStep = 1;
  draft: BookingDrawerDraft = this.engine.resetDraft();
  genderOptions = GENDER_OPTIONS;

  customerSearch = '';
  customerResults: ClientOption[] = [];
  recentCustomers: ClientOption[] = [];
  searching = false;
  showCustomerEdit = false;

  serviceSearch = '';
  categories: BookingCategory[] = [];
  allServices: ServiceOption[] = [];
  filteredServices: ServiceOption[] = [];
  serviceFavorites: Set<string> = new Set();
  staffOptions: StaffOption[] = [];
  selectedCategory = '';
  selectedStaffId = '';
  chairs: BookingResourceItem[] = [];
  rooms: BookingResourceItem[] = [];
  cabins: BookingResourceItem[] = [];
  equipment: BookingResourceItem[] = [];
  selectedChairIds: string[] = [];
  selectedRoomIds: string[] = [];
  selectedCabinId = '';
  selectedEquipmentIds: string[] = [];
  newCustomerTag = '';
  globalDiscount = 0;
  globalDiscountType: 'percent' | 'fixed' = 'percent';
  globalTaxRate = 0;
  overrideIndex = -1;

  conflicts: BookingConflictInfo[] = [];
  freeSlots: BookingFreeSlot[] = [];
  alternativeStaff: AlternativeStaff[] = [];
  nearestSlotBefore: BookingFreeSlot | null = null;
  nearestSlotAfter: BookingFreeSlot | null = null;

  stepErrors: string[] = [];
  showDiscardConfirm = false;
  showRecurring = false;
  recurringFrequency = 'weekly';
  recurringInterval = 1;
  recurringOccurrences = 4;

  bookingStatus: BookingStatus = 'PENDING';
  showStatusMenu = false;
  showSourceMenu = false;

  customerHistoryTab: 'visits' | 'upcoming' | 'cancelled' = 'visits';
  customerHistory: BookingHistoryEntry[] = [];
  customerHistoryLoading = false;

  globalQuery = '';
  globalSearchResults: SearchResult[] = [];
  globalSearchOpen = false;
  globalSearching = false;
  private globalSearchSub = new Subject<string>();

  private searchSub = new Subject<string>();
  private subs: Subscription[] = [];

  get drawerTitle(): string {
    switch (this.mode) {
      case 'edit': return 'Edit Booking';
      case 'duplicate': return 'Duplicate Booking';
      case 'walkin': return 'Walk-in Booking';
      case 'repeat': return 'Repeat Booking';
      default: return 'New Booking';
    }
  }

  get canGoNext(): boolean {
    return this.step < 4;
  }

  get canGoPrev(): boolean {
    return this.step > 1;
  }

  get isStepValid(): boolean {
    if (this.step === 4) {
      return this.engine.validateStep1(this.draft.customer).length === 0
        && this.engine.validateStep2(this.draft.services).length === 0
        && this.engine.validateStep3(this.draft.schedule, this.totalDuration).length === 0;
    }
    return this.engine.canGoNext(this.step, this.draft);
  }

  get totalDuration(): number {
    return this.engine.computeTotalDuration(this.draft.services);
  }

  get subtotal(): number {
    return this.engine.computeSubtotal(this.draft.services);
  }

  get summary(): BookingDrawerSummary {
    return this.engine.computeSummary(
      this.draft.services, this.draft.products, this.draft.packages, this.draft.customer,
      this.draft.membershipDiscount, this.draft.couponDiscount, this.draft.manualDiscount,
      this.draft.advancePaid, this.draft.walletUsed, this.draft.giftCardAmount, this.draft.depositAmount,
    );
  }

  get autoEndTime(): string {
    if (!this.draft.schedule.startTime || this.totalDuration === 0) return '';
    return this.engine.computeEndTime(this.draft.schedule.startTime, this.totalDuration);
  }

  get filteredHistory(): BookingHistoryEntry[] {
    return this.customerHistory.filter(h => {
      if (this.customerHistoryTab === 'visits') return h.status === 'COMPLETED';
      if (this.customerHistoryTab === 'upcoming') return ['PENDING', 'CONFIRMED', 'WAITING', 'CHECKED_IN'].includes(h.status);
      if (this.customerHistoryTab === 'cancelled') return ['CANCELLED', 'NO_SHOW'].includes(h.status);
      return true;
    });
  }

  get upcomingAppointments(): BookingHistoryEntry[] {
    return this.customerHistory.filter(h => ['PENDING', 'CONFIRMED', 'WAITING', 'CHECKED_IN'].includes(h.status));
  }

  get visitTimeline(): { date: string; label: string }[] {
    return this.customerHistory.slice(0, 8).map(h => ({
      date: h.date,
      label: `${h.services?.join(', ') || 'Visit'} - ${this.statusService.getLabel(h.status as BookingStatus)}`,
    }));
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.visible) this.onCancel();
  }

  @HostListener('document:keydown.control.s', ['$event'])
  handleCtrlS(event: KeyboardEvent): void {
    if (this.visible) {
      event.preventDefault();
      this.onSaveDraft();
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  handleEnter(event: KeyboardEvent): void {
    if (!this.visible) return;
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.closest('.bd-confirm-dialog')) return;
    event.preventDefault();
    if (this.step < 4) this.onNext();
    else this.onCreate();
  }

  onGlobalSearchInput(): void {
    this.globalSearchSub.next(this.globalQuery);
  }

  clearGlobalSearch(): void {
    this.globalQuery = '';
    this.globalSearchResults = [];
    this.cdr.markForCheck();
  }

  selectGlobalResult(result: SearchResult): void {
    this.globalSearchOpen = false;
    this.globalQuery = '';
    this.globalSearchResults = [];
    if (result.type === 'customer') {
      this.customerSearch = result.label;
      this.selectCustomer({ id: result.id, fullName: result.label, phone: result.sublabel || '', email: '' });
    } else if (result.type === 'booking') {
      // Navigate to edit booking
      this.bookingsService.getById(result.id).subscribe({
        next: (booking) => {
          this.editBooking = booking;
          this.mode = 'edit';
          this.loadEditBooking();
          this.cdr.markForCheck();
        },
        error: () => {},
      });
    }
    this.cdr.markForCheck();
  }

  loadCustomerHistory(clientId: string): void {
    this.customerHistoryLoading = true;
    this.bookingsService.getClientHistory(clientId).subscribe({
      next: (history) => {
        this.customerHistory = history.map(b => ({
          id: b.id,
          date: b.startTime?.slice(0, 10) || '',
          startTime: b.startTime || '',
          endTime: b.endTime || '',
          services: b.services?.map(s => s.name) || [],
          staffName: b.staff?.fullName || '',
          totalAmount: 0,
          status: (b.status as BookingStatus) || 'COMPLETED',
        }));
        this.customerHistoryLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.customerHistoryLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  ngOnInit(): void {
    this.subs.push(
      this.globalSearchSub.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query: string) => {
          if (query.length < 2) return of<SearchResult[]>([]);
          this.globalSearching = true;
          this.cdr.markForCheck();
          return this.bookingsService.globalSearch(query).pipe(
            map((res: { customers: ClientOption[]; bookings: BookingListItem[] }) => {
              const results: SearchResult[] = [];
              res.customers?.forEach(c => results.push({ type: 'customer', id: c.id, label: c.fullName, sublabel: c.phone || '' }));
              res.bookings?.forEach(b => results.push({ type: 'booking', id: b.id, label: b.title || 'Booking', sublabel: b.startTime?.slice(0, 10) || '' }));
              return results;
            }),
            catchError(() => of<SearchResult[]>([])),
          );
        }),
      ).subscribe((results: SearchResult[]) => {
        this.globalSearchResults = results.slice(0, 10);
        this.globalSearching = false;
        this.cdr.markForCheck();
      })
    );

    this.subs.push(
      this.searchSub.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query: string) => {
          if (query.length < 2) return of<ClientOption[]>([]);
          this.searching = true;
          this.cdr.markForCheck();
          return this.bookingsService.getClients().pipe(
            map((clients: ClientOption[]) => clients.filter((c: ClientOption) =>
              c.fullName.toLowerCase().includes(query.toLowerCase()) ||
              (c.phone || '').includes(query)
            )),
            catchError(() => of<ClientOption[]>([])),
          );
        }),
      ).subscribe((results: ClientOption[]) => {
        this.customerResults = results.slice(0, 8);
        this.searching = false;
        this.cdr.markForCheck();
      })
    );

    this.loadServices();
    this.loadStaff();
    this.loadResources();
    this.loadCategories();
    this.loadRecentCustomers();

    if (this.defaultDate) this.draft.schedule.date = this.defaultDate;
    if (this.defaultTime) this.draft.schedule.startTime = this.defaultTime;
    if (this.defaultStaffId) {
      this.selectedStaffId = this.defaultStaffId;
      this.draft.schedule.staffId = this.defaultStaffId;
    }

    if (this.editBooking) {
      this.loadEditBooking();
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.searchSub.complete();
  }

  private loadServices(): void {
    this.bookingsService.getServices().subscribe(services => {
      this.allServices = services;
      this.filterServices();
      this.cdr.markForCheck();
    });
  }

  private loadStaff(): void {
    this.bookingsService.getStaff().subscribe(staff => {
      this.staffOptions = staff;
      this.cdr.markForCheck();
    });
  }

  private loadResources(): void {
    this.calendarService.getResources({ branchId: this.defaultBranchId || undefined }).subscribe({
      next: (resources) => {
        const mapped = resources.map(resource => this.toBookingResource(resource));
        this.chairs = mapped.filter(resource => resource.type === 'chair');
        this.rooms = mapped.filter(resource => resource.type === 'room');
        this.cabins = mapped.filter(resource => resource.type === 'cabin');
        this.equipment = mapped.filter(resource => resource.type === 'equipment');
        this.ensureResourceFallbacks();
        this.cdr.markForCheck();
      },
      error: () => {
        this.ensureResourceFallbacks();
        this.cdr.markForCheck();
      },
    });
  }

  private toBookingResource(resource: CalendarResource): BookingResourceItem {
    const rawType = (resource.type || '').toLowerCase();
    const type: BookingResourceItem['type'] = rawType.includes('room')
      ? 'room'
      : rawType.includes('cabin')
        ? 'cabin'
        : rawType.includes('equipment') || rawType.includes('tool') || rawType.includes('machine')
          ? 'equipment'
          : 'chair';
    return { id: resource.id, name: resource.name, type };
  }

  private ensureResourceFallbacks(): void {
    if (this.chairs.length === 0) {
      this.chairs = [
        { id: 'ch-1', name: 'Chair 1', type: 'chair' },
        { id: 'ch-2', name: 'Chair 2', type: 'chair' },
        { id: 'ch-3', name: 'Chair 3', type: 'chair' },
        { id: 'ch-4', name: 'Chair 4', type: 'chair' },
      ];
    }
    if (this.rooms.length === 0) {
      this.rooms = [
        { id: 'rm-1', name: 'Room 1', type: 'room' },
        { id: 'rm-2', name: 'Room 2', type: 'room' },
        { id: 'rm-3', name: 'Room 3', type: 'room' },
      ];
    }
    if (this.cabins.length === 0) {
      this.cabins = [
        { id: 'cb-1', name: 'Cabin 1', type: 'cabin' },
        { id: 'cb-2', name: 'Cabin 2', type: 'cabin' },
      ];
    }
    if (this.equipment.length === 0) {
      this.equipment = [
        { id: 'eq-1', name: 'Steamer', type: 'equipment' },
        { id: 'eq-2', name: 'Hair Spa Machine', type: 'equipment' },
      ];
    }
  }

  private loadCategories(): void {
    this.categories = [
      { id: 'hair', name: 'Hair', serviceCount: 0 },
      { id: 'skin', name: 'Skin', serviceCount: 0 },
      { id: 'nails', name: 'Nails', serviceCount: 0 },
      { id: 'massage', name: 'Massage', serviceCount: 0 },
      { id: 'makeup', name: 'Makeup', serviceCount: 0 },
      { id: 'grooming', name: 'Grooming', serviceCount: 0 },
    ];
  }

  private loadRecentCustomers(): void {
    this.bookingsService.getClients().subscribe(clients => {
      this.recentCustomers = clients.slice(0, 5);
      this.cdr.markForCheck();
    });
  }

  filterServices(): void {
    let filtered = [...this.allServices];
    if (this.selectedCategory) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(this.selectedCategory.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(this.selectedCategory.toLowerCase())
      );
    }
    if (this.serviceSearch.trim()) {
      const q = this.serviceSearch.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
    }
    this.filteredServices = filtered;
    this.cdr.markForCheck();
  }

  onCustomerSearchInput(): void {
    this.searchSub.next(this.customerSearch);
  }

  onCustomerSearchFocus(): void {
    if (this.customerSearch.length < 2 && this.customerResults.length === 0) {
      this.customerResults = this.recentCustomers;
    }
  }

  clearCustomerSearch(): void {
    this.customerSearch = '';
    this.customerResults = [];
    this.cdr.markForCheck();
  }

  openNewCustomerForm(): void {
    this.showCustomerEdit = true;
    this.customerSearch = '';
    this.customerResults = [];
    this.cdr.markForCheck();
  }

  selectCustomer(client: ClientOption): void {
    this.draft.customer.id = client.id;
    this.draft.customer.fullName = client.fullName;
    this.draft.customer.mobile = client.phone || '';
    this.draft.customer.email = client.email || '';
    this.customerSearch = client.fullName;
    this.customerResults = [];
    this.showCustomerEdit = false;
    this.loadCustomerProfile(client.id);
    this.loadCustomerHistory(client.id);
    this.validateCurrentStep();
    this.cdr.markForCheck();
  }

  private loadCustomerProfile(id: string): void {
    this.bookingsService.getClientDetail(id).subscribe({
      next: (profile) => {
        this.draft.customer.walletBalance = profile.walletBalance || 0;
        this.draft.customer.loyaltyPoints = profile.loyaltyPoints || this.draft.customer.loyaltyPoints;
        this.draft.customer.membershipName = profile.membershipName || '';
        this.draft.customer.membershipId = profile.membershipId || '';
        this.cdr.markForCheck();
      },
      error: () => { },
    });
  }

  clearCustomerSelection(): void {
    this.draft.customer = { ...EMPTY_DRAFT.customer };
    this.customerSearch = '';
    this.showCustomerEdit = true;
    this.cdr.markForCheck();
  }

  toggleService(svc: ServiceOption): void {
    const idx = this.draft.services.findIndex(s => s.serviceId === svc.id);
    if (idx >= 0) {
      this.draft.services.splice(idx, 1);
    } else {
      const cat = this.categories.find(c =>
        svc.name.toLowerCase().includes(c.name.toLowerCase())
      );
      this.draft.services.push({
        id: svc.id,
        serviceId: svc.id,
        name: svc.name,
        categoryId: cat?.id || 'general',
        categoryName: cat?.name || 'General',
        durationMin: svc.durationMin,
        price: svc.price,
        discount: this.globalDiscount,
        discountType: this.globalDiscountType,
        commission: 0,
        commissionType: 'percent',
        color: '',
        tax: 0,
        taxRate: this.globalTaxRate,
        staffId: this.selectedStaffId,
        staffName: this.getStaffName(this.selectedStaffId),
        staffIds: this.selectedStaffId ? [this.selectedStaffId] : [],
        chairId: this.draft.schedule.chairId,
        chairName: this.draft.schedule.chairName,
        roomId: this.draft.schedule.roomId,
        roomName: this.draft.schedule.roomName,
        resourceIds: this.selectedCabinId ? [this.selectedCabinId] : [],
        equipmentIds: [...this.selectedEquipmentIds],
        customStartTime: '',
        customEndTime: '',
        bufferBefore: 0,
        bufferAfter: 0,
        notes: '',
        isFavorite: this.serviceFavorites.has(svc.id),
      });
      this.onScheduleChange();
    }
    this.validateCurrentStep();
    this.cdr.markForCheck();
  }

  isServiceSelected(serviceId: string): boolean {
    return this.draft.services.some(s => s.serviceId === serviceId);
  }

  toggleFavorite(svc: ServiceOption): void {
    if (this.serviceFavorites.has(svc.id)) {
      this.serviceFavorites.delete(svc.id);
    } else {
      this.serviceFavorites.add(svc.id);
    }
    (svc as ServiceWithFavorites).isFavorite = this.serviceFavorites.has(svc.id);
    const selected = this.draft.services.find(s => s.serviceId === svc.id);
    if (selected) selected.isFavorite = this.serviceFavorites.has(svc.id);
    this.cdr.markForCheck();
  }

  onServiceSearchInput(): void {
    this.filterServices();
  }

  moveServiceUp(index: number): void {
    if (index <= 0) return;
    const arr = this.draft.services;
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    this.onScheduleChange();
    this.cdr.markForCheck();
  }

  moveServiceDown(index: number): void {
    if (index >= this.draft.services.length - 1) return;
    const arr = this.draft.services;
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    this.onScheduleChange();
    this.cdr.markForCheck();
  }

  duplicateService(index: number): void {
    const original = this.draft.services[index];
    const dup: BookingDrawerService = { ...original, id: `${original.id}-dup-${Date.now()}` };
    this.draft.services.splice(index + 1, 0, dup);
    this.onScheduleChange();
    this.cdr.markForCheck();
  }

  toggleServiceOverride(index: number): void {
    this.overrideIndex = this.overrideIndex === index ? -1 : index;
    this.cdr.markForCheck();
  }

  recalcService(index: number): void {
    const s = this.draft.services[index];
    if (s.discountType === 'percent') {
      s.discount = Math.min(100, Math.max(0, s.discount));
    } else {
      s.discount = Math.max(0, Math.min(s.price, s.discount));
    }
    s.tax = Math.round(s.price * s.taxRate / 100);
    this.cdr.markForCheck();
  }

  onServiceStaffChange(index: number): void {
    const s = this.draft.services[index];
    s.staffName = this.getStaffName(s.staffId);
    this.cdr.markForCheck();
  }

  removeService(index: number): void {
    this.draft.services.splice(index, 1);
    this.onScheduleChange();
    this.validateCurrentStep();
    this.cdr.markForCheck();
  }

  onStaffChange(): void {
    this.draft.schedule.staffId = this.selectedStaffId;
    this.draft.schedule.staffName = this.getStaffName(this.selectedStaffId);
    this.draft.services.forEach(s => {
      s.staffId = this.selectedStaffId;
      s.staffName = this.draft.schedule.staffName;
      s.staffIds = this.selectedStaffId ? [this.selectedStaffId] : [];
    });
    this.ensureResourceFallbacks();
    this.validateCurrentStep();
    this.cdr.markForCheck();
  }

  onChairChange(): void {
    this.draft.schedule.chairName = this.getChairName(this.draft.schedule.chairId);
    this.draft.services.forEach(s => {
      s.chairId = this.draft.schedule.chairId;
      s.chairName = this.draft.schedule.chairName;
    });
    this.cdr.markForCheck();
  }

  onRoomChange(): void {
    this.draft.schedule.roomName = this.getRoomName(this.draft.schedule.roomId);
    this.draft.services.forEach(s => {
      s.roomId = this.draft.schedule.roomId;
      s.roomName = this.draft.schedule.roomName;
    });
    this.cdr.markForCheck();
  }

  onMultipleChairChange(): void {
    const primaryChairId = this.selectedChairIds[0] || '';
    this.draft.schedule.chairId = primaryChairId;
    this.onChairChange();
  }

  onMultipleRoomChange(): void {
    const primaryRoomId = this.selectedRoomIds[0] || '';
    this.draft.schedule.roomId = primaryRoomId;
    this.onRoomChange();
  }

  onCabinChange(): void {
    this.draft.services.forEach(service => {
      service.resourceIds = this.selectedCabinId ? [this.selectedCabinId] : [];
    });
    this.cdr.markForCheck();
  }

  onEquipmentChange(): void {
    this.draft.services.forEach(service => {
      service.equipmentIds = [...this.selectedEquipmentIds];
    });
    this.cdr.markForCheck();
  }

  addCustomerTag(): void {
    const name = this.newCustomerTag.trim();
    if (!name) return;
    this.draft.customerTags.push({
      id: `tag-${Date.now()}`,
      name,
      color: this.draft.customer.isVIP ? '#f59e0b' : '#2563eb',
    });
    this.newCustomerTag = '';
    this.cdr.markForCheck();
  }

  removeCustomerTag(index: number): void {
    this.draft.customerTags.splice(index, 1);
    this.cdr.markForCheck();
  }

  addSplitSegment(): void {
    const service = this.draft.services[0];
    if (!service) return;
    this.draft.splitSegments.push({
      id: `split-${Date.now()}`,
      serviceDraftId: service.id,
      staffId: service.staffId || this.draft.schedule.staffId,
      resourceId: service.resourceIds?.[0] || service.chairId || service.roomId,
      startTime: service.customStartTime || this.draft.schedule.startTime,
      endTime: service.customEndTime || this.draft.schedule.endTime,
      durationMin: service.durationMin,
    });
    this.cdr.markForCheck();
  }

  removeSplitSegment(index: number): void {
    this.draft.splitSegments.splice(index, 1);
    this.cdr.markForCheck();
  }

  getServiceDraftName(serviceDraftId: string): string {
    return this.draft.services.find(service => service.id === serviceDraftId)?.name || 'Service segment';
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    Array.from(input.files || []).forEach(file => {
      this.draft.attachments.push({
        id: `att-${Date.now()}-${file.name}`,
        name: file.name,
        type: file.type.startsWith('image/') ? 'photo' : 'document',
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      });
    });
    input.value = '';
    this.cdr.markForCheck();
  }

  removeAttachment(index: number): void {
    this.draft.attachments.splice(index, 1);
    this.cdr.markForCheck();
  }

  applySuggestion(suggestion: import('./booking-drawer.models').BookingDrawerSuggestion): void {
    if (suggestion.serviceId) {
      const service = this.allServices.find(item => item.id === suggestion.serviceId);
      if (service && !this.isServiceSelected(service.id)) this.toggleService(service);
    }
    this.cdr.markForCheck();
  }

  onGlobalDiscountChange(): void {
    this.draft.services = this.engine.applyGlobalDiscount(this.draft.services, this.globalDiscount, this.globalDiscountType);
    this.cdr.markForCheck();
  }

  onGlobalTaxChange(): void {
    this.draft.services = this.engine.applyGlobalTax(this.draft.services, this.globalTaxRate);
    this.cdr.markForCheck();
  }

  onAddProduct(): void {
    this.draft.products.push({
      id: `prod-${Date.now()}`,
      name: 'Product',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    });
    this.cdr.markForCheck();
  }

  removeProduct(index: number): void {
    this.draft.products.splice(index, 1);
    this.cdr.markForCheck();
  }

  onAddPackage(): void {
    this.draft.packages.push({
      id: `pkg-${Date.now()}`,
      name: 'Package',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    });
    this.cdr.markForCheck();
  }

  removePackage(index: number): void {
    this.draft.packages.splice(index, 1);
    this.cdr.markForCheck();
  }

  onScheduleChange(): void {
    if (this.draft.schedule.startTime && this.totalDuration > 0) {
      this.draft.schedule.endTime = this.engine.computeEndTime(this.draft.schedule.startTime, this.totalDuration);
    }
    this.loadExistingBookings();
    this.detectConflicts();
    this.suggestSlots();
    this.findAlternativeStaff();
    this.findNearestSlots();
    this.validateCurrentStep();
    this.cdr.markForCheck();
  }

  private loadExistingBookings(): void {
    if (!this.draft.schedule.date) return;
    this.bookingsService.getAll({ startTime: this.draft.schedule.date }).subscribe({
      next: (bookings) => {
        this.existingBookings = bookings.map(b => ({
          id: b.id,
          staffId: b.staffId,
          startTime: b.startTime,
          endTime: b.endTime,
          resourceId: b.resourceId,
          chairId: null,
          roomId: null,
          clientId: b.clientId,
        }));
        this.detectConflicts();
        this.suggestSlots();
        this.findAlternativeStaff();
        this.findNearestSlots();
        this.cdr.markForCheck();
      },
      error: () => { },
    });
  }

  private existingBookings: Array<{ id: string; staffId: string; startTime: string; endTime: string; resourceId?: string | null; chairId?: string | null; roomId?: string | null; clientId?: string }> = [];

  private detectConflicts(): void {
    this.conflicts = this.engine.detectConflicts(this.draft, this.existingBookings);
  }

  private suggestSlots(): void {
    if (this.draft.schedule.date && this.draft.schedule.staffId && this.totalDuration > 0) {
      this.freeSlots = this.engine.suggestFreeSlots(
        this.draft.schedule.date,
        this.draft.schedule.staffId,
        this.totalDuration,
        this.existingBookings,
      );
    } else {
      this.freeSlots = [];
    }
  }

  private findAlternativeStaff(): void {
    if (this.draft.schedule.date && this.draft.schedule.startTime && this.draft.schedule.endTime) {
      const staff = this.staffOptions.map(s => ({
        id: s.id,
        fullName: s.fullName,
        specialization: s.specialization,
        role: '',
      }));
      this.alternativeStaff = this.engine.findAlternativeStaff(
        this.draft.schedule.date,
        this.draft.schedule.startTime,
        this.draft.schedule.endTime,
        staff,
        this.existingBookings,
        this.draft.schedule.staffId,
      );
    } else {
      this.alternativeStaff = [];
    }
  }

  private findNearestSlots(): void {
    this.nearestSlotBefore = null;
    this.nearestSlotAfter = null;
    if (!this.draft.schedule.date || !this.draft.schedule.staffId || !this.draft.schedule.startTime || this.totalDuration <= 0) return;
    this.nearestSlotBefore = this.engine.getNearestFreeSlotBefore(
      this.draft.schedule.date,
      this.draft.schedule.staffId,
      this.draft.schedule.startTime,
      this.totalDuration,
      this.existingBookings,
    );
    this.nearestSlotAfter = this.engine.getNearestFreeSlotAfter(
      this.draft.schedule.date,
      this.draft.schedule.staffId,
      this.draft.schedule.startTime,
      this.totalDuration,
      this.existingBookings,
    );
  }

  selectFreeSlot(slot: BookingFreeSlot): void {
    this.draft.schedule.startTime = slot.startTime;
    this.draft.schedule.endTime = slot.endTime;
    if (slot.staffId) {
      this.draft.schedule.staffId = slot.staffId;
      this.draft.schedule.staffName = slot.staffName;
      this.selectedStaffId = slot.staffId;
    }
    this.detectConflicts();
    this.findAlternativeStaff();
    this.cdr.markForCheck();
  }

  selectAlternativeStaff(alt: AlternativeStaff): void {
    if (!alt.available) return;
    this.selectedStaffId = alt.staffId;
    this.draft.schedule.staffId = alt.staffId;
    this.draft.schedule.staffName = alt.staffName;
    this.draft.services.forEach(s => {
      s.staffId = alt.staffId;
      s.staffName = alt.staffName;
    });
    this.detectConflicts();
    this.findAlternativeStaff();
    this.findNearestSlots();
    this.cdr.markForCheck();
  }

  selectNearestSlotBefore(): void {
    if (!this.nearestSlotBefore) return;
    this.selectFreeSlot(this.nearestSlotBefore);
  }

  selectNearestSlotAfter(): void {
    if (!this.nearestSlotAfter) return;
    this.selectFreeSlot(this.nearestSlotAfter);
  }

  onRecurringChange(): void {
    this.showRecurring = true;
    this.cdr.markForCheck();
  }

  getStaffName(id: string): string {
    return this.staffOptions.find(s => s.id === id)?.fullName || '';
  }

  getChairName(id: string): string {
    return this.chairs.find(c => c.id === id)?.name || '';
  }

  getRoomName(id: string): string {
    return this.rooms.find(r => r.id === id)?.name || '';
  }

  private getCategoryName(id: string): string {
    return this.categories.find(c => c.id === id)?.name || 'General';
  }

  goToStep(step: BookingStep): void {
    if (step <= this.step + 1 || step <= this.step) {
      this.step = step;
      this.overrideIndex = -1;
      this.validateCurrentStep();
      this.cdr.markForCheck();
    }
  }

  onNext(): void {
    this.stepErrors = this.getValidationErrors();
    if (this.stepErrors.length > 0) {
      this.cdr.markForCheck();
      return;
    }
    if (this.step < 4) {
      this.step = (this.step + 1) as BookingStep;
      this.stepErrors = [];
      this.overrideIndex = -1;
      if (this.step === 3) this.onScheduleChange();
      this.cdr.markForCheck();
    }
  }

  onPrev(): void {
    if (this.step > 1) {
      this.step = (this.step - 1) as BookingStep;
      this.stepErrors = [];
      this.overrideIndex = -1;
      this.cdr.markForCheck();
    }
  }

  private getValidationErrors(): string[] {
    switch (this.step) {
      case 1: return this.engine.validateStep1(this.draft.customer);
      case 2: return this.engine.validateStep2(this.draft.services);
      case 3: return this.engine.validateStep3(this.draft.schedule, this.totalDuration);
      case 4: return [];
      default: return [];
    }
  }

  private validateCurrentStep(): void {
    this.stepErrors = this.getValidationErrors();
  }

  onSaveDraft(): void {
    this.engine.saveDraft(this.draft);
  }

  onCancel(): void {
    const saved = this.engine.loadDraft();
    if (this.engine.draftHasUnsavedChanges(this.draft, saved)) {
      this.showDiscardConfirm = true;
    } else {
      this.closeDrawer();
    }
  }

  confirmDiscard(): void {
    this.showDiscardConfirm = false;
    this.closeDrawer();
  }

  private closeDrawer(): void {
    this.engine.clearDraft();
    this.close.emit();
  }

  onBackdropClick(): void {
    this.onCancel();
  }

  onCreate(): void {
    if (!this.draft.schedule.endTime && this.draft.schedule.startTime && this.totalDuration > 0) {
      this.draft.schedule.endTime = this.engine.computeEndTime(this.draft.schedule.startTime, this.totalDuration);
    }
    this.stepErrors = this.getValidationErrors();
    if (this.stepErrors.length > 0) {
      this.cdr.markForCheck();
      return;
    }
    if (!this.draft.customer.id) {
      this.stepErrors.push('Please select or create a customer');
      this.cdr.markForCheck();
      return;
    }
    if (!this.draft.schedule.date || !this.draft.schedule.startTime || !this.draft.schedule.endTime) {
      this.stepErrors.push('Please set a date and time');
      this.cdr.markForCheck();
      return;
    }

    if (this.mode === 'edit' && this.draft.editBookingId) {
      this.operationsService.update(this.draft.editBookingId, this.draft).subscribe({
        next: (result) => {
          this.engine.clearDraft();
          this.bookingCreated.emit(result);
          this.close.emit();
        },
        error: () => {
          this.stepErrors.push('Failed to update booking. Please try again.');
          this.cdr.markForCheck();
        },
      });
    } else {
      if (!this.defaultBranchId) {
        this.stepErrors.push('Branch is required. Please refresh and select a branch.');
        this.cdr.markForCheck();
        return;
      }
      this.operationsService.create(this.draft, this.defaultBranchId).subscribe({
        next: (result) => {
          this.engine.clearDraft();
          this.bookingCreated.emit(result);
          this.close.emit();
        },
        error: (err) => {
          const message = Array.isArray(err?.error?.message)
            ? err.error.message.join(', ')
            : (err?.error?.message || 'Failed to create booking. Please try again.');
          this.stepErrors.push(message);
          this.cdr.markForCheck();
        },
      });
    }
  }

  changeBookingStatus(newStatus: BookingStatus): void {
    if (!this.draft.editBookingId) return;
    if (!this.statusService.canTransition(this.bookingStatus, newStatus)) return;
    this.operationsService.updateStatus(this.draft.editBookingId, newStatus).subscribe({
      next: () => {
        this.bookingStatus = newStatus;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  private loadEditBooking(): void {
    if (!this.editBooking) return;
    this.mode = 'edit';
    this.draft.editBookingId = this.editBooking.id;
    if (this.editBooking.client) {
      this.draft.customer.id = this.editBooking.clientId;
      this.draft.customer.fullName = this.editBooking.client.fullName;
      this.draft.customer.mobile = this.editBooking.client.phone || '';
      this.draft.customer.email = this.editBooking.client.email || '';
    }
    if (this.editBooking.staff) {
      this.selectedStaffId = this.editBooking.staffId;
      this.draft.schedule.staffId = this.editBooking.staffId;
      this.draft.schedule.staffName = this.editBooking.staff.fullName;
    }
    this.draft.schedule.date = this.editBooking.startTime?.slice(0, 10) || '';
    this.draft.schedule.startTime = this.editBooking.startTime?.slice(11, 16) || '';
    this.draft.schedule.endTime = this.editBooking.endTime?.slice(11, 16) || '';
    this.draft.notes = this.editBooking.notes || '';
    if (this.editBooking.services?.length) {
      this.draft.services = this.editBooking.services.map((s, i) => ({
        id: s.id || `edit-svc-${i}`,
        serviceId: s.serviceId || s.id,
        name: s.name,
        categoryId: 'general',
        categoryName: 'General',
        durationMin: s.durationMin,
        price: s.price,
        discount: 0,
        discountType: 'fixed' as const,
        tax: 0,
        taxRate: 0,
        commission: 0,
        commissionType: 'percent',
        color: '',
        staffId: this.draft.schedule.staffId,
        staffName: this.draft.schedule.staffName,
        staffIds: this.draft.schedule.staffId ? [this.draft.schedule.staffId] : [],
        chairId: '',
        chairName: '',
        roomId: '',
        roomName: '',
        resourceIds: [],
        equipmentIds: [],
        customStartTime: '',
        customEndTime: '',
        bufferBefore: 0,
        bufferAfter: 0,
        notes: '',
        isFavorite: false,
      }));
    }
    if (this.editBooking.status) {
      this.bookingStatus = (this.editBooking.status as BookingStatus);
    }
    this.cdr.markForCheck();
  }

  // --- Phase 4: Customer Panel Quick Actions ---

  onEditCustomer(): void {
    this.showCustomerEdit = true;
    this.cdr.markForCheck();
  }

  onOpenProfile(): void {
    this.cdr.markForCheck();
  }

  onViewPackages(): void {
    this.cdr.markForCheck();
  }

  onViewMembership(): void {
    this.cdr.markForCheck();
  }

  onViewWallet(): void {
    this.cdr.markForCheck();
  }

  onViewInvoices(): void {
    this.cdr.markForCheck();
  }

  // --- Phase 4: Service Panel ---

  onServiceBufferChange(index: number): void {
    this.onScheduleChange();
    this.cdr.markForCheck();
  }

  onServiceCustomTimeChange(index: number): void {
    const s = this.draft.services[index];
    if (s.customStartTime && s.customEndTime) {
      // override schedule time range
    }
    this.cdr.markForCheck();
  }

  onServiceColorChange(index: number): void {
    this.cdr.markForCheck();
  }

  // --- Phase 4: Drag Reorder ---

  dragIndex = -1;

  onDragStart(index: number): void {
    this.dragIndex = index;
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.dragIndex === index || this.dragIndex < 0) return;
    const arr = this.draft.services;
    const [moved] = arr.splice(this.dragIndex, 1);
    arr.splice(index, 0, moved);
    this.dragIndex = index;
    this.onScheduleChange();
    this.cdr.markForCheck();
  }

  onDragEnd(): void {
    this.dragIndex = -1;
  }

  // --- Phase 4: Source Selection ---

  availableSources = BOOKING_SOURCES;

  setSource(source: import('./booking-drawer.models').BookingSource): void {
    this.draft.schedule.source = source;
    this.mode = source === 'walkin' ? 'walkin' : source === 'repeat' ? 'repeat' : 'create';
    this.cdr.markForCheck();
  }

  // --- Phase 4: Save Actions ---

  onReserveSlot(): void {
    this.onSaveDraft();
    this.bookingStatus = 'PENDING';
    this.cdr.markForCheck();
  }

  onConfirmBooking(): void {
    this.onCreate();
  }

  onMarkWaiting(): void {
    if (this.draft.editBookingId) {
      this.operationsService.updateStatus(this.draft.editBookingId, 'WAITING').subscribe({
        next: () => { this.bookingStatus = 'WAITING'; this.cdr.markForCheck(); },
        error: () => {},
      });
    }
  }

  onDuplicateBooking(): void {
    this.mode = 'duplicate';
    this.draft.editBookingId = null;
    this.bookingStatus = 'PENDING';
    this.step = 4;
    this.cdr.markForCheck();
  }

  onRepeatBooking(): void {
    this.mode = 'repeat';
    this.showRecurring = true;
    this.step = 4;
    this.cdr.markForCheck();
  }

  // --- Phase 4: Live Price Panel ---

  get timeline(): import('./booking-drawer.models').TimelineEntry[] {
    if (!this.draft.schedule.startTime) return [];
    return this.engine.generateTimeline(this.draft.services, this.draft.schedule.startTime);
  }

  get totalDurationWithBuffers(): number {
    return this.engine.computeTotalDurationWithBuffers(this.draft.services);
  }

  get showLivePrice(): boolean {
    return this.draft.services.length > 0 || this.draft.products.length > 0 || this.draft.packages.length > 0;
  }

  onMembershipDiscountChange(): void {
    this.cdr.markForCheck();
  }

  onCouponChange(): void {
    this.cdr.markForCheck();
  }

  onManualDiscountChange(): void {
    this.cdr.markForCheck();
  }

  onAdvanceChange(): void {
    this.cdr.markForCheck();
  }

  onWalletUsedChange(): void {
    this.cdr.markForCheck();
  }

  // --- Phase 4: Right Information Panel ---

  showRightPanel = false;

  toggleRightPanel(): void {
    this.showRightPanel = !this.showRightPanel;
    this.cdr.markForCheck();
  }

  get bookingHeaderInfo(): import('./booking-drawer.models').BookingHeaderInfo {
    return {
      bookingNumber: this.draft.bookingNumber || `BK-${Date.now().toString(36).toUpperCase()}`,
      status: this.bookingStatus,
      createdBy: this.draft.createdBy || 'Current User',
      createdTime: this.draft.createdTime || new Date().toISOString(),
      branchName: this.draft.schedule.branchName || 'Main Branch',
      source: this.draft.schedule.source,
      staffName: this.draft.schedule.staffName || 'Unassigned',
    };
  }

  get previousServices(): string[] {
    const set = new Set<string>();
    this.customerHistory.filter(h => h.status === 'COMPLETED').forEach(h => h.services?.forEach(s => set.add(s)));
    return Array.from(set).slice(0, 5);
  }

  get favoriteStaff(): import('./booking-drawer.models').PreferredStaff[] {
    const staffCount = new Map<string, { name: string; count: number; lastService: string }>();
    this.customerHistory.filter(h => h.status === 'COMPLETED').forEach(h => {
      if (!h.staffName) return;
      const existing = staffCount.get(h.staffName) || { name: h.staffName, count: 0, lastService: '' };
      existing.count++;
      existing.lastService = h.services?.join(', ') || '';
      staffCount.set(h.staffName, existing);
    });
    return Array.from(staffCount.entries())
      .map(([name, data]) => ({
        staffId: '', staffName: name, specialization: '', bookingCount: data.count, lastService: data.lastService,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 3);
  }

  get recentProducts(): string[] {
    return this.draft.products.map(p => p.name).slice(0, 5);
  }
}
