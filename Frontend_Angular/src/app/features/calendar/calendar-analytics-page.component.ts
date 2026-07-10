import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { StateViewComponent } from '../../shared/components/state-view/state-view.component';
import { CalendarService } from './calendar.service';
import type { CalendarSummaryResponse, CalendarBooking } from './calendar.models';

interface AnalyticsMetric {
  label: string;
  value: string | number;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}

@Component({
  selector: 'app-calendar-analytics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EnterpriseFeaturePageComponent, StateViewComponent],
  template: `
    <app-enterprise-feature-page
      themeKey="calendar"
      title="Calendar Analytics"
      subtitle="Insights and metrics for your salon schedule"
      icon="📅"
      [breadcrumbs]="[
        { label: 'Calendar', link: '/app/calendar' },
        { label: 'Analytics' }
      ]"
    >
      <div class="analytics-controls">
        <label class="analytics-label">Date Range</label>
        <div class="analytics-range">
          <input type="date" class="analytics-input" [value]="dateFrom" (change)="dateFrom = $any($event.target).value; loadAnalytics()" />
          <span class="analytics-sep">to</span>
          <input type="date" class="analytics-input" [value]="dateTo" (change)="dateTo = $any($event.target).value; loadAnalytics()" />
        </div>
        <button class="analytics-btn" (click)="setRange('today')">Today</button>
        <button class="analytics-btn" (click)="setRange('week')">This Week</button>
        <button class="analytics-btn" (click)="setRange('month')">This Month</button>
      </div>

      <app-state-view *ngIf="loading" type="loading" message="Loading analytics..."></app-state-view>
      <app-state-view *ngIf="error" type="error" title="Failed to load analytics" message="Please try again later."></app-state-view>

      <div class="analytics-grid" *ngIf="!loading && !error">
        <div class="analytics-card" *ngFor="let m of metrics" [style.--card-accent]="m.color">
          <div class="ac-icon">{{ m.icon }}</div>
          <div class="ac-value">{{ m.value }}</div>
          <div class="ac-label">{{ m.label }}</div>
          <span class="ac-trend" *ngIf="m.trend === 'up'" style="color:#16a34a">&#9650; Up</span>
          <span class="ac-trend" *ngIf="m.trend === 'down'" style="color:#dc2626">&#9660; Down</span>
        </div>
      </div>

      <section class="analytics-section" *ngIf="!loading && !error">
        <h3 class="analytics-section-title">Booking Distribution</h3>
        <div class="analytics-chart-placeholder">
          <div class="chart-bar-row" *ngFor="let b of statusBars">
            <span class="chart-bar-label">{{ b.label }}</span>
            <div class="chart-bar-track">
              <div class="chart-bar-fill" [style.width.%]="b.percent" [style.background]="b.color"></div>
            </div>
            <span class="chart-bar-value">{{ b.count }}</span>
          </div>
        </div>
      </section>

      <section class="analytics-section" *ngIf="!loading && !error">
        <h3 class="analytics-section-title">Staff Utilization</h3>
        <p class="analytics-hint">Detailed staff utilization charts will appear once the backend analytics API provides per-staff metrics.</p>
      </section>
    </app-enterprise-feature-page>
  `,
  styles: [`
    .analytics-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .analytics-label { font-size: 13px; font-weight: 600; color: var(--muted, #6b7280); }
    .analytics-range { display: flex; align-items: center; gap: 8px; }
    .analytics-input { height: 36px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 0 10px; font-size: 13px; }
    .analytics-sep { font-size: 13px; color: var(--muted, #6b7280); }
    .analytics-btn { height: 36px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; background: #fff; padding: 0 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .analytics-btn:hover { background: var(--soft, #f7f7f7); }
    .analytics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .analytics-card { background: #fff; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
    .ac-icon { font-size: 24px; }
    .ac-value { font-size: 28px; font-weight: 800; color: var(--text, #111); }
    .ac-label { font-size: 12px; font-weight: 600; color: var(--muted, #6b7280); }
    .ac-trend { font-size: 11px; font-weight: 700; }
    .analytics-section { background: #fff; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .analytics-section-title { font-size: 15px; font-weight: 700; margin: 0 0 16px; color: var(--text, #111); }
    .analytics-hint { font-size: 13px; color: var(--muted, #6b7280); font-style: italic; }
    .chart-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .chart-bar-label { width: 100px; font-size: 12px; font-weight: 600; color: var(--text, #111); text-align: right; }
    .chart-bar-track { flex: 1; height: 20px; background: var(--soft, #f7f7f7); border-radius: 10px; overflow: hidden; }
    .chart-bar-fill { height: 100%; border-radius: 10px; transition: width 0.3s; min-width: 2px; }
    .chart-bar-value { width: 40px; font-size: 12px; font-weight: 700; color: var(--muted, #6b7280); text-align: right; }
  `]
})
export class CalendarAnalyticsPageComponent implements OnInit {
  private calendarService = inject(CalendarService);

