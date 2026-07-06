export { ResourceEngineService } from './calendar-resource-engine.service';
export { ResourceManagerService } from './calendar-resource-manager.service';
export { ResourceAllocationService } from './calendar-resource-allocation.service';
export { ResourceTimelineService } from './calendar-resource-timeline.service';
export { ResourceReservationEngine } from './calendar-resource-reservation.service';
export { ResourceMaintenanceService } from './calendar-resource-maintenance.service';
export { ResourceUtilizationService } from './calendar-resource-utilization.service';
export { ResourceBranchService } from './calendar-resource-branch.service';
export { ResourceFilterService } from './calendar-resource-filter.service';
export { ResourceCacheService, ResourceLookupIndexService } from './calendar-resource-cache.service';
export { RESOURCE_EXTENSION_POINTS } from './calendar-resource-extension-points';

export type { AiResourceAssignmentService } from './calendar-resource-extension-points';
export type { AutoAllocationService } from './calendar-resource-extension-points';
export type { ResourcePredictionService } from './calendar-resource-extension-points';
export type { MaintenancePredictionService } from './calendar-resource-extension-points';
export type { RevenueOptimizationService } from './calendar-resource-extension-points';
export type { CapacityPlanningService } from './calendar-resource-extension-points';

export type {
  ResourceEntity, ResourceAllocation, ResourceTimelineSlot,
  ResourceUtilizationStats, ResourceFilter, MaintenanceBlock,
  ResourceCreateRequest, ResourceUpdateRequest,
  ResourceReservationRequest, ResourceBranchTransferRequest,
  ResourceType, ResourceStatus, ResourceOccupancy,
  ReservationType, ReservationStatus, MaintenanceType,
  BranchScope, ReservationResult,
} from './calendar-resource.models';
export {
  RESOURCE_TYPES, RESOURCE_STATUSES, RESOURCE_OCCUPANCY,
  RESERVATION_TYPES, RESERVATION_STATUSES, MAINTENANCE_TYPES,
  BRANCH_SCOPES, getResourceTypeLabel, getResourceStatusColor,
  getOccupancyColor,
} from './calendar-resource.models';
