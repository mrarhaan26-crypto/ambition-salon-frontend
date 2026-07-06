import { Injectable, inject } from '@angular/core';
import type { QueueEntry, QueueStatus, PriorityLevel, QueueSortField } from './calendar-queue.models';
import { QueueCacheService, QueueLookupIndexService } from './calendar-queue-cache.service';
import { QueuePriorityService } from './calendar-queue-priority.service';
import { QueueEventSystem } from './calendar-queue-event-system';

@Injectable({ providedIn: 'root' })
export class QueueManagerService {
  private cache = inject(QueueCacheService);
  private lookupIndex = inject(QueueLookupIndexService);
  private priorityService = inject(QueuePriorityService);
  private events = inject(QueueEventSystem);
  private holdSet = new Set<string>();

  getAll(): QueueEntry[] {
    return this.cache.allEntries;
  }

  getActive(): QueueEntry[] {
    return this.cache.allEntries.filter(e =>
      e.status === 'WAITING' || e.status === 'CHECKED_IN' ||
      e.status === 'CALLED' || e.status === 'ASSIGNED'
    );
  }

  getByStatus(status: QueueStatus): QueueEntry[] {
    const ids = this.lookupIndex.getIdsByStatus(status);
    return ids.map(id => this.cache.getEntry(id)).filter(Boolean) as QueueEntry[];
  }

  getByStaff(staffId: string): QueueEntry[] {
    const ids = this.lookupIndex.getIdsByStaff(staffId);
    return ids.map(id => this.cache.getEntry(id)).filter(Boolean) as QueueEntry[];
  }

  getById(id: string): QueueEntry | undefined {
    return this.cache.getEntry(id);
  }

  updateStatus(id: string, newStatus: QueueStatus): QueueEntry | null {
    const entry = this.cache.getEntry(id);
    if (!entry) return null;

    const oldStatus = entry.status;
    const oldEntry = { ...entry };
    entry.status = newStatus;
    entry.updatedAt = new Date().toISOString();

    const timestamp = new Date().toISOString();
    if (newStatus === 'CALLED') entry.calledAt = timestamp;
    else if (newStatus === 'ASSIGNED') entry.assignedAt = timestamp;
    else if (newStatus === 'IN_SERVICE') entry.inServiceAt = timestamp;
    else if (newStatus === 'COMPLETED') entry.completedAt = timestamp;

    this.cache.setEntry(entry);
    this.lookupIndex.updateIndex(oldEntry, entry);

    const eventMap: Partial<Record<QueueStatus, string>> = {
      CALLED: 'queue:called', ASSIGNED: 'queue:assigned',
      IN_SERVICE: 'queue:in_service', COMPLETED: 'queue:completed',
      CANCELLED: 'queue:cancelled', NO_SHOW: 'queue:no_show',
    };
    const eventType = eventMap[newStatus];
    if (eventType) {
      (this.events as any).emit(eventType, { entry, previousStatus: oldStatus });
    }

    return entry;
  }

  assignStaff(id: string, staffId: string, staffName?: string): QueueEntry | null {
    const entry = this.cache.getEntry(id);
    if (!entry) return null;
    const oldEntry = { ...entry };
    entry.staffId = staffId;
    if (staffName) entry.staffName = staffName;
    entry.updatedAt = new Date().toISOString();
    if (entry.status === 'CHECKED_IN' || entry.status === 'WAITING') {
      entry.status = 'ASSIGNED';
      entry.assignedAt = new Date().toISOString();
    }
    this.cache.setEntry(entry);
    this.lookupIndex.updateIndex(oldEntry, entry);
    this.events.emit('queue:assigned', { entry, previousStatus: oldEntry.status });
    return entry;
  }

  remove(id: string): boolean {
    const entry = this.cache.getEntry(id);
    if (!entry) return false;
    this.cache.removeEntry(id);
    this.lookupIndex.removeEntry(entry);
    this.holdSet.delete(id);
    return true;
  }

  reorder(entryId: string, newPosition: number): boolean {
    const entry = this.cache.getEntry(entryId);
    if (!entry) return false;

    const active = this.getActive()
      .filter(e => e.id !== entryId)
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
      });

    const clamped = Math.max(1, Math.min(newPosition, active.length + 1));

    active.splice(clamped - 1, 0, entry);
    for (let i = 0; i < active.length; i++) {
      active[i].position = i + 1;
      this.cache.setEntry(active[i]);
    }

    this.events.emit('queue:reordered', { entry, metadata: { newPosition: clamped } });
    return true;
  }

  movePriority(id: string, level: PriorityLevel): QueueEntry | null {
    const entry = this.cache.getEntry(id);
    if (!entry) return null;

    const oldEntry = { ...entry };
    this.priorityService.setManualOverride(id, level);
    entry.priority = level;
    entry.priorityScore = this.getScoreForLevel(level);
    entry.priorityReason = `Manual override to ${level}`;
    entry.updatedAt = new Date().toISOString();
    entry.position = this.recalculateAllPositions();

    this.cache.setEntry(entry);
    this.lookupIndex.updateIndex(oldEntry, entry);
    this.events.emit('queue:priority_changed', { entry, previousStatus: oldEntry.priority });
    return entry;
  }

  hold(id: string): QueueEntry | null {
    const entry = this.cache.getEntry(id);
    if (!entry) return null;
    this.holdSet.add(id);
    entry.priority = 'LOW';
    entry.priorityScore = 0;
    entry.priorityReason = 'On hold';
    entry.updatedAt = new Date().toISOString();
    entry.position = this.recalculateAllPositions();
    this.cache.setEntry(entry);
    this.events.emit('queue:hold', { entry });
    return entry;
  }

  resume(id: string): QueueEntry | null {
    const entry = this.cache.getEntry(id);
    if (!entry) return null;
    if (!this.holdSet.has(id)) return entry;
    this.holdSet.delete(id);
    entry.priority = 'NORMAL';
    entry.priorityScore = 10;
    entry.priorityReason = 'Resumed';
    entry.updatedAt = new Date().toISOString();
    entry.position = this.recalculateAllPositions();
    this.cache.setEntry(entry);
    this.events.emit('queue:resume', { entry });
    return entry;
  }

  isOnHold(id: string): boolean {
    return this.holdSet.has(id);
  }

  getSorted(sortField: QueueSortField = 'priority', ascending = false): QueueEntry[] {
    const active = this.getActive();
    return [...active].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'priority') cmp = b.priorityScore - a.priorityScore;
      else if (sortField === 'checkInTime') cmp = new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
      else if (sortField === 'appointmentTime') {
        const aT = a.appointmentTime ? new Date(a.appointmentTime).getTime() : 0;
        const bT = b.appointmentTime ? new Date(b.appointmentTime).getTime() : 0;
        cmp = aT - bT;
      } else if (sortField === 'waitingTime') cmp = b.waitingMinutes - a.waitingMinutes;
      return ascending ? cmp : -cmp;
    });
  }

  get count(): number {
    return this.cache.allEntries.length;
  }

  get activeCount(): number {
    return this.getActive().length;
  }

  private recalculateAllPositions(): number {
    const active = this.getActive().sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
    });
    for (let i = 0; i < active.length; i++) {
      active[i].position = i + 1;
    }
    return active.length;
  }

  private getScoreForLevel(level: PriorityLevel): number {
    const scores: Record<PriorityLevel, number> = { LOW: 0, NORMAL: 10, HIGH: 30, URGENT: 50 };
    return scores[level] || 0;
  }
}
