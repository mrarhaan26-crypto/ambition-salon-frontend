import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CalendarStateService } from './calendar-state.service';

@Component({
  selector: 'app-calendar-date-picker-popup',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dp-overlay" (click)="close.emit()"></div>
    <div class="dp-popup" (click)="$event.stopPropagation()" role="dialog" aria-label="Date picker">
      <div class="dp-header">
        <button class="dp-nav" (click)="prevMonth()" aria-label="Previous month">&lsaquo;</button>
        <span class="dp-title">{{ monthYear }}</span>
        <button class="dp-nav" (click)="nextMonth()" aria-label="Next month">&rsaquo;</button>
      </div>
      <div class="dp-weekdays">
        <span *ngFor="let d of weekdays" class="dp-weekday">{{ d }}</span>
      </div>
      <div class="dp-grid">
        <button
          *ngFor="let day of days"
          class="dp-day"
          [class.dp-today]="day.isToday"
          [class.dp-selected]="day.isSelected"
          [class.dp-other]="!day.isCurrentMonth"
          [class.dp-has-events]="day.hasEvents"
          (click)="selectDate(day.date)"
          [disabled]="!day.isCurrentMonth"
        >
          {{ day.number }}
        </button>
      </div>
      <div class="dp-footer">
        <button class="dp-today-btn" (click)="goToday()">Today</button>
      </div>
    </div>
  `,
  styles: [`
    .dp-overlay {
      position: fixed; inset: 0; z-index: 999; background: transparent;
    }
    .dp-popup {
      position: absolute; top: 100%; left: 0; z-index: 1000;
      background: #fff; border: 1px solid var(--border, #e5e7eb);
      border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      padding: 14px; width: 256px; font-size: 12px;
      margin-top: 4px;
    }
    .dp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .dp-title { font-weight: 700; font-size: 13px; color: var(--text, #111); }
    .dp-nav {
      width: 28px; height: 28px; border: none; border-radius: 6px;
      background: var(--soft, #f7f7f7); cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      color: var(--text, #111);
    }
    .dp-nav:hover { background: #e5e7eb; }
    .dp-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 6px; }
    .dp-weekday { text-align: center; font-size: 10px; font-weight: 600; color: var(--muted, #6b7280); padding: 4px 0; text-transform: uppercase; }
    .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .dp-day {
      aspect-ratio: 1; border: none; border-radius: 6px; background: transparent;
      cursor: pointer; font-size: 11px; font-weight: 500; color: var(--text, #111);
      display: flex; align-items: center; justify-content: center;
      transition: background 0.1s;
    }
    .dp-day:hover:not(:disabled) { background: var(--soft, #f7f7f7); }
    .dp-day:disabled { color: #d1d5db; cursor: default; }
    .dp-today { font-weight: 700; color: var(--black, #0b0b0b); border: 1px solid var(--black, #0b0b0b); }
    .dp-selected { background: var(--black, #0b0b0b) !important; color: #fff !important; font-weight: 700; }
    .dp-other:not(:disabled) { color: #9ca3af; }
    .dp-has-events::after { content: ''; display: block; width: 4px; height: 4px; border-radius: 50%; background: #6366f1; margin-top: 1px; }
    .dp-footer { display: flex; justify-content: center; margin-top: 10px; }
    .dp-today-btn {
      height: 28px; border: 1px solid var(--border, #e5e7eb); border-radius: 6px;
      background: var(--soft, #f7f7f7); color: var(--text, #111);
      font-size: 11px; font-weight: 600; cursor: pointer; padding: 0 14px;
    }
    .dp-today-btn:hover { background: #e5e7eb; }
  `]
})
export class CalendarDatePickerPopupComponent {
  @Input() currentDate: Date = new Date();
  @Input() appointmentDates: string[] = [];
  @Output() dateSelected = new EventEmitter<Date>();
  @Output() close = new EventEmitter<void>();

  private stateService = inject(CalendarStateService);

  viewDate = this.currentDate;
  weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  get monthYear(): string {
    return this.viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get days(): DayCell[] {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;

    const result: DayCell[] = [];
    const todayStr = new Date().toDateString();
    const selected = this.stateService.currentDate();

    for (let i = 0; i < totalCells; i++) {
      if (i < startPad) {
        const prevMonthDay = new Date(year, month, i - startPad + 1);
        result.push({ number: prevMonthDay.getDate(), date: prevMonthDay, isCurrentMonth: false, isToday: false, isSelected: false, hasEvents: false });
      } else {
        const day = i - startPad + 1;
        const date = new Date(year, month, day);
        const dateStr = date.toDateString();
        const isTodayVal = dateStr === todayStr;
        const isSelectedVal = selected && date.getFullYear() === selected.getFullYear() && date.getMonth() === selected.getMonth() && date.getDate() === selected.getDate();
        const hasEvents = this.appointmentDates.some(ad => {
          try { return new Date(ad).toDateString() === dateStr; } catch { return false; }
        });
        result.push({ number: day, date, isCurrentMonth: true, isToday: isTodayVal, isSelected: isSelectedVal ?? false, hasEvents });
      }
    }
    return result;
  }

  prevMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
  }

  nextMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
  }

  selectDate(date: Date): void {
    this.dateSelected.emit(date);
    this.close.emit();
  }

  goToday(): void {
    this.dateSelected.emit(new Date());
    this.close.emit();
  }
}

interface DayCell {
  number: number;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEvents: boolean;
}
