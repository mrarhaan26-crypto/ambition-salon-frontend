import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { BookingListItem, BookingStatus } from './bookings.models';

const KANBAN_COLUMNS: { status: BookingStatus; label: string; color: string }[] = [
  { status: 'PENDING', label: 'Pending', color: '#eab308' },
  { status: 'CONFIRMED', label: 'Confirmed', color: '#3b82f6' },
  { status: 'CHECKED_IN', label: 'Checked In', color: '#8b5cf6' },
  { status: 'COMPLETED', label: 'Completed', color: '#16a34a' },
  { status: 'CANCELLED', label: 'Cancelled', color: '#dc2626' },
  { status: 'NO_SHOW', label: 'No Show', color: '#6b7280' },
];

@Component({
  selector: 'app-booking-kanban',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kb-board">
      <div class="kb-col" *ngFor="let col of columns">
        <div class="kb-col-head" [style.border-color]="col.color">
          <span class="kb-col-label">{{ col.label }}</span>
          <span class="kb-col-count">{{ getBookings(col.status).length }}</span>
        </div>
        <div
          class="kb-col-body"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event, col.status)"
          [class.kb-drag-over]="dragOverCol === col.status"
        >
          <div
            class="kb-card"
            *ngFor="let b of getBookings(col.status)"
            draggable="true"
            (dragstart)="onDragStart($event, b)"
            (click)="selectBooking.emit(b)"
            [style.border-left-color]="col.color"
          >
            <div class="kb-card-top">
              <strong>{{ b.client?.fullName || 'Unknown' }}</strong>
              <span class="kb-card-amount">{{ (b.totalAmount || 0) | currency }}</span>
            </div>
            <span class="kb-card-title">{{ b.title }}</span>
            <div class="kb-card-meta">
              <span>{{ b.startTime | date:'h:mm a' }} — {{ b.endTime | date:'h:mm a' }}</span>
              <span *ngIf="b.staff?.fullName" class="kb-card-staff">{{ b.staff.fullName }}</span>
            </div>
            <div class="kb-card-services" *ngIf="b.services?.length">
              <span class="kb-svc-tag" *ngFor="let s of b.services">{{ s.name }}</span>
            </div>
          </div>
          <div class="kb-empty" *ngIf="getBookings(col.status).length === 0">
            <span>No {{ col.label.toLowerCase() }} bookings</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kb-board{display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;flex:1;min-height:0;align-items:stretch}
    .kb-col{flex:1;min-width:240px;max-width:340px;display:flex;flex-direction:column;background:#f8fafc;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden}
    .kb-col-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:2px solid #e5e7eb;background:white}
    .kb-col-label{font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.03em}
    .kb-col-count{font-size:11px;font-weight:700;color:#64748b;background:#f1f5f9;border-radius:8px;padding:2px 8px}
    .kb-col-body{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px;min-height:120px;transition:background .15s}
    .kb-drag-over{background:#eef2ff!important}
    .kb-card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;border-left:3px solid #e5e7eb;cursor:pointer;transition:box-shadow .15s,transform .1s;display:flex;flex-direction:column;gap:4px}
    .kb-card:hover{box-shadow:0 4px 12px rgba(15,23,42,.08)}
    .kb-card:active{cursor:grabbing}
    .kb-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:6px}
    .kb-card-top strong{font-size:13px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .kb-card-amount{font-size:12px;font-weight:800;color:#16a34a;white-space:nowrap}
    .kb-card-title{font-size:11px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .kb-card-meta{display:flex;gap:8px;align-items:center;font-size:10px;color:#64748b;font-weight:600;flex-wrap:wrap}
    .kb-card-staff{background:#f1f5f9;border-radius:4px;padding:1px 6px}
    .kb-card-services{display:flex;gap:4px;flex-wrap:wrap;margin-top:2px}
    .kb-svc-tag{font-size:9px;background:#f1f5f9;color:#374151;border-radius:4px;padding:1px 6px;font-weight:600}
    .kb-empty{display:flex;align-items:center;justify-content:center;padding:24px 12px;color:#94a3b8;font-size:12px;font-weight:600;text-align:center}
  `]
})
export class BookingKanbanComponent {
  @Input() bookings: BookingListItem[] = [];
  @Output() selectBooking = new EventEmitter<BookingListItem>();
  @Output() statusChange = new EventEmitter<{ booking: BookingListItem; newStatus: BookingStatus }>();

  columns = KANBAN_COLUMNS;
  dragOverCol: string | null = null;
  private dragData: BookingListItem | null = null;

  getBookings(status: BookingStatus): BookingListItem[] {
    return this.bookings.filter(b => b.status === status);
  }

  onDragStart(e: DragEvent, b: BookingListItem): void {
    this.dragData = b;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', b.id);
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const col = (e.currentTarget as HTMLElement)?.closest?.('.kb-col')?.querySelector('.kb-col-label')?.textContent || '';
    this.dragOverCol = this.columns.find(c => c.label === col)?.status || null;
  }

  onDrop(e: DragEvent, targetStatus: BookingStatus): void {
    e.preventDefault();
    this.dragOverCol = null;
    if (this.dragData && this.dragData.status !== targetStatus) {
      this.statusChange.emit({ booking: this.dragData, newStatus: targetStatus });
    }
    this.dragData = null;
  }
}
