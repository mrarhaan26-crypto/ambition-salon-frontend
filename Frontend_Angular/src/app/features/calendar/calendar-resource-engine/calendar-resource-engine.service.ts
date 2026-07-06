import { Injectable, inject, OnDestroy } from '@angular/core';
import type { ResourceEntity, ResourceAllocation, ResourceTimelineSlot, ResourceUtilizationStats, ResourceFilter, ResourceCreateRequest, ResourceUpdateRequest, ResourceReservationRequest, MaintenanceBlock, ResourceType, ResourceStatus, BranchScope, ResourceBranchTransferRequest } from './calendar-resource.models';
import { ResourceManagerService } from './calendar-resource-manager.service';
import { ResourceAllocationService } from './calendar-resource-allocation.service';
import { ResourceTimelineService } from './calendar-resource-timeline.service';
import { ResourceReservationEngine, type ReservationResult } from './calendar-resource-reservation.service';
import { ResourceMaintenanceService } from './calendar-resource-maintenance.service';
import { ResourceUtilizationService } from './calendar-resource-utilization.service';
import { ResourceBranchService } from './calendar-resource-branch.service';
import { ResourceFilterService } from './calendar-resource-filter.service';
import { ResourceCacheService, ResourceLookupIndexService } from './calendar-resource-cache.service';
import { RESOURCE_EXTENSION_POINTS } from './calendar-resource-extension-points';
import type { ResourceExtensionV3, ChairExtensionV2, RoomExtensionV2, EquipmentExtensionV2 } from '../calendar-drag-engine/calendar-drag-extension-points';
import { DRAG_EXTENSION_POINTS } from '../calendar-drag-engine/calendar-drag-extension-points';

@Injectable({ providedIn: 'root' })
export class ResourceEngineService implements ResourceExtensionV3, ChairExtensionV2, RoomExtensionV2, EquipmentExtensionV2, OnDestroy {
  private manager = inject(ResourceManagerService);
  private allocationService = inject(ResourceAllocationService);
  private timelineService = inject(ResourceTimelineService);
  private reservationEngine = inject(ResourceReservationEngine);
  private maintenanceService = inject(ResourceMaintenanceService);
  private utilizationService = inject(ResourceUtilizationService);
  private branchService = inject(ResourceBranchService);
  private filterService = inject(ResourceFilterService);
  private cache = inject(ResourceCacheService);
  private lookupIndex = inject(ResourceLookupIndexService);

  constructor() {
    DRAG_EXTENSION_POINTS.resource = this;
    DRAG_EXTENSION_POINTS.chair = this;
    DRAG_EXTENSION_POINTS.room = this;
    DRAG_EXTENSION_POINTS.equipment = this;
  }

  ngOnDestroy(): void {
    DRAG_EXTENSION_POINTS.resource = null;
    DRAG_EXTENSION_POINTS.chair = null;
    DRAG_EXTENSION_POINTS.room = null;
    DRAG_EXTENSION_POINTS.equipment = null;
  }

  getResourceForStaff(staffId: string): string | null {
    const allocations = this.allocationService.getAll();
    const alloc = allocations.find(a => a.staffId === staffId && a.status === 'ACTIVE' && a.type === 'primary');
    return alloc?.resourceId || null;
  }

  isResourceAvailable(resourceId: string, start: string, end: string): boolean {
    return this.reservationEngine.isResourceAvailable(resourceId, start, end);
  }

  assignResource(staffId: string, resourceId: string, start: string, end: string): void {
    this.reservationEngine.reserve({
      resourceId, appointmentId: `${staffId}-${start}`,
      type: 'primary', staffId, startTime: start, endTime: end,
    });
  }

  getChairForStaff(staffId: string): string | null {
    return this.getResourceForStaff(staffId);
  }

  assignChair(staffId: string, chairId: string): void {
    const existing = this.manager.getById(chairId);
    if (existing?.type === 'chair') {
      this.assignResource(staffId, chairId, new Date().toISOString(), new Date(Date.now() + 3600000).toISOString());
    }
  }

  getRoomForStaff(staffId: string): string | null {
    return this.getResourceForStaff(staffId);
  }

  assignRoom(staffId: string, roomId: string): void {
    const existing = this.manager.getById(roomId);
    if (existing?.type === 'room') {
      this.assignResource(staffId, roomId, new Date().toISOString(), new Date(Date.now() + 3600000).toISOString());
    }
  }

  getEquipmentForStaff(staffId: string): string | null {
    return this.getResourceForStaff(staffId);
  }

  assignEquipment(staffId: string, equipmentId: string): void {
    const existing = this.manager.getById(equipmentId);
    if (existing?.type === 'equipment') {
      this.assignResource(staffId, equipmentId, new Date().toISOString(), new Date(Date.now() + 3600000).toISOString());
    }
  }

  get managerService(): ResourceManagerService { return this.manager; }
  get allocationServiceAccessor(): ResourceAllocationService { return this.allocationService; }
  get timelineServiceAccessor(): ResourceTimelineService { return this.timelineService; }
  get reservationEngineAccessor(): ResourceReservationEngine { return this.reservationEngine; }
  get maintenanceServiceAccessor(): ResourceMaintenanceService { return this.maintenanceService; }
  get utilizationServiceAccessor(): ResourceUtilizationService { return this.utilizationService; }
  get branchServiceAccessor(): ResourceBranchService { return this.branchService; }
  get filterServiceAccessor(): ResourceFilterService { return this.filterService; }
  get cacheAccessor(): ResourceCacheService { return this.cache; }
  get lookupIndexAccessor(): ResourceLookupIndexService { return this.lookupIndex; }
  get extensionPoints(): typeof RESOURCE_EXTENSION_POINTS { return RESOURCE_EXTENSION_POINTS; }

  clearCache(): void {
    this.cache.invalidateAll();
    this.lookupIndex.clear();
    this.utilizationService.clearCache();
  }
}
