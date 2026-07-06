import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { STAFF_GROUP_LABELS, STAFF_GROUP_TYPES } from './calendar-staff-timeline.constants';
import type { StaffGroup, StaffTimelineStaff } from './calendar-staff-timeline.models';
import type { StaffGroupType } from './calendar-staff-timeline.constants';

@Component({
  selector: 'app-staff-timeline-groups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="groups-bar" role="region" aria-label="Staff groups">
      <select
        [(ngModel)]="activeGroupType"
        (ngModelChange)="onGroupTypeChange()"
        class="group-select"
        aria-label="Group by"
      >
        <option value="role">{{ STAFF_GROUP_LABELS['role'] }}</option>
        <option value="department">{{ STAFF_GROUP_LABELS['department'] }}</option>
        <option value="branch">{{ STAFF_GROUP_LABELS['branch'] }}</option>
      </select>

      <div class="group-pills">
        <button
          *ngFor="let group of groups"
          class="group-pill"
          [class.collapsed]="group.collapsed"
          (click)="toggleGroup(group.id)"
          [attr.aria-expanded]="!group.collapsed"
          [attr.aria-label]="group.label + ' (' + group.count + ' staff)'"
        >
          <span class="gp-arrow">{{ group.collapsed ? '&#9654;' : '&#9660;' }}</span>
          <span class="gp-label">{{ group.label }}</span>
          <span class="gp-count">{{ group.count }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .groups-bar {
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
      padding: 8px 12px; border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .group-select {
      height: 32px; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 0 8px; font-size: 11px; font-weight: 600;
      background: white; min-width: 100px;
    }
    .group-pills { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
    .group-pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border: 1px solid #e5e7eb; border-radius: 12px;
      font-size: 10px; font-weight: 600; cursor: pointer;
      background: white; color: #374151; transition: all .12s;
    }
    .group-pill:hover { background: #f3f4f6; }
    .group-pill.collapsed { opacity: .7; background: #f9fafb; }
    .gp-arrow { font-size: 8px; color: #9ca3af; }
    .gp-label { white-space: nowrap; }
    .gp-count {
      font-size: 9px; background: #e5e7eb; color: #6b7280;
      padding: 0 5px; border-radius: 8px; font-weight: 700;
    }
  `],
})
export class StaffTimelineGroupsComponent {
  @Input({ required: true }) groups: StaffGroup[] = [];
  @Input() staffList: StaffTimelineStaff[] = [];
  @Output() groupsChange = new EventEmitter<StaffGroup[]>();

  STAFF_GROUP_LABELS = STAFF_GROUP_LABELS;
  activeGroupType: StaffGroupType = 'role';

  onGroupTypeChange(): void {
    const newGroups = this.buildGroups(this.activeGroupType);
    this.groupsChange.emit(newGroups);
  }

  toggleGroup(groupId: string): void {
    const updated = this.groups.map(g =>
      g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
    );
    this.groupsChange.emit(updated);
  }

  private buildGroups(type: StaffGroupType): StaffGroup[] {
    if (type === 'role') {
      return this.buildRoleGroups();
    }
    return [{
      id: 'all',
      label: 'All Staff',
      type,
      staffIds: this.staffList.map(s => s.id),
      collapsed: false,
      count: this.staffList.length,
    }];
  }

  private buildRoleGroups(): StaffGroup[] {
    const roleMap = new Map<string, string[]>();
    this.staffList.forEach(s => {
      const role = s.role || 'Unassigned';
      if (!roleMap.has(role)) roleMap.set(role, []);
      roleMap.get(role)!.push(s.id);
    });
    return Array.from(roleMap.entries()).map(([role, ids]) => ({
      id: `role-${role}`,
      label: role,
      type: 'role' as StaffGroupType,
      staffIds: ids,
      collapsed: false,
      count: ids.length,
    }));
  }
}
