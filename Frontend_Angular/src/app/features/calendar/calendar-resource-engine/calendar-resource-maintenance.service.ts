import { Injectable } from '@angular/core';
import type { MaintenanceBlock, MaintenanceType } from './calendar-resource.models';

@Injectable({ providedIn: 'root' })
export class ResourceMaintenanceService {
  private blocks = new Map<string, MaintenanceBlock[]>();
  private changeListeners: Array<() => void> = [];

  getAll(resourceId?: string): MaintenanceBlock[] {
    if (resourceId) {
      return this.blocks.get(resourceId) || [];
    }
    return Array.from(this.blocks.values()).flat();
  }

  getByResourceAndDate(resourceId: string, date: string): MaintenanceBlock[] {
    const resourceBlocks = this.blocks.get(resourceId) || [];
    const dateKey = new Date(date).toDateString();
    return resourceBlocks.filter(b => {
      const bDate = new Date(b.startTime).toDateString();
      return bDate === dateKey;
    });
  }

  getByResource(resourceId: string): MaintenanceBlock[] {
    return this.blocks.get(resourceId) || [];
  }

  getActive(resourceId: string): MaintenanceBlock[] {
    const now = new Date().toISOString();
    return (this.blocks.get(resourceId) || []).filter(b =>
      b.startTime <= now && b.endTime >= now
    );
  }

  createBlock(block: Omit<MaintenanceBlock, 'id' | 'createdAt'>): MaintenanceBlock {
    const newBlock: MaintenanceBlock = {
      ...block,
      id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
    };

    if (!this.blocks.has(block.resourceId)) {
      this.blocks.set(block.resourceId, []);
    }
    this.blocks.get(block.resourceId)!.push(newBlock);
    this.notify();
    return newBlock;
  }

  createCleaning(resourceId: string, startTime: string, endTime: string, label?: string): MaintenanceBlock {
    return this.createBlock({
      resourceId, type: 'CLEANING',
      startTime, endTime,
      label: label || 'Cleaning',
      createdBy: 'system',
    });
  }

  createRepair(resourceId: string, startTime: string, endTime: string, label?: string, description?: string): MaintenanceBlock {
    return this.createBlock({
      resourceId, type: 'REPAIR',
      startTime, endTime,
      label: label || 'Repair',
      description, createdBy: 'system',
    });
  }

  createCalibration(resourceId: string, startTime: string, endTime: string, label?: string): MaintenanceBlock {
    return this.createBlock({
      resourceId, type: 'CALIBRATION',
      startTime, endTime,
      label: label || 'Calibration',
      createdBy: 'system',
    });
  }

  createInspection(resourceId: string, startTime: string, endTime: string, label?: string): MaintenanceBlock {
    return this.createBlock({
      resourceId, type: 'INSPECTION',
      startTime, endTime,
      label: label || 'Inspection',
      createdBy: 'system',
    });
  }

  createManualBlock(resourceId: string, startTime: string, endTime: string, label: string, description?: string): MaintenanceBlock {
    return this.createBlock({
      resourceId, type: 'MANUAL_BLOCK',
      startTime, endTime, label, description,
      createdBy: 'user',
    });
  }

  createHolidayBlock(resourceId: string, startTime: string, endTime: string, label?: string): MaintenanceBlock {
    return this.createBlock({
      resourceId, type: 'HOLIDAY_BLOCK',
      startTime, endTime,
      label: label || 'Holiday',
      createdBy: 'system',
    });
  }

  deleteBlock(id: string): boolean {
    for (const [, blocks] of this.blocks) {
      const idx = blocks.findIndex(b => b.id === id);
      if (idx >= 0) {
        blocks.splice(idx, 1);
        this.notify();
        return true;
      }
    }
    return false;
  }

  deleteBlocksForResource(resourceId: string): number {
    const blocks = this.blocks.get(resourceId);
    if (!blocks) return 0;
    const count = blocks.length;
    this.blocks.delete(resourceId);
    if (count > 0) this.notify();
    return count;
  }

  isInMaintenance(resourceId: string, time: string): boolean {
    const timeMs = new Date(time).getTime();
    return (this.blocks.get(resourceId) || []).some(b => {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      return timeMs >= start && timeMs < end;
    });
  }

  get totalBlocks(): number {
    return Array.from(this.blocks.values()).reduce((sum, b) => sum + b.length, 0);
  }

  onChange(fn: () => void): () => void {
    this.changeListeners.push(fn);
    return () => { this.changeListeners = this.changeListeners.filter(l => l !== fn); };
  }

  private notify(): void {
    for (const fn of this.changeListeners) fn();
  }
}
