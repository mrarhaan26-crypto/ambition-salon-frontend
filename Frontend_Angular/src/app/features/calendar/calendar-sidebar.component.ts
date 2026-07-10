import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, inject } from '@angular/core';
import { STATUS_COLORS } from './calendar.constants';
import { QueueEngineService } from './calendar-queue-engine/calendar-queue-engine.service';
import { ResourceEngineService } from './calendar-resource-engine/calendar-resource-engine.service';
import type { ResourceEntity } from './calendar-resource-engine/calendar-resource.models';

@Component({
  selector: 'app-calendar-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed" role="complementary" aria-label="Calendar sidebar">
      <button class="collapse-btn" (click)="toggle.emit()" [attr.aria-label]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
        {{ collapsed ? '&#9654;' : '&#9664;' }}
      </button>

      <div class="sidebar-content" *ngIf="!collapsed">
        <!-- Queue Summary -->
        <section class="sidebar-section" aria-label="Queue summary">
          <h3 class="sidebar-label">Queue</h3>
          <div class="queue-summary" *ngIf="queueStats">
            <div class="qs-row">
              <span class="qs-label">Waiting</span>
              <span class="qs-value qs-waiting">{{ queueStats.waiting }}</span>
            </div>
            <div class="qs-row">
              <span class="qs-label">In Service</span>
              <span class="qs-value qs-ips">{{ queueStats.inService }}</span>
            </div>
            <div class="qs-row">
              <span class="qs-label">Completed Today</span>
              <span class="qs-value qs-done">{{ queueStats.completed }}</span>
            </div>
          </div>
          <div class="queue-summary-empty" *ngIf="!queueStats">
            <span>No queue data</span>
          </div>
        </section>

        <!-- Resource Availability -->
        <section class="sidebar-section" aria-label="Resource availability">
          <h3 class="sidebar-label">Resources</h3>
          <div class="resource-list">
            <div *ngFor="let r of resourceItems" class="resource-item" [title]="r.name + ' (' + r.type + ')'">
              <span class="ri-dot" [class.ri-free]="r.available" [class.ri-used]="!r.available"></span>
              <span class="ri-name">{{ r.name }}</span>
              <span class="ri-type">{{ r.type }}</span>
            </div>
            <div class="resource-empty" *ngIf="resourceItems.length === 0">No resources</div>
          </div>
        </section>

        <!-- Legend -->
        <section class="sidebar-section" aria-label="Status legend">
          <h3 class="sidebar-label">Legend</h3>
          <div class="legend-list">
            <div *ngFor="let item of legendItems" class="legend-item">
              <span class="legend-dot" [style.background]="item.color"></span>
              <span class="legend-label">{{ item.label }}</span>
            </div>
          </div>
        </section>

        <!-- Quick Actions -->
        <section class="sidebar-section" aria-label="Quick actions">
          <h3 class="sidebar-label">Actions</h3>
          <div class="quick-actions">
            <button class="qa-btn" (click)="newAppointment.emit()" aria-label="New appointment">+ Appointment</button>
            <button class="qa-btn qa-walkin" (click)="newWalkIn.emit()" aria-label="Add walk-in">+ Walk-in</button>
            <button class="qa-btn qa-ai" (click)="openAiScheduler.emit()" aria-label="AI Scheduler">AI Schedule</button>
          </div>
        </section>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 220px;
      min-width: 220px;
      background: #fff;
      border-right: 1px solid var(--border, #e5e7eb);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transition: width 0.2s, min-width 0.2s;
      position: relative;
    }
    .sidebar.collapsed { width: 40px; min-width: 40px; }
    .sidebar-content { padding: 12px; display: flex; flex-direction: column; gap: 16px; }
    .collapse-btn {
      position: absolute;
      top: 6px;
      right: 4px;
      width: 26px;
      height: 26px;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }
    .collapse-btn:hover { background: var(--soft, #f7f7f7); }
    .sidebar-section { display: flex; flex-direction: column; gap: 6px; }
    .sidebar-section-header { display: flex; align-items: center; justify-content: space-between; }
    .sidebar-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted, #6b7280); margin: 0; }
    .sidebar-count { font-size: 10px; font-weight: 700; color: var(--muted, #6b7280); background: var(--soft, #f7f7f7); padding: 1px 7px; border-radius: 999px; }

    /* Queue Summary */
    .queue-summary { display: flex; flex-direction: column; gap: 3px; }
    .queue-summary-empty { font-size: 11px; color: var(--muted, #6b7280); padding: 4px 0; font-style: italic; }
    .qs-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
    .qs-label { color: var(--text, #111); font-weight: 500; }
    .qs-value { font-weight: 700; }
    .qs-waiting { color: #f59e0b; }
    .qs-ips { color: #3b82f6; }
    .qs-done { color: #16a34a; }

    /* Resource List */
    .resource-list { display: flex; flex-direction: column; gap: 3px; max-height: 100px; overflow-y: auto; }
    .resource-item { display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 2px 0; }
    .ri-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .ri-free { background: #16a34a; }
    .ri-used { background: #f59e0b; }
    .ri-name { font-weight: 600; color: var(--text, #111); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
    .ri-type { font-size: 9px; color: var(--muted, #6b7280); text-transform: capitalize; flex-shrink: 0; }
    .resource-empty { font-size: 11px; color: var(--muted, #6b7280); padding: 4px 0; font-style: italic; }

    /* Legend */
    .legend-list { display: flex; flex-direction: column; gap: 3px; }
    .legend-item { display: flex; align-items: center; gap: 7px; font-size: 11px; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .legend-label { color: var(--text, #111); }

    /* Quick Actions */
    .quick-actions { display: flex; flex-direction: column; gap: 4px; }
    .qa-btn {
      height: 30px;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 6px;
      background: transparent;
      color: var(--text, #111);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 0 10px;
      text-align: center;
      transition: background 0.1s, border-color 0.1s;
      width: 100%;
    }
    .qa-btn:hover { background: var(--soft, #f7f7f7); border-color: #d1d5db; }
    .qa-btn:focus-visible { outline: 2px solid var(--black, #0b0b0b); outline-offset: 2px; }
    .qa-walkin { color: #f59e0b; border-color: #fde68a; }
    .qa-walkin:hover { background: #fffbeb; }
    .qa-ai { color: #6366f1; border-color: #c7d2fe; }
    .qa-ai:hover { background: #eef2ff; }

    @media (max-width: 1024px) {
      .sidebar { width: 200px; min-width: 200px; }
    }
    @media (max-width: 768px) {
      .sidebar { width: 200px; min-width: 200px; }
      .sidebar-content { padding: 10px; gap: 12px; }
    }
  `]
})
export class CalendarSidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() toggle = new EventEmitter<void>();
  @Output() newAppointment = new EventEmitter<void>();
  @Output() newWalkIn = new EventEmitter<void>();
  @Output() openAiScheduler = new EventEmitter<void>();

  private queueEngine = inject(QueueEngineService);
  private resourceEngine = inject(ResourceEngineService);
  private cdr = inject(ChangeDetectorRef);
  private pollingHandle: ReturnType<typeof setInterval> | null = null;

  queueStats: { waiting: number; inService: number; completed: number } | null = null;
  resourceItems: { name: string; type: string; available: boolean }[] = [];

  legendItems = Object.entries(STATUS_COLORS).map(([status, color]) => ({
    label: status.charAt(0) + status.slice(1).toLowerCase(),
    color,
  }));

  ngOnInit(): void {
    this.updateQueueStats();
    this.loadResources();
    this.pollingHandle = setInterval(() => {
      this.updateQueueStats();
      this.loadResources();
      this.cdr.markForCheck();
    }, 15_000);
  }

  ngOnDestroy(): void {
    if (this.pollingHandle !== null) {
      clearInterval(this.pollingHandle);
      this.pollingHandle = null;
    }
  }

  private loadResources(): void {
    try {
      const resources = this.resourceEngine.managerService.getAll();
      this.resourceItems = resources.map((r: ResourceEntity) => ({
        name: r.name,
        type: r.type,
        available: r.status === 'ACTIVE',
      }));
    } catch {
      this.resourceItems = [];
    }
  }

  private updateQueueStats(): void {
    try {
      const stats = this.queueEngine.getStats();
      this.queueStats = {
        waiting: stats.totalWaiting + stats.totalCheckedIn,
        inService: stats.totalInService,
        completed: stats.totalCompleted,
      };
    } catch {
      this.queueStats = null;
    }
  }
}

export interface SidebarStaff {
  id: string;
  name: string;
  color: string;
  initials: string;
  active: boolean;
}
