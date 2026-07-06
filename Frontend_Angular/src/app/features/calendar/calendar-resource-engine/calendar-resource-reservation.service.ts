import { Injectable, inject } from '@angular/core';
import type { ResourceAllocation, ResourceReservationRequest, ReservationStatus } from './calendar-resource.models';
import { ResourceAllocationService } from './calendar-resource-allocation.service';
import { ResourceManagerService } from './calendar-resource-manager.service';

export interface ReservationResult {
  success: boolean;
  allocation?: ResourceAllocation;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ResourceReservationEngine {
  private allocationService = inject(ResourceAllocationService);
  private manager = inject(ResourceManagerService);
  private readonly TEMP_TIMEOUT_MS = 600000;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  reserve(request: ResourceReservationRequest): ReservationResult {
    const resource = this.manager.getById(request.resourceId);
    if (!resource) return { success: false, error: `Resource ${request.resourceId} not found` };

    if (resource.status === 'INACTIVE') return { success: false, error: 'Resource is inactive' };
    if (resource.status === 'MAINTENANCE') return { success: false, error: 'Resource is under maintenance' };
    if (resource.status === 'OUT_OF_SERVICE') return { success: false, error: 'Resource is out of service' };
    if (resource.status === 'ARCHIVED') return { success: false, error: 'Resource is archived' };

    if (request.type === 'exclusive') {
      const overlapping = this.allocationService.findOverlapping(request.resourceId, request.startTime, request.endTime, undefined);
      if (overlapping.length > 0) {
        return { success: false, error: `Resource is already reserved during this time (${overlapping.length} overlapping)` };
      }
    }

    const allocation = this.allocationService.reserve(request);
    if (!allocation) return { success: false, error: 'Failed to create reservation' };

    return { success: true, allocation };
  }

  release(allocationId: string): ReservationResult {
    const success = this.allocationService.release(allocationId);
    return success
      ? { success: true }
      : { success: false, error: 'Allocation not found' };
  }

  extend(allocationId: string, newEndTime: string): ReservationResult {
    const allocation = this.allocationService.extend(allocationId, newEndTime);
    return allocation
      ? { success: true, allocation }
      : { success: false, error: 'Cannot extend — overlapping or not found' };
  }

  cancel(allocationId: string): ReservationResult {
    const success = this.allocationService.cancel(allocationId);
    return success
      ? { success: true }
      : { success: false, error: 'Allocation not found' };
  }

  expireTemporaryReservations(): number {
    return this.allocationService.expireTemporary();
  }

  reserveTemporary(request: ResourceReservationRequest): ReservationResult {
    return this.reserve({ ...request, type: 'temporary' });
  }

  convertTemporaryToPermanent(allocationId: string, type: 'primary' | 'secondary' | 'exclusive'): ReservationResult {
    const allocations = this.allocationService.getAll();
    const allocation = allocations.find(a => a.id === allocationId);
    if (!allocation) return { success: false, error: 'Allocation not found' };
    if (allocation.type !== 'temporary') return { success: false, error: 'Not a temporary reservation' };

    allocation.type = type;
    allocation.expiresAt = undefined;

    const existing = this.allocationService.getByAppointment(allocation.appointmentId);
    if (type === 'primary' && existing.some(a => a.type === 'primary' && a.id !== allocationId)) {
      for (const e of existing) {
        if (e.type === 'primary' && e.id !== allocationId) {
          e.type = 'secondary';
        }
      }
    }

    return { success: true, allocation };
  }

  isResourceAvailable(resourceId: string, startTime: string, endTime: string): boolean {
    return this.allocationService.isResourceFree(resourceId, startTime, endTime);
  }

  getResourceAvailability(resourceId: string, date: string): { time: string; available: boolean }[] {
    const resource = this.manager.getById(resourceId);
    if (!resource) return [];

    const slots: { time: string; available: boolean }[] = [];
    for (let h = 9; h < 20; h++) {
      const slotStart = new Date(date);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 3600000);
      const available = this.allocationService.isResourceFree(resourceId, slotStart.toISOString(), slotEnd.toISOString());
      slots.push({ time: slotStart.toISOString(), available });
    }

    return slots;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.expireTemporaryReservations();
    }, 60000);
  }
}
