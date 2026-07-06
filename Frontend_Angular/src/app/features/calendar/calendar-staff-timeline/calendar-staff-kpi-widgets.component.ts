import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import type { StaffKpiData } from './calendar-staff-timeline.models';

@Component({
  selector: 'app-staff-kpi-widgets',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kpi-widgets" role="group" aria-label="Staff KPIs" *ngIf="kpis">
      <div class="kpi-item" *ngIf="showRevenue">
        <span class="kpi-value">{{ kpis.revenue | currency }}</span>
        <span class="kpi-label">Revenue</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-value kpi-completed">{{ kpis.completed }}</span>
        <span class="kpi-label">Completed</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-value kpi-pending">{{ kpis.pending }}</span>
        <span class="kpi-label">Pending</span>
      </div>
      <div class="kpi-item" *ngIf="kpis.cancelled > 0">
        <span class="kpi-value kpi-cancelled">{{ kpis.cancelled }}</span>
        <span class="kpi-label">Cancelled</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-value">{{ kpis.occupancy }}%</span>
        <span class="kpi-label">Occupancy</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-value">{{ formatHours(kpis.workingHours) }}</span>
        <span class="kpi-label">Worked</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-value">{{ formatHours(kpis.breakHours) }}</span>
        <span class="kpi-label">Break</span>
      </div>
      <div class="kpi-item kpi-performance" *ngIf="kpis.performanceScore !== undefined">
        <span class="kpi-value">{{ kpis.performanceScore }}</span>
        <span class="kpi-label">Score</span>
      </div>
    </div>
  `,
  styles: [`
    .kpi-widgets {
      display: flex; flex-wrap: wrap; gap: 4px 12px;
      padding: 8px 12px; background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .kpi-item { display: flex; flex-direction: column; gap: 1px; min-width: 50px; }
    .kpi-value { font-size: 13px; font-weight: 700; color: #0b0b0b; }
    .kpi-label { font-size: 8px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    .kpi-completed { color: #16a34a; }
    .kpi-pending { color: #f59e0b; }
    .kpi-cancelled { color: #dc2626; }
    .kpi-performance .kpi-value { color: #6366f1; }
  `],
})
export class StaffKpiWidgetsComponent {
  @Input({ required: true }) kpis!: StaffKpiData;
  @Input() showRevenue = true;

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m > 0 ? ' ' + m + 'm' : ''}`;
  }
}
