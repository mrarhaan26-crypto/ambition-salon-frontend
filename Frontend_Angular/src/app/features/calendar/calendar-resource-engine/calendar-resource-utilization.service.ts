import { Injectable, inject } from '@angular/core';
import type { ResourceUtilizationStats, ResourceEntity } from './calendar-resource.models';
import { ResourceManagerService } from './calendar-resource-manager.service';
import { ResourceAllocationService } from './calendar-resource-allocation.service';
import { ResourceMaintenanceService } from './calendar-resource-maintenance.service';
import { BUSINESS_HOURS_START, BUSINESS_HOURS_END } from '../calendar.constants';

@Injectable({ providedIn: 'root' })
export class ResourceUtilizationService {
  private manager = inject(ResourceManagerService);
  private allocationService = inject(ResourceAllocationService);
  private maintenanceService = inject(ResourceMaintenanceService);
  private statsCache = new Map<string, ResourceUtilizationStats>();
  private readonly TTL_MS = 30000;

  getStats(resourceId: string, periodStart: string, periodEnd: string): ResourceUtilizationStats {
    const cacheKey = `${resourceId}:${periodStart}:${periodEnd}`;
    const cached = this.statsCache.get(cacheKey);
    if (cached && Date.now() - new Date(cached.periodEnd).getTime() < this.TTL_MS) return cached;

    const resource = this.manager.getById(resourceId);
    if (!resource) {
      const empty: ResourceUtilizationStats = {
        resourceId, resourceName: 'Unknown', resourceType: 'equipment',
        totalMinutes: 0, freeMinutes: 0, busyMinutes: 0,
        maintenanceMinutes: 0, idleMinutes: 0, usagePercent: 0,
        peakUsageHour: 0, peakUsageDate: '',
        periodStart, periodEnd,
      };
      return empty;
    }

    const stats = this.calculateStats(resource, periodStart, periodEnd);
    this.statsCache.set(cacheKey, stats);
    return stats;
  }

  getStatsForAll(periodStart: string, periodEnd: string): ResourceUtilizationStats[] {
    return this.manager.getAll().map(r => this.getStats(r.id, periodStart, periodEnd));
  }

  getStatsByType(type: string, periodStart: string, periodEnd: string): ResourceUtilizationStats[] {
    return this.manager.getByType(type as any).map(r => this.getStats(r.id, periodStart, periodEnd));
  }

  getTotalUtilization(periodStart: string, periodEnd: string): { averageUsage: number; totalResources: number; peakHour: number } {
    const stats = this.getStatsForAll(periodStart, periodEnd);
    const avg = stats.length > 0
      ? stats.reduce((sum, s) => sum + s.usagePercent, 0) / stats.length
      : 0;
    const peakHour = stats.reduce((max, s) => s.peakUsageHour > max ? s.peakUsageHour : max, 0);
    return { averageUsage: Math.round(avg), totalResources: stats.length, peakHour };
  }

  getPeakUsage(periodStart: string, periodEnd: string): { hour: number; count: number }[] {
    const hourly: Record<number, number> = {};
    for (let h = BUSINESS_HOURS_START; h < BUSINESS_HOURS_END; h++) {
      hourly[h] = 0;
    }

    const allocations = this.allocationService.getAll();
    const startMs = new Date(periodStart).getTime();
    const endMs = new Date(periodEnd).getTime();

    for (const a of allocations) {
      if (a.status !== 'ACTIVE') continue;
      const aStart = new Date(a.startTime).getTime();
      if (aStart < startMs || aStart >= endMs) continue;
      const hour = new Date(a.startTime).getHours();
      if (hourly[hour] !== undefined) hourly[hour]++;
    }

    return Object.entries(hourly)
      .map(([hour, count]) => ({ hour: Number(hour), count }))
      .sort((a, b) => a.hour - b.hour);
  }

  clearCache(): void {
    this.statsCache.clear();
  }

  private calculateStats(resource: ResourceEntity, periodStart: string, periodEnd: string): ResourceUtilizationStats {
    const startMs = new Date(periodStart).getTime();
    const endMs = new Date(periodEnd).getTime();
    const totalMinutes = Math.max(0, (endMs - startMs) / 60000);

    if (totalMinutes <= 0) {
      return {
        resourceId: resource.id, resourceName: resource.name,
        resourceType: resource.type, totalMinutes: 0, freeMinutes: 0,
        busyMinutes: 0, maintenanceMinutes: 0, idleMinutes: 0,
        usagePercent: 0, peakUsageHour: 0, peakUsageDate: '',
        periodStart, periodEnd,
      };
    }

    const allocations = this.allocationService.getByResource(resource.id)
      .filter(a => {
        if (a.status !== 'ACTIVE') return false;
        const aStart = new Date(a.startTime).getTime();
        const aEnd = new Date(a.endTime).getTime();
        return aStart < endMs && aEnd > startMs;
      });

    const maintenanceBlocks = this.maintenanceService.getByResource(resource.id)
      .filter(b => {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        return bStart < endMs && bEnd > startMs;
      });

    let busyMinutes = 0;
    const hourlyBusy: Record<number, number> = {};

    for (const a of allocations) {
      const aStart = Math.max(new Date(a.startTime).getTime(), startMs);
      const aEnd = Math.min(new Date(a.endTime).getTime(), endMs);
      const mins = Math.max(0, (aEnd - aStart) / 60000);
      busyMinutes += mins;

      const hour = new Date(a.startTime).getHours();
      hourlyBusy[hour] = (hourlyBusy[hour] || 0) + mins;
    }

    let maintenanceMinutes = 0;
    for (const b of maintenanceBlocks) {
      const bStart = Math.max(new Date(b.startTime).getTime(), startMs);
      const bEnd = Math.min(new Date(b.endTime).getTime(), endMs);
      maintenanceMinutes += Math.max(0, (bEnd - bStart) / 60000);
    }

    const freeMinutes = totalMinutes - busyMinutes - maintenanceMinutes;
    const usagePercent = Math.round((busyMinutes / Math.max(1, totalMinutes - maintenanceMinutes)) * 100);

    let peakUsageHour = BUSINESS_HOURS_START;
    let peakUsageCount = 0;
    for (const [hour, count] of Object.entries(hourlyBusy)) {
      if (count > peakUsageCount) {
        peakUsageCount = count;
        peakUsageHour = Number(hour);
      }
    }

    return {
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.type,
      totalMinutes: Math.round(totalMinutes),
      freeMinutes: Math.round(freeMinutes),
      busyMinutes: Math.round(busyMinutes),
      maintenanceMinutes: Math.round(maintenanceMinutes),
      idleMinutes: Math.round(freeMinutes),
      usagePercent,
      peakUsageHour,
      peakUsageDate: peakUsageCount > 0 ? periodStart : '',
      periodStart,
      periodEnd,
    };
  }
}
