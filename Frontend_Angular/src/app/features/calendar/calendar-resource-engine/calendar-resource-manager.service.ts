import { Injectable } from '@angular/core';
import type { ResourceEntity, ResourceStatus, ResourceCreateRequest, ResourceUpdateRequest, ResourceType } from './calendar-resource.models';
import { ResourceCacheService, ResourceLookupIndexService } from './calendar-resource-cache.service';

@Injectable({ providedIn: 'root' })
export class ResourceManagerService {
  private resources = new Map<string, ResourceEntity>();
  private changeListeners: Array<() => void> = [];

  constructor(
    private cache: ResourceCacheService,
    private lookupIndex: ResourceLookupIndexService,
  ) {}

  getAll(): ResourceEntity[] {
    const cached = this.cache.getResourceList();
    if (cached) return cached;
    const list = Array.from(this.resources.values());
    this.cache.setResourceList(list);
    return list;
  }

  getById(id: string): ResourceEntity | undefined {
    const cached = this.cache.getResource(id);
    if (cached) return cached;
    const resource = this.resources.get(id);
    if (resource) this.cache.setResource(resource);
    return resource;
  }

  getByType(type: ResourceType): ResourceEntity[] {
    const ids = this.lookupIndex.getIdsByType(type);
    return ids.map(id => this.getById(id)).filter(Boolean) as ResourceEntity[];
  }

  getByBranch(branchId: string): ResourceEntity[] {
    const ids = this.lookupIndex.getIdsByBranch(branchId);
    return ids.map(id => this.getById(id)).filter(Boolean) as ResourceEntity[];
  }

  create(request: ResourceCreateRequest): ResourceEntity {
    const resource: ResourceEntity = {
      id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: request.name,
      type: request.type,
      status: 'ACTIVE',
      branchId: request.branchId,
      branchScope: request.branchScope || 'branch',
      description: request.description,
      capacity: request.capacity ?? 1,
      isFavorite: false,
      isHidden: false,
      color: request.color || '#6366f1',
      icon: request.icon,
      tags: request.tags || [],
      metadata: request.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.resources.set(resource.id, resource);
    this.cache.setResource(resource);
    this.cache.setResourceList(null as unknown as ResourceEntity[]);
    this.lookupIndex.indexResource(resource);
    this.notify();
    return resource;
  }

  update(id: string, request: ResourceUpdateRequest): ResourceEntity | null {
    const existing = this.resources.get(id);
    if (!existing) return null;

    const oldType = existing.type;
    const oldBranch = existing.branchId;
    const oldStatus = existing.status;

    const updated: ResourceEntity = {
      ...existing,
      ...request,
      updatedAt: new Date().toISOString(),
    };
    this.resources.set(id, updated);
    this.cache.setResource(updated);
    this.cache.setResourceList(null as unknown as ResourceEntity[]);

    if (oldType !== updated.type || oldBranch !== updated.branchId || oldStatus !== updated.status) {
      this.lookupIndex.removeResource(id, {
        ...existing,
        type: oldType as ResourceType,
        branchId: oldBranch,
        status: oldStatus as ResourceStatus,
      } as ResourceEntity);
      this.lookupIndex.indexResource(updated);
    }

    this.notify();
    return updated;
  }

  delete(id: string): boolean {
    const existing = this.resources.get(id);
    if (!existing) return false;
    this.resources.delete(id);
    this.cache.removeResource(id);
    this.cache.setResourceList(null as unknown as ResourceEntity[]);
    this.lookupIndex.removeResource(id, existing);
    this.notify();
    return true;
  }

  setStatus(id: string, status: ResourceStatus): ResourceEntity | null {
    const existing = this.getById(id);
    if (!existing) return null;
    return this.update(id, { metadata: { ...existing.metadata, status } } as ResourceUpdateRequest);
  }

  enable(id: string): ResourceEntity | null {
    const resource = this.getById(id);
    if (!resource) return null;
    return this.update(id, { metadata: { ...resource.metadata, status: 'ACTIVE' } } as ResourceUpdateRequest);
  }

  disable(id: string): ResourceEntity | null {
    return this.update(id, { metadata: { status: 'INACTIVE' } } as ResourceUpdateRequest);
  }

  archive(id: string): ResourceEntity | null {
    return this.update(id, { metadata: { status: 'ARCHIVED' } } as ResourceUpdateRequest);
  }

  restore(id: string): ResourceEntity | null {
    return this.update(id, { metadata: { status: 'ACTIVE' } } as ResourceUpdateRequest);
  }

  setFavorite(id: string, favorite: boolean): ResourceEntity | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, isFavorite: favorite, updatedAt: new Date().toISOString() };
    this.resources.set(id, updated);
    this.cache.setResource(updated);
    this.notify();
    return updated;
  }

  setHidden(id: string, hidden: boolean): ResourceEntity | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, isHidden: hidden, updatedAt: new Date().toISOString() };
    this.resources.set(id, updated);
    this.cache.setResource(updated);
    this.notify();
    return updated;
  }

  get count(): number {
    return this.resources.size;
  }

  onChange(fn: () => void): () => void {
    this.changeListeners.push(fn);
    return () => { this.changeListeners = this.changeListeners.filter(l => l !== fn); };
  }

  private notify(): void {
    for (const fn of this.changeListeners) fn();
  }
}
