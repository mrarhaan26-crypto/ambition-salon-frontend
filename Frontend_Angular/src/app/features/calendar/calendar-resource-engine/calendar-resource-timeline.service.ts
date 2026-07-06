import { Injectable, inject } from '@angular/core';
import type { ResourceEntity, ResourceTimelineSlot, ResourceOccupancy, ResourceType } from './calendar-resource.models';
import { getOccupancyColor, getResourceTypeLabel } from './calendar-resource.models';
import { ResourceManagerService } from './calendar-resource-manager.service';
import { ResourceAllocationService } from './calendar-resource-allocation.service';
import { ResourceMaintenanceService } from './calendar-resource-maintenance.service';
import { ResourceCacheService } from './calendar-resource-cache.service';
import { BUSINESS_HOURS_START, BUSINESS_HOURS_END } from '../calendar.constants';

export interface TimelineConfig {
  startHour: number;
  endHour: number;
  slotDurationMinutes: number;
}

const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  startHour: BUSINESS_HOURS_START,
  endHour: BUSINESS_HOURS_END,
  slotDurationMinutes: 60,
};

@Injectable({ providedIn: 'root' })
export class ResourceTimelineService {
  private manager = inject(ResourceManagerService);
  private allocationService = inject(ResourceAllocationService);
  private maintenanceService = inject(ResourceMaintenanceService);
  private cache = inject(ResourceCacheService);

  private config: TimelineConfig = { ...DEFAULT_TIMELINE_CONFIG };

  setConfig(config: Partial<TimelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getTimeline(resourceId: string, date: string): ResourceTimelineSlot[] {
    const cached = this.cache.getTimeline(resourceId, date);
    if (cached) return cached;

    const resource = this.manager.getById(resourceId);
    if (!resource) return [];

    const slots = this.buildTimeline(resource, date);
    this.cache.setTimeline(resourceId, date, slots);
    return slots;
  }

  getTimelineForMultiple(resourceIds: string[], date: string): Map<string, ResourceTimelineSlot[]> {
    const result = new Map<string, ResourceTimelineSlot[]>();
    for (const id of resourceIds) {
      result.set(id, this.getTimeline(id, date));
    }
    return result;
  }

  getAllTimelines(date: string): ResourceTimelineSlot[] {
    const resources = this.manager.getAll();
    const result: ResourceTimelineSlot[] = [];
    for (const r of resources) {
      result.push(...this.getTimeline(r.id, date));
    }
    return result;
  }

  private buildTimeline(resource: ResourceEntity, date: string): ResourceTimelineSlot[] {
    const slots: ResourceTimelineSlot[] = [];
    const dateObj = new Date(date);
    dateObj.setHours(this.config.startHour, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(this.config.endHour, 0, 0, 0);
    const slotMs = this.config.slotDurationMinutes * 60000;

    const allocations = this.allocationService.getByResourceAndDate(resource.id, date);
    const maintenanceBlocks = this.maintenanceService.getByResourceAndDate(resource.id, date);

    let cursor = dateObj.getTime();
    while (cursor < dayEnd.getTime()) {
      const slotStart = cursor;
      const slotEnd = Math.min(cursor + slotMs, dayEnd.getTime());
      const slotStartStr = new Date(slotStart).toISOString();
      const slotEndStr = new Date(slotEnd).toISOString();

      const occupancy = this.getOccupancyForTimeRange(resource, slotStartStr, slotEndStr, allocations, maintenanceBlocks);
      slots.push({
        resourceId: resource.id,
        resourceName: resource.name,
        resourceType: resource.type,
        occupancy: occupancy.type,
        startTime: slotStartStr,
        endTime: slotEndStr,
        appointmentId: occupancy.appointmentId,
        allocationId: occupancy.allocationId,
        maintenanceId: occupancy.maintenanceId,
        label: occupancy.label,
        color: getOccupancyColor(occupancy.type),
        staffName: occupancy.staffName,
        clientName: occupancy.clientName,
      });

      cursor = slotEnd;
    }

    return slots;
  }

  private getOccupancyForTimeRange(
    resource: ResourceEntity,
    startTime: string,
    endTime: string,
    allocations: { resourceId: string; startTime: string; endTime: string; id: string; type: string; appointmentId: string; status: string; staffId?: string; clientId?: string }[],
    maintenanceBlocks: { resourceId: string; startTime: string; endTime: string; id: string; type: string; label: string }[],
  ): { type: ResourceOccupancy; appointmentId?: string; allocationId?: string; maintenanceId?: string; label: string; staffName?: string; clientName?: string } {
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();

    if (resource.status === 'OUT_OF_SERVICE') {
      return { type: 'OUT_OF_SERVICE', label: 'Out of Service' };
    }

    for (const m of maintenanceBlocks) {
      const mStart = new Date(m.startTime).getTime();
      const mEnd = new Date(m.endTime).getTime();
      if (startMs < mEnd && endMs > mStart) {
        const typeMap: Record<string, ResourceOccupancy> = {
          CLEANING: 'CLEANING', REPAIR: 'MAINTENANCE',
          CALIBRATION: 'MAINTENANCE', INSPECTION: 'MAINTENANCE',
          MANUAL_BLOCK: 'BLOCKED', HOLIDAY_BLOCK: 'HOLIDAY',
        };
        return {
          type: typeMap[m.type] || 'MAINTENANCE',
          maintenanceId: m.id,
          label: m.label,
        };
      }
    }

    for (const a of allocations) {
      if (a.status !== 'ACTIVE') continue;
      const aStart = new Date(a.startTime).getTime();
      const aEnd = new Date(a.endTime).getTime();
      if (startMs < aEnd && endMs > aStart) {
        return {
          type: 'OCCUPIED',
          appointmentId: a.appointmentId,
          allocationId: a.id,
          label: 'Occupied',
          staffName: a.staffId,
          clientName: a.clientId,
        };
      }
    }

    if (resource.status === 'MAINTENANCE') {
      return { type: 'MAINTENANCE', label: 'Maintenance' };
    }

    return { type: 'FREE', label: 'Free' };
  }
}
