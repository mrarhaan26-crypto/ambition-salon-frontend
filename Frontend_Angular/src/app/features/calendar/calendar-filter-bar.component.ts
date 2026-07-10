import { CommonModule } from '@angular/common';
import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarStateService } from './calendar-state.service';
import { CalendarColorRuleService } from './calendar-color-rule.service';

@Component({
  selector: 'app-calendar-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-bar" role="search" aria-label="Calendar filters">
      <div class="fb-filters">
        <button class="fb-toggle" (click)="showPanel.set(!showPanel())" [class.active]="showPanel()" aria-label="Toggle filter panel">
          <span class="fb-icon">&#9881;</span>
          Filters
          <span class="fb-badge" *ngIf="state.activeFilterCount() > 0">{{ state.activeFilterCount() }}</span>
        </button>

        <div class="fb-search" *ngIf="showPanel()">
          <input
            type="text"
            placeholder="Search appointments..."
            [value]="state.filters().searchQuery"
            (input)="state.setFilter('searchQuery', $any($event.target).value)"
            aria-label="Search appointments"
          >
        </div>

        <ng-container *ngIf="showPanel()">
          <select class="fb-select" [value]="state.colorMode()" (change)="state.setColorMode($any($event.target).value)" aria-label="Color mode">
            <option value="status">By Status</option>
            <option value="staff">By Staff</option>
            <option value="service">By Service</option>
            <option value="resource">By Resource</option>
            <option value="source">By Source</option>
            <option value="payment">By Payment</option>
            <option value="vip">By VIP</option>
            <option value="branch">By Branch</option>
          </select>

          <select class="fb-select" [value]="state.density()" (change)="state.setDensity($any($event.target).value)" aria-label="Density">
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>

          <button class="fb-btn fb-preset" (click)="savePresetDialog.set(true)" aria-label="Save current filters as preset">Save Preset</button>
        </ng-container>
      </div>

      <div class="fb-chips" *ngIf="state.activeFilterCount() > 0">
        <span class="fb-chip" *ngIf="state.filters().staffIds.length > 0">
          Staff: {{ state.filters().staffIds.length }}
          <button class="fb-chip-close" (click)="state.setFilter('staffIds', [])" aria-label="Clear staff filter">&times;</button>
        </span>
        <span class="fb-chip" *ngIf="state.filters().branchIds.length > 0">
          Branch: {{ state.filters().branchIds.length }}
          <button class="fb-chip-close" (click)="state.setFilter('branchIds', [])" aria-label="Clear branch filter">&times;</button>
        </span>
        <span class="fb-chip" *ngIf="state.filters().serviceIds.length > 0">
          Service: {{ state.filters().serviceIds.length }}
          <button class="fb-chip-close" (click)="state.setFilter('serviceIds', [])" aria-label="Clear service filter">&times;</button>
        </span>
        <span class="fb-chip" *ngIf="state.filters().resourceIds.length > 0">
          Resource: {{ state.filters().resourceIds.length }}
          <button class="fb-chip-close" (click)="state.setFilter('resourceIds', [])" aria-label="Clear resource filter">&times;</button>
        </span>
        <span class="fb-chip" *ngIf="state.filters().statuses.length > 0">
          Status: {{ state.filters().statuses.length }}
          <button class="fb-chip-close" (click)="state.setFilter('statuses', [])" aria-label="Clear status filter">&times;</button>
        </span>
        <span class="fb-chip" *ngIf="state.filters().vipOnly">
          VIP Only
          <button class="fb-chip-close" (click)="state.setFilter('vipOnly', false)" aria-label="Clear VIP filter">&times;</button>
        </span>
        <span class="fb-chip" *ngIf="state.filters().conflictOnly">
          Conflicts Only
          <button class="fb-chip-close" (click)="state.setFilter('conflictOnly', false)" aria-label="Clear conflict filter">&times;</button>
        </span>
        <span class="fb-chip" *ngIf="state.filters().searchQuery">
          "{{ state.filters().searchQuery }}"
          <button class="fb-chip-close" (click)="state.setFilter('searchQuery', '')" aria-label="Clear search">&times;</button>
        </span>
        <button class="fb-chip fb-clear-all" (click)="state.clearFilters()">Clear All</button>
      </div>

      <div class="fb-presets" *ngIf="showPanel() && state.presets().length > 0">
        <span class="fb-preset-label">Presets:</span>
        <button *ngFor="let p of state.presets()" class="fb-chip fb-preset-chip" (click)="state.applyPreset(p.id)">
          {{ p.name }}
          <button class="fb-chip-close" (click)="state.deletePreset(p.id); $event.stopPropagation()" aria-label="Delete preset">&times;</button>
        </button>
      </div>

      <div class="fb-legend" *ngIf="showPanel()">
        <span class="fb-legend-label">Legend:</span>
        <span *ngFor="let item of colorRule.legend()" class="fb-legend-item">
          <span class="fb-legend-dot" [style.background]="item.color"></span>
          <span class="fb-legend-text">{{ item.label }}</span>
        </span>
      </div>

      <div class="fb-save-dialog" *ngIf="savePresetDialog()">
        <div class="fb-save-overlay" (click)="savePresetDialog.set(false)"></div>
        <div class="fb-save-modal">
          <h4>Save Filter Preset</h4>
          <input type="text" #presetName placeholder="Preset name" (keydown.enter)="doSavePreset(presetName.value)" />
          <div class="fb-save-actions">
            <button class="fb-btn fb-btn-primary" (click)="doSavePreset(presetName.value)">Save</button>
            <button class="fb-btn" (click)="savePresetDialog.set(false)">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-bar { display: flex; flex-direction: column; gap: 8px; padding: 8px 24px; background: #fff; border-bottom: 1px solid var(--border, #e5e7eb); }
    .fb-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .fb-toggle { display: inline-flex; align-items: center; gap: 6px; height: 34px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; background: #fff; color: var(--text, #111); font-size: 13px; font-weight: 600; cursor: pointer; padding: 0 12px; }
    .fb-toggle:hover { background: var(--soft, #f7f7f7); }
    .fb-toggle.active { background: var(--black, #0b0b0b); color: #fff; border-color: var(--black, #0b0b0b); }
    .fb-icon { font-size: 14px; }
    .fb-badge { font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: #4f46e5; color: #fff; margin-left: 2px; }
    .fb-search input { height: 34px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 0 10px; font-size: 13px; background: var(--soft, #f7f7f7); outline: none; width: 180px; }
    .fb-select { height: 34px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 0 8px; font-size: 12px; background: #fff; color: var(--text, #111); cursor: pointer; }
    .fb-btn { height: 34px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; background: #fff; color: var(--text, #111); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0 12px; }
    .fb-btn:hover { background: var(--soft, #f7f7f7); }
    .fb-btn-primary { background: var(--black, #0b0b0b); color: #fff; border-color: var(--black, #0b0b0b); }
    .fb-btn-primary:hover { background: #1a1a1a; }
    .fb-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .fb-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--soft, #f7f7f7); border: 1px solid var(--border, #e5e7eb); color: var(--text, #111); }
    .fb-chip-close { background: none; border: none; cursor: pointer; font-size: 14px; line-height: 1; padding: 0; color: var(--muted, #6b7280); }
    .fb-chip-close:hover { color: var(--text, #111); }
    .fb-clear-all { background: #fee2e2; border-color: #fecaca; color: #dc2626; cursor: pointer; }
    .fb-clear-all:hover { background: #fecaca; }
    .fb-presets { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .fb-preset-label { font-size: 11px; font-weight: 600; color: var(--muted, #6b7280); }
    .fb-preset-chip { cursor: pointer; }
    .fb-legend { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .fb-legend-label { font-size: 11px; font-weight: 600; color: var(--muted, #6b7280); }
    .fb-legend-item { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; }
    .fb-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .fb-legend-text { color: var(--text, #111); }
    .fb-save-dialog { position: fixed; inset: 0; z-index: 3000; display: flex; align-items: center; justify-content: center; }
    .fb-save-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); }
    .fb-save-modal { position: relative; background: #fff; border-radius: 12px; padding: 24px; min-width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); display: flex; flex-direction: column; gap: 12px; }
    .fb-save-modal h4 { margin: 0; font-size: 16px; }
    .fb-save-modal input { height: 40px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 0 12px; font-size: 14px; outline: none; }
    .fb-save-actions { display: flex; gap: 8px; justify-content: flex-end; }
    @media (max-width: 768px) {
      .filter-bar { padding: 8px 16px; }
      .fb-filters { gap: 4px; }
      .fb-search input { width: 120px; }
      .fb-legend { display: none; }
    }
  `]
})
export class CalendarFilterBarComponent {
  state = inject(CalendarStateService);
  colorRule = inject(CalendarColorRuleService);
  showPanel = signal(false);
  savePresetDialog = signal(false);

  doSavePreset(name: string): void {
    if (name?.trim()) {
      this.state.savePreset(name.trim());
    }
    this.savePresetDialog.set(false);
  }
}
