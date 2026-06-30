import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendar-ai-scheduler',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-ai-scheduler.html',
  styleUrl: './calendar-ai-scheduler.css',
})
export class CalendarAiScheduler {
  @Input() suggestions: any[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Input() serviceId = '';
  @Input() serviceDuration = 30;
  @Input() optimizing = false;
  @Input() optimization: any = null;
  @Input() serviceList: any[] = [];
  @Input() staffList: any[] = [];

  @Output() serviceIdChange = new EventEmitter<string>();
  @Output() serviceDurationChange = new EventEmitter<number>();
  @Output() runSuggest = new EventEmitter<void>();
  @Output() runOptimize = new EventEmitter<void>();
  @Output() bookSlot = new EventEmitter<any>();
  @Output() closePanel = new EventEmitter<void>();

  onServiceChange(id: string): void {
    this.serviceIdChange.emit(id);
  }

  onDurationChange(d: number): void {
    this.serviceDurationChange.emit(d);
  }

  getStaffName(staffId: string): string {
    const s = this.staffList.find(st => st.id === staffId);
    return s ? s.fullName : staffId;
  }

  getServiceName(id: string): string {
    const s = this.serviceList.find(sv => sv.id === id);
    return s ? s.name : 'Custom';
  }

  trackById(_idx: number, item: any): string {
    return item.staffId || _idx;
  }
}
