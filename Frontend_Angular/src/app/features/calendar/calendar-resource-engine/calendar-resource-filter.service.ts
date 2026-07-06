import { Injectable, inject } from '@angular/core';
import type { ResourceEntity, ResourceFilter, ResourceType, ResourceStatus } from './calendar-resource.models';
import { ResourceManagerService } from './calendar-resource-manager.service';

@Injectable({ providedIn: 'root' })
export class ResourceFilterService {
  private manager = inject(ResourceManagerService);

  apply(resources: ResourceEntity[], filter: ResourceFilter): ResourceEntity[] {
    let result = [...resources];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    if (filter.type && filter.type.length > 0) {
      result = result.filter(r => filter.type!.includes(r.type));
    }

    if (filter.status && filter.status.length > 0) {
      result = result.filter(r => filter.status!.includes(r.status));
    }

    if (filter.branchId && filter.branchId.length > 0) {
      result = result.filter(r => filter.branchId!.includes(r.branchId));
    }

    if (filter.availability === true) {
      result = result.filter(r => r.status === 'ACTIVE');
    }

    if (filter.favorite === true) {
      result = result.filter(r => r.isFavorite);
    }

    if (filter.hidden === false) {
      result = result.filter(r => !r.isHidden);
    }

    if (filter.maintenance === true) {
      result = result.filter(r => r.status === 'MAINTENANCE');
    }

    if (filter.tags && filter.tags.length > 0) {
      result = result.filter(r =>
        r.tags && filter.tags!.some(t => r.tags.includes(t))
      );
    }

    return result;
  }

  getAllFiltered(filter: ResourceFilter): ResourceEntity[] {
    return this.apply(this.manager.getAll(), filter);
  }

  getFilterOptions(): {
    types: ResourceType[];
    statuses: ResourceStatus[];
    branches: string[];
    tags: string[];
  } {
    const resources = this.manager.getAll();
    const types = new Set<ResourceType>();
    const statuses = new Set<ResourceStatus>();
    const branches = new Set<string>();
    const tags = new Set<string>();

    for (const r of resources) {
      types.add(r.type);
      statuses.add(r.status);
      branches.add(r.branchId);
      for (const t of r.tags) tags.add(t);
    }

    return {
      types: Array.from(types),
      statuses: Array.from(statuses),
      branches: Array.from(branches),
      tags: Array.from(tags),
    };
  }

  resetFilter(): ResourceFilter {
    return {};
  }
}
