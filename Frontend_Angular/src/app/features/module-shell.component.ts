import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { DashboardService } from './dashboard.service';
import { GlobalSearchService } from './global-search/global-search.service';
import { GlobalSearchResult } from './global-search/global-search.models';
import {
  toDateStr, computeGreeting, computeTrend, computeBusinessHealth,
  computeDailyTarget, computeStaffBookingCount, computeStaffCompletedCount,
  computeStaffRevenue, filterToday, filterYesterday
} from './dashboard.utils';

@Component({
  selector: 'app-module-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <ng-container *ngIf="title === 'home'; else modulePage">
      <!-- Loading Skeleton -->
      <div class="loading" *ngIf="loading" role="status" aria-live="polite">
        <div class="skeleton-grid">
          <div class="skeleton-card" *ngFor="let _ of [1,2,3,4,5,6]"><div class="sk-shimmer"></div></div>
        </div>
        <div class="skeleton-panel"><div class="sk-shimmer"></div></div>
        <div class="skeleton-panel"><div class="sk-shimmer"></div></div>
        <span class="loading-text">Loading your command center...</span>
      </div>

      <!-- Error Banner -->
      <div class="error" *ngIf="error" role="alert">
        <strong>Unable to load dashboard</strong>
        <p>{{ error }}</p>
        <button class="retry-btn" (click)="loadDashboard()">Retry</button>
      </div>

      <!-- Dashboard Content -->
      <section class="home" *ngIf="!loading && !error">
        <!-- ===== HERO BANNER ===== -->
        <div class="dashboard-header">
          <div>
            <h1>Ambition Command Dashboard</h1>
            <p class="header-subtitle">Your salon command center — revenue, bookings, staff performance, and business alerts in one place</p>
            <div class="header-progress-row">
              <div class="header-target">
                <span class="target-label">Today's Target</span>
                <span class="target-value">{{ computedTodayRevenue | currency }} / {{ dailyTarget | currency }}</span>
              </div>
              <div class="progress-bar-track">
                <div class="progress-bar-fill" [style.width.%]="targetProgress" [class.pb-low]="targetProgress < 40" [class.pb-mid]="targetProgress >= 40 && targetProgress < 80" [class.pb-high]="targetProgress >= 80"></div>
              </div>
            </div>
          </div>
          <div class="header-meta">
            <div class="header-top-row">
              <div class="search-wrapper" [class.active]="searchFocused || searchQuery.length > 0">
                <input #searchInput
                  type="text"
                  class="search-input-header"
                  [(ngModel)]="searchQuery"
                  (input)="onGlobalSearch(searchInput.value)"
                  (focus)="searchFocused = true"
                  (blur)="onSearchBlur()"
                  (keydown.escape)="closeSearch()"
                  (keydown.arrow-down)="onSearchKeydown($event)"
                  placeholder="Search clients, bookings, staff..."
                  aria-label="Global search"
                  role="searchbox">
                <span class="search-icon" *ngIf="!searchQuery && !searchFocused">&#x1F50D;</span>
                <button class="search-clear" *ngIf="searchQuery" (click)="closeSearch()" aria-label="Clear search">&times;</button>
                <!-- Search Results Dropdown -->
                <div class="search-dropdown" *ngIf="searchQuery.length >= 2 && searchResults" (mousedown)="onSearchDropdownMousedown($event)" role="listbox" aria-label="Search results">
                  <div class="sd-loading" *ngIf="searchLoading">Searching...</div>
                  <ng-container *ngIf="!searchLoading">
                    <div class="sd-empty" *ngIf="searchResults.totalCount === 0">
                      <p>No results for "{{ searchQuery }}"</p>
                    </div>
                    <div class="sd-group" *ngIf="searchResults.results.clients.length > 0">
                      <div class="sd-group-title">Clients ({{ searchResults.results.clients.length }})</div>
                      <div class="sd-item" *ngFor="let c of searchResults.results.clients | slice:0:5; trackBy: trackByIndex" [routerLink]="'/app/clients'" (click)="closeSearch()" role="option" tabindex="0">
                        <strong>{{ c.fullName }}</strong>
                        <span>{{ c.phone }}</span>
                      </div>
                    </div>
                    <div class="sd-group" *ngIf="searchResults.results.bookings.length > 0">
                      <div class="sd-group-title">Bookings ({{ searchResults.results.bookings.length }})</div>
                      <div class="sd-item" *ngFor="let b of searchResults.results.bookings | slice:0:5; trackBy: trackByIndex" [routerLink]="'/app/bookings'" (click)="closeSearch()" role="option" tabindex="0">
                        <strong>{{ b.title }}</strong>
                        <span>{{ b.status }} &middot; {{ b.totalAmount | currency }}</span>
                      </div>
                    </div>
                    <div class="sd-group" *ngIf="searchResults.results.staff.length > 0">
                      <div class="sd-group-title">Staff ({{ searchResults.results.staff.length }})</div>
                      <div class="sd-item" *ngFor="let s of searchResults.results.staff | slice:0:5; trackBy: trackByIndex" [routerLink]="'/app/staff'" (click)="closeSearch()" role="option" tabindex="0">
                        <strong>{{ s.fullName }}</strong>
                        <span>{{ s.role }}</span>
                      </div>
                    </div>
                    <a class="sd-view-all" *ngIf="searchResults.totalCount > 0" routerLink="/app/global-search" (click)="closeSearch()">View all results &rarr;</a>
                  </ng-container>
                </div>
              </div>
              <div class="header-actions">
                <button class="header-icon-btn" (click)="toggleNotificationPanel()" aria-label="Toggle notifications" [attr.aria-expanded]="showNotifications" title="Notifications">
                  <span class="hbtn-icon">&#x1F514;</span>
                  <span class="hbtn-badge" *ngIf="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
                </button>
                <button class="header-icon-btn" (click)="togglePreferences()" aria-label="Dashboard preferences" title="Preferences">
                  <span class="hbtn-icon">&#x2699;</span>
                </button>
              </div>
            </div>
            <div class="header-info-row">
              <span class="header-date">{{ currentTime | date:'EEEE, MMMM d, y' }}</span>
              <span class="header-clock">{{ currentTime | date:'h:mm:ss a' }}</span>
              <span class="header-greeting">{{ greeting }}, Owner</span>
              <span class="live-badge"><span class="dot"></span>Live</span>
              <span class="health-badge {{ businessHealth.class }}">{{ businessHealth.label }}</span>
            </div>
          </div>
        </div>

        <!-- ===== 6 KPI CARDS ===== -->
        <div class="kpi-grid">
          <ng-container *ngIf="loading">
            <div class="kpi-card" *ngFor="let _ of [1,2,3,4,5,6,7,8]">
              <div class="kpi-indicator"></div>
              <div class="kpi-content"><div class="kpi-skeleton"><div class="sk-shimmer"></div></div></div>
            </div>
          </ng-container>
          <ng-container *ngIf="!loading">
            <div class="kpi-card card-revenue" routerLink="/app/payments" *ngIf="!prefs.hideRevenue">
              <div class="kpi-indicator"></div>
              <div class="kpi-content">
                <span class="kpi-label">Today Revenue</span>
                <strong class="kpi-value">{{ computedTodayRevenue | currency }}</strong>
                <span class="kpi-trend" [class.trend-up]="revenueTrend.dir==='up'" [class.trend-down]="revenueTrend.dir==='down'" [class.trend-neutral]="revenueTrend.dir==='neutral'">
                  {{ revenueTrend.dir === 'up' ? '↑' : revenueTrend.dir === 'down' ? '↓' : '→' }} {{ revenueTrend.pct }}% vs yesterday
                </span>
              </div>
            </div>
            <div class="kpi-card card-bookings" routerLink="/app/calendar">
              <div class="kpi-indicator"></div>
              <div class="kpi-content">
                <span class="kpi-label">Today Bookings</span>
                <strong class="kpi-value">{{ computedTodayBookings }}</strong>
                <span class="kpi-trend" [class.trend-up]="bookingTrend.dir==='up'" [class.trend-down]="bookingTrend.dir==='down'" [class.trend-neutral]="bookingTrend.dir==='neutral'">
                  {{ bookingTrend.dir === 'up' ? '↑' : bookingTrend.dir === 'down' ? '↓' : '→' }} {{ bookingTrend.pct }}% vs yesterday
                </span>
              </div>
            </div>
            <div class="kpi-card card-completed" routerLink="/app/bookings">
              <div class="kpi-indicator"></div>
              <div class="kpi-content">
                <span class="kpi-label">Completed</span>
                <strong class="kpi-value">{{ computedCompletedBookings }}</strong>
                <span class="kpi-meta">Completed today</span>
              </div>
            </div>
            <div class="kpi-card card-pending" routerLink="/app/bookings">
              <div class="kpi-indicator"></div>
              <div class="kpi-content">
                <span class="kpi-label">Pending</span>
                <strong class="kpi-value">{{ computedPendingBookings }}</strong>
                <span class="kpi-meta">Awaiting confirmation</span>
              </div>
            </div>
            <div class="kpi-card card-clients" routerLink="/app/clients">
              <div class="kpi-indicator"></div>
              <div class="kpi-content">
                <span class="kpi-label">Active Clients</span>
                <strong class="kpi-value">{{ computedActiveClients }}</strong>
                <span class="kpi-meta">Total in system</span>
              </div>
            </div>
            <div class="kpi-card card-stock" routerLink="/app/inventory">
              <div class="kpi-indicator"></div>
              <div class="kpi-content">
                <span class="kpi-label">Low Stock</span>
                <strong class="kpi-value">{{ computedLowStockCount }}</strong>
                <span class="kpi-meta">Items need reorder</span>
              </div>
            </div>
            <div class="kpi-card card-staff-available" routerLink="/app/staff">
              <div class="kpi-indicator"></div>
              <div class="kpi-content">
                <span class="kpi-label">Staff Available</span>
                <strong class="kpi-value">{{ computedStaffAvailable }}</strong>
                <span class="kpi-meta">Available now</span>
              </div>
            </div>
            <div class="kpi-card card-pending-payments" routerLink="/app/payments">
              <div class="kpi-indicator"></div>
              <div class="kpi-content">
                <span class="kpi-label">Pending Payments</span>
                <strong class="kpi-value">{{ computedPendingPaymentsAmount | currency }}</strong>
                <span class="kpi-meta">Due today</span>
              </div>
            </div>
          </ng-container>
        </div>

        <!-- ===== ROW 1: Upcoming Bookings + AI Insights ===== -->
        <div class="grid-2col">
          <!-- Upcoming Bookings -->
          <div class="panel">
            <div class="panel-header">
              <h2>Upcoming Bookings</h2>
              <a routerLink="/app/calendar" class="panel-action">View Calendar &rarr;</a>
            </div>
            <div class="empty-state" *ngIf="bookingsToday.length === 0">
              <div class="empty-icon">📅</div>
              <p class="empty-title">No bookings scheduled today</p>
              <p class="empty-desc">Enjoy your day — or create a new appointment to get started.</p>
              <a routerLink="/app/calendar" class="empty-action">Book Appointment</a>
            </div>
            <div class="ub-list" *ngIf="bookingsToday.length > 0">
              <div class="ub-card" *ngFor="let b of bookingsToday | slice:0:8; trackBy: trackByBookingId" [routerLink]="'/app/calendar'" [queryParams]="{date: b.startTime | date:'yyyy-MM-dd'}">
                <div class="ub-time">{{ b.startTime | date:'shortTime' }}</div>
                <div class="ub-body">
                  <div class="ub-client">{{ b.client?.fullName || b.clientName || b.title || 'Guest' }}</div>
                  <div class="ub-meta">
                    <span>{{ b.services?.[0]?.name || b.serviceName || b.title || 'Service' }}</span>
                    <span class="ub-dot">&middot;</span>
                    <span>{{ b.staff?.fullName || b.staffName || 'Staff' }}</span>
                  </div>
                </div>
                <div class="ub-status">
                  <span class="status-chip status-{{ (b.status || 'pending') | lowercase }}">{{ b.status || 'PENDING' }}</span>
                </div>
                <div class="ub-amount" *ngIf="b.totalAmount">{{ b.totalAmount | currency }}</div>
              </div>
              <a routerLink="/app/bookings" class="panel-footer-link">View all bookings &rarr;</a>
            </div>
          </div>

          <!-- AI Business Insights -->
          <div class="panel">
            <div class="panel-header"><h2>AI Business Insights</h2></div>
            <div class="insight-list" *ngIf="insightList.length > 0">
              <div class="insight-row" *ngFor="let ins of insightList; trackBy: trackByIndex">
                <span class="insight-icon" [class.insight-positive]="ins.type==='positive'" [class.insight-warning]="ins.type==='warning'" [class.insight-danger]="ins.type==='danger'">&#9679;</span>
                <span class="insight-text">{{ ins.text }}</span>
              </div>
            </div>
            <div class="empty-state" *ngIf="insightList.length === 0">
              <div class="empty-icon">🧠</div>
              <p class="empty-title">No insights available</p>
              <p class="empty-desc">Connect more business data to unlock AI-powered recommendations.</p>
            </div>
            <div class="insight-actions">
              <a routerLink="/app/calendar" class="insight-btn">Open Calendar</a>
              <a routerLink="/app/payments" class="insight-btn" *ngIf="computedDuePayments > 0">Open Payments</a>
              <a routerLink="/app/inventory" class="insight-btn" *ngIf="computedLowStockCount > 0">Open Inventory</a>
            </div>
          </div>
        </div>

        <!-- ===== ROW 2: Staff Performance + Payment Snapshot ===== -->
        <div class="grid-2col">
          <!-- Staff Performance -->
          <div class="panel">
            <div class="panel-header">
              <h2>Staff Performance</h2>
              <a routerLink="/app/staff" class="panel-action">Manage Staff &rarr;</a>
            </div>
            <div class="empty-state" *ngIf="staffList.length === 0">
              <div class="empty-icon">👥</div>
              <p class="empty-title">No staff data available</p>
              <p class="empty-desc">Add staff members to track performance and workload.</p>
              <a routerLink="/app/staff" class="empty-action">Add Staff</a>
            </div>
            <div class="staff-scroll" *ngIf="staffList.length > 0">
              <div class="staff-card" *ngFor="let s of staffList; trackBy: trackByStaffId" [routerLink]="'/app/staff'">
                <div class="staff-avatar">{{ (s.fullName || s.name || 'S')[0] }}</div>
                <div class="staff-info">
                  <div class="staff-name">{{ s.fullName || s.name }}</div>
                  <div class="staff-role">{{ s.role || 'Staff' }}</div>
                </div>
                <div class="staff-metrics">
                  <div class="staff-metric">
                    <span class="sm-value">{{ staffBookingCount(s) }}</span>
                    <span class="sm-label">Today</span>
                  </div>
                  <div class="staff-metric">
                    <span class="sm-value">{{ staffCompletedCount(s) }}</span>
                    <span class="sm-label">Done</span>
                  </div>
                  <div class="staff-metric">
                    <span class="sm-value">{{ staffRevenue(s) | currency:'':'1.0-0' }}</span>
                    <span class="sm-label">Revenue</span>
                  </div>
                </div>
                <div class="staff-workload">
                  <span class="wl-chip" [class.wl-high]="staffBookingCount(s) >= 3" [class.wl-medium]="staffBookingCount(s) === 1 || staffBookingCount(s) === 2" [class.wl-low]="staffBookingCount(s) === 0">
                    {{ staffBookingCount(s) >= 3 ? 'Busy' : staffBookingCount(s) > 0 ? 'Active' : 'Free' }}
                  </span>
                </div>
              </div>
            </div>
            <div class="staff-alert" *ngIf="underbookedStaff.length > 0 && staffList.length > 0">
              <span class="alert-icon">&#9888;</span>
              <span>{{ underbookedStaff.length }} staff with no bookings today</span>
            </div>
          </div>

          <!-- Payment Snapshot -->
          <div class="panel">
            <div class="panel-header">
              <h2>Payment Snapshot</h2>
              <a routerLink="/app/payments" class="panel-action">View All &rarr;</a>
            </div>
            <div class="empty-state" *ngIf="payments.length === 0 && !loading">
              <div class="empty-icon">💳</div>
              <p class="empty-title">No payments recorded yet</p>
              <p class="empty-desc">Payments will appear here once clients start checking out.</p>
              <a routerLink="/app/pos" class="empty-action">Open POS</a>
            </div>
            <div class="ps-grid" *ngIf="payments.length > 0">
              <div class="ps-row">
                <span class="ps-label">Paid Today</span>
                <strong class="ps-value ps-value-paid">{{ computedPaidToday | currency }}</strong>
              </div>
              <div class="ps-row">
                <span class="ps-label">Due Today</span>
                <strong class="ps-value ps-value-due">{{ computedDueToday | currency }}</strong>
              </div>
              <div class="ps-row ps-row-total">
                <span class="ps-label">Total Collected</span>
                <strong class="ps-value">{{ computedTotalCollected | currency }}</strong>
              </div>
            </div>
            <div class="ps-methods" *ngIf="payments.length > 0">
              <div class="ps-method" *ngIf="computedCashTotal > 0"><span class="ps-method-dot" style="background:#10b981"></span>Cash: {{ computedCashTotal | currency }}</div>
              <div class="ps-method" *ngIf="computedUpiTotal > 0"><span class="ps-method-dot" style="background:#3b82f6"></span>UPI: {{ computedUpiTotal | currency }}</div>
              <div class="ps-method" *ngIf="computedCardTotal > 0"><span class="ps-method-dot" style="background:#8b5cf6"></span>Card: {{ computedCardTotal | currency }}</div>
            </div>
            <div class="ps-footer" *ngIf="recentPayments.length > 0">
              <div class="ps-recent-title">Latest Payments</div>
              <div class="ps-recent-item" *ngFor="let p of recentPayments | slice:0:3; trackBy: trackByPaymentId">
                <span>{{ p.method }}</span>
                <span>{{ p.amount | currency }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== ROW 3: Quick Actions + Inventory Snapshot ===== -->
        <div class="grid-2col">
          <!-- Quick Actions -->
          <div class="panel">
            <div class="panel-header"><h2>Quick Actions</h2></div>
            <div class="quick-actions">
              <a routerLink="/app/calendar" class="qa-btn qa-primary">&#x1F4C5; Book Appointment</a>
              <a routerLink="/app/clients" class="qa-btn qa-secondary">&#x1F9D1; Add Client</a>
              <a routerLink="/app/pos" class="qa-btn qa-accent">&#x1F4B3; Checkout POS</a>
              <a routerLink="/app/marketing" class="qa-btn qa-secondary">&#x1F4E2; Send Campaign</a>
              <a routerLink="/app/calendar" class="qa-btn qa-secondary">&#x1F4C5; View Calendar</a>
              <a routerLink="/app/bookings" class="qa-btn qa-secondary">&#x1F4CB; View Bookings</a>
              <a routerLink="/app/payments" class="qa-btn qa-warning">&#x1F4B0; Payments Due</a>
              <a routerLink="/app/inventory" class="qa-btn qa-secondary">&#x1F4E6; Inventory</a>
              <a routerLink="/app/ai-insights" class="qa-btn qa-secondary">&#x1F916; AI Insights</a>
              <a routerLink="/app/reports" class="qa-btn qa-secondary">&#x1F4CA; Reports</a>
            </div>
          </div>

          <!-- Inventory Snapshot -->
          <div class="panel">
            <div class="panel-header">
              <h2>Inventory Snapshot</h2>
              <a routerLink="/app/inventory" class="panel-action">Manage &rarr;</a>
            </div>
            <div class="empty-state" *ngIf="inventory.length === 0 && lowStock.length === 0">
              <div class="empty-icon">📦</div>
              <p class="empty-title">No inventory data</p>
              <p class="empty-desc">Add products to track stock levels and reorder alerts.</p>
              <a routerLink="/app/inventory" class="empty-action">Manage Inventory</a>
            </div>
            <div class="is-grid" *ngIf="inventory.length > 0 || lowStock.length > 0">
              <div class="is-row">
                <span class="is-label">Low Stock Items</span>
                <strong class="is-value is-danger" [class.is-ok]="computedLowStockCount === 0">{{ computedLowStockCount }}</strong>
              </div>
              <div class="is-row">
                <span class="is-label">Inventory Value</span>
                <strong class="is-value">{{ computedInventoryValue | currency }}</strong>
              </div>
              <div class="is-row">
                <span class="is-label">Total Products</span>
                <strong class="is-value">{{ inventory.length }}</strong>
              </div>
            </div>
            <div class="is-low-stock" *ngIf="lowStock.length > 0">
              <div class="is-ls-title">Items needing reorder</div>
              <div class="is-ls-item" *ngFor="let item of lowStock | slice:0:4; trackBy: trackByInventoryId">
                <span class="is-ls-name">{{ item.name || item.productName || 'Item' }}</span>
                <span class="is-ls-qty">Stock: {{ item.quantity ?? item.stock ?? 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== ROW 4: Work Queue + Client Snapshot ===== -->
        <div class="grid-2col">
          <!-- Work Queue / Alerts -->
          <div class="panel">
            <div class="panel-header"><h2>Work Queue</h2></div>
            <div class="empty-state" *ngIf="workQueueAlerts.length === 0">
              <div class="empty-icon">✅</div>
              <p class="empty-title">All clear</p>
              <p class="empty-desc">No pending alerts or issues requiring your attention.</p>
            </div>
            <div class="wq-list" *ngIf="workQueueAlerts.length > 0">
              <div class="wq-item" *ngFor="let alert of workQueueAlerts; trackBy: trackByIndex">
                <span class="wq-icon" [style.color]="alert.color">&#9679;</span>
                <div class="wq-body">
                  <span class="wq-text">{{ alert.text }}</span>
                  <span class="wq-count">{{ alert.count }}</span>
                </div>
                <a [routerLink]="alert.route" class="wq-action">View</a>
              </div>
            </div>
          </div>

          <!-- Client Snapshot -->
          <div class="panel">
            <div class="panel-header">
              <h2>Client Snapshot</h2>
              <a routerLink="/app/clients" class="panel-action">View All &rarr;</a>
            </div>
            <div class="empty-state" *ngIf="clients.length === 0">
              <div class="empty-icon">👤</div>
              <p class="empty-title">No client data available</p>
              <p class="empty-desc">Add clients to track visits, payments, and preferences.</p>
              <a routerLink="/app/clients" class="empty-action">Add Client</a>
            </div>
            <div class="cs-grid" *ngIf="clients.length > 0">
              <div class="cs-row">
                <span class="cs-label">Total Clients</span>
                <strong class="cs-value">{{ clients.length }}</strong>
              </div>
              <div class="cs-row">
                <span class="cs-label">Active (visited)</span>
                <strong class="cs-value">{{ computedActiveClients }}</strong>
              </div>
              <div class="cs-row">
                <span class="cs-label">With Due Payments</span>
                <strong class="cs-value cs-warning">{{ computedDueClients }}</strong>
              </div>
            </div>
            <a routerLink="/app/clients" class="panel-footer-link">Open Clients &rarr;</a>
          </div>
        </div>

        <!-- ===== ROW 5: Revenue Analytics + Booking Analytics ===== -->
        <div class="grid-2col">
          <!-- Revenue Analytics -->
          <div class="panel">
            <div class="panel-header">
              <h2>Revenue Analytics</h2>
              <a routerLink="/app/reports" class="panel-action">Full Report &rarr;</a>
            </div>
            <div class="ra-grid">
              <div class="ra-card">
                <span class="ra-label">Today</span>
                <strong class="ra-value">{{ computedTodayRevenue | currency }}</strong>
              </div>
              <div class="ra-card">
                <span class="ra-label">This Week</span>
                <strong class="ra-value">{{ computedWeekRevenue | currency }}</strong>
              </div>
              <div class="ra-card">
                <span class="ra-label">This Month</span>
                <strong class="ra-value">{{ computedMonthRevenue | currency }}</strong>
              </div>
              <div class="ra-card ra-growth">
                <span class="ra-label">Growth</span>
                <strong class="ra-value" [class.text-green]="computedRevenueGrowth >= 0" [class.text-red]="computedRevenueGrowth < 0">
                  {{ computedRevenueGrowth >= 0 ? '+' : '' }}{{ computedRevenueGrowth }}%
                </strong>
              </div>
            </div>
          </div>

          <!-- Booking Analytics -->
          <div class="panel">
            <div class="panel-header">
              <h2>Booking Analytics</h2>
              <a routerLink="/app/bookings" class="panel-action">View All &rarr;</a>
            </div>
            <div class="ba-grid">
              <div class="ba-card ba-confirmed">
                <span class="ba-icon">✓</span>
                <div class="ba-body">
                  <strong class="ba-value">{{ bookingStats.confirmed }}</strong>
                  <span class="ba-label">Confirmed</span>
                </div>
              </div>
              <div class="ba-card ba-completed">
                <span class="ba-icon">★</span>
                <div class="ba-body">
                  <strong class="ba-value">{{ bookingStats.completed }}</strong>
                  <span class="ba-label">Completed</span>
                </div>
              </div>
              <div class="ba-card ba-pending">
                <span class="ba-icon">⏳</span>
                <div class="ba-body">
                  <strong class="ba-value">{{ bookingStats.pending }}</strong>
                  <span class="ba-label">Pending</span>
                </div>
              </div>
              <div class="ba-card ba-cancelled">
                <span class="ba-icon">✕</span>
                <div class="ba-body">
                  <strong class="ba-value">{{ bookingStats.cancelled }}</strong>
                  <span class="ba-label">Cancelled</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== ROW 6: Activity Timeline + Business Alerts ===== -->
        <div class="grid-2col">
          <!-- Activity Timeline -->
          <div class="panel">
            <div class="panel-header">
              <h2>Activity Timeline</h2>
            </div>
            <div class="empty-state" *ngIf="activityTimeline.length === 0">
              <div class="empty-icon">📋</div>
              <p class="empty-title">No recent activity</p>
              <p class="empty-desc">Activities from the last 7 days will appear here.</p>
            </div>
            <div class="at-list" *ngIf="activityTimeline.length > 0">
              <div class="at-item" *ngFor="let a of activityTimeline; trackBy: trackByIndex">
                <span class="at-icon">{{ a.icon }}</span>
                <div class="at-body">
                  <span class="at-title">{{ a.title }}</span>
                  <span class="at-time">{{ a.timestamp | date:'MMM d, h:mm a' }}</span>
                </div>
                <span class="at-amount" *ngIf="a.amount != null">{{ a.amount | currency }}</span>
              </div>
            </div>
          </div>

          <!-- Business Alerts -->
          <div class="panel">
            <div class="panel-header">
              <h2>Business Alerts</h2>
            </div>
            <div class="empty-state" *ngIf="businessAlerts.length === 0">
              <div class="empty-icon">✅</div>
              <p class="empty-title">All clear</p>
              <p class="empty-desc">No alerts requiring your attention.</p>
            </div>
            <div class="alerts-list" *ngIf="businessAlerts.length > 0">
              <div class="alert-item" *ngFor="let a of businessAlerts; trackBy: trackByIndex" [routerLink]="a.route">
                <span class="alert-icon" [style.background]="a.color">{{ a.icon }}</span>
                <div class="alert-body">
                  <span class="alert-title">{{ a.title }}</span>
                  <span class="alert-count" [style.color]="a.color">{{ a.count }} item{{ a.count !== 1 ? 's' : '' }}</span>
                </div>
                <span class="alert-arrow">→</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== ROW 7: Notification Center ===== -->
        <div class="panel" *ngIf="showNotifications">
          <div class="panel-header">
            <h2>Notification Center</h2>
            <div class="panel-header-actions">
              <button class="panel-header-btn" (click)="markAllNotificationsRead()" *ngIf="hasUnreadNotifications" aria-label="Mark all as read">Mark All Read</button>
              <button class="panel-header-btn" (click)="clearAllNotifications()" *ngIf="notifications.length > 0" aria-label="Clear all notifications">Clear All</button>
              <a routerLink="/app/notifications" class="panel-action">View All &rarr;</a>
            </div>
          </div>
          <div class="empty-state" *ngIf="notifications.length === 0">
            <div class="empty-icon">&#x1F514;</div>
            <p class="empty-title">No notifications</p>
            <p class="empty-desc">You're all caught up! New notifications will appear here.</p>
          </div>
          <div class="nc-list" *ngIf="notifications.length > 0">
            <div class="nc-item" *ngFor="let n of notifications; trackBy: trackByIndex" [class.nc-unread]="!n.read" role="listitem">
              <div class="nc-indicator" [class.nc-indicator-read]="n.read"></div>
              <div class="nc-body">
                <span class="nc-title">{{ n.title }}</span>
                <span class="nc-message" *ngIf="n.message">{{ n.message }}</span>
                <span class="nc-time">{{ n.createdAt | date:'MMM d, h:mm a' }}</span>
              </div>
              <div class="nc-actions">
                <button class="nc-btn" *ngIf="!n.read" (click)="markNotificationRead(n)" aria-label="Mark notification as read" title="Mark as read">&#x2713;</button>
                <button class="nc-btn nc-btn-remove" (click)="dismissNotification(n)" aria-label="Dismiss notification" title="Dismiss">&times;</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== ROW 8: Business Health Score Card ===== -->
        <div class="panel health-score-panel">
          <div class="panel-header">
            <h2>Business Health Score</h2>
          </div>
          <div class="hs-grid">
            <div class="hs-main">
              <span class="hs-score">{{ healthScoreOverall }}</span>
              <span class="hs-label {{ healthScoreClass }}">{{ healthScoreLabel }}</span>
            </div>
            <div class="hs-details">
              <div class="hs-item">
                <span class="hs-item-label">Revenue</span>
                <div class="hs-bar-track"><div class="hs-bar-fill" [style.width.%]="healthScoreRevenue" [class.hs-excellent]="healthScoreRevenue >= 80" [class.hs-good]="healthScoreRevenue >= 50 && healthScoreRevenue < 80" [class.hs-warning]="healthScoreRevenue >= 25 && healthScoreRevenue < 50" [class.hs-critical]="healthScoreRevenue < 25"></div></div>
                <span class="hs-item-value {{ healthScoreClassFor(healthScoreRevenue) }}">{{ healthScoreLevelFor(healthScoreRevenue) }}</span>
              </div>
              <div class="hs-item">
                <span class="hs-item-label">Bookings</span>
                <div class="hs-bar-track"><div class="hs-bar-fill" [style.width.%]="healthScoreBookings" [class.hs-excellent]="healthScoreBookings >= 80" [class.hs-good]="healthScoreBookings >= 50 && healthScoreBookings < 80" [class.hs-warning]="healthScoreBookings >= 25 && healthScoreBookings < 50" [class.hs-critical]="healthScoreBookings < 25"></div></div>
                <span class="hs-item-value {{ healthScoreClassFor(healthScoreBookings) }}">{{ healthScoreLevelFor(healthScoreBookings) }}</span>
              </div>
              <div class="hs-item">
                <span class="hs-item-label">Payments</span>
                <div class="hs-bar-track"><div class="hs-bar-fill" [style.width.%]="healthScorePayments" [class.hs-excellent]="healthScorePayments >= 80" [class.hs-good]="healthScorePayments >= 50 && healthScorePayments < 80" [class.hs-warning]="healthScorePayments >= 25 && healthScorePayments < 50" [class.hs-critical]="healthScorePayments < 25"></div></div>
                <span class="hs-item-value {{ healthScoreClassFor(healthScorePayments) }}">{{ healthScoreLevelFor(healthScorePayments) }}</span>
              </div>
              <div class="hs-item">
                <span class="hs-item-label">Inventory</span>
                <div class="hs-bar-track"><div class="hs-bar-fill" [style.width.%]="healthScoreInventory" [class.hs-excellent]="healthScoreInventory >= 80" [class.hs-good]="healthScoreInventory >= 50 && healthScoreInventory < 80" [class.hs-warning]="healthScoreInventory >= 25 && healthScoreInventory < 50" [class.hs-critical]="healthScoreInventory < 25"></div></div>
                <span class="hs-item-value {{ healthScoreClassFor(healthScoreInventory) }}">{{ healthScoreLevelFor(healthScoreInventory) }}</span>
              </div>
              <div class="hs-item">
                <span class="hs-item-label">Staff Utilization</span>
                <div class="hs-bar-track"><div class="hs-bar-fill" [style.width.%]="healthScoreStaff" [class.hs-excellent]="healthScoreStaff >= 80" [class.hs-good]="healthScoreStaff >= 50 && healthScoreStaff < 80" [class.hs-warning]="healthScoreStaff >= 25 && healthScoreStaff < 50" [class.hs-critical]="healthScoreStaff < 25"></div></div>
                <span class="hs-item-value {{ healthScoreClassFor(healthScoreStaff) }}">{{ healthScoreLevelFor(healthScoreStaff) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== ROW 9: Dashboard Preferences Overlay ===== -->
        <div class="prefs-overlay" *ngIf="showPrefs" (click)="showPrefs = false" aria-label="Close preferences" role="dialog" aria-modal="true">
            <div class="prefs-panel" (click)="onPrefsPanelClick($event)">
            <div class="prefs-header">
              <h3>Dashboard Preferences</h3>
              <button class="prefs-close" (click)="showPrefs = false" aria-label="Close preferences">&times;</button>
            </div>
            <div class="prefs-body">
              <label class="prefs-row">
                <span>Hide Revenue</span>
                <input type="checkbox" [(ngModel)]="prefs.hideRevenue" (change)="savePreferences()" aria-label="Hide revenue from dashboard">
              </label>
              <label class="prefs-row">
                <span>Compact Mode</span>
                <input type="checkbox" [(ngModel)]="prefs.compactMode" (change)="savePreferences()" aria-label="Enable compact mode">
              </label>
              <label class="prefs-row">
                <span>Auto Refresh</span>
                <input type="checkbox" [(ngModel)]="prefs.autoRefresh" (change)="toggleAutoRefresh()" aria-label="Enable auto refresh">
              </label>
              <label class="prefs-row">
                <span>Default Time Range</span>
                <select [(ngModel)]="prefs.defaultTimeRange" (change)="savePreferences()" aria-label="Default time range">
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <!-- ===== FOOTER ===== -->
        <div class="dashboard-footer" [class.compact]="prefs.compactMode">
          <span>Ambition Unisex Salon Software &mdash; Command Dashboard</span>
          <span class="footer-api-status" *ngIf="apiFailures > 0">{{ apiFailures }} API endpoint(s) unreachable</span>
          <button class="footer-refresh" [class.refreshing]="refreshing" [disabled]="refreshing" (click)="loadDashboard()">
            <span class="refresh-icon">&#x21BB;</span> {{ refreshing ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </section>
    </ng-container>

    <ng-template #modulePage>
      <div class="module-page">
        <h1>{{ title | titlecase }}</h1>
        <p>{{ title }} module for Ambition Unisex Salon Software.</p>
        <div class="module-cards">
          <div class="card"><h3>Status</h3><b>Ready</b><p>Module is available</p></div>
          <div class="card"><h3>Module</h3><b>{{ title | titlecase }}</b><p>Navigate from sidebar</p></div>
          <div class="card"><h3>API</h3><b>Connected</b><p>Backend integration ready</p></div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    h1{margin:0 0 14px}
    .home{display:grid;gap:24px;padding-bottom:40px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 2px 8px rgba(15,23,42,.04)}
    .panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
    .panel-header h2{margin:0;font-size:18px;font-weight:700;color:#0f172a}
    .panel-action{font-size:13px;font-weight:600;color:#6366f1;text-decoration:none}
    .panel-action:hover{text-decoration:underline}
    .panel-footer-link{display:block;text-align:center;padding:12px 0 0;font-size:13px;font-weight:600;color:#6366f1;text-decoration:none}
    .panel-footer-link:hover{text-decoration:underline}
    .grid-2col{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .empty-action{display:inline-block;font-size:13px;font-weight:600;color:#6366f1;text-decoration:none;padding:6px 14px;border:1px solid #e0e7ff;border-radius:12px}

    /* Loading Skeleton */
    .loading{display:grid;gap:18px;padding:24px 0}
    .skeleton-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .skeleton-card,.skeleton-panel{background:white;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;position:relative;min-height:120px}
    .skeleton-panel{min-height:200px}
    .sk-shimmer{position:absolute;inset:0;background:linear-gradient(90deg,transparent,#f1f5f9 40%,#f1f5f9 60%,transparent);animation:shimmer 1.5s ease-in-out infinite}
    @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
    .loading-text{text-align:center;color:#94a3b8;font-size:14px;padding:12px 0}

    /* Error */
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:28px;text-align:center}
    .error strong{color:#991b1b;font-size:16px}
    .error p{color:#7f1d1d;margin:8px 0;font-size:14px}
    .retry-btn{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 24px;font-weight:700;cursor:pointer}

    /* Hero Banner */
    .dashboard-header{display:flex;justify-content:space-between;align-items:flex-start;background:linear-gradient(135deg,#0b0b0b 0%,#1a1a2e 100%);color:white;border-radius:28px;padding:36px 40px}
    .dashboard-header h1{font-size:32px;font-weight:800;letter-spacing:-.02em}
    .header-subtitle{margin:8px 0 0;color:#94a3b8;font-size:15px;max-width:500px;line-height:1.5}
    .header-meta{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;min-width:0}
    .header-top-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .header-info-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .header-date{font-size:14px;color:#cbd5e1;font-weight:500}
    .header-greeting{font-size:13px;color:#64748b}
    .header-actions{display:flex;align-items:center;gap:6px}
    .header-icon-btn{position:relative;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;font-size:16px;transition:background .15s}
    .header-icon-btn:hover{background:rgba(255,255,255,0.2)}
    .header-icon-btn:focus-visible{outline:2px solid white;outline-offset:2px}
    .hbtn-icon{line-height:1}
    .hbtn-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:white;font-size:10px;font-weight:800;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid #1a1a2e;line-height:1}
    .live-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.15);color:#10b981;font-size:12px;font-weight:700;padding:4px 14px;border-radius:100px;text-transform:uppercase;letter-spacing:.05em}
    .live-badge .dot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

    /* ===== Global Search ===== */
    .search-wrapper{position:relative}
    .search-input-header{width:200px;padding:8px 32px 8px 14px;border:1px solid rgba(255,255,255,0.2);border-radius:10px;background:rgba(255,255,255,0.08);color:white;font-size:13px;outline:none;transition:all .2s}
    .search-input-header::placeholder{color:rgba(255,255,255,0.5)}
    .search-input-header:focus,.search-wrapper.active .search-input-header{border-color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.15);width:260px}
    .search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;opacity:.6;pointer-events:none}
    .search-clear{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:0;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:2px 4px;line-height:1}
    .search-clear:hover{color:white}
    .search-dropdown{position:absolute;top:calc(100% + 6px);right:0;width:380px;max-height:420px;overflow-y:auto;background:white;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.15);z-index:1000;padding:8px}
    .sd-loading{padding:16px;text-align:center;color:#94a3b8;font-size:13px}
    .sd-empty{padding:24px;text-align:center;color:#94a3b8;font-size:14px}
    .sd-empty p{margin:0}
    .sd-group{margin-bottom:8px}
    .sd-group:last-child{margin-bottom:0}
    .sd-group-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;padding:6px 10px 4px}
    .sd-item{display:flex;flex-direction:column;padding:8px 10px;border-radius:10px;cursor:pointer;transition:background .1s;text-decoration:none;color:inherit}
    .sd-item:hover{background:#f8fafc}
    .sd-item strong{font-size:13px;font-weight:700;color:#0f172a}
    .sd-item span{font-size:11px;color:#94a3b8;margin-top:1px}
    .sd-view-all{display:block;text-align:center;padding:10px;font-size:13px;font-weight:600;color:#6366f1;text-decoration:none;border-top:1px solid #f1f5f9;margin-top:4px}
    .sd-view-all:hover{text-decoration:underline}

    /* KPI Cards */
    .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:20px;display:flex;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,.05);transition:box-shadow .2s,transform .2s;cursor:pointer}
    .kpi-card:hover{box-shadow:0 8px 24px rgba(15,23,42,.08);transform:translateY(-2px)}
    .kpi-indicator{width:5px;flex-shrink:0}
    .card-revenue .kpi-indicator{background:#10b981}
    .card-bookings .kpi-indicator{background:#3b82f6}
    .card-completed .kpi-indicator{background:#06b6d4}
    .card-pending .kpi-indicator{background:#f59e0b}
    .card-clients .kpi-indicator{background:#8b5cf6}
    .card-stock .kpi-indicator{background:#f43f5e}
    .card-staff-available .kpi-indicator{background:#10b981}
    .card-pending-payments .kpi-indicator{background:#f59e0b}
    .kpi-content{padding:20px 24px;flex:1}
    .kpi-label{display:block;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
    .kpi-value{display:block;font-size:36px;font-weight:800;color:#0f172a;line-height:1.1;margin-bottom:6px;letter-spacing:-.02em}
    .kpi-meta{display:block;color:#94a3b8;font-size:13px}

    /* Upcoming Bookings */
    .ub-list{display:flex;flex-direction:column}
    .ub-card{display:flex;align-items:center;padding:12px 14px;border-radius:16px;transition:background .12s;cursor:pointer;gap:12px;border-bottom:1px solid #f8fafc}
    .ub-card:hover{background:#f8fafc}
    .ub-card:last-child{border-bottom:0}
    .ub-time{font-size:13px;font-weight:700;color:#0f172a;min-width:52px;white-space:nowrap}
    .ub-body{flex:1;min-width:0}
    .ub-client{font-weight:700;font-size:14px;color:#0f172a}
    .ub-meta{font-size:12px;color:#64748b;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ub-dot{margin:0 4px}
    .ub-status{flex-shrink:0}
    .ub-amount{font-weight:700;font-size:14px;color:#0f172a;margin-left:8px}
    .status-chip{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;text-transform:uppercase;letter-spacing:.03em}
    .status-confirmed,.status-checked_in{background:#dbeafe;color:#1d4ed8}
    .status-completed{background:#d1fae5;color:#065f46}
    .status-pending{background:#fef3c7;color:#92400e}
    .status-cancelled{background:#fee2e2;color:#991b1b}
    .status-no_show{background:#f3e8ff;color:#6d28d9}

    /* AI Insights */
    .insight-list{display:flex;flex-direction:column;gap:10px}
    .insight-row{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:14px;background:#f8fafc;font-size:14px}
    .insight-icon{font-size:10px;flex-shrink:0;margin-top:4px}
    .insight-positive{color:#10b981}
    .insight-warning{color:#f59e0b}
    .insight-danger{color:#ef4444}
    .insight-text{color:#334155;line-height:1.4}
    .insight-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
    .insight-btn{font-size:12px;font-weight:600;color:#6366f1;padding:6px 14px;border:1px solid #e0e7ff;border-radius:100px;text-decoration:none;transition:background .12s}
    .insight-btn:hover{background:#eef2ff}

    /* Staff Performance */
    .staff-scroll{max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
    .staff-card{display:flex;align-items:center;padding:12px 14px;border-radius:16px;transition:background .12s;cursor:pointer;gap:12px;border:1px solid #f1f5f9}
    .staff-card:hover{background:#f8fafc}
    .staff-avatar{width:36px;height:36px;border-radius:50%;background:#eef2ff;color:#6366f1;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0}
    .staff-info{flex:1;min-width:0}
    .staff-name{font-weight:700;font-size:14px;color:#0f172a}
    .staff-role{font-size:12px;color:#64748b}
    .staff-metrics{display:flex;gap:14px;flex-shrink:0}
    .staff-metric{text-align:center}
    .sm-value{display:block;font-weight:700;font-size:14px;color:#0f172a}
    .sm-label{display:block;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
    .staff-workload{flex-shrink:0}
    .wl-chip{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;text-transform:uppercase;letter-spacing:.03em}
    .wl-high{background:#fee2e2;color:#991b1b}
    .wl-medium{background:#fef3c7;color:#92400e}
    .wl-low{background:#d1fae5;color:#065f46}
    .staff-alert{display:flex;align-items:center;gap:8px;margin-top:12px;padding:10px 14px;background:#fef3c7;border-radius:14px;font-size:13px;color:#92400e}
    .alert-icon{font-size:16px}

    /* Payment Snapshot */
    .ps-grid{display:flex;flex-direction:column;gap:8px}
    .ps-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9}
    .ps-row:last-child{border-bottom:0}
    .ps-label{font-size:14px;color:#64748b;font-weight:500}
    .ps-value{font-size:20px;font-weight:800;color:#0f172a}
    .ps-value-paid{color:#065f46}
    .ps-value-due{color:#92400e}
    .ps-row-total{border-bottom:0;padding-top:6px;border-top:2px solid #f1f5f9}
    .ps-methods{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px}
    .ps-method{font-size:13px;font-weight:600;color:#0f172a;display:flex;align-items:center;gap:6px}
    .ps-method-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
    .ps-footer{margin-top:14px;padding-top:14px;border-top:1px solid #f1f5f9}
    .ps-recent-title{font-size:13px;font-weight:600;color:#64748b;margin-bottom:8px}
    .ps-recent-item{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#0f172a}

    /* Quick Actions */
    .quick-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .qa-btn{display:flex;align-items:center;gap:8px;border:1px solid #e5e7eb;background:#fff;border-radius:16px;padding:14px 16px;font-weight:700;text-align:left;text-decoration:none;color:#0b0b0b;transition:background .15s,box-shadow .15s;font-size:13px}
    .qa-btn:hover{background:#f8fafc;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .qa-primary{border-color:#6366f1;color:#6366f1;background:#eef2ff}
    .qa-primary:hover{background:#e0e7ff}
    .qa-accent{border-color:#10b981;color:#065f46;background:#ecfdf5}
    .qa-accent:hover{background:#d1fae5}
    .qa-warning{border-color:#f59e0b;color:#92400e;background:#fef3c7}
    .qa-warning:hover{background:#fde68a}

    /* Inventory Snapshot */
    .is-grid{display:flex;flex-direction:column;gap:8px}
    .is-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9}
    .is-row:last-child{border-bottom:0}
    .is-label{font-size:14px;color:#64748b;font-weight:500}
    .is-value{font-size:20px;font-weight:800;color:#0f172a}
    .is-danger{color:#dc2626}
    .is-ok{color:#065f46}
    .is-low-stock{margin-top:14px}
    .is-ls-title{font-size:13px;font-weight:600;color:#64748b;margin-bottom:8px}
    .is-ls-item{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;color:#0f172a;border-bottom:1px solid #f8fafc}

    /* Work Queue */
    .wq-list{display:flex;flex-direction:column;gap:8px}
    .wq-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:#f8fafc;transition:background .12s}
    .wq-item:hover{background:#f1f5f9}
    .wq-icon{font-size:10px;flex-shrink:0}
    .wq-body{flex:1;display:flex;justify-content:space-between;align-items:center;min-width:0}
    .wq-text{font-size:14px;color:#334155;font-weight:500}
    .wq-count{font-weight:800;font-size:16px;color:#0f172a;margin-left:12px}
    .wq-action{font-size:12px;font-weight:600;color:#6366f1;text-decoration:none;flex-shrink:0;padding:4px 10px;border-radius:8px;border:1px solid #e0e7ff}

    /* Client Snapshot */
    .cs-grid{display:flex;flex-direction:column;gap:8px}
    .cs-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f1f5f9}
    .cs-row:last-child{border-bottom:0}
    .cs-label{font-size:14px;color:#64748b;font-weight:500}
    .cs-value{font-size:22px;font-weight:800;color:#0f172a}
    .cs-warning{color:#f59e0b}

    /* Footer */
    .dashboard-footer{display:flex;justify-content:space-between;align-items:center;padding:16px 0;font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9;margin-top:8px}
    .footer-api-status{color:#f59e0b}
    /* Module Page */
    .module-page{padding:24px 0}
    .module-page h1{font-size:32px;text-transform:capitalize}
    .module-page p{color:#64748b;margin:8px 0 24px}
    .module-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
    .card{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;text-align:center}
    .card h3{margin:0 0 8px;color:#64748b;font-size:14px;text-transform:uppercase;letter-spacing:.04em}
    .card b{font-size:24px}
    .card p{color:#94a3b8;font-size:13px;margin:8px 0 0}

    /* Responsive */
    /* Clock */
    .header-clock{font-size:14px;font-weight:600;color:#cbd5e1;font-variant-numeric:tabular-nums}

    /* Target Progress */
    .header-progress-row{margin-top:18px;max-width:400px}
    .header-target{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
    .target-label{color:#94a3b8;font-weight:500}
    .target-value{color:#e2e8f0;font-weight:700}
    .progress-bar-track{height:6px;background:rgba(255,255,255,.12);border-radius:100px;overflow:hidden}
    .progress-bar-fill{height:100%;border-radius:100px;transition:width .6s ease;background:#d4af37}
    .pb-low{background:#ef4444}
    .pb-mid{background:#f59e0b}
    .pb-high{background:#10b981}

    /* Business Health */
    .health-badge{font-size:11px;font-weight:700;padding:4px 14px;border-radius:100px;text-transform:uppercase;letter-spacing:.05em}
    .health-excellent{background:rgba(16,185,129,0.15);color:#10b981}
    .health-good{background:rgba(245,158,11,0.15);color:#f59e0b}
    .health-warning{background:rgba(239,68,68,0.15);color:#ef4444}

    /* KPI Trend */
    .kpi-trend{display:block;font-size:12px;font-weight:600;margin-top:4px}
    .trend-up{color:#10b981}
    .trend-down{color:#ef4444}
    .trend-neutral{color:#94a3b8}

    /* Empty States */
    .empty-state{padding:32px 24px;text-align:center}
    .empty-icon{font-size:36px;margin-bottom:12px;line-height:1}
    .empty-title{font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px}
    .empty-desc{font-size:13px;color:#94a3b8;margin:0 0 16px;line-height:1.5}
    .empty-state .empty-action{display:inline-block;font-size:13px;font-weight:600;color:#6366f1;text-decoration:none;padding:8px 18px;border:1px solid #e0e7ff;border-radius:12px;transition:background .15s}
    .empty-state .empty-action:hover{background:#eef2ff}

    /* Revenue Analytics */
    .ra-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .ra-card{background:#f8fafc;border-radius:16px;padding:16px;text-align:center}
    .ra-label{display:block;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
    .ra-value{display:block;font-size:22px;font-weight:800;color:#0f172a;line-height:1.2}
    .ra-growth .ra-value{font-size:26px}
    .text-green{color:#10b981}
    .text-red{color:#ef4444}

    /* Booking Analytics */
    .ba-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .ba-card{display:flex;align-items:center;gap:14px;border-radius:16px;padding:16px}
    .ba-confirmed{background:#eff6ff}
    .ba-completed{background:#ecfdf5}
    .ba-pending{background:#fef3c7}
    .ba-cancelled{background:#fef2f2}
    .ba-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0}
    .ba-confirmed .ba-icon{background:#dbeafe;color:#1d4ed8}
    .ba-completed .ba-icon{background:#d1fae5;color:#065f46}
    .ba-pending .ba-icon{background:#fde68a;color:#92400e}
    .ba-cancelled .ba-icon{background:#fee2e2;color:#991b1b}
    .ba-body{flex:1}
    .ba-value{display:block;font-size:24px;font-weight:800;color:#0f172a;line-height:1.2}
    .ba-label{display:block;font-size:12px;color:#64748b;font-weight:500;margin-top:2px}

    /* Activity Timeline */
    .at-list{display:flex;flex-direction:column;gap:4px}
    .at-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;transition:background .12s}
    .at-item:hover{background:#f8fafc}
    .at-icon{font-size:18px;flex-shrink:0;width:32px;text-align:center}
    .at-body{flex:1;min-width:0}
    .at-title{display:block;font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .at-time{display:block;font-size:12px;color:#94a3b8;margin-top:2px}
    .at-amount{font-size:14px;font-weight:700;color:#0f172a;flex-shrink:0;margin-left:8px}

    /* Business Alerts */
    .alerts-list{display:flex;flex-direction:column;gap:8px}
    .alert-item{display:flex;align-items:center;gap:12px;padding:14px;border-radius:16px;cursor:pointer;transition:background .12s;border:1px solid #f1f5f9}
    .alert-item:hover{background:#f8fafc}
    .alert-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
    .alert-body{flex:1}
    .alert-title{display:block;font-size:14px;font-weight:700;color:#0f172a}
    .alert-count{display:block;font-size:12px;font-weight:600;margin-top:2px}
    .alert-arrow{font-size:16px;color:#94a3b8;flex-shrink:0}

    /* Refresh animation */
    .footer-refresh{background:transparent;border:1px solid #e5e7eb;border-radius:10px;padding:6px 16px;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:color .15s}
    .footer-refresh:hover:not(:disabled){background:#f8fafc}
    .footer-refresh:disabled{opacity:.6;cursor:not-allowed}
    .refresh-icon{display:inline-block;transition:transform .4s}
    .refreshing .refresh-icon{animation:spin 1s linear infinite}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

    /* ===== Notification Center ===== */
    .panel-header-actions{display:flex;align-items:center;gap:8px}
    .panel-header-btn{background:none;border:1px solid #e5e7eb;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;transition:all .12s}
    .panel-header-btn:hover{background:#f8fafc;color:#0f172a}
    .panel-header-btn:focus-visible{outline:2px solid #6366f1;outline-offset:2px}
    .nc-list{display:flex;flex-direction:column;gap:4px;max-height:400px;overflow-y:auto}
    .nc-item{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:14px;transition:background .12s;border-left:3px solid transparent}
    .nc-item:hover{background:#f8fafc}
    .nc-unread{background:#f0f9ff;border-left-color:#3b82f6}
    .nc-indicator{width:8px;height:8px;border-radius:50%;background:#3b82f6;flex-shrink:0;margin-top:5px}
    .nc-indicator-read{background:#d1d5db}
    .nc-body{flex:1;min-width:0}
    .nc-title{display:block;font-size:14px;font-weight:700;color:#0f172a}
    .nc-message{display:block;font-size:13px;color:#64748b;margin-top:2px;line-height:1.4}
    .nc-time{display:block;font-size:11px;color:#94a3b8;margin-top:3px}
    .nc-actions{display:flex;align-items:center;gap:4px;flex-shrink:0}
    .nc-btn{width:28px;height:28px;border-radius:8px;border:1px solid #e5e7eb;background:white;color:#64748b;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
    .nc-btn:hover{background:#ecfdf5;color:#065f46;border-color:#a7f3d0}
    .nc-btn-remove:hover{background:#fef2f2;color:#991b1b;border-color:#fecaca}
    .nc-btn:focus-visible{outline:2px solid #6366f1;outline-offset:2px}

    /* ===== Business Health Score ===== */
    .health-score-panel{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:white}
    .health-score-panel .panel-header h2{color:white}
    .hs-grid{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center}
    .hs-main{display:flex;flex-direction:column;align-items:center;gap:8px;padding-right:24px;border-right:1px solid rgba(255,255,255,0.1);min-width:120px}
    .hs-score{font-size:48px;font-weight:800;letter-spacing:-.03em;line-height:1}
    .hs-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:4px 14px;border-radius:100px}
    .hs-label.hs-excellent{background:rgba(16,185,129,0.2);color:#10b981}
    .hs-label.hs-good{background:rgba(59,130,246,0.2);color:#60a5fa}
    .hs-label.hs-warning{background:rgba(245,158,11,0.2);color:#fbbf24}
    .hs-label.hs-critical{background:rgba(239,68,68,0.2);color:#f87171}
    .hs-details{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .hs-item{display:flex;align-items:center;gap:10px}
    .hs-item-label{font-size:12px;font-weight:600;color:#94a3b8;min-width:80px;flex-shrink:0}
    .hs-bar-track{flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:100px;overflow:hidden}
    .hs-bar-fill{height:100%;border-radius:100px;transition:width .8s ease}
    .hs-bar-fill.hs-excellent{background:#10b981}
    .hs-bar-fill.hs-good{background:#3b82f6}
    .hs-bar-fill.hs-warning{background:#f59e0b}
    .hs-bar-fill.hs-critical{background:#ef4444}
    .hs-item-value{font-size:11px;font-weight:700;min-width:56px;text-align:right;text-transform:uppercase;letter-spacing:.03em}
    .hs-item-value.hs-excellent{color:#10b981}
    .hs-item-value.hs-good{color:#60a5fa}
    .hs-item-value.hs-warning{color:#fbbf24}
    .hs-item-value.hs-critical{color:#f87171}

    /* ===== Preferences Overlay ===== */
    .prefs-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:2000;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .prefs-panel{background:white;border-radius:24px;padding:28px;width:380px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
    .prefs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
    .prefs-header h3{margin:0;font-size:18px;font-weight:700;color:#0f172a}
    .prefs-close{background:none;border:0;font-size:24px;color:#94a3b8;cursor:pointer;padding:0;line-height:1}
    .prefs-close:hover{color:#0f172a}
    .prefs-close:focus-visible{outline:2px solid #6366f1;outline-offset:2px;border-radius:4px}
    .prefs-body{display:flex;flex-direction:column;gap:16px}
    .prefs-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f1f5f9;cursor:pointer}
    .prefs-row:last-child{border-bottom:0}
    .prefs-row span{font-size:14px;font-weight:500;color:#0f172a}
    .prefs-row input[type=checkbox]{width:18px;height:18px;accent-color:#6366f1;cursor:pointer}
    .prefs-row select{padding:6px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#0f172a;background:white;cursor:pointer}
    .prefs-row select:focus-visible{outline:2px solid #6366f1;outline-offset:2px}

    /* ===== Compact Mode ===== */
    .compact .dashboard-footer{padding:10px 0;font-size:11px}

    /* ===== Accessibility: Focus States ===== */
    *:focus-visible{outline:2px solid #6366f1;outline-offset:2px;border-radius:4px}
    .home a:focus-visible,.home button:focus-visible,.home [tabindex]:focus-visible{outline:2px solid #6366f1;outline-offset:2px;border-radius:4px}

    @media(max-width:1100px){.kpi-grid,.skeleton-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:1000px){.grid-2col{grid-template-columns:1fr}}
    @media(max-width:1000px){.dashboard-header{flex-direction:column;gap:16px}.header-meta{align-items:flex-start}}
    @media(max-width:1000px){.hs-grid{grid-template-columns:1fr}.hs-main{border-right:0;border-bottom:1px solid rgba(255,255,255,0.1);padding-right:0;padding-bottom:16px;flex-direction:row;justify-content:center;gap:16px}}
    @media(max-width:1000px){.hs-details{grid-template-columns:1fr}}
    @media(max-width:600px){.kpi-grid,.skeleton-grid{grid-template-columns:1fr}.quick-actions{grid-template-columns:1fr}}
    @media(max-width:600px){.search-input-header:focus,.search-wrapper.active .search-input-header{width:180px}.search-dropdown{width:320px;right:-80px}}
  `]
})
export class ModuleShellComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private dashboardService = inject(DashboardService);
  private globalSearchService = inject(GlobalSearchService);

  title = this.route.snapshot.data['title'] || 'home';
  loading = false;
  error = '';
  apiFailures = 0;

  bookings: any[] = [];
  staffList: any[] = [];
  clients: any[] = [];
  payments: any[] = [];
  inventory: any[] = [];
  lowStock: any[] = [];

  currentTime: Date = new Date();
  refreshing = false;
  private clockInterval: any = null;

  /* ===== Global Search ===== */
  searchQuery = '';
  searchResults: GlobalSearchResult | null = null;
  searchFocused = false;
  searchLoading = false;
  private searchSubject = new Subject<string>();

  /* ===== Notification Center ===== */
  showNotifications = false;
  notifications: any[] = [];
  unreadCount = 0;

  /* ===== Dashboard Preferences ===== */
  showPrefs = false;
  prefs = this.loadPreferences();

  get greeting(): string {
    return computeGreeting();
  }

  get yesterdayBookings(): any[] {
    return filterYesterday(this.bookings, 'startTime');
  }

  get yesterdayRevenue(): number {
    return this.yesterdayBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + (b.totalAmount || 0), 0);
  }

  get dailyTarget(): number {
    return computeDailyTarget(this.yesterdayRevenue);
  }

  get targetProgress(): number {
    if (this.dailyTarget <= 0) return 0;
    return Math.min(100, Math.round((this.computedTodayRevenue / this.dailyTarget) * 100));
  }

  get businessHealth(): { label: string; class: string } {
    const completionRate = this.computedTodayBookings > 0
      ? (this.computedCompletedBookings / this.computedTodayBookings) * 100
      : 0;
    return computeBusinessHealth({
      completionRate,
      targetProgress: this.targetProgress,
      lowStockCount: this.computedLowStockCount,
      duePayments: this.computedDuePayments,
    });
  }

  get bookingTrend(): { dir: string; pct: number } {
    return computeTrend(this.computedTodayBookings, this.yesterdayBookings.length);
  }

  get revenueTrend(): { dir: string; pct: number } {
    return computeTrend(this.computedTodayRevenue, this.yesterdayRevenue);
  }

  get bookingsToday(): any[] {
    return filterToday(this.bookings, 'startTime').sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }

  get computedTodayRevenue(): number {
    const todayStr = toDateStr(new Date());
    return (this.bookings || []).reduce((sum, b) => {
      if (b.status === 'COMPLETED' && b.startTime && toDateStr(new Date(b.startTime)) === todayStr) {
        return sum + (b.totalAmount || 0);
      }
      return sum;
    }, 0);
  }

  get computedTodayBookings(): number {
    return this.bookingsToday.length;
  }

  get computedCompletedBookings(): number {
    return this.bookingsToday.filter(b => b.status === 'COMPLETED').length;
  }

  get computedPendingBookings(): number {
    return (this.bookings || []).filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED').length;
  }

  get computedActiveClients(): number {
    return this.clients.length;
  }

  get computedLowStockCount(): number {
    return this.lowStock.length;
  }

  get computedStaffAvailable(): number {
    return (this.staffList || []).filter(s => this.staffBookingCount(s) < 3).length;
  }

  get computedPendingPaymentsAmount(): number {
    return this.computedDueToday;
  }

  get computedWeekRevenue(): number {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return (this.bookings || []).reduce((sum, b) => {
      if (b.status === 'COMPLETED' && b.startTime && new Date(b.startTime) >= startOfWeek) {
        return sum + (b.totalAmount || 0);
      }
      return sum;
    }, 0);
  }

  get computedMonthRevenue(): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return (this.bookings || []).reduce((sum, b) => {
      if (b.status === 'COMPLETED' && b.startTime && new Date(b.startTime) >= startOfMonth) {
        return sum + (b.totalAmount || 0);
      }
      return sum;
    }, 0);
  }

  get computedRevenueGrowth(): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthRev = (this.bookings || []).reduce((sum, b) => {
      if (b.status === 'COMPLETED' && b.startTime) {
        const d = new Date(b.startTime);
        if (d >= startOfLastMonth && d < startOfMonth) return sum + (b.totalAmount || 0);
      }
      return sum;
    }, 0);
    if (lastMonthRev === 0) return this.computedMonthRevenue > 0 ? 100 : 0;
    return Math.round(((this.computedMonthRevenue - lastMonthRev) / lastMonthRev) * 100);
  }

  get bookingStats(): { confirmed: number; completed: number; pending: number; cancelled: number } {
    const stats = { confirmed: 0, completed: 0, pending: 0, cancelled: 0 };
    (this.bookings || []).forEach(b => {
      if (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') stats.confirmed++;
      else if (b.status === 'COMPLETED') stats.completed++;
      else if (b.status === 'PENDING') stats.pending++;
      else if (b.status === 'CANCELLED' || b.status === 'NO_SHOW') stats.cancelled++;
    });
    return stats;
  }

  get todayBirthdays(): any[] {
    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();
    return (this.clients || []).filter(c => {
      if (c.dateOfBirth) {
        const dob = new Date(c.dateOfBirth);
        return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
      }
      return false;
    });
  }

  get businessAlerts(): { type: string; icon: string; title: string; count: number; route: string; color: string }[] {
    const alerts: { type: string; icon: string; title: string; count: number; route: string; color: string }[] = [];
    if (this.lowStock.length > 0) alerts.push({ type: 'low-stock', icon: '📦', title: 'Low Stock Items', count: this.lowStock.length, route: '/app/inventory', color: '#f43f5e' });
    if (this.computedDuePayments > 0) alerts.push({ type: 'pending-payments', icon: '💳', title: 'Pending Payments', count: this.computedDuePayments, route: '/app/payments', color: '#f59e0b' });
    const pendingConfirm = (this.bookings || []).filter(b => b.status === 'PENDING').length;
    if (pendingConfirm > 0) alerts.push({ type: 'pending-confirm', icon: '📋', title: 'Pending Confirmations', count: pendingConfirm, route: '/app/bookings', color: '#3b82f6' });
    const leaveCount = this.underbookedStaff.length;
    if (leaveCount > 0) alerts.push({ type: 'staff-leave', icon: '🏖️', title: 'Staff with No Bookings', count: leaveCount, route: '/app/staff', color: '#8b5cf6' });
    if (this.todayBirthdays.length > 0) alerts.push({ type: 'birthday', icon: '🎂', title: "Today's Birthdays", count: this.todayBirthdays.length, route: '/app/clients', color: '#ec4899' });
    return alerts;
  }

  get activityTimeline(): { type: string; icon: string; title: string; timestamp: Date; amount?: number }[] {
    const items: { type: string; icon: string; title: string; timestamp: Date; amount?: number }[] = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    (this.bookings || []).forEach(b => {
      if (b.startTime) {
        const d = new Date(b.startTime);
        if (d >= sevenDaysAgo) {
          items.push({ type: 'booking', icon: '📅', title: `Appointment booked for ${b.client?.fullName || b.clientName || 'Guest'}`, timestamp: d, amount: b.totalAmount });
        }
        if ((b.status === 'CANCELLED' || b.status === 'NO_SHOW') && d >= sevenDaysAgo) {
          items.push({ type: 'cancellation', icon: '❌', title: `Booking cancelled for ${b.client?.fullName || b.clientName || 'Guest'}`, timestamp: d });
        }
      }
    });

    (this.payments || []).forEach(p => {
      if (p.createdAt) {
        const d = new Date(p.createdAt);
        if (d >= sevenDaysAgo) {
          items.push({ type: 'payment', icon: '💳', title: `Payment received${p.method ? ' via ' + p.method : ''}`, timestamp: d, amount: p.amount });
        }
      }
    });

    (this.clients || []).forEach(c => {
      if (c.lastVisitAt) {
        const d = new Date(c.lastVisitAt);
        if (d >= sevenDaysAgo) {
          items.push({ type: 'client', icon: '👤', title: `Client added: ${c.fullName || 'New client'}`, timestamp: d });
        }
      }
    });

    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return items.slice(0, 15);
  }

  get computedPaidToday(): number {
    const todayStr = toDateStr(new Date());
    return (this.payments || []).filter(p => {
      if (p.createdAt) return toDateStr(new Date(p.createdAt)) === todayStr;
      return false;
    }).reduce((s, p) => s + (p.amount || 0), 0);
  }

  get computedDueToday(): number {
    return this.bookingsToday.reduce((sum, b) => {
      const paid = (b.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      return sum + Math.max(0, (b.totalAmount || 0) - paid);
    }, 0);
  }

  get computedTotalCollected(): number {
    return (this.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  }

  get computedCashTotal(): number {
    return (this.payments || []).filter(p => p.method === 'CASH').reduce((s, p) => s + (p.amount || 0), 0);
  }

  get computedUpiTotal(): number {
    return (this.payments || []).filter(p => p.method === 'UPI' || p.method === 'ONLINE').reduce((s, p) => s + (p.amount || 0), 0);
  }

  get computedCardTotal(): number {
    return (this.payments || []).filter(p => p.method === 'CARD').reduce((s, p) => s + (p.amount || 0), 0);
  }

  get computedInventoryValue(): number {
    return (this.inventory || []).reduce((s, item) => s + ((item.price || 0) * (item.quantity || item.stock || 0)), 0);
  }

  get computedDuePayments(): number {
    return this.bookingsToday.filter(b => {
      const paid = (b.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      return (b.totalAmount || 0) > paid;
    }).length;
  }

  get computedDueClients(): number {
    const clientIds = new Set<string>();
    this.bookingsToday.filter(b => {
      const paid = (b.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      return (b.totalAmount || 0) > paid;
    }).forEach(b => { if (b.clientId) clientIds.add(b.clientId); });
    return clientIds.size;
  }

  get recentPayments(): any[] {
    return (this.payments || []).slice().sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }).slice(0, 5);
  }

  get underbookedStaff(): any[] {
    return (this.staffList || []).filter(s => this.staffBookingCount(s) === 0);
  }

  get workQueueAlerts(): { text: string; count: number; route: string; color: string }[] {
    const alerts: { text: string; count: number; route: string; color: string }[] = [];
    const pending = (this.bookings || []).filter(b => b.status === 'PENDING').length;
    if (pending > 0) alerts.push({ text: 'Pending bookings need confirmation', count: pending, route: '/app/bookings', color: '#f59e0b' });
    const due = this.computedDuePayments;
    if (due > 0) alerts.push({ text: 'Bookings with due payments', count: due, route: '/app/payments', color: '#ef4444' });
    if (this.lowStock.length > 0) alerts.push({ text: 'Low stock items need reorder', count: this.lowStock.length, route: '/app/inventory', color: '#f43f5e' });
    const cancelled = (this.bookings || []).filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length;
    if (cancelled > 0) alerts.push({ text: 'Cancelled / no-show bookings', count: cancelled, route: '/app/bookings', color: '#8b5cf6' });
    return alerts;
  }

  get insightList(): { text: string; type: string }[] {
    const items: { text: string; type: string }[] = [];
    const todayCount = this.computedTodayBookings;
    if (todayCount > 0) items.push({ text: `${todayCount} booking(s) scheduled today`, type: 'positive' });
    const pendingCount = this.computedPendingBookings;
    if (pendingCount > 0) items.push({ text: `${pendingCount} booking(s) pending confirmation`, type: 'warning' });
    const revenue = this.computedTodayRevenue;
    if (revenue > 0) items.push({ text: `Revenue today is $${revenue.toLocaleString()}`, type: 'positive' });
    if (this.computedLowStockCount > 0) items.push({ text: `${this.computedLowStockCount} low stock alert(s)`, type: 'danger' });
    const due = this.computedDuePayments;
    if (due > 0) items.push({ text: `${due} booking(s) have outstanding payments`, type: 'warning' });
    const busyStaff = (this.staffList || []).filter(s => this.staffBookingCount(s) >= 3).map(s => s.fullName || s.name).slice(0, 2);
    if (busyStaff.length > 0) items.push({ text: `${busyStaff.join(', ')} ${busyStaff.length === 1 ? 'has' : 'have'} highest workload today`, type: 'warning' });
    const under = this.underbookedStaff.length;
    if (under > 0) items.push({ text: `${under} staff member(s) with no bookings today`, type: 'warning' });
    if (items.length === 0) items.push({ text: 'Connect more data for deeper insights', type: 'positive' });
    return items;
  }

  staffBookingCount(s: any): number {
    return computeStaffBookingCount(this.bookingsToday, s);
  }

  staffCompletedCount(s: any): number {
    return computeStaffCompletedCount(this.bookingsToday, s);
  }

  staffRevenue(s: any): number {
    return computeStaffRevenue(this.bookingsToday, s);
  }

  /* ===== TrackBy (Performance) ===== */
  trackByIndex(_idx: number, _item: any): number { return _idx; }
  trackByBookingId(_idx: number, b: any): string { return b.id || _idx; }
  trackByStaffId(_idx: number, s: any): string { return s.id || _idx; }
  trackByPaymentId(_idx: number, p: any): string { return p.id || _idx; }
  trackByInventoryId(_idx: number, item: any): string { return item.id || _idx; }

  /* ===== Business Health Score Getters ===== */
  get healthScoreRevenue(): number {
    const total = this.computedTodayRevenue || 0;
    const target = this.dailyTarget || 1;
    return Math.min(100, Math.round((total / target) * 100));
  }
  get healthScoreBookings(): number {
    const total = this.computedTodayBookings || 0;
    const cap = Math.max(this.staffList.length * 3, 1);
    return Math.min(100, Math.round((total / cap) * 100));
  }
  get healthScorePayments(): number {
    const totalPaid = this.computedPaidToday || 0;
    const totalDue = this.computedTodayRevenue || 1;
    return Math.min(100, Math.round((totalPaid / totalDue) * 100));
  }
  get healthScoreInventory(): number {
    const total = this.inventory.length || 0;
    const low = this.lowStock.length || 0;
    if (total === 0) return 50;
    return Math.min(100, Math.round(((total - low) / total) * 100));
  }
  get healthScoreStaff(): number {
    const total = this.staffList.length || 1;
    const busy = (this.staffList || []).filter(s => this.staffBookingCount(s) >= 3).length;
    return Math.min(100, Math.round((busy / total) * 100));
  }
  get healthScoreOverall(): number {
    return Math.round(
      (this.healthScoreRevenue + this.healthScoreBookings +
       this.healthScorePayments + this.healthScoreInventory +
       this.healthScoreStaff) / 5
    );
  }
  get healthScoreClass(): string {
    const s = this.healthScoreOverall;
    if (s >= 80) return 'hs-excellent';
    if (s >= 50) return 'hs-good';
    if (s >= 25) return 'hs-warning';
    return 'hs-critical';
  }
  get healthScoreLabel(): string {
    const s = this.healthScoreOverall;
    if (s >= 80) return 'Excellent';
    if (s >= 50) return 'Good';
    if (s >= 25) return 'Warning';
    return 'Critical';
  }
  healthScoreClassFor(score: number): string {
    if (score >= 80) return 'hs-excellent';
    if (score >= 50) return 'hs-good';
    if (score >= 25) return 'hs-warning';
    return 'hs-critical';
  }
  healthScoreLevelFor(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 25) return 'Warning';
    return 'Critical';
  }

  /* ===== Global Search ===== */
  onGlobalSearch(value: string) {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }
  onSearchBlur() {
    setTimeout(() => { this.searchFocused = false; }, 200);
  }
  closeSearch() {
    this.searchQuery = '';
    this.searchResults = null;
    this.searchFocused = false;
    this.searchLoading = false;
  }
  onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
    }
  }
  onSearchDropdownMousedown(event: MouseEvent) {
    event.preventDefault();
  }
  private setupSearch() {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q: string) => {
        if (q.length < 2) {
          this.searchResults = null;
          return of(null);
        }
        this.searchLoading = true;
        return this.globalSearchService.search(q).pipe(
          catchError(() => {
            this.searchLoading = false;
            return of(null);
          })
        );
      })
    ).subscribe((data) => {
      if (data) this.searchResults = data;
      this.searchLoading = false;
    });
  }

  /* ===== Notification Center ===== */
  toggleNotificationPanel() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.loadNotifications();
  }
  loadNotifications() {
    this.dashboardService.getNotifications({ read: 'false', archived: 'false' }).subscribe({
      next: (d) => { this.notifications = d || []; },
      error: () => {},
    });
    this.dashboardService.getUnreadCount().subscribe({
      next: (d) => { this.unreadCount = d.count || 0; },
      error: () => {},
    });
  }
  markNotificationRead(n: any) {
    if (n.read) return;
    this.dashboardService.markNotificationRead(n.id).subscribe({
      next: () => {
        n.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: () => {},
    });
  }
  markAllNotificationsRead() {
    this.dashboardService.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
      },
      error: () => {},
    });
  }
  clearAllNotifications() {
    this.notifications = [];
    this.unreadCount = 0;
  }
  dismissNotification(n: any) {
    this.notifications = this.notifications.filter(x => x !== n);
    if (!n.read) this.unreadCount = Math.max(0, this.unreadCount - 1);
  }

  /* ===== Dashboard Preferences ===== */
  togglePreferences() {
    this.showPrefs = !this.showPrefs;
  }
  loadPreferences(): any {
    try {
      const saved = localStorage.getItem('dashboard_prefs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { hideRevenue: false, compactMode: false, autoRefresh: false, defaultTimeRange: 'today' };
  }
  savePreferences() {
    try {
      localStorage.setItem('dashboard_prefs', JSON.stringify(this.prefs));
    } catch {}
  }
  toggleAutoRefresh() {
    this.savePreferences();
    if (this.prefs.autoRefresh) {
      this.clockInterval = setInterval(() => { this.loadDashboard(); }, 30000);
    }
  }
  onPrefsPanelClick(event: MouseEvent) {
    event.stopPropagation();
  }
  get hasUnreadNotifications(): boolean {
    return this.notifications.some(n => !n.read);
  }

  ngOnInit() {
    if (this.title === 'home') {
      this.setupSearch();
      this.loadDashboard();
      this.loadNotifications();
      this.clockInterval = setInterval(() => { this.currentTime = new Date(); }, 1000);
    }
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.searchSubject.complete();
  }

  loadDashboard() {
    if (this.refreshing) return;
    this.refreshing = true;
    this.loading = true;
    this.error = '';
    this.apiFailures = 0;

    this.dashboardService.getBookings().subscribe({
      next: (d) => { this.bookings = d || []; },
      error: () => { this.apiFailures++; },
    });

    this.dashboardService.getStaff().subscribe({
      next: (d) => { this.staffList = d || []; },
      error: () => { this.apiFailures++; },
    });

    this.dashboardService.getClients().subscribe({
      next: (d) => { this.clients = d || []; },
      error: () => { this.apiFailures++; },
    });

    this.dashboardService.getPayments().subscribe({
      next: (d) => { this.payments = d || []; },
      error: () => { this.apiFailures++; },
    });

    this.dashboardService.getInventory().subscribe({
      next: (d) => { this.inventory = d || []; },
      error: () => { this.apiFailures++; },
    });

    this.dashboardService.getLowStock().subscribe({
      next: (d) => { this.lowStock = d || []; },
      error: () => { this.apiFailures++; },
    });

    this.dashboardService.getAdvancedReports().subscribe({
      next: (d) => {
        if (this.bookings.length === 0 && d?.totalBookings != null) {
          this.bookings = d.bookings || [];
        }
      },
      error: () => {},
    });

    // Mark loading complete after a short delay to allow parallel requests
    setTimeout(() => { this.loading = false; this.refreshing = false; }, 1500);
    // Also stop loading when at least some data has arrived
    setTimeout(() => {
      if (this.bookings.length > 0 || this.staffList.length > 0 || this.clients.length > 0 || this.payments.length > 0) {
        this.loading = false;
        this.refreshing = false;
      }
    }, 800);
    // Force stop loading after timeout
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.refreshing = false;
        if (this.apiFailures >= 4) this.error = 'Some dashboard data could not be loaded. Refresh to try again.';
      }
    }, 5000);
  }

}
