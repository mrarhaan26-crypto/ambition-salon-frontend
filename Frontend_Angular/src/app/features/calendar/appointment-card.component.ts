import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { STATUS_COLORS, STATUS_LABELS } from './calendar.constants';
import type { AppointmentCardData } from './calendar-appointment.models';
import { ConflictVisualService } from './calendar-conflict-engine/calendar-conflict-visual.service';
import { getDurationMinutes } from './calendar.utils';

@Component({
  selector: 'app-appointment-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="apt-card"
      [class]="'status-' + (data.status || '').toLowerCase()"
      [class.vip]="data.isVIP"
      [class.has-notes]="data.notes"
      [class.apt-dragging]="dragging"
      [class.apt-resizing-top]="resizingEdge === 'top'"
      [class.apt-resizing-bottom]="resizingEdge === 'bottom'"
      [class.apt-conflict]="conflictState?.hasConflict"
      [class.apt-conflict-denied]="conflictState?.deniedAnimation"
      [style.top.px]="top"
      [style.height.px]="height"
      [style.left]="left"
      [style.width]="width"
      [style.border-color]="conflictState?.borderColor || null"
      tabindex="0"
      role="button"
      [attr.aria-label]="getAriaLabel()"
      [attr.aria-grabbed]="dragging"
      (click)="onClick()"
      (keydown.enter)="onClick()"
      (keydown.space)="onClick(); $event.preventDefault()"
      (pointerdown)="onPointerDown($event)"
    >
      <div class="apt-resize-handle apt-resize-top" 
        (pointerdown)="onResizeStart($event, 'top'); $event.stopPropagation()"
        [attr.aria-label]="'Resize top edge'"
        role="separator"
        tabindex="0"
        aria-orientation="horizontal"
        (keydown.enter)="onResizeStart($event, 'top')"
        (keydown.space)="onResizeStart($event, 'top'); $event.preventDefault()"
      ></div>

      <div class="apt-color-strip" [style.background]="data.staffColor || getStatusColor()" aria-hidden="true"></div>

      <div class="apt-body">
        <div class="apt-header">
          <span class="apt-service-name">{{ data.serviceName || data.title }}</span>
          <span class="apt-duration">{{ getDuration() }}m</span>
        </div>

        <div class="apt-client-row">
          <div class="apt-staff-avatar" [style.background]="data.staffColor" [attr.aria-label]="data.staffName">
            {{ data.staffInitials }}
          </div>
          <span class="apt-client-name">{{ data.clientName }}</span>
          <span class="apt-service-count" *ngIf="data.serviceCount > 1" title="{{ data.serviceCount }} services">+{{ data.serviceCount - 1 }}</span>
        </div>

        <div class="apt-footer">
          <span
            class="apt-status-badge"
            [style.background]="getStatusColor()"
            [attr.aria-label]="'Status: ' + getStatusLabel()"
          >
            {{ getStatusLabel() }}
          </span>

          <span class="apt-indicators">
            <span class="apt-indicator apt-vip" *ngIf="data.isVIP" aria-label="VIP client" title="VIP">&#9733;</span>
            <span class="apt-indicator apt-membership" *ngIf="data.hasMembership" aria-label="Membership" title="Membership">&#9829;</span>
            <span class="apt-indicator apt-conflict-badge" *ngIf="conflictState?.hasConflict" [title]="conflictState.tooltip" aria-label="Schedule conflict">&#9888;</span>
            <span class="apt-indicator apt-note" *ngIf="data.notes" aria-label="Has notes" title="Has notes">&#128221;</span>
            <span class="apt-indicator apt-package" *ngIf="data.hasPackage" aria-label="Package booking" title="Package">&#128230;</span>
            <span class="apt-indicator apt-payment" *ngIf="data.amount > 0" aria-label="Amount: {{ data.amount | currency }}">
              {{ data.amount | currency:'INR':'symbol':'1.0-0' }}
            </span>
            <button class="apt-overflow-btn" aria-label="More actions" title="More actions">&#8942;</button>
          </span>
        </div>
      </div>

      <div class="apt-resize-handle apt-resize-bottom"
        (pointerdown)="onResizeStart($event, 'bottom'); $event.stopPropagation()"
        [attr.aria-label]="'Resize bottom edge'"
        role="separator"
        tabindex="0"
        aria-orientation="horizontal"
        (keydown.enter)="onResizeStart($event, 'bottom')"
        (keydown.space)="onResizeStart($event, 'bottom'); $event.preventDefault()"
      ></div>
    </div>
  `,
  styles: [`
    .apt-card {
      position: absolute;
      left: 4px;
      right: 4px;
      border-radius: 6px;
      background: #fff;
      border: 1px solid var(--border, #e5e7eb);
      border-left: none;
      overflow: visible;
      cursor: grab;
      transition: box-shadow 0.15s, transform 0.1s;
      z-index: 1;
      display: flex;
      min-height: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      touch-action: none;
    }
    .apt-card:active { cursor: grabbing; }
    .apt-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 3;
    }
    .apt-card:focus-visible {
      outline: 2px solid var(--black, #0b0b0b);
      outline-offset: 2px;
      z-index: 4;
    }
    .apt-card.apt-dragging {
      opacity: 0.4;
      z-index: 10;
      pointer-events: none;
    }
    .apt-resize-handle {
      position: absolute;
      left: 0;
      right: 0;
      height: 6px;
      z-index: 2;
      cursor: ns-resize;
      touch-action: none;
    }
    .apt-resize-handle:focus-visible {
      outline: 2px solid var(--black, #0b0b0b);
      outline-offset: 1px;
    }
    .apt-resize-top { top: -2px; }
    .apt-resize-bottom { bottom: -2px; }
    .apt-card.apt-resizing-top .apt-resize-top,
    .apt-card.apt-resizing-bottom .apt-resize-bottom {
      background: rgba(99,102,241,0.2);
    }
    .apt-color-strip {
      width: 4px;
      flex-shrink: 0;
    }
    .apt-body {
      flex: 1;
      padding: 4px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
      min-width: 0;
    }
    .apt-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
    .apt-service-name {
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .apt-duration {
      font-size: 10px;
      font-weight: 500;
      color: var(--muted, #6b7280);
      flex-shrink: 0;
    }
    .apt-client-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .apt-staff-avatar {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }
    .apt-client-name {
      font-size: 11px;
      color: var(--muted, #6b7280);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .apt-service-count {
      font-size: 9px;
      font-weight: 700;
      color: #9575CD;
      background: #F3E5F5;
      padding: 0 5px;
      border-radius: 8px;
      flex-shrink: 0;
      line-height: 16px;
    }
    .apt-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      margin-top: auto;
    }
    .apt-status-badge {
      font-size: 9px;
      font-weight: 700;
      color: #fff;
      padding: 1px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .apt-indicators {
      display: flex;
      align-items: center;
      gap: 3px;
      margin-left: auto;
    }
    .apt-indicator {
      font-size: 10px;
      line-height: 1;
    }
    .apt-vip { color: #FFD700; }
    .apt-membership { color: #E91E63; }
    .apt-note { color: var(--muted, #6b7280); }
    .apt-package { color: #9575CD; }
    .apt-payment { font-size: 9px; font-weight: 600; color: #2E7D32; white-space: nowrap; }
    .apt-overflow-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0 2px;
      color: var(--muted, #6b7280);
      opacity: 0;
      transition: opacity 0.12s;
    }
    .apt-card:hover .apt-overflow-btn { opacity: 1; }
    .apt-overflow-btn:focus-visible { opacity: 1; outline: 1px solid var(--black, #0b0b0b); }

    .apt-card.status-draft .apt-color-strip { background: #B0BEC5; }
    .apt-card.status-pending .apt-color-strip { background: #FFB74D; }
    .apt-card.status-confirmed .apt-color-strip { background: #4A90D9; }
    .apt-card.status-checked_in .apt-color-strip { background: #50C878; }
    .apt-card.status-checked-in .apt-color-strip { background: #50C878; }
    .apt-card.status-waiting .apt-color-strip { background: #9575CD; }
    .apt-card.status-in_service .apt-color-strip { background: #26A69A; }
    .apt-card.status-in-service .apt-color-strip { background: #26A69A; }
    .apt-card.status-in_progress .apt-color-strip { background: #26A69A; }
    .apt-card.status-completed .apt-color-strip { background: #2E7D32; }
    .apt-card.status-cancelled .apt-color-strip { background: #9E9E9E; }
    .apt-card.status-no_show .apt-color-strip { background: #E57373; }
    .apt-card.status-paid .apt-color-strip { background: #1B5E20; }
    .apt-card.status-archived .apt-color-strip { background: #78909C; }

    .apt-card.vip { border-color: #FFD700; box-shadow: 0 0 0 1px #FFD700; }

    .apt-card.apt-conflict { box-shadow: 0 0 0 2px var(--conflict-color, #dc2626); }
    .apt-card.apt-conflict-denied { animation: conflict-shake 0.4s ease-in-out; }
    @keyframes conflict-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    .apt-conflict-badge { color: #dc2626; font-size: 12px; cursor: help; }

    @media (max-width: 768px) {
      .apt-body { padding: 3px 6px; }
      .apt-service-name { font-size: 10px; }
      .apt-client-name { display: none; }
      .apt-duration { display: none; }
      .apt-status-badge { font-size: 8px; padding: 1px 4px; }
    }
  `]
})
export class AppointmentCardComponent {
  private conflictVisual = inject(ConflictVisualService);

  @Input() data!: AppointmentCardData;
  @Input() top = 0;
  @Input() height = 0;
  @Input() left = '4px';
  @Input() width = 'auto';
  @Input() dragging = false;
  @Input() resizingEdge: 'top' | 'bottom' | null = null;
  @Output() cardClick = new EventEmitter<string>();
  @Output() dragStart = new EventEmitter<{ appointmentId: string; clientX: number; clientY: number }>();
  @Output() resizeStartEvent = new EventEmitter<{ appointmentId: string; edge: 'top' | 'bottom'; clientX: number; clientY: number }>();

  get conflictState() {
    return this.conflictVisual.getState(this.data.id);
  }

  onClick(): void {
    if (!this.dragging) {
      this.cardClick.emit(this.data.id);
    }
  }

  onPointerDown(e: PointerEvent): void {
    if (e.target instanceof HTMLElement && e.target.closest('.apt-resize-handle')) return;
    this.dragStart.emit({
      appointmentId: this.data.id,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  }

  onResizeStart(e: PointerEvent | KeyboardEvent, edge: 'top' | 'bottom'): void {
    const clientX = 'clientX' in e ? e.clientX : 0;
    const clientY = 'clientY' in e ? e.clientY : 0;
    this.resizeStartEvent.emit({
      appointmentId: this.data.id,
      edge,
      clientX,
      clientY,
    });
  }

  getAriaLabel(): string {
    const parts = [this.data.serviceName, 'with', this.data.clientName, this.getStatusLabel(), this.getDuration(), 'minutes'];
    if (this.data.isVIP) parts.unshift('VIP');
    return parts.join(' ');
  }

  getStatusColor(): string {
    return STATUS_COLORS[this.data.status] || STATUS_COLORS['CONFIRMED'];
  }

  getStatusLabel(): string {
    return STATUS_LABELS[this.data.status] || this.data.status;
  }

  getDuration(): number {
    return getDurationMinutes(this.data.startTime, this.data.endTime);
  }
}
