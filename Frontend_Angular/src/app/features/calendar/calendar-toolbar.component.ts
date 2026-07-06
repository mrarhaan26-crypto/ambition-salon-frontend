import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarView, VIEWS } from './calendar.constants';
import { formatDateTitle } from './calendar.utils';

@Component({
  selector: 'app-calendar-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        <h2 class="tb-title" aria-live="polite">{{ formatTitle() }}</h2>
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
        <div class="tb-search" role="search" aria-label="Search appointments">
          <span class="tb-search-icon" aria-hidden="true">&#128269;</span>
          <input
            type="text"
            placeholder="Search appointments..."
            [value]="searchQuery"
            (input)="searchChange.emit($any($event.target).value)"
            aria-label="Search appointments"
          >
        </div>
        <button class="tb-btn tb-icon" aria-label="Refresh" (click)="refresh.emit()">
          &#8635;
        </button>
        <button class="tb-btn tb-icon" aria-label="Calendar settings" (click)="settings.emit()">
          &#9881;
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #fff;
      border-bottom: 1px solid var(--border, #e5e7eb);
      gap: 16px;
      flex-wrap: wrap;
    }
    .toolbar-left { display: flex; align-items: center; gap: 8px; }
    .toolbar-center { display: flex; align-items: center; gap: 4px; }
    .toolbar-right { display: flex; align-items: center; gap: 8px; }
    .tb-btn {
      height: 36px;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      background: #fff;
      color: var(--text, #111);
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
    }
    .tb-btn:hover { background: var(--soft, #f7f7f7); }
    .tb-btn:focus-visible { outline: 2px solid var(--black, #0b0b0b); outline-offset: 2px; }
    .tb-today { background: var(--black, #0b0b0b); color: #fff; border-color: var(--black, #0b0b0b); }
    .tb-today:hover { background: #1a1a1a; }
    .tb-nav { min-width: 36px; padding: 0; font-size: 16px; }
    .tb-title { font-size: 16px; font-weight: 700; margin: 0; min-width: 200px; }
    .tb-view { text-transform: capitalize; min-width: 56px; }
    .tb-view.active { background: var(--black, #0b0b0b); color: #fff; border-color: var(--black, #0b0b0b); }
    .tb-search {
      display: flex;
      align-items: center;
      background: var(--soft, #f7f7f7);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      padding: 0 10px;
      gap: 6px;
    }
    .tb-search input {
      border: none;
      background: transparent;
      height: 34px;
      width: 180px;
      padding: 0;
      font-size: 13px;
      outline: none;
    }
    .tb-search-icon { font-size: 14px; opacity: 0.5; }
    .tb-icon { min-width: 36px; padding: 0; font-size: 16px; }
    @media (max-width: 768px) {
      .toolbar { flex-direction: column; align-items: stretch; padding: 12px 16px; }
      .toolbar-left { justify-content: space-between; }
      .toolbar-center { justify-content: center; }
      .toolbar-right { justify-content: flex-end; }
      .tb-search input { width: 120px; }
      .tb-title { font-size: 14px; min-width: 0; }
    }
  `]
})
export class CalendarToolbarComponent {
  @Input() view: CalendarView = 'month';
  @Input() currentDate: Date = new Date();
  @Input() searchQuery = '';
  @Output() goToday = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() viewChange = new EventEmitter<CalendarView>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();
  @Output() settings = new EventEmitter<void>();

  viewOptions = VIEWS;

  setView(v: CalendarView): void {
    if (v !== this.view) {
      this.viewChange.emit(v);
    }
  }

  formatTitle(): string {
    return formatDateTitle(this.currentDate, this.view);
  }
}
