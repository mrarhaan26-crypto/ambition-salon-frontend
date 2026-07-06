import { Injectable } from '@angular/core';
import type { ResourceEntity, ResourceAllocation, MaintenanceBlock, ResourceTimelineSlot } from './calendar-resource.models';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ResourceCacheService {
  private resources = new Map<string, CacheEntry<ResourceEntity>>();
  private allocations = new Map<string, CacheEntry<ResourceAllocation[]>>();
  private maintenance = new Map<string, CacheEntry<MaintenanceBlock[]>>();
  private timelines = new Map<string, CacheEntry<ResourceTimelineSlot[]>>();
  private listCache: { data: ResourceEntity[]; timestamp: number } | null = null;
  private readonly TTL_MS = 10000;
  private readonly MAX_ENTRIES = 500;

  getResource(id: string): ResourceEntity | null {
    const entry = this.resources.get(id);
    if (!entry || Date.now() - entry.timestamp > this.TTL_MS) {
      if (entry) this.resources.delete(id);
      return null;
    }
    return entry.data;
  }

  setResource(resource: ResourceEntity): void {
    this.evictIfNeeded(this.resources);
    this.resources.set(resource.id, { data: resource, timestamp: Date.now() });
    this.listCache = null;
  }

  removeResource(id: string): void {
    this.resources.delete(id);
    this.listCache = null;
  }

  getResourceList(): ResourceEntity[] | null {
    if (!this.listCache || Date.now() - this.listCache.timestamp > this.TTL_MS) {
      this.listCache = null;
      return null;
    }
    return this.listCache.data;
  }

  setResourceList(resources: ResourceEntity[]): void {
    this.listCache = { data: resources, timestamp: Date.now() };
  }

  getAllocations(resourceId: string, date: string): ResourceAllocation[] | null {
    const key = `${resourceId}:${date}`;
    const entry = this.allocations.get(key);
    if (!entry || Date.now() - entry.timestamp > this.TTL_MS) {
      if (entry) this.allocations.delete(key);
      return null;
    }
    return entry.data;
  }

  setAllocations(resourceId: string, date: string, allocations: ResourceAllocation[]): void {
    this.evictIfNeeded(this.allocations);
    this.allocations.set(`${resourceId}:${date}`, { data: allocations, timestamp: Date.now() });
  }

  removeAllocationsForResource(resourceId: string): void {
    for (const key of this.allocations.keys()) {
      if (key.startsWith(resourceId + ':')) this.allocations.delete(key);
    }
  }

  getMaintenance(resourceId: string, date: string): MaintenanceBlock[] | null {
    const key = `${resourceId}:m:${date}`;
    const entry = this.maintenance.get(key);
    if (!entry || Date.now() - entry.timestamp > this.TTL_MS) {
      if (entry) this.maintenance.delete(key);
      return null;
    }
    return entry.data;
  }

  setMaintenance(resourceId: string, date: string, blocks: MaintenanceBlock[]): void {
    this.evictIfNeeded(this.maintenance);
    this.maintenance.set(`${resourceId}:m:${date}`, { data: blocks, timestamp: Date.now() });
  }

  getTimeline(resourceId: string, date: string): ResourceTimelineSlot[] | null {
    const key = `${resourceId}:t:${date}`;
    const entry = this.timelines.get(key);
    if (!entry || Date.now() - entry.timestamp > this.TTL_MS) {
      if (entry) this.timelines.delete(key);
      return null;
    }
    return entry.data;
  }

  setTimeline(resourceId: string, date: string, slots: ResourceTimelineSlot[]): void {
    this.evictIfNeeded(this.timelines);
    this.timelines.set(`${resourceId}:t:${date}`, { data: slots, timestamp: Date.now() });
  }

  invalidateAll(): void {
    this.resources.clear();
    this.allocations.clear();
    this.maintenance.clear();
    this.timelines.clear();
    this.listCache = null;
  }

  invalidateResource(resourceId: string): void {
    this.resources.delete(resourceId);
    this.removeAllocationsForResource(resourceId);
    for (const key of this.maintenance.keys()) {
      if (key.startsWith(resourceId + ':m:')) this.maintenance.delete(key);
    }
    for (const key of this.timelines.keys()) {
      if (key.startsWith(resourceId + ':t:')) this.timelines.delete(key);
    }
    this.listCache = null;
  }

  private evictIfNeeded(map: Map<string, CacheEntry<unknown>>): void {
    if (map.size < this.MAX_ENTRIES) return;
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of map) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) map.delete(oldestKey);
  }
}

@Injectable({ providedIn: 'root' })
export class ResourceLookupIndexService {
  private byType = new Map<string, string[]>();
  private byBranch = new Map<string, string[]>();
  private byStatus = new Map<string, string[]>();

  indexResource(resource: ResourceEntity): void {
    this.addToIndex(this.byType, resource.type, resource.id);
    this.addToIndex(this.byBranch, resource.branchId, resource.id);
    this.addToIndex(this.byStatus, resource.status, resource.id);
  }

  removeResource(resourceId: string, resource: ResourceEntity): void {
    this.removeFromIndex(this.byType, resource.type, resourceId);
    this.removeFromIndex(this.byBranch, resource.branchId, resourceId);
    this.removeFromIndex(this.byStatus, resource.status, resourceId);
  }

  getIdsByType(type: string): string[] {
    return this.byType.get(type) || [];
  }

  getIdsByBranch(branchId: string): string[] {
    return this.byBranch.get(branchId) || [];
  }

  getIdsByStatus(status: string): string[] {
    return this.byStatus.get(status) || [];
  }

  clear(): void {
    this.byType.clear();
    this.byBranch.clear();
    this.byStatus.clear();
  }

  private addToIndex(index: Map<string, string[]>, key: string, id: string): void {
    if (!index.has(key)) index.set(key, []);
    const ids = index.get(key)!;
    if (!ids.includes(id)) ids.push(id);
  }

  private removeFromIndex(index: Map<string, string[]>, key: string, id: string): void {
    const ids = index.get(key);
    if (!ids) return;
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1);
    if (ids.length === 0) index.delete(key);
  }
}
