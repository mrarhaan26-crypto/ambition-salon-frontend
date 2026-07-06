import { Injectable, inject } from '@angular/core';
import type { QueueEntry, QueueDisplayItem, QueueStats } from './calendar-queue.models';
import { QueueCacheService } from './calendar-queue-cache.service';

@Injectable({ providedIn: 'root' })
export class QueueDisplayService {
  private cache = inject(QueueCacheService);

  getDisplayList(): QueueDisplayItem[] {
    const cached = this.cache.getCachedDisplay();
    if (cached) return cached;

    const entries = this.cache.allEntries;
    const now = Date.now();

    const items = entries
      .filter(e => e.status !== 'COMPLETED' && e.status !== 'CANCELLED' && e.status !== 'NO_SHOW')
      .sort((a, b) => a.position - b.position)
      .map(e => this.toDisplayItem(e, now));

    this.cache.setCachedDisplay(items);
    return items;
  }

  getDisplayForStatus(status: string): QueueDisplayItem[] {
    return this.getDisplayList().filter(d => d.status === status);
  }

  getStats(): QueueStats {
    const cached = this.cache.getCachedStats();
    if (cached) return cached;

    const entries = this.cache.allEntries;
    const now = Date.now();

    const stats: QueueStats = {
      totalWaiting: entries.filter(e => e.status === 'WAITING').length,
      totalCheckedIn: entries.filter(e => e.status === 'CHECKED_IN').length,
      totalInService: entries.filter(e => e.status === 'IN_SERVICE').length,
      totalCompleted: entries.filter(e => e.status === 'COMPLETED').length,
      totalCancelled: entries.filter(e => e.status === 'CANCELLED').length,
      totalNoShow: entries.filter(e => e.status === 'NO_SHOW').length,
      averageWaitMinutes: 0,
      longestWaitMinutes: 0,
      estimatedTotalServiceMinutes: 0,
      peakQueueLength: 0,
    };

    const active = entries.filter(e => e.status === 'WAITING' || e.status === 'CHECKED_IN');
    if (active.length > 0) {
      const waitTimes = active.map(e => Math.round((now - new Date(e.checkInTime).getTime()) / 60000));
      stats.averageWaitMinutes = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
      stats.longestWaitMinutes = Math.max(...waitTimes);
    }

    const inService = entries.filter(e => e.status === 'IN_SERVICE' || e.status === 'ASSIGNED');
    stats.estimatedTotalServiceMinutes = inService.reduce((sum, e) => sum + e.estimatedServiceMinutes, 0);

    this.cache.setCachedStats(stats);
    return stats;
  }

  refreshStats(): QueueStats {
    this.cache.setCachedStats(null as unknown as QueueStats);
    return this.getStats();
  }

  private toDisplayItem(entry: QueueEntry, now: number): QueueDisplayItem {
    return {
      id: entry.id,
      token: entry.token,
      queueNumber: entry.queueNumber,
      clientName: entry.clientName,
      isVIP: entry.isVIP,
      status: entry.status,
      priority: entry.priority,
      position: entry.position,
      estimatedWaitMinutes: entry.estimatedWaitMinutes,
      estimatedServiceMinutes: entry.estimatedServiceMinutes,
      waitingMinutes: Math.round((now - new Date(entry.checkInTime).getTime()) / 60000),
      assignedStaff: entry.staffName,
      assignedResource: entry.resourceName,
      serviceName: entry.services[0]?.name || 'No service',
      serviceDuration: entry.services.reduce((s, sv) => s + sv.durationMin, 0),
      checkInTime: entry.checkInTime,
      membershipTier: entry.membershipTier,
    };
  }
}
