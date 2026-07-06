import { Injectable, inject } from '@angular/core';
import type { ResourceEntity, BranchScope, ResourceBranchTransferRequest } from './calendar-resource.models';
import { ResourceManagerService } from './calendar-resource-manager.service';
import { ResourceCacheService } from './calendar-resource-cache.service';

@Injectable({ providedIn: 'root' })
export class ResourceBranchService {
  private manager = inject(ResourceManagerService);
  private cache = inject(ResourceCacheService);

  getByBranch(branchId: string): ResourceEntity[] {
    return this.manager.getByBranch(branchId);
  }

  getByBranchAndType(branchId: string, type: string): ResourceEntity[] {
    return this.manager.getByBranch(branchId).filter(r => r.type === type);
  }

  getSharedResources(): ResourceEntity[] {
    return this.manager.getAll().filter(r => r.branchScope === 'shared');
  }

  getGlobalResources(): ResourceEntity[] {
    return this.manager.getAll().filter(r => r.branchScope === 'global');
  }

  getBranchResources(branchId: string): ResourceEntity[] {
    return this.manager.getAll().filter(r => r.branchScope === 'branch' && r.branchId === branchId);
  }

  getByScope(scope: BranchScope, branchId?: string): ResourceEntity[] {
    return this.manager.getAll().filter(r => {
      if (r.branchScope !== scope) return false;
      if (scope === 'branch' && branchId) return r.branchId === branchId;
      return true;
    });
  }

  transferBranch(request: ResourceBranchTransferRequest): ResourceEntity | null {
    const resource = this.manager.getById(request.resourceId);
    if (!resource) return null;

    return this.manager.update(request.resourceId, {
      tags: [...(resource.tags || []), `transferred_from:${resource.branchId}`],
      metadata: {
        ...resource.metadata,
        previousBranchId: resource.branchId,
        previousScope: resource.branchScope,
        transferReason: request.reason,
        transferDate: new Date().toISOString(),
      },
    } as any);
  }

  getBranchSummary(branchId: string): {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const resources = this.getByBranch(branchId);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const r of resources) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }

    return { total: resources.length, byType, byStatus };
  }
}
