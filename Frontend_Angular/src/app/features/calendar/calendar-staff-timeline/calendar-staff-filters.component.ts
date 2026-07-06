import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DEFAULT_FILTER_STATE, STAFF_STATUS_LABELS, STAFF_GROUP_LABELS, STAFF_GROUP_TYPES } from './calendar-staff-timeline.constants';
import type { StaffTimelineFilterState, StaffTimelineStaff } from './calendar-staff-timeline.models';
import type { StaffGroupType } from './calendar-staff-timeline.constants';

@Component({
  selector: 'app-staff-timeline-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters-bar" role="search" aria-label="Staff filters">
      <div class="filter-search">
        <input
          [(ngModel)]="filterState.search"
          (ngModelChange)="onFilterChange()"
          placeholder="Search staff..."
          class="filter-input"
          type="search"
          [attr.aria-label]="'Search staff'"
        />
      </div>

      <select
        [(ngModel)]="filterState.role"
        (ngModelChange)="onFilterChange()"
        class="filter-select"
        aria-label="Filter by role"
      >
        <option value="">All Roles</option>
        <option *ngFor="let r of uniqueRoles" [value]="r">{{ r }}</option>
      </select>

      <select
        [(ngModel)]="filterState.availability"
        (ngModelChange)="onFilterChange()"
        class="filter-select"
        aria-label="Filter by availability"
      >
        <option value="">All Status</option>
        <option *ngFor="let st of statusOptions" [value]="st">{{ STAFF_STATUS_LABELS[st] || st }}</option>
      </select>

      <select
        [(ngModel)]="filterState.branchId"
        (ngModelChange)="onFilterChange()"
        class="filter-select"
        aria-label="Filter by branch"
      >
        <option value="">All Branches</option>
        <option *ngFor="let b of uniqueBranches" [value]="b.id">{{ b.name }}</option>
      </select>

      <label class="filter-checkbox" *ngIf="showFavorites">
        <input type="checkbox" [(ngModel)]="filterState.favoritesOnly" (ngModelChange)="onFilterChange()" />
        <span>Favorites</span>
      </label>

      <label class="filter-checkbox">
        <input type="checkbox" [(ngModel)]="filterState.hideInactive" (ngModelChange)="onFilterChange()" />
        <span>Hide Inactive</span>
      </label>

      <button class="filter-clear" (click)="clearFilters()" *ngIf="hasActiveFilters" aria-label="Clear filters">
        Clear
      </button>
    </div>
  `,
  styles: [`
    .filters-bar {
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
      padding: 10px 12px; border-bottom: 1px solid #e5e7eb;
      background: #fafafa;
    }
    .filter-input {
      height: 34px; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 0 12px; font-size: 12px; min-width: 160px;
      background: white;
    }
    .filter-select {
      height: 34px; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 0 8px; font-size: 11px; font-weight: 600;
      background: white; min-width: 100px;
    }
    .filter-checkbox {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600; color: #374151;
      cursor: pointer; white-space: nowrap;
    }
    .filter-checkbox input { width: auto; height: auto; }
    .filter-clear {
      padding: 4px 12px; border: 1px solid #d1d5db; border-radius: 6px;
      background: white; font-size: 10px; font-weight: 700; cursor: pointer;
      color: #6b7280;
    }
    .filter-clear:hover { background: #f3f4f6; }
  `],
})
export class StaffTimelineFiltersComponent {
  @Input({ required: true }) staffList: StaffTimelineStaff[] = [];
  @Input() showFavorites = true;
  @Output() filterChange = new EventEmitter<StaffTimelineFilterState>();

  STAFF_STATUS_LABELS = STAFF_STATUS_LABELS;
  filterState: StaffTimelineFilterState = { ...DEFAULT_FILTER_STATE };
  statusOptions = ['AVAILABLE', 'BUSY', 'BREAK', 'LEAVE', 'HOLIDAY', 'OFF_DUTY', 'TRAINING', 'MEETING'];

  get uniqueRoles(): string[] {
    return [...new Set(this.staffList.map(s => s.role).filter(Boolean))];
  }

  get uniqueBranches(): { id: string; name: string }[] {
    const map = new Map<string, string>();
    this.staffList.forEach(s => {
      if (s.branchId && s.branchName) map.set(s.branchId, s.branchName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  get hasActiveFilters(): boolean {
    return !!this.filterState.search || !!this.filterState.role
      || !!this.filterState.availability || !!this.filterState.branchId
      || this.filterState.favoritesOnly || this.filterState.hideInactive;
  }

  onFilterChange(): void {
    this.filterChange.emit({ ...this.filterState });
  }

  clearFilters(): void {
    this.filterState = { ...DEFAULT_FILTER_STATE };
    this.onFilterChange();
  }
}
