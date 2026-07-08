import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { BookingListItem } from './bookings.models';

@Component({
  selector: 'app-booking-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tl-wrapper">
      <div class="tl-header">
        <div class="tl-h-spacer"></div>
        <div class="tl-h-hour" *ngFor="let h of hours">{{ formatHour(h) }}</div>
      </div>
      <div class="tl-body">
        <ng-container *ngIf="groupedByStaff.length > 0; else noData">
          <div class="tl-row" *ngFor="let row of groupedByStaff">
            <div class="tl-staff-cell">
              <span class="tl-staff-name">{{ row.staffName }}</span>
              <span class="tl-staff-role">{{ row.role }}</span>
            </div>
            <div class="tl-timeline-cell" #tlCell>
              <div
                class="tl-booking"
                *ngFor="let b of row.bookings"
                [style.left.%]="getLeftPercent(b)"
                [style.width.%]="getWidthPercent(b)"
                [style.background]="getStatusColor(b.status)"
                (click)="selectBooking.emit(b)"
                [title]="b.client?.fullName + ' - ' + b.title"
              >
                <span class="tl-bk-time">{{ b.startTime | date:'h:mm' }}</span>
                <span class="tl-bk-client">{{ b.client?.fullName || '?' }}</span>
              </div>
              <div class="tl-now-line" *ngIf="isToday" [style.left.%]="nowPercent"></div>
            </div>
          </div>
        </ng-container>
        <ng-template #noData>
          <div class="tl-empty">No bookings to display</div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .tl-wrapper{display:flex;flex-direction:column;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:white;flex:1}
    .tl-header{display:flex;border-bottom:1px solid #e5e7eb;background:#f8fafc;flex-shrink:0}
    .tl-h-spacer{flex:0 0 140px;border-right:1px solid #e5e7eb}
    .tl-h-hour{flex:1;min-width:60px;text-align:center;padding:8px 2px;font-size:10px;font-weight:700;color:#64748b;border-right:1px solid #f1f5f9;text-transform:uppercase;letter-spacing:.02em}
    .tl-h-hour:last-child{border-right:0}
    .tl-body{overflow-y:auto;flex:1}
    .tl-row{display:flex;border-bottom:1px solid #f1f5f9;min-height:52px}
    .tl-row:last-child{border-bottom:0}
    .tl-staff-cell{flex:0 0 140px;padding:8px 12px;border-right:1px solid #e5e7eb;background:#fafafa;display:flex;flex-direction:column;justify-content:center}
    .tl-staff-name{font-size:13px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .tl-staff-role{font-size:10px;color:#64748b;font-weight:600}
    .tl-timeline-cell{flex:1;position:relative;min-height:52px;background:repeating-linear-gradient(90deg,transparent,transparent calc(100% / 14 - 1px),#f8fafc calc(100% / 14 - 1px),#f8fafc calc(100% / 14));overflow:hidden}
    .tl-booking{position:absolute;top:4px;bottom:4px;border-radius:6px;padding:2px 6px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;overflow:hidden;transition:opacity .15s;min-width:4px}
    .tl-booking:hover{opacity:.85;z-index:2}
    .tl-bk-time{font-size:9px;font-weight:800;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tl-bk-client{font-size:10px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tl-now-line{position:absolute;top:0;bottom:0;width:2px;background:#ef4444;z-index:3;pointer-events:none}
    .tl-empty{display:flex;align-items:center;justify-content:center;padding:48px;color:#94a3b8;font-size:14px;font-weight:600}
  `]
})
export class BookingTimelineComponent {
  @Input() bookings: BookingListItem[] = [];
  @Output() selectBooking = new EventEmitter<BookingListItem>();

  hours = Array.from({ length: 14 }, (_, i) => i + 7);
  isToday = true;
  nowPercent = 0;

  ngOnInit(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0);
    const totalMinutes = (end.getTime() - start.getTime()) / 60000;
    const nowMinutes = (now.getTime() - start.getTime()) / 60000;
    this.nowPercent = Math.min(100, Math.max(0, (nowMinutes / totalMinutes) * 100));
  }

  get groupedByStaff(): { staffName: string; role: string; bookings: BookingListItem[] }[] {
    const map = new Map<string, { staffName: string; role: string; bookings: BookingListItem[] }>();
    for (const b of this.bookings) {
      const id = b.staff?.fullName || 'Unassigned';
      if (!map.has(id)) {
        map.set(id, { staffName: id, role: b.staff?.role || '', bookings: [] });
      }
      map.get(id)!.bookings.push(b);
    }
    const sorted = Array.from(map.values());
    for (const row of sorted) {
      row.bookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    return sorted;
  }

  formatHour(h: number): string {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  }

  getLeftPercent(b: BookingListItem): number {
    const start = new Date(b.startTime);
    const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 7, 0, 0);
    const totalMin = 14 * 60;
    const startMin = (start.getTime() - dayStart.getTime()) / 60000;
    return Math.max(0, (startMin / totalMin) * 100);
  }

  getWidthPercent(b: BookingListItem): number {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 7, 0, 0);
    const totalMin = 14 * 60;
    const durMin = (end.getTime() - start.getTime()) / 60000;
    return Math.max(2, (durMin / totalMin) * 100);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      PENDING: '#eab308', CONFIRMED: '#3b82f6', CHECKED_IN: '#8b5cf6',
      COMPLETED: '#16a34a', CANCELLED: '#94a3b8', NO_SHOW: '#6b7280',
    };
    return colors[status] || '#94a3b8';
  }
}
