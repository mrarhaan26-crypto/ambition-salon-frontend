import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarStateService } from './calendar-state.service';
import { CalendarDatePickerPopupComponent } from './calendar-date-picker-popup.component';
import { CalendarView, VIEWS } from './calendar.constants';
import { formatDateTitle } from './calendar.utils';

@Component({
  selector: 'app-calendar-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarDatePickerPopupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar" role="toolbar" aria-label="Calendar toolbar">
      <div class="toolbar-left">
        <button class="tb-btn tb-today" (click)="goToday.emit()" aria-label="Go to today">
          Today
        </button>
        <button class="tb-btn tb-nav" (click)="prev.emit()" aria-label="Previous">
          <span aria-hidden="true">&larr;</span>
        </button>
        <button class="tb-btn tb-nav" (click)="next.emit()" aria-label="Next">
          <span aria-hidden="true">&rarr;</span>
        </button>
        <div class="tb-title-wrap">
          <button class="tb-title-btn" (click)="toggleDatePicker()" aria-label="Open date picker">
            <h2 class="tb-title" aria-live="polite">{{ formatTitle() }}</h2>
            <span class="tb-title-arrow">&#9660;</span>
          </button>
          <app-calendar-date-picker-popup
            *ngIf="datePickerOpen"
            [currentDate]="currentDate"
            [appointmentDates]="appointmentDates"
            (dateSelected)="onDatePickerSelect($event)"
            (close)="datePickerOpen = false"
          ></app-calendar-date-picker-popup>
        </div>
        
        <select class="tb-select tb-branch" [value]="branchId" (change)="branchChange.emit($any($event.target).value)" aria-label="Select branch">
          <option value="">All Branches</option>
          <option *ngFor="let b of branches" [value]="b.id">{{ b.name || b.id }}</option>
        </select>
      </div>

      <div class="toolbar-center" role="tablist" aria-label="View mode">
        <button
          *ngFor="let v of viewOptions"
          class="tb-btn tb-view"
          [class.active]="view === v"
          (click)="setView(v)"
          [attr.aria-pressed]="view === v"
          [attr.aria-label]="v + ' view'"
        >
          {{ v | titlecase }}
        </button>
      </div>

      <div class="toolbar-right">
        <button class="tb-btn tb-action" (click)="filterToggle.emit()" aria-label="Toggle filters" [class.active]="filtersActive">
          <span aria-hidden="true">&#9881;</span>
          Filters
          <span class="tb-badge" *ngIf="activeFilterCount > 0">{{ activeFilterCount }}</span>
        </button>
        <button class="tb-btn tb-action" (click)="openAiScheduler.emit()" aria-label="AI Scheduler" title="AI Scheduler">
          <span aria-hidden="true">&#9889;</span>
        </button>
        <button class="tb-btn tb-action" (click)="openConflictCenter.emit()" aria-label="Conflict Center" title="Conflict Center">
          <span aria-hidden="true">&#9888;</span>
          <span class="tb-badge tb-badge-warn" *ngIf="conflictCount > 0">{{ conflictCount }}</span>
        </button>
        <button class="tb-btn tb-action" (click)="openQueue.emit()" aria-label="Queue" title="Queue">
          <span aria-hidden="true">&#128203;</span>
          <span class="tb-badge tb-badge-queue" *ngIf="queueCount > 0">{{ queueCount }}</span>
        </button>
        <button class="tb-btn tb-action" (click)="openResourceMap.emit()" aria-label="Resource Map" title="Resource Map">
          <span aria-hidden="true">&#128204;</span>
        </button>
        
        <div class="tb-separator"></div>

        <select class="tb-select tb-density" [value]="density" (change)="densityChange.emit($any($event.target).value)" aria-label="Density">
          <option value="compact">Compact</option>
          <option value="comfortable">Std</option>
          <option value="spacious">Spacious</option>
        </select>
        
        <button class="tb-btn tb-icon" [class.active]="fullscreen" (click)="fullscreenToggle.emit()" aria-label="Toggle fullscreen" title="Fullscreen">
          {{ fullscreen ? '&#9214;' : '&#9974;' }}
        </button>
        <button class="tb-btn tb-icon" (click)="refresh.emit()" aria-label="Refresh" title="Refresh">
          &#8635;
        </button>
        <span class="tb-live" [class.connected]="liveSyncConnected" [title]="liveSyncConnected ? 'Live sync connected' : 'Live sync disconnected'">
          <span class="tb-live-dot"></span>
        </span>
        <button class="tb-btn tb-icon" (click)="settings.emit()" aria-label="Calendar settings" title="Settings">
          &#9878;
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: linear-gradient(135deg, #0ea5e9, #2563eb);
      color: #fff;
      gap: 16px;
      flex-wrap: wrap;
    }
    .toolbar-left, .toolbar-center, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tb-title-wrap { position: relative; display: inline-flex; }
    .tb-title-btn {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px; padding: 2px 10px; cursor: pointer;
      transition: background 0.15s;
    }
    .tb-title-btn:hover { background: rgba(255,255,255,0.2); }
    .tb-title-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .tb-title-arrow { font-size: 8px; opacity: 0.6; }
    .tb-btn {
      height: 36px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      padding: 0 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.15s;
      white-space: nowrap;
      backdrop-filter: blur(4px);
    }
    .tb-btn:hover { background: rgba(255,255,255,0.2); }
    .tb-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .tb-btn.active { background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.5); }
    .tb-today { background: rgba(255,255,255,0.2); font-weight: 700; }
    .tb-today:hover { background: rgba(255,255,255,0.3); }
    .tb-nav { min-width: 36px; padding: 0; font-size: 16px; }
    .tb-title { font-size: 16px; font-weight: 700; margin: 0; min-width: 200px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .tb-view { text-transform: capitalize; min-width: 56px; }
    .tb-view.active { background: rgba(255,255,255,0.3); border-color: #fff; }
    .tb-action { position: relative; }
    .tb-badge { font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: #fff; color: #0ea5e9; line-height: 1.4; }
    .tb-badge-warn { background: #dc2626; color: #fff; }
    .tb-badge-queue { background: #f59e0b; color: #fff; }
    .tb-separator { width: 1px; height: 24px; background: rgba(255,255,255,0.2); }
    .tb-select {
      height: 36px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      padding: 0 10px;
      cursor: pointer;
      backdrop-filter: blur(4px);
    }
    .tb-select option { color: #111; background: #fff; }
    .tb-branch { min-width: 130px; }
    .tb-density { min-width: 80px; }
    .tb-icon { min-width: 36px; padding: 0; font-size: 16px; }
    .tb-live { display: inline-flex; align-items: center; padding: 0 4px; }
    .tb-live-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.3); transition: background 0.3s; }
    .tb-live.connected .tb-live-dot { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.6); }
    @media (max-width: 1024px) {
      .toolbar { padding: 10px 16px; gap: 8px; }
      .tb-title { font-size: 14px; min-width: 0; }
      .tb-branch { min-width: 100px; }
    }
    @media (max-width: 768px) {
      .toolbar { flex-direction: column; align-items: stretch; padding: 10px 16px; }
      .toolbar-left { justify-content: space-between; flex-wrap: wrap; }
      .toolbar-center { justify-content: center; }
      .toolbar-right { justify-content: flex-end; flex-wrap: wrap; }
      .tb-title { font-size: 14px; }
      .tb-density { display: none; }
    }
  `]
})
export class CalendarToolbarComponent {
  private state = inject(CalendarStateService);

  @Input() view: CalendarView = 'month';
  @Input() currentDate: Date = new Date();
  @Input() searchQuery = '';
  @Input() branches: { id: string; name?: string }[] = [];
  @Input() branchId = '';
  @Input() filtersActive = false;
  @Input() activeFilterCount = 0;
  @Input() fullscreen = false;
  @Input() density = 'comfortable';
  @Input() conflictCount = 0;
  @Input() queueCount = 0;
  @Input() liveSyncConnected = false;
  @Input() appointmentDates: string[] = [];

  @Output() goToday = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() viewChange = new EventEmitter<CalendarView>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();
  @Output() settings = new EventEmitter<void>();
  @Output() branchChange = new EventEmitter<string>();
  @Output() filterToggle = new EventEmitter<void>();
  @Output() openAiScheduler = new EventEmitter<void>();
  @Output() openConflictCenter = new EventEmitter<void>();
  @Output() openQueue = new EventEmitter<void>();
  @Output() openResourceMap = new EventEmitter<void>();
  @Output() fullscreenToggle = new EventEmitter<void>();
  @Output() densityChange = new EventEmitter<string>();
  @Output() datePickerDateSelected = new EventEmitter<Date>();

  datePickerOpen = false;

  viewOptions = VIEWS;

  setView(v: CalendarView): void {
    if (v !== this.view) {
      this.viewChange.emit(v);
    }
  }

  formatTitle(): string {
    return formatDateTitle(this.currentDate, this.view);
  }

  toggleDatePicker(): void {
    this.datePickerOpen = !this.datePickerOpen;
  }

  onDatePickerSelect(date: Date): void {
    this.datePickerOpen = false;
    this.datePickerDateSelected.emit(date);
  }
}