  dateFrom = '';
  dateTo = '';
  loading = signal(false);
  error = signal(false);
  metrics: AnalyticsMetric[] = [];
  statusBars: { label: string; count: number; percent: number; color: string }[] = [];
  appointments: CalendarBooking[] = [];

  ngOnInit(): void {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.dateFrom = monthStart.toISOString().slice(0, 10);
    this.dateTo = monthEnd.toISOString().slice(0, 10);
    this.loadAnalytics();
  }

  setRange(range: 'today' | 'week' | 'month'): void {
    const now = new Date();
    if (range === 'today') {
      this.dateFrom = this.dateTo = now.toISOString().slice(0, 10);
    } else if (range === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() + 1);
      this.dateFrom = start.toISOString().slice(0, 10);
      this.dateTo = now.toISOString().slice(0, 10);
    } else {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.dateFrom = monthStart.toISOString().slice(0, 10);
      this.dateTo = monthEnd.toISOString().slice(0, 10);
    }
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading.set(true);
    this.error.set(false);
    this.calendarService.getCalendarSummary({
      from: this.dateFrom,
      to: this.dateTo,
    }).subscribe({
      next: (res: CalendarSummaryResponse) => {
        this.loading.set(false);
        const kpis = res.kpis;
        if (kpis) {
          this.metrics = [
            { label: 'Total Bookings', value: kpis.totalBookings ?? 0, icon: '📅', color: '#0ea5e9' },
            { label: 'Confirmed', value: kpis.confirmed ?? 0, icon: '✅', color: '#16a34a' },
            { label: 'Completed', value: kpis.completed ?? 0, icon: '✓', color: '#22c55e' },
            { label: 'Pending', value: kpis.pending ?? 0, icon: '⏳', color: '#f59e0b' },
            { label: 'Cancelled', value: kpis.cancelled ?? 0, icon: '✕', color: '#dc2626' },
            { label: 'Revenue', value: kpis.revenue ? `₹${kpis.revenue}` : 0, icon: '💰', color: '#16a34a' },
            { label: 'Occupancy', value: kpis.occupancyRate ? `${Math.round(kpis.occupancyRate)}%` : 'N/A', icon: '📊', color: '#8b5cf6' },
            { label: 'Cancellation Rate', value: kpis.cancellationRate ? `${Math.round(kpis.cancellationRate)}%` : 'N/A', icon: '📉', color: '#dc2626' },
          ];
        }
        this.buildStatusBars(res as any);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private buildStatusBars(data: any): void {
    const statusCounts = data?.statusCounts || {};
    const total = Object.values(statusCounts).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) || 1;
    const colorMap: Record<string, string> = {
      CONFIRMED: '#4A90D9', PENDING: '#FFB74D', COMPLETED: '#2E7D32',
      CANCELLED: '#9E9E9E', NO_SHOW: '#E57373', CHECKED_IN: '#50C878',
      WAITING: '#9575CD', IN_SERVICE: '#26A69A',
    };
    this.statusBars = Object.entries(statusCounts).map(([status, count]: [string, any]) => ({
      label: status.charAt(0) + status.slice(1).toLowerCase(),
      count: typeof count === 'number' ? count : 0,
      percent: ((typeof count === 'number' ? count : 0) / total) * 100,
      color: colorMap[status] || '#B0BEC5',
    })).sort((a, b) => b.count - a.count);
  }
}
