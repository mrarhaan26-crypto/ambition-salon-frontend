import { Injectable } from '@angular/core';
import type { OverrideRole, OverridePermission, OverrideDecision, ConflictType, ConflictReport } from './calendar-conflict.models';

const PERMISSION_MATRIX: Record<OverrideRole, OverridePermission> = {
  owner: {
    role: 'owner',
    canOverrideStaffConflict: true,
    canOverrideClientConflict: true,
    canOverrideResourceConflict: true,
    canOverrideBufferConflict: true,
    maxOverridesPerDay: 100,
  },
  manager: {
    role: 'manager',
    canOverrideStaffConflict: true,
    canOverrideClientConflict: true,
    canOverrideResourceConflict: true,
    canOverrideBufferConflict: true,
    maxOverridesPerDay: 20,
  },
  reception: {
    role: 'reception',
    canOverrideStaffConflict: false,
    canOverrideClientConflict: true,
    canOverrideResourceConflict: false,
    canOverrideBufferConflict: true,
    maxOverridesPerDay: 5,
  },
};

@Injectable({ providedIn: 'root' })
export class OverrideService {
  private dailyOverrideCounts: Record<OverrideRole, number> = {
    owner: 0,
    manager: 0,
    reception: 0,
  };
  private lastResetDate = new Date().toDateString();

  getPermission(role: OverrideRole): OverridePermission {
    return { ...PERMISSION_MATRIX[role] };
  }

  canOverride(role: OverrideRole, report: ConflictReport): { allowed: boolean; reason: string } {
    this.checkDailyReset();
    const permission = this.getPermission(role);

    if (this.dailyOverrideCounts[role] >= permission.maxOverridesPerDay) {
      return {
        allowed: false,
        reason: `Daily override limit reached (${permission.maxOverridesPerDay}) for ${role}`,
      };
    }

    for (const conflict of report.errors) {
      if (!conflict.canOverride) {
        return {
          allowed: false,
          reason: `Conflict "${conflict.message}" cannot be overridden`,
        };
      }

      if (conflict.category === 'staff' && !permission.canOverrideStaffConflict) {
        return {
          allowed: false,
          reason: `${role} does not have permission to override staff conflicts`,
        };
      }
      if (conflict.category === 'client' && !permission.canOverrideClientConflict) {
        return {
          allowed: false,
          reason: `${role} does not have permission to override client conflicts`,
        };
      }
      if (conflict.category === 'resource' && !permission.canOverrideResourceConflict) {
        return {
          allowed: false,
          reason: `${role} does not have permission to override resource conflicts`,
        };
      }
      if (conflict.category === 'buffer' && !permission.canOverrideBufferConflict) {
        return {
          allowed: false,
          reason: `${role} does not have permission to override buffer conflicts`,
        };
      }
    }

    return { allowed: true, reason: '' };
  }

  applyOverride(role: OverrideRole, report: ConflictReport, reason: string): OverrideDecision {
    const check = this.canOverride(role, report);
    if (!check.allowed) {
      return {
        allowed: false,
        role,
        timestamp: Date.now(),
        conflictTypes: report.errors.map(e => e.type),
        reason: check.reason,
      };
    }

    this.dailyOverrideCounts[role]++;

    return {
      allowed: true,
      role,
      timestamp: Date.now(),
      conflictTypes: report.errors.map(e => e.type),
      reason,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  getDailyOverrideCount(role: OverrideRole): number {
    this.checkDailyReset();
    return this.dailyOverrideCounts[role];
  }

  resetDailyCounts(): void {
    for (const role of Object.keys(this.dailyOverrideCounts) as OverrideRole[]) {
      this.dailyOverrideCounts[role] = 0;
    }
    this.lastResetDate = new Date().toDateString();
  }

  private checkDailyReset(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.resetDailyCounts();
    }
  }
}
