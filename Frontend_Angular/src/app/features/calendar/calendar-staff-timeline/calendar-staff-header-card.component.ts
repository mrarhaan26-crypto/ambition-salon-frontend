import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { STAFF_STATUS_LABELS, STAFF_STATUS_COLORS } from './calendar-staff-timeline.constants';
import type { StaffTimelineStaff } from './calendar-staff-timeline.models';
import { getStaffInitials } from './calendar-staff-timeline-engine';
import { ResourceEngineService } from '../calendar-resource-engine/calendar-resource-engine.service';

@Component({
  selector: 'app-staff-header-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="staff-header-card" [class.inactive]="!staff.isActive" role="region" [attr.aria-label]="'Staff: ' + staff.fullName">
      <div class="shc-row">
        <div class="shc-avatar" [style.background]="staff.color" aria-hidden="true">
          {{ initials }}
        </div>
        <div class="shc-info">
          <div class="shc-name-row">
            <span class="shc-name">{{ staff.fullName }}</span>
            <span class="shc-pin" *ngIf="staff.isFavorite" aria-label="Favorite staff">&#9733;</span>
            <span class="shc-online" *ngIf="staff.online" aria-label="Online">&#9679;</span>
          </div>
          <span class="shc-role">{{ staff.role }}{{ staff.specialization ? ' - ' + staff.specialization : '' }}</span>
        </div>
        <span class="shc-status" [style.background]="statusBg" [style.color]="statusColor" [attr.aria-label]="'Status: ' + statusLabel">
          {{ statusLabel }}
        </span>
      </div>

      <div class="shc-hours">
        <span class="shc-hours-icon" aria-hidden="true">&#128338;</span>
        <span class="shc-hours-text">{{ workingHoursLabel }}</span>
      </div>

      <div class="shc-kpi-row">
        <div class="shc-kpi-item">
          <span class="shc-kpi-value">{{ staff.bookingsToday }}</span>
          <span class="shc-kpi-label">Bookings</span>
        </div>
        <div class="shc-kpi-item">
          <span class="shc-kpi-value">{{ staff.revenueToday | currency }}</span>
          <span class="shc-kpi-label">Revenue</span>
        </div>
        <div class="shc-kpi-item">
          <span class="shc-kpi-value">{{ staff.occupancyPercent }}%</span>
          <span class="shc-kpi-label">Occupancy</span>
        </div>
      </div>

      <div class="shc-capacity-bar" role="progressbar" [attr.aria-valuenow]="staff.occupancyPercent" [attr.aria-valuemin]="0" [attr.aria-valuemax]="100" [attr.aria-label]="'Occupancy ' + staff.occupancyPercent + '%'">
        <div class="shc-capacity-fill" [style.width.%]="staff.occupancyPercent" [style.background]="capacityColor"></div>
      </div>

      <div class="shc-resource" *ngIf="resourceName">
        <span class="shc-resource-label">Resource:</span>
        <span class="shc-resource-name">{{ resourceName }}</span>
      </div>
    </div>
  `,
  styles: [`
    .staff-header-card {
      padding: 12px;
      background: #fafafa;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 120px;
      transition: background .15s;
    }
    .staff-header-card.inactive { opacity: .6; }
    .shc-row { display: flex; align-items: center; gap: 10px; }
    .shc-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; color: white;
      flex-shrink: 0;
    }
    .shc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .shc-name-row { display: flex; align-items: center; gap: 4px; }
    .shc-name { font-size: 13px; font-weight: 700; color: #0b0b0b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .shc-pin { color: #f59e0b; font-size: 14px; }
    .shc-online { color: #16a34a; font-size: 10px; }
    .shc-role { font-size: 10px; color: #6b7280; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .shc-status {
      font-size: 9px; font-weight: 700; padding: 2px 8px;
      border-radius: 10px; white-space: nowrap; flex-shrink: 0;
      letter-spacing: .02em;
    }
    .shc-hours { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #6b7280; }
    .shc-hours-icon { font-size: 12px; }
    .shc-hours-text { font-weight: 600; }
    .shc-kpi-row { display: flex; gap: 12px; }
    .shc-kpi-item { display: flex; flex-direction: column; gap: 1px; }
    .shc-kpi-value { font-size: 12px; font-weight: 700; color: #0b0b0b; }
    .shc-kpi-label { font-size: 8px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    .shc-capacity-bar {
      height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;
    }
    .shc-capacity-fill {
      height: 100%; border-radius: 2px; transition: width .3s ease;
    }
    .shc-resource { display: flex; align-items: center; gap: 4px; font-size: 10px; }
    .shc-resource-label { color: #9ca3af; font-weight: 600; }
    .shc-resource-name { color: #6366f1; font-weight: 700; }
  `],
})
export class StaffHeaderCardComponent {
  private resourceEngine = inject(ResourceEngineService);

  @Input({ required: true }) staff!: StaffTimelineStaff;

  get initials(): string {
    return getStaffInitials(this.staff.fullName);
  }

  get resourceName(): string | null {
    try {
      const resourceId = this.resourceEngine.getResourceForStaff(this.staff.id);
      if (!resourceId) return null;
      const resource = this.resourceEngine.managerService.getById(resourceId);
      return resource?.name || null;
    } catch {
      return null;
    }
  }

  get statusLabel(): string {
    return STAFF_STATUS_LABELS[this.staff.status] || this.staff.status;
  }

  get statusColor(): string {
    return '#fff';
  }

  get statusBg(): string {
    return STAFF_STATUS_COLORS[this.staff.status] || '#6b7280';
  }

  get workingHoursLabel(): string {
    if (this.staff.workingHours.length === 0) return 'Not set';
    const first = this.staff.workingHours[0];
    const start = new Date(first.start);
    const end = new Date(first.end);
    const fmt = (d: Date) => {
      const h = d.getHours() % 12 || 12;
      const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
      return `${h}:${d.getMinutes().toString().padStart(2, '0')} ${ampm}`;
    };
    return `${fmt(start)} - ${fmt(end)}`;
  }

  get capacityColor(): string {
    const pct = this.staff.occupancyPercent;
    if (pct >= 90) return '#dc2626';
    if (pct >= 70) return '#f59e0b';
    if (pct >= 40) return '#3b82f6';
    return '#16a34a';
  }
}
