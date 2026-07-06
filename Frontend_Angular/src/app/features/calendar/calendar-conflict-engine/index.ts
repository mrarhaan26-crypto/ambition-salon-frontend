export { ConflictEngineService } from './calendar-conflict-engine.service';
export { StaffConflictService } from './calendar-staff-conflict.service';
export { ClientConflictService } from './calendar-client-conflict.service';
export { ResourceConflictService } from './calendar-resource-conflict.service';
export { BufferEngineService } from './calendar-buffer-engine.service';
export { AvailabilityEngineService } from './calendar-availability-engine.service';
export { OverrideService } from './calendar-override.service';
export { ConflictEventSystem } from './calendar-conflict-event-system';
export { ConflictVisualService } from './calendar-conflict-visual.service';
export { ValidationCacheService, LookupIndexService } from './calendar-validation-cache.service';
export { CONFLICT_EXTENSION_POINTS } from './calendar-conflict-extension-points';

export type { AiConflictPrediction } from './calendar-conflict-extension-points';
export type { RevenueImpactService } from './calendar-conflict-extension-points';
export type { StaffSuggestionService } from './calendar-conflict-extension-points';
export type { AlternativeSlotService } from './calendar-conflict-extension-points';
export type { SmartRescheduleService } from './calendar-conflict-extension-points';
export type { PredictiveAvailabilityService } from './calendar-conflict-extension-points';
export type { BatchValidationService } from './calendar-conflict-extension-points';

export type {
  ConflictType,
  ConflictSeverity,
  ConflictCategory,
  ValidationMode,
  ConflictItem,
  ConflictReport,
  OverrideRole,
  OverridePermission,
  OverrideDecision,
  ValidationContext,
  StaffScheduleBlock,
  StaffSchedule,
  ClientRestriction,
  ResourceAvailability,
  ConflictLookupTable,
} from './calendar-conflict.models';
