import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CalendarView } from './calendar.constants';
import { CalendarDayViewComponent } from './calendar-day-view.component';
import { CalendarWeekViewComponent } from './calendar-week-view.component';
import { CalendarMonthViewComponent } from './calendar-month-view.component';
import type { CalendarBooking } from './calendar.models';

@Component({
  selector: 'app-calendar-grid',
  standalone: true,
  imports: [CommonModule, CalendarDayViewComponent, CalendarWeekViewComponent, CalendarMonthViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="calendar-grid" role="region" aria-label="Calendar grid">
      <div class="loading-skeleton" *ngIf="loading" role="status" aria-label="Loading calendar">
        <div class="sk-header">
          <div class="sk-line sk-line-lg"></div>
          <div class="sk-line sk-line-sm"></div>
        </div>
        <div class="sk-body">
          <div class="sk-row" *ngFor="let _ of [].constructor(6); let i = index">
            <div class="sk-cell" *ngFor="let _ of [].constructor(7)">
              <div class="sk-block"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && empty" role="status" aria-label="No appointments">
        <div class="empty-icon" aria-hidden="true">&#128197;</div>
        <h3 class="empty-title">No Appointments</h3>
        <p class="empty-desc">There are no appointments for this period. Click a time slot to create one, or adjust your filters.</p>
      </div>

      <div class="view-container" *ngIf="!loading && !empty">
        <app-calendar-day-view
          *ngIf="view === 'day'"
          [currentDate]="currentDate"
          [appointments]="appointments"
          [staffColorMap]="staffColorMap"
          (appointmentClick)="appointmentClick.emit($event)"
          (slotClick)="slotClick.emit($event)"
        ></app-calendar-day-view>
        <app-calendar-week-view
          *ngIf="view === 'week'"
          [currentDate]="currentDate"
          [appointments]="appointments"
          [staffColorMap]="staffColorMap"
          (appointmentClick)="appointmentClick.emit($event)"
          (dayClick)="dayClick.emit($event)"
        ></app-calendar-week-view>
        <app-calendar-month-view
          *ngIf="view === 'month'"
          [currentDate]="currentDate"
          [appointments]="appointments"
          (daySelect)="daySelect.emit($event)"
        ></app-calendar-month-view>
      </div>
    </div>
  `,
  styles: [`
    .calendar-grid { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; border-radius: 16px; border: 1px solid var(--border, #e5e7eb); margin: 0; box-shadow: 0 2px 8px rgba(15,23,42,.04); }
    .view-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    app-calendar-day-view, app-calendar-week-view, app-calendar-month-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .loading-skeleton { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .sk-header { display: flex; flex-direction: column; gap: 8px; }
    .sk-line { height: 14px; border-radius: 6px; background: linear-gradient(90deg, var(--soft, #f7f7f7) 25%, #e8e8e8 50%, var(--soft, #f7f7f7) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    .sk-line-lg { width: 40%; }
    .sk-line-sm { width: 20%; }
    .sk-body { display: flex; flex-direction: column; gap: 8px; }
    .sk-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    .sk-cell { aspect-ratio: 1; }
    .sk-block { width: 100%; height: 100%; border-radius: 8px; background: linear-gradient(90deg, var(--soft, #f7f7f7) 25%, #e8e8e8 50%, var(--soft, #f7f7f7) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 12px; text-align: center; }
    .empty-icon { font-size: 48px; opacity: 0.3; }
    .empty-title { font-size: 18px; font-weight: 700; margin: 0; color: var(--text, #111); }
    .empty-desc { font-size: 14px; color: var(--muted, #6b7280); max-width: 360px; margin: 0; line-height: 1.5; }
  `]
})
export class CalendarGridComponent {
  @Input() view: CalendarView = 'month';
  @Input() currentDate: Date = new Date();
  @Input() loading = false;
  @Input() empty = true;
  @Input() appointments: CalendarBooking[] = [];
  @Input() staffColorMap: Record<string, string> = {};
  @Output() appointmentClick = new EventEmitter<string>();
  @Output() slotClick = new EventEmitter<{ date: Date; hour: number }>();
  @Output() daySelect = new EventEmitter<Date>();
  @Output() dayClick = new EventEmitter<Date>();
}
