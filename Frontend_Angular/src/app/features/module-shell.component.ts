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
          <div class="module-card"><h3>Status</h3><b>Ready</b><p>Module is available</p></div>
          <div class="module-card"><h3>Module</h3><b>{{ title | titlecase }}</b><p>Navigate from sidebar</p></div>
          <div class="module-card"><h3>API</h3><b>Connected</b><p>Backend integration ready</p></div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    /* ====================================================
       AMBITION LUXURY ENTERPRISE DASHBOARD
       Premium glassmorphism · Aurora · Gold accents
       ==================================================== */

    /* --- PAGE BACKGROUND + AURORA --- */
    :host{display:block;position:relative;min-height:100vh}
    .home{display:grid;gap:24px;padding:24px 0 40px;position:relative}
    .home::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:0;
      background:
        radial-gradient(ellipse 800px 600px at 15% 10%,rgba(99,102,241,.07),transparent 70%),
        radial-gradient(ellipse 600px 500px at 85% 85%,rgba(168,85,247,.05),transparent 70%),
        radial-gradient(ellipse 500px 400px at 50% 50%,rgba(236,72,153,.03),transparent 70%);
      animation:auroraShift 25s ease-in-out infinite alternate}
    .home > *{position:relative;z-index:1}
    @keyframes auroraShift{
      0%{opacity:.5;transform:translate(0,0) scale(1)}
      50%{opacity:1;transform:translate(15px,-10px) scale(1.03)}
      100%{opacity:.6;transform:translate(-8px,8px) scale(.98)}
    }

    /* --- LOADING SKELETON (Premium) --- */
    .loading{display:grid;gap:18px;padding:24px 0}
    .skeleton-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .skeleton-card,.skeleton-panel{background:rgba(255,255,255,.7);backdrop-filter:blur(12px);border:1px solid rgba(99,102,241,.08);border-radius:24px;overflow:hidden;position:relative;min-height:120px;
      box-shadow:0 4px 20px rgba(79,70,229,.06)}
    .skeleton-panel{min-height:200px}
    .sk-shimmer{position:absolute;inset:0;
      background:linear-gradient(90deg,transparent 0%,rgba(99,102,241,.04) 30%,rgba(168,85,247,.06) 50%,rgba(99,102,241,.04) 70%,transparent 100%);
      background-size:200% 100%;animation:shimmer 2s ease-in-out infinite}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .loading-text{text-align:center;color:#a5b4fc;font-size:14px;padding:12px 0;font-weight:600;letter-spacing:.02em}

    /* --- ERROR BANNER --- */
    .error{background:linear-gradient(135deg,rgba(254,242,242,.9),rgba(254,226,226,.8));backdrop-filter:blur(12px);border:1px solid rgba(239,68,68,.2);border-radius:24px;padding:28px;text-align:center;
      box-shadow:0 8px 32px rgba(239,68,68,.08)}
    .error strong{color:#991b1b;font-size:16px;display:block}
    .error p{color:#7f1d1d;margin:8px 0;font-size:14px}
    .retry-btn{margin-top:12px;background:linear-gradient(135deg,#0b0b0b,#1e1b4b);color:white;border:0;border-radius:14px;padding:11px 28px;font-weight:700;cursor:pointer;transition:all .2s;
      box-shadow:0 4px 16px rgba(11,11,11,.3)}
    .retry-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(11,11,11,.4)}

    /* ===== HERO BANNER ===== */
    .dashboard-header{display:flex;justify-content:space-between;align-items:flex-start;
      background:linear-gradient(135deg,#0b0b0b 0%,#1a1a2e 40%,#0f172a 100%);color:white;
      border-radius:28px;padding:36px 40px;position:relative;overflow:hidden;
      box-shadow:0 12px 48px rgba(11,11,11,.3),0 4px 16px rgba(79,70,229,.08)}
    .dashboard-header::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;
      background:radial-gradient(ellipse 600px 400px at 30% 20%,rgba(99,102,241,.12),transparent 60%),
        radial-gradient(ellipse 400px 300px at 80% 80%,rgba(168,85,247,.08),transparent 60%);
      animation:heroAurora 20s ease-in-out infinite alternate;pointer-events:none}
    .dashboard-header::after{content:'';position:absolute;inset:0;
      background:linear-gradient(135deg,transparent 40%,rgba(212,175,55,.06) 60%,transparent 80%);
      pointer-events:none}
    @keyframes heroAurora{
      0%{transform:translate(0,0) rotate(0deg)}
      50%{transform:translate(20px,-15px) rotate(1deg)}
      100%{transform:translate(-10px,10px) rotate(-1deg)}
    }
    .dashboard-header > *{position:relative;z-index:1}
    .dashboard-header h1{font-size:32px;font-weight:800;letter-spacing:-.03em;
      background:linear-gradient(135deg,#ffffff 0%,#e2e8f0 50%,#d4af37 100%);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .header-subtitle{margin:8px 0 0;color:#94a3b8;font-size:15px;max-width:500px;line-height:1.5}
    .header-meta{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;min-width:0}
    .header-top-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .header-info-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .header-date{font-size:14px;color:#cbd5e1;font-weight:500}
    .header-clock{font-size:14px;font-weight:600;color:#d4af37;font-variant-numeric:tabular-nums;
      text-shadow:0 0 12px rgba(212,175,55,.3)}
    .header-greeting{font-size:13px;color:#a5b4fc;font-weight:600}
    .header-actions{display:flex;align-items:center;gap:6px}
    .header-icon-btn{position:relative;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
      border-radius:12px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;
      cursor:pointer;color:white;font-size:16px;transition:all .2s;backdrop-filter:blur(8px)}
    .header-icon-btn:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.25);
      box-shadow:0 4px 16px rgba(99,102,241,.2)}
    .header-icon-btn:focus-visible{outline:2px solid #d4af37;outline-offset:2px}
    .hbtn-icon{line-height:1}
    .hbtn-badge{position:absolute;top:-5px;right:-5px;
      background:linear-gradient(135deg,#ef4444,#dc2626);color:white;font-size:10px;font-weight:800;
      min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;
      padding:0 5px;border:2px solid #0b0b0b;line-height:1;
      box-shadow:0 2px 8px rgba(239,68,68,.4);animation:badgePulse 2s ease-in-out infinite}
    @keyframes badgePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
    .live-badge{display:inline-flex;align-items:center;gap:6px;
      background:rgba(16,185,129,.15);color:#10b981;font-size:12px;font-weight:700;
      padding:5px 14px;border-radius:100px;text-transform:uppercase;letter-spacing:.06em;
      border:1px solid rgba(16,185,129,.2);backdrop-filter:blur(4px)}
    .live-badge .dot{width:7px;height:7px;border-radius:50%;background:#10b981;
      box-shadow:0 0 8px rgba(16,185,129,.6);animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.8)}}

    /* --- TARGET PROGRESS (Luxury) --- */
    .header-progress-row{margin-top:18px;max-width:420px}
    .header-target{display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px}
    .target-label{color:#94a3b8;font-weight:500}
    .target-value{color:#e2e8f0;font-weight:700}
    .progress-bar-track{height:8px;background:rgba(255,255,255,.08);border-radius:100px;overflow:hidden;
      box-shadow:inset 0 1px 3px rgba(0,0,0,.2)}
    .progress-bar-fill{height:100%;border-radius:100px;transition:width .8s cubic-bezier(.4,0,.2,1);
      background:linear-gradient(90deg,#d4af37,#fbbf24,#d4af37);background-size:200% 100%;
      animation:goldShimmer 3s ease-in-out infinite;position:relative}
    .progress-bar-fill::after{content:'';position:absolute;inset:0;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);
      animation:shimmerSweep 2s ease-in-out infinite}
    @keyframes goldShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    @keyframes shimmerSweep{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
    .pb-low{background:linear-gradient(90deg,#ef4444,#f87171)!important}
    .pb-mid{background:linear-gradient(90deg,#f59e0b,#fbbf24)!important}
    .pb-high{background:linear-gradient(90deg,#10b981,#34d399)!important}

    /* --- BUSINESS HEALTH BADGE --- */
    .health-badge{font-size:11px;font-weight:700;padding:5px 14px;border-radius:100px;
      text-transform:uppercase;letter-spacing:.06em;backdrop-filter:blur(8px);
      border:1px solid rgba(255,255,255,.1)}
    .health-excellent{background:rgba(16,185,129,.2);color:#10b981;border-color:rgba(16,185,129,.3);
      box-shadow:0 0 12px rgba(16,185,129,.15)}
    .health-good{background:rgba(245,158,11,.2);color:#fbbf24;border-color:rgba(245,158,11,.3);
      box-shadow:0 0 12px rgba(245,158,11,.15)}
    .health-warning{background:rgba(239,68,68,.2);color:#f87171;border-color:rgba(239,68,68,.3);
      box-shadow:0 0 12px rgba(239,68,68,.15)}

    /* --- GLOBAL SEARCH (Luxury) --- */
    .search-wrapper{position:relative}
    .search-input-header{width:210px;padding:9px 36px 9px 14px;
      border:1px solid rgba(255,255,255,.15);border-radius:12px;
      background:rgba(255,255,255,.08);color:white;font-size:13px;outline:none;
      transition:all .25s cubic-bezier(.4,0,.2,1);backdrop-filter:blur(8px)}
    .search-input-header::placeholder{color:rgba(255,255,255,.45)}
    .search-input-header:focus,.search-wrapper.active .search-input-header{
      border-color:rgba(212,175,55,.4);background:rgba(255,255,255,.12);width:280px;
      box-shadow:0 0 0 3px rgba(212,175,55,.1),0 4px 16px rgba(0,0,0,.1)}
    .search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:13px;opacity:.5;pointer-events:none}
    .search-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:0;
      color:rgba(255,255,255,.5);font-size:18px;cursor:pointer;padding:2px 4px;line-height:1;
      transition:color .15s}
    .search-clear:hover{color:white}
    .search-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:400px;max-height:440px;
      overflow-y:auto;background:rgba(255,255,255,.95);backdrop-filter:blur(16px);
      border:1px solid rgba(99,102,241,.1);border-radius:18px;
      box-shadow:0 16px 48px rgba(79,70,229,.12),0 4px 16px rgba(0,0,0,.08);z-index:1000;padding:10px;
      animation:fadeInScale .2s ease}
    @keyframes fadeInScale{from{opacity:0;transform:scale(.97) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
    .sd-loading{padding:16px;text-align:center;color:#a5b4fc;font-size:13px;font-weight:600}
    .sd-empty{padding:24px;text-align:center;color:#94a3b8;font-size:14px}
    .sd-empty p{margin:0}
    .sd-group{margin-bottom:8px}
    .sd-group:last-child{margin-bottom:0}
    .sd-group-title{font-size:11px;font-weight:700;color:#a5b4fc;text-transform:uppercase;
      letter-spacing:.06em;padding:8px 12px 4px}
    .sd-item{display:flex;flex-direction:column;padding:10px 12px;border-radius:12px;cursor:pointer;
      transition:all .15s;text-decoration:none;color:inherit}
    .sd-item:hover{background:rgba(99,102,241,.06);transform:translateX(2px)}
    .sd-item strong{font-size:13px;font-weight:700;color:#0f172a}
    .sd-item span{font-size:11px;color:#94a3b8;margin-top:2px}
    .sd-view-all{display:block;text-align:center;padding:12px;font-size:13px;font-weight:600;
      color:#6366f1;text-decoration:none;border-top:1px solid rgba(99,102,241,.08);margin-top:6px;
      border-radius:0 0 8px 8px;transition:background .15s}
    .sd-view-all:hover{background:rgba(99,102,241,.04)}

    /* ===== KPI CARDS (Premium Glass + Gradient + Glow) ===== */
    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:rgba(255,255,255,.75);backdrop-filter:blur(12px);
      border:1px solid rgba(99,102,241,.08);border-radius:20px;display:flex;overflow:hidden;
      box-shadow:0 4px 20px rgba(79,70,229,.06),0 1px 3px rgba(0,0,0,.04);
      transition:all .25s cubic-bezier(.4,0,.2,1);cursor:pointer;position:relative}
    .kpi-card::before{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);
      transition:left .5s ease;pointer-events:none;border-radius:inherit}
    .kpi-card:hover::before{left:120%}
    .kpi-card:hover{box-shadow:0 12px 36px rgba(79,70,229,.12),0 4px 12px rgba(0,0,0,.06);
      transform:translateY(-3px);border-color:rgba(99,102,241,.15)}
    .kpi-indicator{width:5px;flex-shrink:0;border-radius:0 4px 4px 0}
    .card-revenue .kpi-indicator{background:linear-gradient(180deg,#10b981,#059669);
      box-shadow:0 0 12px rgba(16,185,129,.3)}
    .card-bookings .kpi-indicator{background:linear-gradient(180deg,#3b82f6,#2563eb);
      box-shadow:0 0 12px rgba(59,130,246,.3)}
    .card-completed .kpi-indicator{background:linear-gradient(180deg,#06b6d4,#0891b2);
      box-shadow:0 0 12px rgba(6,182,212,.3)}
    .card-pending .kpi-indicator{background:linear-gradient(180deg,#f59e0b,#d97706);
      box-shadow:0 0 12px rgba(245,158,11,.3)}
    .card-clients .kpi-indicator{background:linear-gradient(180deg,#8b5cf6,#7c3aed);
      box-shadow:0 0 12px rgba(139,92,246,.3)}
    .card-stock .kpi-indicator{background:linear-gradient(180deg,#f43f5e,#e11d48);
      box-shadow:0 0 12px rgba(244,63,94,.3)}
    .card-staff-available .kpi-indicator{background:linear-gradient(180deg,#10b981,#34d399);
      box-shadow:0 0 12px rgba(16,185,129,.3)}
    .card-pending-payments .kpi-indicator{background:linear-gradient(180deg,#f59e0b,#fbbf24);
      box-shadow:0 0 12px rgba(245,158,11,.3)}
    .kpi-content{padding:20px 22px;flex:1;position:relative}
    .kpi-label{display:block;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:.06em;margin-bottom:8px}
    .kpi-value{display:block;font-size:32px;font-weight:800;color:#0f172a;line-height:1.1;
      margin-bottom:6px;letter-spacing:-.02em;
      animation:countIn .6s cubic-bezier(.4,0,.2,1) both}
    @keyframes countIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .kpi-meta{display:block;color:#94a3b8;font-size:12px;font-weight:500}
    .kpi-trend{display:block;font-size:12px;font-weight:700;margin-top:4px}
    .trend-up{color:#10b981}
    .trend-down{color:#ef4444}
    .trend-neutral{color:#94a3b8}

    /* ===== PANELS (Premium Glass + Gold Accent) ===== */
    .panel{background:rgba(255,255,255,.7);backdrop-filter:blur(12px);
      border:1px solid rgba(99,102,241,.08);border-radius:24px;padding:28px;
      box-shadow:0 4px 24px rgba(79,70,229,.05),0 1px 3px rgba(0,0,0,.03);
      transition:all .25s ease;position:relative;overflow:hidden}
    .panel::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
      background:linear-gradient(90deg,transparent,rgba(212,175,55,.15),rgba(99,102,241,.1),transparent);
      opacity:0;transition:opacity .3s ease}
    .panel:hover::before{opacity:1}
    .panel:hover{box-shadow:0 8px 32px rgba(79,70,229,.08),0 2px 8px rgba(0,0,0,.04);
      border-color:rgba(99,102,241,.12)}
    .panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
    .panel-header h2{margin:0;font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.01em}
    .panel-action{font-size:12px;font-weight:600;color:#6366f1;text-decoration:none;
      padding:5px 12px;border-radius:8px;transition:all .15s}
    .panel-action:hover{background:rgba(99,102,241,.06);text-decoration:none}
    .panel-footer-link{display:block;text-align:center;padding:14px 0 0;font-size:13px;font-weight:600;
      color:#6366f1;text-decoration:none;transition:color .15s}
    .panel-footer-link:hover{color:#4f46e5}
    .grid-2col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .empty-action{display:inline-block;font-size:13px;font-weight:600;color:#6366f1;text-decoration:none;
      padding:8px 18px;border:1px solid rgba(99,102,241,.15);border-radius:12px;transition:all .15s;
      background:rgba(99,102,241,.04)}
    .empty-action:hover{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.3)}

    /* --- Empty States --- */
    .empty-state{padding:36px 24px;text-align:center}
    .empty-icon{font-size:40px;margin-bottom:14px;line-height:1;
      filter:drop-shadow(0 2px 8px rgba(0,0,0,.1))}
    .empty-title{font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px}
    .empty-desc{font-size:13px;color:#94a3b8;margin:0 0 18px;line-height:1.5}
    .empty-state .empty-action{display:inline-block;font-size:13px;font-weight:600;color:#6366f1;
      text-decoration:none;padding:9px 20px;border:1px solid rgba(99,102,241,.15);border-radius:12px;
      transition:all .15s;background:rgba(99,102,241,.04)}
    .empty-state .empty-action:hover{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.3);
      transform:translateY(-1px)}

    /* --- Upcoming Bookings --- */
    .ub-list{display:flex;flex-direction:column}
    .ub-card{display:flex;align-items:center;padding:14px 16px;border-radius:16px;
      transition:all .2s cubic-bezier(.4,0,.2,1);cursor:pointer;gap:14px;
      border-bottom:1px solid rgba(99,102,241,.05);position:relative}
    .ub-card:hover{background:rgba(99,102,241,.04);transform:translateX(3px);
      box-shadow:0 2px 12px rgba(79,70,229,.06)}
    .ub-card:last-child{border-bottom:0}
    .ub-time{font-size:13px;font-weight:700;color:#6366f1;min-width:56px;white-space:nowrap;
      background:rgba(99,102,241,.06);padding:4px 10px;border-radius:8px;text-align:center}
    .ub-body{flex:1;min-width:0}
    .ub-client{font-weight:700;font-size:14px;color:#0f172a}
    .ub-meta{font-size:12px;color:#64748b;margin-top:3px;white-space:nowrap;overflow:hidden;
      text-overflow:ellipsis}
    .ub-dot{margin:0 4px}
    .ub-status{flex-shrink:0}
    .ub-amount{font-weight:700;font-size:14px;color:#0f172a;margin-left:8px}
    .status-chip{display:inline-block;font-size:10px;font-weight:700;padding:4px 12px;
      border-radius:100px;text-transform:uppercase;letter-spacing:.04em;
      box-shadow:0 1px 4px rgba(0,0,0,.08)}
    .status-confirmed,.status-checked_in{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1d4ed8;
      box-shadow:0 1px 6px rgba(59,130,246,.15)}
    .status-completed{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;
      box-shadow:0 1px 6px rgba(16,185,129,.15)}
    .status-pending{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;
      box-shadow:0 1px 6px rgba(245,158,11,.15)}
    .status-cancelled{background:linear-gradient(135deg,#fee2e2,#fecdd3);color:#991b1b;
      box-shadow:0 1px 6px rgba(239,68,68,.15)}
    .status-no_show{background:linear-gradient(135deg,#f3e8ff,#e9d5ff);color:#6d28d9;
      box-shadow:0 1px 6px rgba(139,92,246,.15)}

    /* --- AI Insights --- */
    .insight-list{display:flex;flex-direction:column;gap:10px}
    .insight-row{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:14px;
      background:rgba(248,250,252,.6);font-size:14px;transition:all .15s;
      border:1px solid rgba(99,102,241,.04)}
    .insight-row:hover{background:rgba(248,250,252,.9);transform:translateX(2px)}
    .insight-icon{font-size:10px;flex-shrink:0;margin-top:5px}
    .insight-positive{color:#10b981}
    .insight-warning{color:#f59e0b}
    .insight-danger{color:#ef4444}
    .insight-text{color:#334155;line-height:1.5;font-weight:500}
    .insight-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
    .insight-btn{font-size:12px;font-weight:600;color:#6366f1;padding:7px 16px;
      border:1px solid rgba(99,102,241,.15);border-radius:100px;text-decoration:none;
      transition:all .15s;background:rgba(99,102,241,.04)}
    .insight-btn:hover{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.3);
      transform:translateY(-1px)}

    /* --- Staff Performance --- */
    .staff-scroll{max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;
      scrollbar-width:thin;scrollbar-color:rgba(99,102,241,.15) transparent}
    .staff-scroll::-webkit-scrollbar{width:6px}
    .staff-scroll::-webkit-scrollbar-thumb{background:rgba(99,102,241,.15);border-radius:999px}
    .staff-card{display:flex;align-items:center;padding:14px 16px;border-radius:16px;
      transition:all .2s cubic-bezier(.4,0,.2,1);cursor:pointer;gap:14px;
      border:1px solid rgba(99,102,241,.06);background:rgba(255,255,255,.5)}
    .staff-card:hover{background:rgba(99,102,241,.04);border-color:rgba(99,102,241,.12);
      transform:translateX(3px);box-shadow:0 4px 16px rgba(79,70,229,.06)}
    .staff-avatar{width:40px;height:40px;border-radius:50%;
      background:linear-gradient(135deg,#eef2ff,#e0e7ff);color:#6366f1;
      display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;
      flex-shrink:0;box-shadow:0 0 0 3px rgba(255,255,255,.8),0 2px 8px rgba(99,102,241,.15);
      transition:transform .2s}
    .staff-card:hover .staff-avatar{transform:scale(1.08)}
    .staff-info{flex:1;min-width:0}
    .staff-name{font-weight:700;font-size:14px;color:#0f172a}
    .staff-role{font-size:12px;color:#64748b;margin-top:1px}
    .staff-metrics{display:flex;gap:16px;flex-shrink:0}
    .staff-metric{text-align:center}
    .sm-value{display:block;font-weight:700;font-size:14px;color:#0f172a}
    .sm-label{display:block;font-size:10px;color:#94a3b8;text-transform:uppercase;
      letter-spacing:.04em;margin-top:2px}
    .staff-workload{flex-shrink:0}
    .wl-chip{display:inline-block;font-size:10px;font-weight:700;padding:4px 12px;
      border-radius:100px;text-transform:uppercase;letter-spacing:.04em;
      box-shadow:0 1px 4px rgba(0,0,0,.08)}
    .wl-high{background:linear-gradient(135deg,#fee2e2,#fecdd3);color:#991b1b;
      box-shadow:0 1px 6px rgba(239,68,68,.12)}
    .wl-medium{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;
      box-shadow:0 1px 6px rgba(245,158,11,.12)}
    .wl-low{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;
      box-shadow:0 1px 6px rgba(16,185,129,.12)}
    .staff-alert{display:flex;align-items:center;gap:10px;margin-top:14px;
      padding:12px 16px;background:linear-gradient(135deg,rgba(254,243,199,.8),rgba(254,224,136,.6));
      border-radius:14px;font-size:13px;color:#92400e;font-weight:600;
      border:1px solid rgba(245,158,11,.15)}
    .alert-icon{font-size:16px}

    /* --- Payment Snapshot --- */
    .ps-grid{display:flex;flex-direction:column;gap:8px}
    .ps-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;
      border-bottom:1px solid rgba(99,102,241,.05)}
    .ps-row:last-child{border-bottom:0}
    .ps-label{font-size:14px;color:#64748b;font-weight:500}
    .ps-value{font-size:20px;font-weight:800;color:#0f172a}
    .ps-value-paid{color:#065f46}
    .ps-value-due{color:#92400e}
    .ps-row-total{border-bottom:0;padding-top:8px;border-top:2px solid rgba(99,102,241,.08)}
    .ps-methods{display:flex;flex-wrap:wrap;gap:16px;margin-top:10px}
    .ps-method{font-size:13px;font-weight:600;color:#0f172a;display:flex;align-items:center;gap:7px}
    .ps-method-dot{width:9px;height:9px;border-radius:50%;display:inline-block;
      box-shadow:0 0 6px rgba(0,0,0,.15)}
    .ps-footer{margin-top:16px;padding-top:16px;border-top:1px solid rgba(99,102,241,.05)}
    .ps-recent-title{font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:10px;
      text-transform:uppercase;letter-spacing:.04em}
    .ps-recent-item{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;color:#0f172a}

    /* --- Quick Actions --- */
    .quick-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .qa-btn{display:flex;align-items:center;gap:10px;
      border:1px solid rgba(99,102,241,.08);background:rgba(255,255,255,.6);
      backdrop-filter:blur(8px);border-radius:16px;padding:16px 18px;font-weight:700;
      text-align:left;text-decoration:none;color:#0b0b0b;
      transition:all .2s cubic-bezier(.4,0,.2,1);font-size:13px;position:relative;overflow:hidden}
    .qa-btn::before{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);
      transition:left .4s ease;pointer-events:none}
    .qa-btn:hover::before{left:120%}
    .qa-btn:hover{background:rgba(255,255,255,.85);box-shadow:0 6px 20px rgba(79,70,229,.08);
      transform:translateY(-2px);border-color:rgba(99,102,241,.15)}
    .qa-primary{border-color:rgba(99,102,241,.2);color:#6366f1;
      background:linear-gradient(135deg,rgba(238,242,255,.8),rgba(224,231,255,.6))}
    .qa-primary:hover{background:linear-gradient(135deg,rgba(224,231,255,.9),rgba(199,210,254,.7));
      box-shadow:0 6px 20px rgba(99,102,241,.12)}
    .qa-accent{border-color:rgba(16,185,129,.2);color:#065f46;
      background:linear-gradient(135deg,rgba(236,253,245,.8),rgba(209,250,229,.6))}
    .qa-accent:hover{background:linear-gradient(135deg,rgba(209,250,229,.9),rgba(167,243,208,.7));
      box-shadow:0 6px 20px rgba(16,185,129,.12)}
    .qa-warning{border-color:rgba(245,158,11,.2);color:#92400e;
      background:linear-gradient(135deg,rgba(254,243,199,.8),rgba(254,224,136,.6))}
    .qa-warning:hover{background:linear-gradient(135deg,rgba(254,224,136,.9),rgba(253,230,138,.7));
      box-shadow:0 6px 20px rgba(245,158,11,.12)}

    /* --- Inventory Snapshot --- */
    .is-grid{display:flex;flex-direction:column;gap:8px}
    .is-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;
      border-bottom:1px solid rgba(99,102,241,.05)}
    .is-row:last-child{border-bottom:0}
    .is-label{font-size:14px;color:#64748b;font-weight:500}
    .is-value{font-size:20px;font-weight:800;color:#0f172a}
    .is-danger{color:#dc2626}
    .is-ok{color:#065f46}
    .is-low-stock{margin-top:16px}
    .is-ls-title{font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:10px;
      text-transform:uppercase;letter-spacing:.04em}
    .is-ls-item{display:flex;justify-content:space-between;padding:9px 0;font-size:13px;color:#0f172a;
      border-bottom:1px solid rgba(99,102,241,.04)}

    /* --- Work Queue --- */
    .wq-list{display:flex;flex-direction:column;gap:10px}
    .wq-item{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;
      background:rgba(248,250,252,.5);transition:all .2s;border:1px solid rgba(99,102,241,.04)}
    .wq-item:hover{background:rgba(248,250,252,.8);transform:translateX(2px);
      box-shadow:0 2px 8px rgba(79,70,229,.04)}
    .wq-icon{font-size:10px;flex-shrink:0}
    .wq-body{flex:1;display:flex;justify-content:space-between;align-items:center;min-width:0}
    .wq-text{font-size:14px;color:#334155;font-weight:500}
    .wq-count{font-weight:800;font-size:16px;color:#0f172a;margin-left:12px}
    .wq-action{font-size:12px;font-weight:600;color:#6366f1;text-decoration:none;flex-shrink:0;
      padding:5px 12px;border-radius:8px;border:1px solid rgba(99,102,241,.12);
      transition:all .15s;background:rgba(99,102,241,.04)}
    .wq-action:hover{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.25)}

    /* --- Client Snapshot --- */
    .cs-grid{display:flex;flex-direction:column;gap:8px}
    .cs-row{display:flex;justify-content:space-between;align-items:center;padding:14px 0;
      border-bottom:1px solid rgba(99,102,241,.05)}
    .cs-row:last-child{border-bottom:0}
    .cs-label{font-size:14px;color:#64748b;font-weight:500}
    .cs-value{font-size:22px;font-weight:800;color:#0f172a}
    .cs-warning{color:#f59e0b}

    /* --- Revenue Analytics --- */
    .ra-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .ra-card{background:rgba(248,250,252,.5);border-radius:16px;padding:18px;text-align:center;
      border:1px solid rgba(99,102,241,.04);transition:all .2s}
    .ra-card:hover{background:rgba(248,250,252,.8);transform:translateY(-2px);
      box-shadow:0 4px 16px rgba(79,70,229,.06)}
    .ra-label{display:block;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;
      letter-spacing:.05em;margin-bottom:8px}
    .ra-value{display:block;font-size:22px;font-weight:800;color:#0f172a;line-height:1.2}
    .ra-growth .ra-value{font-size:26px}
    .text-green{color:#10b981}
    .text-red{color:#ef4444}

    /* --- Booking Analytics --- */
    .ba-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .ba-card{display:flex;align-items:center;gap:14px;border-radius:16px;padding:18px;
      transition:all .2s;border:1px solid transparent}
    .ba-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
    .ba-confirmed{background:linear-gradient(135deg,rgba(239,246,255,.8),rgba(219,234,254,.6));
      border-color:rgba(59,130,246,.1)}
    .ba-completed{background:linear-gradient(135deg,rgba(236,253,245,.8),rgba(209,250,229,.6));
      border-color:rgba(16,185,129,.1)}
    .ba-pending{background:linear-gradient(135deg,rgba(254,243,199,.8),rgba(254,224,136,.6));
      border-color:rgba(245,158,11,.1)}
    .ba-cancelled{background:linear-gradient(135deg,rgba(254,242,242,.8),rgba(254,205,211,.6));
      border-color:rgba(239,68,68,.1)}
    .ba-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;
      justify-content:center;font-size:16px;font-weight:700;flex-shrink:0;
      box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .ba-confirmed .ba-icon{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1d4ed8}
    .ba-completed .ba-icon{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46}
    .ba-pending .ba-icon{background:linear-gradient(135deg,#fde68a,#fbbf24);color:#92400e}
    .ba-cancelled .ba-icon{background:linear-gradient(135deg,#fee2e2,#fecdd3);color:#991b1b}
    .ba-body{flex:1}
    .ba-value{display:block;font-size:24px;font-weight:800;color:#0f172a;line-height:1.2}
    .ba-label{display:block;font-size:12px;color:#64748b;font-weight:500;margin-top:3px}

    /* --- Activity Timeline --- */
    .at-list{display:flex;flex-direction:column;gap:4px}
    .at-item{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;
      transition:all .15s}
    .at-item:hover{background:rgba(99,102,241,.03);transform:translateX(2px)}
    .at-icon{font-size:18px;flex-shrink:0;width:36px;height:36px;display:flex;
      align-items:center;justify-content:center;
      background:rgba(248,250,252,.6);border-radius:10px}
    .at-body{flex:1;min-width:0}
    .at-title{display:block;font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap;
      overflow:hidden;text-overflow:ellipsis}
    .at-time{display:block;font-size:12px;color:#94a3b8;margin-top:3px}
    .at-amount{font-size:14px;font-weight:700;color:#0f172a;flex-shrink:0;margin-left:8px}

    /* --- Business Alerts --- */
    .alerts-list{display:flex;flex-direction:column;gap:10px}
    .alert-item{display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;
      cursor:pointer;transition:all .2s;border:1px solid rgba(99,102,241,.06);
      background:rgba(255,255,255,.5)}
    .alert-item:hover{background:rgba(99,102,241,.04);border-color:rgba(99,102,241,.12);
      transform:translateX(3px);box-shadow:0 4px 16px rgba(79,70,229,.06)}
    .alert-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;
      justify-content:center;font-size:16px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .alert-body{flex:1}
    .alert-title{display:block;font-size:14px;font-weight:700;color:#0f172a}
    .alert-count{display:block;font-size:12px;font-weight:600;margin-top:3px}
    .alert-arrow{font-size:16px;color:#94a3b8;flex-shrink:0;transition:transform .15s}
    .alert-item:hover .alert-arrow{transform:translateX(3px);color:#6366f1}

    /* --- Notification Center (Luxury) --- */
    .panel-header-actions{display:flex;align-items:center;gap:8px}
    .panel-header-btn{background:none;border:1px solid rgba(99,102,241,.12);border-radius:10px;
      padding:5px 14px;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;
      transition:all .15s}
    .panel-header-btn:hover{background:rgba(99,102,241,.06);color:#0f172a;
      border-color:rgba(99,102,241,.2)}
    .panel-header-btn:focus-visible{outline:2px solid #6366f1;outline-offset:2px}
    .nc-list{display:flex;flex-direction:column;gap:4px;max-height:400px;overflow-y:auto;
      scrollbar-width:thin;scrollbar-color:rgba(99,102,241,.15) transparent}
    .nc-item{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;border-radius:14px;
      transition:all .15s;border-left:3px solid transparent}
    .nc-item:hover{background:rgba(99,102,241,.03)}
    .nc-unread{background:rgba(240,249,255,.6);border-left-color:#3b82f6;
      box-shadow:inset 0 0 0 1px rgba(59,130,246,.06)}
    .nc-indicator{width:9px;height:9px;border-radius:50%;background:#3b82f6;flex-shrink:0;
      margin-top:5px;box-shadow:0 0 8px rgba(59,130,246,.3)}
    .nc-indicator-read{background:#d1d5db;box-shadow:none}
    .nc-body{flex:1;min-width:0}
    .nc-title{display:block;font-size:14px;font-weight:700;color:#0f172a}
    .nc-message{display:block;font-size:13px;color:#64748b;margin-top:3px;line-height:1.5}
    .nc-time{display:block;font-size:11px;color:#94a3b8;margin-top:4px}
    .nc-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
    .nc-btn{width:30px;height:30px;border-radius:10px;border:1px solid rgba(99,102,241,.1);
      background:rgba(255,255,255,.8);color:#64748b;font-size:14px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;transition:all .15s;
      backdrop-filter:blur(4px)}
    .nc-btn:hover{background:rgba(16,185,129,.08);color:#065f46;border-color:rgba(16,185,129,.25);
      transform:scale(1.05)}
    .nc-btn-remove:hover{background:rgba(239,68,68,.08);color:#991b1b;
      border-color:rgba(239,68,68,.25)}
    .nc-btn:focus-visible{outline:2px solid #6366f1;outline-offset:2px}

    /* ===== BUSINESS HEALTH SCORE (Premium Dark) ===== */
    .health-score-panel{background:linear-gradient(135deg,#0b0b0b 0%,#1a1a2e 40%,#0f172a 100%);
      color:white;position:relative;overflow:hidden}
    .health-score-panel::before{content:'';position:absolute;top:-50%;right:-30%;width:80%;height:200%;
      background:radial-gradient(ellipse 500px 400px at 50% 50%,rgba(99,102,241,.1),transparent 60%);
      pointer-events:none}
    .health-score-panel > *{position:relative;z-index:1}
    .health-score-panel .panel-header h2{color:white}
    .hs-grid{display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:center}
    .hs-main{display:flex;flex-direction:column;align-items:center;gap:10px;
      padding-right:28px;border-right:1px solid rgba(255,255,255,.08);min-width:130px}
    .hs-score{font-size:52px;font-weight:800;letter-spacing:-.03em;line-height:1;
      background:linear-gradient(135deg,#d4af37,#fbbf24,#d4af37);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
      text-shadow:none;filter:drop-shadow(0 2px 8px rgba(212,175,55,.3))}
    .hs-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
      padding:5px 16px;border-radius:100px}
    .hs-label.hs-excellent{background:rgba(16,185,129,.2);color:#10b981;
      box-shadow:0 0 12px rgba(16,185,129,.15)}
    .hs-label.hs-good{background:rgba(59,130,246,.2);color:#60a5fa;
      box-shadow:0 0 12px rgba(59,130,246,.15)}
    .hs-label.hs-warning{background:rgba(245,158,11,.2);color:#fbbf24;
      box-shadow:0 0 12px rgba(245,158,11,.15)}
    .hs-label.hs-critical{background:rgba(239,68,68,.2);color:#f87171;
      box-shadow:0 0 12px rgba(239,68,68,.15)}
    .hs-details{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .hs-item{display:flex;align-items:center;gap:12px}
    .hs-item-label{font-size:12px;font-weight:600;color:#94a3b8;min-width:90px;flex-shrink:0}
    .hs-bar-track{flex:1;height:7px;background:rgba(255,255,255,.08);border-radius:100px;overflow:hidden;
      box-shadow:inset 0 1px 3px rgba(0,0,0,.2)}
    .hs-bar-fill{height:100%;border-radius:100px;transition:width 1s cubic-bezier(.4,0,.2,1)}
    .hs-bar-fill.hs-excellent{background:linear-gradient(90deg,#10b981,#34d399);
      box-shadow:0 0 8px rgba(16,185,129,.3)}
    .hs-bar-fill.hs-good{background:linear-gradient(90deg,#3b82f6,#60a5fa);
      box-shadow:0 0 8px rgba(59,130,246,.3)}
    .hs-bar-fill.hs-warning{background:linear-gradient(90deg,#f59e0b,#fbbf24);
      box-shadow:0 0 8px rgba(245,158,11,.3)}
    .hs-bar-fill.hs-critical{background:linear-gradient(90deg,#ef4444,#f87171);
      box-shadow:0 0 8px rgba(239,68,68,.3)}
    .hs-item-value{font-size:11px;font-weight:700;min-width:60px;text-align:right;
      text-transform:uppercase;letter-spacing:.04em}
    .hs-item-value.hs-excellent{color:#10b981}
    .hs-item-value.hs-good{color:#60a5fa}
    .hs-item-value.hs-warning{color:#fbbf24}
    .hs-item-value.hs-critical{color:#f87171}

    /* ===== PREFERENCES OVERLAY (Glass) ===== */
    .prefs-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);
      z-index:2000;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .prefs-panel{background:rgba(255,255,255,.95);backdrop-filter:blur(16px);
      border-radius:24px;padding:32px;width:400px;max-width:90vw;
      box-shadow:0 24px 64px rgba(79,70,229,.15),0 8px 24px rgba(0,0,0,.1);
      border:1px solid rgba(99,102,241,.1);animation:fadeInScale .25s ease}
    .prefs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
    .prefs-header h3{margin:0;font-size:18px;font-weight:700;color:#0f172a}
    .prefs-close{background:none;border:0;font-size:24px;color:#94a3b8;cursor:pointer;padding:0;
      line-height:1;transition:all .15s;width:32px;height:32px;display:flex;align-items:center;
      justify-content:center;border-radius:8px}
    .prefs-close:hover{color:#0f172a;background:rgba(99,102,241,.06)}
    .prefs-close:focus-visible{outline:2px solid #6366f1;outline-offset:2px;border-radius:8px}
    .prefs-body{display:flex;flex-direction:column;gap:16px}
    .prefs-row{display:flex;justify-content:space-between;align-items:center;padding:14px 0;
      border-bottom:1px solid rgba(99,102,241,.06);cursor:pointer;transition:background .15s;
      border-radius:8px;padding-left:8px;padding-right:8px}
    .prefs-row:last-child{border-bottom:0}
    .prefs-row:hover{background:rgba(99,102,241,.03)}
    .prefs-row span{font-size:14px;font-weight:500;color:#0f172a}
    .prefs-row input[type=checkbox]{width:20px;height:20px;accent-color:#6366f1;cursor:pointer}
    .prefs-row select{padding:8px 14px;border:1px solid rgba(99,102,241,.12);border-radius:10px;
      font-size:13px;color:#0f172a;background:rgba(255,255,255,.8);cursor:pointer;
      backdrop-filter:blur(4px);transition:border-color .15s}
    .prefs-row select:focus-visible{outline:2px solid #6366f1;outline-offset:2px}

    /* ===== COMPACT MODE ===== */
    .compact .dashboard-footer{padding:10px 0;font-size:11px}

    /* ===== FOOTER (Premium) ===== */
    .dashboard-footer{display:flex;justify-content:space-between;align-items:center;
      padding:18px 0;font-size:12px;color:#94a3b8;
      border-top:1px solid rgba(99,102,241,.06);margin-top:8px}
    .footer-api-status{color:#f59e0b;font-weight:600}
    .footer-refresh{background:rgba(255,255,255,.6);border:1px solid rgba(99,102,241,.1);
      border-radius:10px;padding:7px 18px;font-size:12px;font-weight:600;color:#64748b;
      cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .15s;
      backdrop-filter:blur(4px)}
    .footer-refresh:hover:not(:disabled){background:rgba(99,102,241,.06);border-color:rgba(99,102,241,.2);
      color:#0f172a}
    .footer-refresh:disabled{opacity:.5;cursor:not-allowed}
    .refresh-icon{display:inline-block;transition:transform .4s}
    .refreshing .refresh-icon{animation:spin 1s linear infinite}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

    /* ===== MODULE PAGE ===== */
    .module-page{padding:24px 0}
    .module-page h1{font-size:32px;text-transform:capitalize}
    .module-page p{color:#64748b;margin:8px 0 24px}
    .module-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
    .module-card{background:rgba(255,255,255,.7);backdrop-filter:blur(12px);
      border:1px solid rgba(99,102,241,.08);border-radius:24px;padding:28px;text-align:center;
      box-shadow:0 4px 20px rgba(79,70,229,.06);transition:all .2s}
    .module-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(79,70,229,.1)}
    .module-card h3{margin:0 0 10px;color:#94a3b8;font-size:12px;text-transform:uppercase;
      letter-spacing:.06em;font-weight:700}
    .module-card b{font-size:26px;color:#0f172a}
    .module-card p{color:#94a3b8;font-size:13px;margin:8px 0 0}

    /* ===== ACCESSIBILITY: FOCUS STATES ===== */
    *:focus-visible{outline:2px solid #6366f1;outline-offset:2px;border-radius:6px;
      transition:outline-offset .15s ease,box-shadow .15s ease}
    .home a:focus-visible,.home button:focus-visible,.home [tabindex]:focus-visible{
      outline:2px solid #6366f1;outline-offset:2px}

    /* ===== RESPONSIVE ===== */
    @media(max-width:1200px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:1100px){.kpi-grid,.skeleton-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:1000px){
      .grid-2col{grid-template-columns:1fr}
      .dashboard-header{flex-direction:column;gap:16px;padding:28px 32px}
      .header-meta{align-items:flex-start}
      .hs-grid{grid-template-columns:1fr}
      .hs-main{border-right:0;border-bottom:1px solid rgba(255,255,255,.08);padding-right:0;
        padding-bottom:18px;flex-direction:row;justify-content:center;gap:16px}
      .hs-details{grid-template-columns:1fr}
    }
    @media(max-width:768px){
      .dashboard-header{padding:24px;border-radius:20px}
      .dashboard-header h1{font-size:24px}
      .header-subtitle{font-size:13px}
      .panel{padding:20px;border-radius:20px}
      .panel-header h2{font-size:15px}
      .quick-actions{grid-template-columns:1fr}
      .kpi-grid{grid-template-columns:repeat(2,1fr);gap:12px}
      .kpi-value{font-size:26px}
      .search-input-header:focus,.search-wrapper.active .search-input-header{width:200px}
      .search-dropdown{width:320px;right:-60px}
    }
    @media(max-width:600px){
      .kpi-grid,.skeleton-grid{grid-template-columns:1fr}
      .dashboard-header{padding:20px;border-radius:16px}
      .dashboard-header h1{font-size:20px}
      .panel{padding:16px;border-radius:16px}
      .header-progress-row{max-width:100%}
      .search-input-header:focus,.search-wrapper.active .search-input-header{width:160px}
      .search-dropdown{width:280px;right:-40px}
      .hs-score{font-size:36px}
      .module-cards{grid-template-columns:1fr}
    }

    /* ===== REDUCED MOTION ===== */
    @media(prefers-reduced-motion:reduce){
      *,*::before,*::after{
        animation-duration:0.01ms!important;animation-iteration-count:1!important;
        transition-duration:0.01ms!important;scroll-behavior:auto!important}
      .home::before{animation:none!important;opacity:.7!important}
      .dashboard-header::before{animation:none!important}
      .progress-bar-fill::after{animation:none!important}
      .kpi-card::before{display:none!important}
      .qa-btn::before{display:none!important}
      .kpi-card:hover,.staff-card:hover,.ub-card:hover,.alert-item:hover,
      .wq-item:hover,.at-item:hover,.qa-btn:hover,.insight-btn:hover,
      .ra-card:hover,.ba-card:hover{transform:none!important}
    }

    /* ===== SCROLLBAR ===== */
    ::-webkit-scrollbar{width:8px;height:8px}
    ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(99,102,241,.2),rgba(168,85,247,.15));
      border-radius:999px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,rgba(99,102,241,.3),rgba(168,85,247,.25))}
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
