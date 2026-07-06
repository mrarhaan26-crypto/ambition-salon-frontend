import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import type { ConflictReport, ValidationContext, ConflictItem } from './calendar-conflict.models';
import { createEmptyConflictReport, addConflict, MAX_CONFLICTS_PER_REPORT } from './calendar-conflict.models';
import { StaffConflictService } from './calendar-staff-conflict.service';
import { ClientConflictService } from './calendar-client-conflict.service';
import { ResourceConflictService } from './calendar-resource-conflict.service';
import { BufferEngineService } from './calendar-buffer-engine.service';
import { AvailabilityEngineService } from './calendar-availability-engine.service';
import { OverrideService } from './calendar-override.service';
import { ConflictEventSystem } from './calendar-conflict-event-system';
import { ConflictVisualService } from './calendar-conflict-visual.service';
import { ValidationCacheService, LookupIndexService } from './calendar-validation-cache.service';
import { CONFLICT_EXTENSION_POINTS } from './calendar-conflict-extension-points';
import type { DragSession } from '../calendar-drag-engine/calendar-drag-state.service';
import type { DragEventPayload } from '../calendar-drag-engine/calendar-drag-events-system';
import { DragEventSystem } from '../calendar-drag-engine/calendar-drag-events-system';
import type { ConflictExtensionV3 } from '../calendar-drag-engine/calendar-drag-extension-points';
import { DRAG_EXTENSION_POINTS } from '../calendar-drag-engine/calendar-drag-extension-points';

@Injectable({ providedIn: 'root' })
export class ConflictEngineService implements ConflictExtensionV3, OnDestroy {
  private staffConflict = inject(StaffConflictService);
  private clientConflict = inject(ClientConflictService);
  private resourceConflict = inject(ResourceConflictService);
  private bufferEngine = inject(BufferEngineService);
  private availabilityEngine = inject(AvailabilityEngineService);
  private overrideService = inject(OverrideService);
  private eventSystem = inject(ConflictEventSystem);
  private visualService = inject(ConflictVisualService);
  private cache = inject(ValidationCacheService);
  private lookupIndex = inject(LookupIndexService);
  private dragEvents = inject(DragEventSystem);
  private ngZone = inject(NgZone);

  private unsubDragStart?: () => void;
  private unsubDragMove?: () => void;
  private unsubDropComplete?: () => void;
  private unsubDragCancel?: () => void;

  constructor() {
    this.ngZone.runOutsideAngular(() => {
      this.unsubDragStart = this.dragEvents.on('drag:start', (e) => this.onDragStart(e));
      this.unsubDragMove = this.dragEvents.on('drag:move', (e) => this.onDragMove(e));
      this.unsubDropComplete = this.dragEvents.on('drop:complete', (e) => this.onDropComplete(e));
      this.unsubDragCancel = this.dragEvents.on('drag:cancel', () => this.onDragCancel());
    });
    DRAG_EXTENSION_POINTS.conflict = this;
  }

  ngOnDestroy(): void {
    this.unsubDragStart?.();
    this.unsubDragMove?.();
    this.unsubDropComplete?.();
    this.unsubDragCancel?.();
    DRAG_EXTENSION_POINTS.conflict = null;
    this.dragEvents.removeAll();
  }

  validateAppointment(ctx: ValidationContext): ConflictReport {
    const cached = this.cache.get(ctx);
    if (cached) return cached;

    const startTime = performance.now();
    const report = createEmptyConflictReport();

    const staffReport = this.staffConflict.validate(ctx);
    this.mergeReport(report, staffReport);

    const clientReport = this.clientConflict.validate(ctx);
    this.mergeReport(report, clientReport);

    const resourceReport = this.resourceConflict.validate(ctx);
    this.mergeReport(report, resourceReport);

    const bufferReport = this.bufferEngine.validate(ctx);
    this.mergeReport(report, bufferReport);

    report.duration = performance.now() - startTime;
    report.timestamp = Date.now();

    if (report.conflicts.length > MAX_CONFLICTS_PER_REPORT) {
      report.conflicts = report.conflicts.slice(0, MAX_CONFLICTS_PER_REPORT);
      report.errors = report.errors.slice(0, MAX_CONFLICTS_PER_REPORT);
      report.warnings = report.warnings.slice(0, MAX_CONFLICTS_PER_REPORT);
      report.infos = report.infos.slice(0, MAX_CONFLICTS_PER_REPORT);
    }

    this.cache.set(ctx, report);
    return report;
  }

  validateMove(ctx: ValidationContext): ConflictReport {
    const report = this.validateAppointment({ ...ctx, mode: 'move' });
    if (!report.valid) {
      this.eventSystem.emit('move:rejected', { report, context: ctx });
    } else {
      this.eventSystem.emit('move:accepted', { report, context: ctx });
    }
    return report;
  }

  validateResize(ctx: ValidationContext): ConflictReport {
    const report = this.validateAppointment({ ...ctx, mode: 'resize' });
    if (!report.valid) {
      this.eventSystem.emit('resize:rejected', { report, context: ctx });
    } else {
      this.eventSystem.emit('resize:accepted', { report, context: ctx });
    }
    return report;
  }

