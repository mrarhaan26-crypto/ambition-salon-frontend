import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { BUSINESS_HOURS_START, BUSINESS_HOURS_END } from './calendar.constants';
import { isToday, isSameDay, getHoursArray, formatHour } from './calendar.utils';

@Component({
  selector: 'app-calendar-day-view',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="day-view" role="grid" aria-label="Day view for {{ currentDate | date:'fullDate' }}">
      <div class="dv-header">
        <div class="dv-header-info">
          <span class="dv-day-name">{{ currentDate | date:'EEEE' }}</span>
          <span
            class="dv-day-num"
            [class.today-num]="isTodayFn(currentDate)"
          >{{ currentDate.getDate() }}</span>
          <span class="dv-day-month">{{ currentDate | date:'MMMM yyyy' }}</span>
        </div>
        <div class="dv-bh" *ngIf="isTodayFn(currentDate)">
          <span class="dv-bh-dot"></span>
          <span>Business hours: {{ formatHourFn(BUSINESS_HOURS_START) }} – {{ formatHourFn(BUSINESS_HOURS_END) }}</span>
        </div>
      </div>

      <div class="dv-body">
        <div class="dv-time-col">
          <div *ngFor="let hour of hours" class="dv-time-row">
            <span class="dv-time-label">{{ formatHourFn(hour) }}</span>
          </div>
        </div>

        <div class="dv-grid">
          <div class="dv-day-col" [class.today]="isTodayFn(currentDate)">
            <div
              *ngFor="let hour of hours; let hi = index"
              class="dv-hour-slot"
              [class.business-hours]="hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END"
              [class.dv-hour-alt]="hi % 2 === 1"
            >
              <div class="dv-hour-line"></div>
              <div class="dv-half-line"></div>
            </div>
            <div class="dv-current-time" *ngIf="isTodayFn(currentDate)" [style.top.px]="getCurrentTimePosition()">
              <span class="dv-now-dot" aria-label="Current time indicator"></span>
              <span class="dv-now-line"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .day-view { display: flex; flex-direction: column; height: 100%; }
    .dv-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border, #e5e7eb);
      background: #fff;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .dv-header-info { display: flex; align-items: center; gap: 12px; }
    .dv-day-name { font-size: 14px; color: var(--muted, #6b7280); font-weight: 500; }
    .dv-day-num { font-size: 28px; font-weight: 800; }
    .dv-day-num.today-num {
      background: var(--black, #0b0b0b); color: #fff; width: 40px; height: 40px;
      border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    }
    .dv-day-month { font-size: 14px; color: var(--muted, #6b7280); }
    .dv-bh { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted, #6b7280); }
    .dv-bh-dot { width: 6px; height: 6px; background: #50C878; border-radius: 50%; }
    .dv-body { display: flex; flex: 1; overflow-y: auto; }
    .dv-time-col { width: 70px; min-width: 70px; border-right: 1px solid var(--border, #e5e7eb); flex-shrink: 0; }
    .dv-time-row { height: 60px; display: flex; align-items: flex-start; justify-content: center; padding-top: 2px; }
    .dv-time-label { font-size: 11px; font-weight: 500; color: var(--muted, #6b7280); }
    .dv-grid { flex: 1; position: relative; }
    .dv-day-col { position: relative; height: 100%; }
    .dv-day-col.today { background: #f0f7ff; }
    .dv-hour-slot { height: 60px; position: relative; }
    .dv-hour-slot.dv-hour-alt { background: rgba(0,0,0,0.01); }
    .dv-hour-line { position: absolute; top: 0; left: 0; right: 0; border-top: 1px solid var(--border, #e5e7eb); }
    .dv-half-line { position: absolute; top: 30px; left: 0; right: 0; border-top: 1px dashed var(--border, #e5e7eb); opacity: 0.5; }
    .dv-current-time { position: absolute; left: 0; right: 0; z-index: 2; pointer-events: none; }
    .dv-now-dot {
      position: absolute; left: -5px; top: -5px; width: 10px; height: 10px;
      background: #e53935; border-radius: 50%; z-index: 1;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.8);
    }
    .dv-now-line { position: absolute; top: 0; left: 0; right: 0; border-top: 2px solid #e53935; }
  `]
})
export class CalendarDayViewComponent {
  @Input() currentDate: Date = new Date();

  BUSINESS_HOURS_START = BUSINESS_HOURS_START;
  BUSINESS_HOURS_END = BUSINESS_HOURS_END;
  hours = getHoursArray(0, 24);

  isTodayFn(d: Date): boolean { return isToday(d); }

  formatHourFn(hour: number): string {
    return formatHour(hour);
  }

  getCurrentTimePosition(): number {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return (minutes / 60) * 60;
  }
}
