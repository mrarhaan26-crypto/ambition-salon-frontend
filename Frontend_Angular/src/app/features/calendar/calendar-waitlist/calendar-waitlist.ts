import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar-waitlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-waitlist.html',
  styleUrl: './calendar-waitlist.css',
})
export class CalendarWaitlist {
  @Input() entries: any[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Input() fillEntry: any = null;
  @Output() fillEntryChange = new EventEmitter<any>();
  @Output() cancelFill = new EventEmitter<void>();
  @Output() removeEntry = new EventEmitter<string>();

  selectForFill(entry: any): void {
    this.fillEntryChange.emit(entry);
  }
}