  validateCreation(ctx: ValidationContext): ConflictReport {
    const report = this.validateAppointment({ ...ctx, mode: 'creation', appointmentId: undefined });
    if (!report.valid) {
      this.eventSystem.emit('creation:rejected', { report, context: ctx });
    } else {
      this.eventSystem.emit('creation:accepted', { report, context: ctx });
    }
    return report;
  }

  async checkBeforeDrag(appointmentId: string, newStart: string, newEnd: string, newStaffId?: string): Promise<{ hasConflict: boolean; conflicts: string[] }> {
    const ctx: ValidationContext = {
      mode: 'move',
      appointmentId,
      staffId: newStaffId || '',
      startTime: newStart,
      endTime: newEnd,
    };
    const report = this.validateAppointment(ctx);
    return {
      hasConflict: !report.valid,
      conflicts: report.errors.map(e => e.message),
    };
  }

  async checkBeforeResize(appointmentId: string, newStart: string, newEnd: string): Promise<{ hasConflict: boolean; conflicts: string[] }> {
    const ctx: ValidationContext = {
      mode: 'resize',
      appointmentId,
      staffId: '',
      startTime: newStart,
      endTime: newEnd,
    };
    const report = this.validateAppointment(ctx);
    return {
      hasConflict: !report.valid,
      conflicts: report.errors.map(e => e.message),
    };
  }

  applyOverride(role: 'owner' | 'manager' | 'reception', report: ConflictReport, reason: string): ConflictReport | null {
    const decision = this.overrideService.applyOverride(role, report, reason);
    if (decision.allowed) {
      this.eventSystem.emit('override:granted', { override: decision, report });
      return { ...report, valid: true, errors: [], warnings: [], conflicts: [] };
    }
    this.eventSystem.emit('override:denied', { override: decision, report });
    return null;
  }

  get staffConflictService(): StaffConflictService { return this.staffConflict; }
  get clientConflictService(): ClientConflictService { return this.clientConflict; }
  get resourceConflictService(): ResourceConflictService { return this.resourceConflict; }
  get bufferEngineService(): BufferEngineService { return this.bufferEngine; }
  get availabilityEngine(): AvailabilityEngineService { return this.availabilityEngine; }
  get overrideServiceAccessor(): OverrideService { return this.overrideService; }
  get eventSystemAccessor(): ConflictEventSystem { return this.eventSystem; }
  get visualServiceAccessor(): ConflictVisualService { return this.visualService; }
  get cacheAccessor(): ValidationCacheService { return this.cache; }
  get lookupIndexAccessor(): LookupIndexService { return this.lookupIndex; }
  get extensionPoints(): typeof CONFLICT_EXTENSION_POINTS { return CONFLICT_EXTENSION_POINTS; }

  clearCache(): void {
    this.cache.clear();
    this.lookupIndex.clear();
    this.staffConflict.clearCache();
    this.clientConflict.clearCache();
    this.resourceConflict.clearCache();
    this.availabilityEngine.clearCache();
  }

  private onDragStart(payload: DragEventPayload): void {
    this.visualService.clearAll();
    this.cache.invalidate(payload.session.target.appointmentId);
  }

  private onDragMove(payload: DragEventPayload): void {
    const session = payload.session;
    if (!session.snappedStart || !session.snappedEnd) return;

    const ctx: ValidationContext = {
      mode: 'move',
      appointmentId: session.target.appointmentId,
      staffId: session.current.staffId || session.target.staffId,
      startTime: session.snappedStart,
      endTime: session.snappedEnd,
    };
    const report = this.validateAppointment(ctx);
    this.visualService.applyReport(session.target.appointmentId, report);

    if (!report.valid) {
      this.eventSystem.emit('conflict:detected', { report, context: ctx });
    }
  }

  private onDropComplete(payload: DragEventPayload): void {
    const session = payload.session;
    if (!session.snappedStart || !session.snappedEnd) return;

    const ctx: ValidationContext = {
      mode: session.mode === 'dragging' ? 'move' : 'resize',
      appointmentId: session.target.appointmentId,
      staffId: session.current.staffId || session.target.staffId,
      startTime: session.snappedStart,
      endTime: session.snappedEnd,
    };
    const report = this.validateAppointment(ctx);

    if (!report.valid) {
      this.visualService.triggerDropDenied();
      this.eventSystem.emit(session.mode === 'dragging' ? 'move:rejected' : 'resize:rejected', { report, context: ctx });
    } else {
      this.eventSystem.emit(session.mode === 'dragging' ? 'move:accepted' : 'resize:accepted', { report, context: ctx });
      this.eventSystem.emit('conflict:resolved', { report, context: ctx });
    }
  }

  private onDragCancel(): void {
    this.visualService.clearAll();
  }

  private mergeReport(target: ConflictReport, source: ConflictReport): void {
    for (const c of source.conflicts) {
      addConflict(target, c);
    }
  }
}
