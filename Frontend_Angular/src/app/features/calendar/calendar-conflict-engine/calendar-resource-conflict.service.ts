import { Injectable } from '@angular/core';
import type { ConflictReport, ValidationContext, ResourceAvailability } from './calendar-conflict.models';
import { addConflict, createEmptyConflictReport } from './calendar-conflict.models';

export type ResourceType =
  | 'chair'
  | 'room'
  | 'equipment'
  | 'wash_station'
  | 'vip_cabin'
  | 'laser_machine'
  | 'massage_bed';

export type ResourceConflictType =
  | 'resource_chair'
  | 'resource_room'
  | 'resource_equipment'
  | 'resource_wash_station'
  | 'resource_vip_cabin'
  | 'resource_laser_machine'
  | 'resource_massage_bed';

const RESOURCE_MAP: Record<string, ResourceConflictType> = {
  chair: 'resource_chair',
  room: 'resource_room',
  equipment: 'resource_equipment',
  wash_station: 'resource_wash_station',
  vip_cabin: 'resource_vip_cabin',
  laser_machine: 'resource_laser_machine',
  massage_bed: 'resource_massage_bed',
};

@Injectable({ providedIn: 'root' })
export class ResourceConflictService {
  private resourceAvailability = new Map<string, ResourceAvailability>();

  setResourceAvailability(resourceId: string, availability: ResourceAvailability): void {
    this.resourceAvailability.set(resourceId, availability);
  }

  setAllResourceAvailability(indexed: Map<string, ResourceAvailability>): void {
    this.resourceAvailability = indexed;
  }

  clearCache(): void {
    this.resourceAvailability.clear();
  }

  validate(ctx: ValidationContext): ConflictReport {
    const report = createEmptyConflictReport();
    if (!ctx.resourceId) return report;

    const resource = this.resourceAvailability.get(ctx.resourceId);
    if (!resource) return report;

    if (!resource.available) {
      const conflictType = RESOURCE_MAP[resource.type] || 'resource_equipment';
      addConflict(report, {
        type: conflictType,
        severity: 'error',
        category: 'resource',
        message: `${this.getResourceLabel(resource.type)} is not available`,
        details: `Resource "${resource.name}" is currently unavailable`,
        conflictingResourceId: ctx.resourceId,
        canOverride: true,
        overrideRole: 'manager',
      });
      return report;
    }

    for (const slot of resource.bookedSlots) {
      if (this.intervalsOverlap(ctx.startTime, ctx.endTime, slot.startTime, slot.endTime)) {
        const conflictType = RESOURCE_MAP[resource.type] || 'resource_equipment';
        addConflict(report, {
          type: conflictType,
          severity: 'error',
          category: 'resource',
          message: `${this.getResourceLabel(resource.type)} is already booked`,
          details: `"${resource.name}" is booked from ${this.formatTime(slot.startTime)} to ${this.formatTime(slot.endTime)}`,
          conflictingResourceId: ctx.resourceId,
          canOverride: true,
          overrideRole: 'manager',
        });
      }
    }

    return report;
  }

  private getResourceLabel(type: string): string {
    const labels: Record<string, string> = {
      chair: 'Chair',
      room: 'Room',
      equipment: 'Equipment',
      wash_station: 'Wash Station',
      vip_cabin: 'VIP Cabin',
      laser_machine: 'Laser Machine',
      massage_bed: 'Massage Bed',
    };
    return labels[type] || 'Resource';
  }

  private intervalsOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
    const a = new Date(s1).getTime();
    const b = new Date(e1).getTime();
    const c = new Date(s2).getTime();
    const d = new Date(e2).getTime();
    return a < d && c < b;
  }

  private formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
