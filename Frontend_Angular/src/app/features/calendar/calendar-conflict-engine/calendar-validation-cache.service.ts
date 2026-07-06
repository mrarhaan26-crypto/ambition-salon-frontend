import { Injectable } from '@angular/core';
import type { ConflictReport, ValidationContext } from './calendar-conflict.models';

interface CacheEntry {
  report: ConflictReport;
  timestamp: number;
  contextHash: string;
}

@Injectable({ providedIn: 'root' })
export class ValidationCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 5000;
  private readonly MAX_ENTRIES = 500;

  get(context: ValidationContext): ConflictReport | null {
    const hash = this.hashContext(context);
    const entry = this.cache.get(hash);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(hash);
      return null;
    }
    return entry.report;
  }

  set(context: ValidationContext, report: ConflictReport): void {
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.evictOldest();
    }
    const hash = this.hashContext(context);
    this.cache.set(hash, {
      report,
      timestamp: Date.now(),
      contextHash: hash,
    });
  }

  invalidate(appointmentId?: string, staffId?: string, clientId?: string): void {
    if (!appointmentId && !staffId && !clientId) {
      this.clear();
      return;
    }

    for (const [hash, entry] of this.cache) {
      if (appointmentId && entry.report.conflicts.some(c => c.appointmentId === appointmentId)) {
        this.cache.delete(hash);
      } else if (staffId && entry.report.conflicts.some(c => c.conflictingStaffId === staffId)) {
        this.cache.delete(hash);
      } else if (clientId && entry.report.conflicts.some(c => c.conflictingClientId === clientId)) {
        this.cache.delete(hash);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  private hashContext(context: ValidationContext): string {
    return `${context.mode}|${context.staffId}|${context.clientId || ''}|${context.startTime}|${context.endTime}|${context.resourceId || ''}|${context.appointmentId || ''}`;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

@Injectable({ providedIn: 'root' })
export class LookupIndexService {
  private staffIndex = new Map<string, Map<string, { startTime: string; endTime: string; id: string }[]>>();
  private clientIndex = new Map<string, Map<string, { startTime: string; endTime: string; id: string }[]>>();
  private resourceIndex = new Map<string, Map<string, { startTime: string; endTime: string; id: string }[]>>();

  indexStaffAppointments(staffId: string, appointments: { startTime: string; endTime: string; id: string }[]): void {
    const dateMap = new Map<string, { startTime: string; endTime: string; id: string }[]>();
    for (const apt of appointments) {
      const dateKey = new Date(apt.startTime).toDateString();
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(apt);
    }
    this.staffIndex.set(staffId, dateMap);
  }

  indexClientAppointments(clientId: string, appointments: { startTime: string; endTime: string; id: string }[]): void {
    const dateMap = new Map<string, { startTime: string; endTime: string; id: string }[]>();
    for (const apt of appointments) {
      const dateKey = new Date(apt.startTime).toDateString();
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(apt);
    }
    this.clientIndex.set(clientId, dateMap);
  }

  indexResourceAppointments(resourceId: string, appointments: { startTime: string; endTime: string; id: string }[]): void {
    const dateMap = new Map<string, { startTime: string; endTime: string; id: string }[]>();
    for (const apt of appointments) {
      const dateKey = new Date(apt.startTime).toDateString();
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(apt);
    }
    this.resourceIndex.set(resourceId, dateMap);
  }

  getStaffAppointmentsForDate(staffId: string, date: string): { startTime: string; endTime: string; id: string }[] {
    const dateMap = this.staffIndex.get(staffId);
    if (!dateMap) return [];
    const dateKey = new Date(date).toDateString();
    return dateMap.get(dateKey) || [];
  }

  getClientAppointmentsForDate(clientId: string, date: string): { startTime: string; endTime: string; id: string }[] {
    const dateMap = this.clientIndex.get(clientId);
    if (!dateMap) return [];
    const dateKey = new Date(date).toDateString();
    return dateMap.get(dateKey) || [];
  }

  getResourceAppointmentsForDate(resourceId: string, date: string): { startTime: string; endTime: string; id: string }[] {
    const dateMap = this.resourceIndex.get(resourceId);
    if (!dateMap) return [];
    const dateKey = new Date(date).toDateString();
    return dateMap.get(dateKey) || [];
  }

  clear(): void {
    this.staffIndex.clear();
    this.clientIndex.clear();
    this.resourceIndex.clear();
  }

  clearStaff(staffId: string): void {
    this.staffIndex.delete(staffId);
  }

  clearClient(clientId: string): void {
    this.clientIndex.delete(clientId);
  }

  clearResource(resourceId: string): void {
    this.resourceIndex.delete(resourceId);
  }
}
