import { Injectable } from '@angular/core';
import type { QueueEntry, QueueDisplayItem, QueueStats } from './calendar-queue.models';

@Injectable({ providedIn: 'root' })
export class QueueCacheService {
  private entries = new Map<string, QueueEntry>();
  private displayCache: QueueDisplayItem[] | null = null;
  private statsCache: QueueStats | null = null;
  private displayTimestamp = 0;
  private statsTimestamp = 0;
  private readonly TTL_MS = 2000;
  private readonly MAX_ENTRIES = 2000;

  getEntry(id: string): QueueEntry | undefined {
    return this.entries.get(id);
  }

  setEntry(entry: QueueEntry): void {
    if (this.entries.size >= this.MAX_ENTRIES) {
      const firstKey = this.entries.keys().next().value;
      if (firstKey) this.entries.delete(firstKey);
    }
    this.entries.set(entry.id, entry);
    this.displayCache = null;
    this.statsCache = null;
  }

  removeEntry(id: string): void {
    this.entries.delete(id);
    this.displayCache = null;
    this.statsCache = null;
  }

  getCachedDisplay(): QueueDisplayItem[] | null {
    if (this.displayCache && Date.now() - this.displayTimestamp < this.TTL_MS) {
      return this.displayCache;
    }
    return null;
  }

  setCachedDisplay(items: QueueDisplayItem[]): void {
    this.displayCache = items;
    this.displayTimestamp = Date.now();
  }

  getCachedStats(): QueueStats | null {
    if (this.statsCache && Date.now() - this.statsTimestamp < this.TTL_MS) {
      return this.statsCache;
    }
    return null;
  }

  setCachedStats(stats: QueueStats): void {
    this.statsCache = stats;
    this.statsTimestamp = Date.now();
  }

  get allEntries(): QueueEntry[] {
    return Array.from(this.entries.values());
  }

  invalidateAll(): void {
    this.entries.clear();
    this.displayCache = null;
    this.statsCache = null;
    this.displayTimestamp = 0;
    this.statsTimestamp = 0;
  }
}

@Injectable({ providedIn: 'root' })
export class QueueLookupIndexService {
  private byStatus = new Map<string, string[]>();
  private byStaff = new Map<string, string[]>();
  private byClient = new Map<string, string[]>();
  private byPriority = new Map<string, string[]>();

  indexEntry(entry: QueueEntry): void {
    this.addToIndex(this.byStatus, entry.status, entry.id);
    if (entry.staffId) this.addToIndex(this.byStaff, entry.staffId, entry.id);
    if (entry.clientId) this.addToIndex(this.byClient, entry.clientId, entry.id);
    this.addToIndex(this.byPriority, entry.priority, entry.id);
  }

  removeEntry(entry: QueueEntry): void {
    this.removeFromIndex(this.byStatus, entry.status, entry.id);
    if (entry.staffId) this.removeFromIndex(this.byStaff, entry.staffId, entry.id);
    if (entry.clientId) this.removeFromIndex(this.byClient, entry.clientId, entry.id);
    this.removeFromIndex(this.byPriority, entry.priority, entry.id);
  }

  updateIndex(oldEntry: QueueEntry, newEntry: QueueEntry): void {
    this.removeEntry(oldEntry);
    this.indexEntry(newEntry);
  }

  getIdsByStatus(status: string): string[] {
    return this.byStatus.get(status) || [];
  }

  getIdsByStaff(staffId: string): string[] {
    return this.byStaff.get(staffId) || [];
  }

  getIdsByClient(clientId: string): string[] {
    return this.byClient.get(clientId) || [];
  }

  getIdsByPriority(priority: string): string[] {
    return this.byPriority.get(priority) || [];
  }

  clear(): void {
    this.byStatus.clear();
    this.byStaff.clear();
    this.byClient.clear();
    this.byPriority.clear();
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
