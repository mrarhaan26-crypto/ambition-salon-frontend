import { Injectable } from '@angular/core';
import type { ResourceAllocation, ReservationType, ReservationStatus, ResourceReservationRequest } from './calendar-resource.models';
import { ResourceManagerService } from './calendar-resource-manager.service';

@Injectable({ providedIn: 'root' })
export class ResourceAllocationService {
  private allocations = new Map<string, ResourceAllocation>();
  private changeListeners: Array<() => void> = [];

  constructor(private manager: ResourceManagerService) {}

  getAll(): ResourceAllocation[] {
    return Array.from(this.allocations.values());
  }

  getByAppointment(appointmentId: string): ResourceAllocation[] {
    return Array.from(this.allocations.values()).filter(a => a.appointmentId === appointmentId);
  }

  getByResource(resourceId: string): ResourceAllocation[] {
    return Array.from(this.allocations.values()).filter(a => a.resourceId === resourceId);
  }

  getByResourceAndDate(resourceId: string, date: string): ResourceAllocation[] {
    const dateKey = new Date(date).toDateString();
    return Array.from(this.allocations.values()).filter(a => {
      if (a.resourceId !== resourceId) return false;
      const aDate = new Date(a.startTime).toDateString();
      return aDate === dateKey || new Date(a.startTime) <= new Date(date) && new Date(a.endTime) >= new Date(date);
    });
  }

  getActiveByResource(resourceId: string): ResourceAllocation[] {
    return this.getByResource(resourceId).filter(a => a.status === 'ACTIVE');
  }

  reserve(request: ResourceReservationRequest): ResourceAllocation | null {
    const resource = this.manager.getById(request.resourceId);
    if (!resource) return null;

    const overlapping = this.findOverlapping(request.resourceId, request.startTime, request.endTime, undefined);
    if (overlapping.length > 0 && request.type === 'exclusive') return null;

    if (request.type === 'primary') {
      const existingPrimary = this.getByAppointment(request.appointmentId)
        .find(a => a.type === 'primary' && a.status === 'ACTIVE');
      if (existingPrimary) return null;
    }

    const allocation: ResourceAllocation = {
      id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      resourceId: request.resourceId,
      appointmentId: request.appointmentId,
      type: request.type,
      status: 'ACTIVE',
      staffId: request.staffId,
      clientId: request.clientId,
      startTime: request.startTime,
      endTime: request.endTime,
      createdAt: new Date().toISOString(),
    };

    if (request.type === 'temporary') {
      allocation.expiresAt = new Date(Date.now() + 600000).toISOString();
    }

    this.allocations.set(allocation.id, allocation);
    this.notify();
    return allocation;
  }

  release(id: string): boolean {
    const allocation = this.allocations.get(id);
    if (!allocation) return false;
    allocation.status = 'RELEASED';
    allocation.releasedAt = new Date().toISOString();
    this.allocations.set(id, allocation);
    this.notify();
    return true;
  }

  releaseByAppointment(appointmentId: string): number {
    let count = 0;
    for (const [, a] of this.allocations) {
      if (a.appointmentId === appointmentId && a.status === 'ACTIVE') {
        a.status = 'RELEASED';
        a.releasedAt = new Date().toISOString();
        count++;
      }
    }
    if (count > 0) this.notify();
    return count;
  }

  extend(id: string, newEndTime: string): ResourceAllocation | null {
    const allocation = this.allocations.get(id);
    if (!allocation || allocation.status !== 'ACTIVE') return null;

    const overlapping = this.findOverlapping(allocation.resourceId, allocation.endTime, newEndTime, id);
    if (overlapping.length > 0 && allocation.type === 'exclusive') return null;

    allocation.endTime = newEndTime;
    this.allocations.set(id, allocation);
    this.notify();
    return allocation;
  }

  cancel(id: string): boolean {
    const allocation = this.allocations.get(id);
    if (!allocation) return false;
    allocation.status = 'CANCELLED';
    this.allocations.set(id, allocation);
    this.notify();
    return true;
  }

  expire(id: string): boolean {
    const allocation = this.allocations.get(id);
    if (!allocation) return false;
    allocation.status = 'EXPIRED';
    this.allocations.set(id, allocation);
    this.notify();
    return true;
  }

  expireTemporary(): number {
    const now = Date.now();
    let count = 0;
    for (const [, a] of this.allocations) {
      if (a.type === 'temporary' && a.status === 'ACTIVE' && a.expiresAt && new Date(a.expiresAt).getTime() <= now) {
        a.status = 'EXPIRED';
        count++;
      }
    }
    if (count > 0) this.notify();
    return count;
  }

  getPrimaryForAppointment(appointmentId: string): ResourceAllocation | undefined {
    return this.getByAppointment(appointmentId).find(a => a.type === 'primary' && a.status === 'ACTIVE');
  }

  getSecondaryForAppointment(appointmentId: string): ResourceAllocation[] {
    return this.getByAppointment(appointmentId).filter(a => a.type === 'secondary' && a.status === 'ACTIVE');
  }

  isResourceFree(resourceId: string, startTime: string, endTime: string): boolean {
    return this.findOverlapping(resourceId, startTime, endTime, undefined).length === 0;
  }

  findOverlapping(resourceId: string, startTime: string, endTime: string, excludeId?: string): ResourceAllocation[] {
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    return Array.from(this.allocations.values()).filter(a => {
      if (a.resourceId !== resourceId) return false;
      if (a.status !== 'ACTIVE') return false;
      if (excludeId && a.id === excludeId) return false;
      const aStart = new Date(a.startTime).getTime();
      const aEnd = new Date(a.endTime).getTime();
      return startMs < aEnd && endMs > aStart;
    });
  }

  get count(): number {
    return this.allocations.size;
  }

  get activeCount(): number {
    return Array.from(this.allocations.values()).filter(a => a.status === 'ACTIVE').length;
  }

  onChange(fn: () => void): () => void {
    this.changeListeners.push(fn);
    return () => { this.changeListeners = this.changeListeners.filter(l => l !== fn); };
  }

  private notify(): void {
    for (const fn of this.changeListeners) fn();
  }
}
