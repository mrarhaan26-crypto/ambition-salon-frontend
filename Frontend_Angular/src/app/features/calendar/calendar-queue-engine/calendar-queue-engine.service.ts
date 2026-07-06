import { Injectable, inject, OnDestroy } from '@angular/core';
import type { QueueEntry, QueueStatus, PriorityLevel, CheckInRequest, CheckInResult, QueueDisplayItem, QueueStats, QueueSortField } from './calendar-queue.models';
import { CheckInEngineService } from './calendar-checkin-engine.service';
import { QueueManagerService } from './calendar-queue-manager.service';
import { QueuePriorityService } from './calendar-queue-priority.service';
import { QueueDisplayService } from './calendar-queue-display.service';
import { QueueEventSystem } from './calendar-queue-event-system';
import { QueueCacheService, QueueLookupIndexService } from './calendar-queue-cache.service';
import { QUEUE_EXTENSION_POINTS } from './calendar-queue-extension-points';

@Injectable({ providedIn: 'root' })
export class QueueEngineService implements OnDestroy {
  private checkInEngine = inject(CheckInEngineService);
  private manager = inject(QueueManagerService);
  private priorityService = inject(QueuePriorityService);
  private display = inject(QueueDisplayService);
  private events = inject(QueueEventSystem);
  private cache = inject(QueueCacheService);
  private lookupIndex = inject(QueueLookupIndexService);

  ngOnDestroy(): void {
    this.events.removeAll();
  }

  checkIn(request: CheckInRequest): CheckInResult {
    return this.checkInEngine.checkIn(request);
  }

  walkInCheckIn(clientName: string, services: { name: string; durationMin: number; price: number }[], createdBy: string, staffId?: string): CheckInResult {
    return this.checkInEngine.walkInCheckIn(clientName, services, createdBy, staffId);
  }

  getAll(): QueueEntry[] { return this.manager.getAll(); }
  getActive(): QueueEntry[] { return this.manager.getActive(); }
  getByStatus(status: QueueStatus): QueueEntry[] { return this.manager.getByStatus(status); }
  getByStaff(staffId: string): QueueEntry[] { return this.manager.getByStaff(staffId); }
  getById(id: string): QueueEntry | undefined { return this.manager.getById(id); }

  updateStatus(id: string, status: QueueStatus): QueueEntry | null {
    return this.manager.updateStatus(id, status);
  }

  assignStaff(id: string, staffId: string, staffName?: string): QueueEntry | null {
    return this.manager.assignStaff(id, staffId, staffName);
  }

  remove(id: string): boolean { return this.manager.remove(id); }

  reorder(entryId: string, newPosition: number): boolean {
    return this.manager.reorder(entryId, newPosition);
  }

  movePriority(id: string, level: PriorityLevel): QueueEntry | null {
    return this.manager.movePriority(id, level);
  }

  hold(id: string): QueueEntry | null { return this.manager.hold(id); }
  resume(id: string): QueueEntry | null { return this.manager.resume(id); }
  isOnHold(id: string): boolean { return this.manager.isOnHold(id); }

  getSorted(sortField?: QueueSortField, ascending?: boolean): QueueEntry[] {
    return this.manager.getSorted(sortField, ascending);
  }

  getDisplayList(): QueueDisplayItem[] { return this.display.getDisplayList(); }
  getDisplayForStatus(status: string): QueueDisplayItem[] { return this.display.getDisplayForStatus(status); }
  getStats(): QueueStats { return this.display.getStats(); }
  refreshStats(): QueueStats { return this.display.refreshStats(); }

  get checkInEngineService(): CheckInEngineService { return this.checkInEngine; }
  get managerService(): QueueManagerService { return this.manager; }
  get priorityServiceAccessor(): QueuePriorityService { return this.priorityService; }
  get displayService(): QueueDisplayService { return this.display; }
  get eventSystem(): QueueEventSystem { return this.events; }
  get cacheAccessor(): QueueCacheService { return this.cache; }
  get lookupIndexAccessor(): QueueLookupIndexService { return this.lookupIndex; }
  get extensionPoints(): typeof QUEUE_EXTENSION_POINTS { return QUEUE_EXTENSION_POINTS; }

  get count(): number { return this.manager.count; }
  get activeCount(): number { return this.manager.activeCount; }

  clearCache(): void {
    this.cache.invalidateAll();
    this.lookupIndex.clear();
  }
}
