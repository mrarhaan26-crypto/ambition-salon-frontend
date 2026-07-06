import { Injectable } from '@angular/core';
import type { ConflictReport, ValidationContext } from './calendar-conflict.models';
import { addConflict, createEmptyConflictReport } from './calendar-conflict.models';

export interface BufferConfig {
  beforeMinutes: number;
  afterMinutes: number;
  cleaningMinutes: number;
  preparationMinutes: number;
  travelMinutes: number;
}

export interface StaffBufferConfigs {
  [staffId: string]: BufferConfig;
}

const DEFAULT_BUFFER: BufferConfig = {
  beforeMinutes: 5,
  afterMinutes: 5,
  cleaningMinutes: 10,
  preparationMinutes: 5,
  travelMinutes: 0,
};

@Injectable({ providedIn: 'root' })
export class BufferEngineService {
  private staffConfigs: StaffBufferConfigs = {};
  private globalConfig: BufferConfig = { ...DEFAULT_BUFFER };

  setGlobalConfig(config: Partial<BufferConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config };
  }

  setStaffConfig(staffId: string, config: Partial<BufferConfig>): void {
    const existing = this.staffConfigs[staffId] || { ...DEFAULT_BUFFER };
    this.staffConfigs[staffId] = { ...existing, ...config };
  }

  getConfig(staffId?: string): BufferConfig {
    if (staffId && this.staffConfigs[staffId]) {
      return this.staffConfigs[staffId];
    }
    return { ...this.globalConfig };
  }

  clearConfigs(): void {
    this.staffConfigs = {};
  }

  validate(ctx: ValidationContext): ConflictReport {
    const report = createEmptyConflictReport();
    const config = this.getConfig(ctx.staffId);

    this.checkBufferBefore(ctx, report, config);
    this.checkBufferAfter(ctx, report, config);
    this.checkCleaningTime(ctx, report, config);
    this.checkPreparationTime(ctx, report, config);
    this.checkTravelTime(ctx, report, config);

    return report;
  }

  getAdjustedTime(startTime: string, endTime: string, staffId?: string): { startTime: string; endTime: string } {
    const config = this.getConfig(staffId);
    const start = new Date(startTime);
    const end = new Date(endTime);

    start.setMinutes(start.getMinutes() - config.preparationMinutes);
    end.setMinutes(end.getMinutes() + config.cleaningMinutes);

    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  }

  getBufferBeforeMinutes(staffId?: string): number {
    return this.getConfig(staffId).beforeMinutes;
  }

  getBufferAfterMinutes(staffId?: string): number {
    return this.getConfig(staffId).afterMinutes;
  }

  private checkBufferBefore(ctx: ValidationContext, report: ConflictReport, config: BufferConfig): void {
    if (config.beforeMinutes <= 0) return;
    const startMs = new Date(ctx.startTime).getTime();
    const bufferStart = new Date(startMs - config.beforeMinutes * 60000).toISOString();
    addConflict(report, {
      type: 'buffer_before',
      severity: 'info',
      category: 'buffer',
      message: `${config.beforeMinutes}min buffer needed before appointment`,
      details: `Buffer window: ${bufferStart} - ${ctx.startTime}`,
      canOverride: true,
      overrideRole: 'manager',
    });
  }

  private checkBufferAfter(ctx: ValidationContext, report: ConflictReport, config: BufferConfig): void {
    if (config.afterMinutes <= 0) return;
    const endMs = new Date(ctx.endTime).getTime();
    const bufferEnd = new Date(endMs + config.afterMinutes * 60000).toISOString();
    addConflict(report, {
      type: 'buffer_after',
      severity: 'info',
      category: 'buffer',
      message: `${config.afterMinutes}min buffer needed after appointment`,
      details: `Buffer window: ${ctx.endTime} - ${bufferEnd}`,
      canOverride: true,
      overrideRole: 'manager',
    });
  }

  private checkCleaningTime(ctx: ValidationContext, report: ConflictReport, config: BufferConfig): void {
    if (config.cleaningMinutes <= 0) return;
    addConflict(report, {
      type: 'buffer_cleaning',
      severity: 'info',
      category: 'buffer',
      message: `${config.cleaningMinutes}min cleaning time needed`,
      details: `Cleaning time required after service`,
      canOverride: true,
      overrideRole: 'manager',
    });
  }

  private checkPreparationTime(ctx: ValidationContext, report: ConflictReport, config: BufferConfig): void {
    if (config.preparationMinutes <= 0) return;
    addConflict(report, {
      type: 'buffer_preparation',
      severity: 'info',
      category: 'buffer',
      message: `${config.preparationMinutes}min preparation time needed`,
      details: `Preparation time required before service`,
      canOverride: true,
      overrideRole: 'manager',
    });
  }

  private checkTravelTime(ctx: ValidationContext, report: ConflictReport, config: BufferConfig): void {
    if (config.travelMinutes <= 0) return;
    addConflict(report, {
      type: 'buffer_travel',
      severity: 'info',
      category: 'buffer',
      message: `${config.travelMinutes}min travel time needed`,
      details: `Travel time between locations`,
      canOverride: true,
      overrideRole: 'manager',
    });
  }
}
