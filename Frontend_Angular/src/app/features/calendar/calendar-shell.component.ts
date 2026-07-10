import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ChangeDetectorRef, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, switchMap, of, catchError, finalize, Subscription, Observable, combineLatest, fromEvent } from 'rxjs';
import { tap, map, debounceTime, distinctUntilChanged, take } from 'rxjs/operators';
import { CalendarView } from './calendar.constants';
import { CalendarService } from './calendar.service';
import type { CalendarBooking } from './calendar.models';
import type { DialogAppointmentData } from './appointment-dialog.component';
import { CalendarToolbarComponent } from './calendar-toolbar.component';
import { CalendarGridComponent } from './calendar-grid.component';
import { CalendarFilterBarComponent } from './calendar-filter-bar.component';
import { AppointmentDialogComponent } from './appointment-dialog.component';
import { BookingsService } from '../bookings/bookings.service';
import { StaffTimelineComponent } from './calendar-staff-timeline/calendar-staff-timeline.component';
import type { ContextMenuEvent, DragSlotSelection } from './calendar-staff-timeline/calendar-staff-timeline.component';
import { StaffTimelineService } from './calendar-staff-timeline/calendar-staff-timeline.service';
import { DragEventSystem } from './calendar-drag-engine/calendar-drag-events-system';
import { ConflictVisualService } from './calendar-conflict-engine/calendar-conflict-visual.service';
import { QueueEngineService } from './calendar-queue-engine/calendar-queue-engine.service';
import { getStaffInitials } from './calendar-staff-timeline/calendar-staff-timeline-engine';
import type { StaffTimelineViewData } from './calendar-staff-timeline/calendar-staff-timeline.models';
import { CalendarStateService } from './calendar-state.service';
import { CalendarColorRuleService } from './calendar-color-rule.service';
import { STATUS_COLORS } from './calendar.constants';
import type { SidebarStaff } from './calendar-sidebar.component';
import { EnterpriseDrawerService } from '../../core/layouts/enterprise-drawer.service';

const STORAGE_KEY = 'ambition_calendar_view';

interface SavedView {
  view: CalendarView;
  branchId: string;
  staffId: string;
}

@Component({
  selector: 'app-calendar-shell',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    CalendarToolbarComponent, CalendarGridComponent,
    CalendarFilterBarComponent,
    AppointmentDialogComponent, StaffTimelineComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="calendar-page" [class.fullscreen]="state.fullscreen()" [class.density-compact]="state.density() === 'compact'" [class.density-spacious]="state.density() === 'spacious'" role="application" aria-label="Calendar">
      <app-calendar-toolbar
        [view]="state.view()"
        [currentDate]="state.currentDate()"
        [searchQuery]="state.filters().searchQuery"
        [branches]="branches"
        [branchId]="state.branchId()"
        [filtersActive]="filterPanelVisible"
        [activeFilterCount]="state.activeFilterCount()"
        [fullscreen]="state.fullscreen()"
        [density]="state.density()"
        [conflictCount]="conflictCount"
        [queueCount]="queueCount"
        [liveSyncConnected]="state.liveSyncConnected()"
        [appointmentDates]="appointmentDates"
        (goToday)="goToday()"
        (prev)="navigate(-1)"
        (next)="navigate(1)"
        (viewChange)="setView($event)"
        (searchChange)="onSearchChange($event)"
        (refresh)="loadAppointments()"
        (settings)="onSettings()"
        (branchChange)="onBranchChange($event)"
        (filterToggle)="filterPanelVisible = !filterPanelVisible"
        (datePickerDateSelected)="onDateSelected($event)"
        (openAiScheduler)="onOpenAiScheduler()"
        (openConflictCenter)="onOpenConflictCenter()"
        (openQueue)="onOpenQueue()"
        (openResourceMap)="onOpenResourceMap()"
        (fullscreenToggle)="state.toggleFullscreen()"
        (densityChange)="state.setDensity($event)"
      >
      </app-calendar-toolbar>

      <app-calendar-filter-bar *ngIf="filterPanelVisible"></app-calendar-filter-bar>

      <div class="calendar-layout">
        <app-calendar-grid
          *ngIf="state.view() !== 'timeline'"
          [view]="state.view()"
          [currentDate]="state.currentDate()"
          [loading]="state.loading()"
          [empty]="state.filteredAppointments().length === 0"
          [appointments]="state.filteredAppointments()"
          [staffColorMap]="state.staffColorMap()"
          [staffList]="state.staffList()"
          [legendItems]="legendItems"
          (appointmentClick)="onAppointmentClick($event)"
          (slotClick)="onSlotClick($event)"
          (daySelect)="onDaySelect($event)"
          (dayClick)="onDaySelect($event)"
          (addStaff)="onAddStaff()"
        >
        </app-calendar-grid>

        <ng-container *ngIf="state.view() === 'timeline'">
          <app-staff-timeline
            [date]="timelineDate"
            [loading]="state.timelineLoading()"
            [data]="timelineData"
            (appointmentClick)="onAppointmentClick($event)"
            (slotClick)="onTimelineSlotClick($event)"
            (slotRangeClick)="onTimelineSlotRangeClick($event)"
            (contextAction)="onContextMenuAction($event)"
            (quickDuplicate)="onQuickDuplicate($event)"
          ></app-staff-timeline>
        </ng-container>
      </div>
    </section>

    <app-appointment-dialog
      *ngIf="dialogVisible"
      [booking]="selectedBooking"
      [defaultDate]="dialogDefaultDate"
      [defaultTime]="dialogDefaultTime"
      [defaultStaffId]="dialogDefaultStaffId"
      [defaultBranchId]="dialogDefaultBranchId"
      [isDuplicate]="isDuplicateMode"
      (save)="onDialogSave($event)"
      (delete)="onDialogDelete($event)"
      (close)="closeDialog()"
    >
    </app-appointment-dialog>

    <div class="toast" *ngIf="toastVisible" role="alert" aria-live="polite">
      <span>{{ toastMessage }}</span>
    </div>
  `,
  styles: [`
    .calendar-page {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--soft, #f7f7f7);
      border-radius: 0;
      overflow: hidden;
    }
    .calendar-page.fullscreen {
      position: fixed;
      inset: 0;
      z-index: 1000;
      border-radius: 0;
    }
    .calendar-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    app-calendar-grid {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 4px 8px 8px 8px;
    }
    app-staff-timeline {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 4px 8px 8px 8px;
    }
    .toast {
      position: fixed; bottom: 24px; right: 24px;
      background: #059669; color: #fff;
      padding: 12px 20px; border-radius: 10px;
      font-size: 14px; font-weight: 600;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      z-index: 2000;
      animation: toastIn 0.25s ease;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 768px) {
      app-calendar-grid { padding: 4px; }
      app-staff-timeline { padding: 4px; }
    }
  `]
})
export class CalendarShellComponent implements OnInit, OnDestroy {
  private calendarService = inject(CalendarService);
  private bookingsService = inject(BookingsService);
  private staffTimelineService = inject(StaffTimelineService);
  private dragEvents = inject(DragEventSystem);
  private conflictVisual = inject(ConflictVisualService);
  private queueEngine = inject(QueueEngineService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  state = inject(CalendarStateService);
  colorRule = inject(CalendarColorRuleService);
  drawerService = inject(EnterpriseDrawerService);

  filterPanelVisible = false;
  conflictCount = 0;
  queueCount = 0;
  get appointmentDates(): string[] {
    return this.allAppointments.map(a => a.startTime?.slice(0, 10)).filter(Boolean) as string[];
  }

  get legendItems(): { label: string; color: string }[] {
    return Object.entries(STATUS_COLORS).map(([status, color]) => ({
      label: status.charAt(0) + status.slice(1).toLowerCase(),
      color,
    }));
  }

  timelineData: StaffTimelineViewData = {
    staffList: [], appointments: [], groups: [],
    hours: [], currentTimePercent: 0, todayDate: '',
    totalStaff: 0, totalAppointments: 0, filteredStaff: 0,
  };
  timelineDate = '';

  dialogVisible = false;
  selectedBooking: CalendarBooking | null = null;
  dialogDefaultDate = '';
  dialogDefaultTime = '';
  dialogDefaultStaffId = '';
  dialogDefaultBranchId = '';
  isDuplicateMode = false;

  toastMessage = '';
  toastVisible = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private refresh$ = new Subject<void>();
  private subs: Subscription[] = [];
  private cleanupFns: (() => void)[] = [];
  private allAppointments: CalendarBooking[] = [];
  branches: { id: string; name?: string; city?: string }[] = [];

  ngOnInit(): void {
    this.restoreSavedView();
    this.readRouteParams();

    this.subs.push(
      this.refresh$.pipe(
        switchMap(() => {
          if (this.state.view() === 'timeline') {
            return this.loadTimelineData();
          }
          this.state.loading.set(true);
          return this.loadForCurrentView().pipe(
            catchError((err) => of([] as CalendarBooking[])),
            finalize(() => { this.state.loading.set(false); }),
          );
        }),
      ).subscribe(bookings => {
        if (this.state.view() !== 'timeline') {
          this.allAppointments = bookings as CalendarBooking[];
          this.state.allAppointments.set(this.allAppointments);
        }
        this.updateCounts();
        this.cdr.markForCheck();
      })
    );

    const dragCleanup = this.dragEvents.on('appointment:updated', (payload) => {
      const session = payload.session;
      const newStart = session.snappedStart || session.target.startTime;
      const newEnd = session.snappedEnd || session.target.endTime;
      const newStaffId = session.current.staffId || session.target.staffId;

      this.bookingsService.update(session.target.appointmentId, {
        startTime: newStart,
        endTime: newEnd,
        staffId: newStaffId,
      } as any).subscribe({
        next: () => this.loadAppointments(),
        error: (e) => console.error('[CalendarShell] drag update failed:', e),
      });
    });
    this.cleanupFns.push(dragCleanup);

    const conflictCleanup = this.conflictVisual.onChange(() => {
      this.conflictCount = this.conflictVisual.getAllStates().filter(s => s.hasConflict).length;
      this.cdr.markForCheck();
    });
    this.cleanupFns.push(conflictCleanup);

    this.loadStaffColors();

    effect(() => {
      const v = this.state.view();
      this.syncRouteParams();
    });

    this.subs.push(
      combineLatest([
        fromEvent(document, 'keydown'),
      ]).pipe(
        map(([event]) => event as KeyboardEvent),
        debounceTime(200),
      ).subscribe((e: KeyboardEvent) => {
        if (e.key === 't' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          this.goToday();
        }
      })
    );

    this.updateQueueCount();
    const queueInterval = setInterval(() => this.updateQueueCount(), 15000);
    this.cleanupFns.push(() => clearInterval(queueInterval));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.cleanupFns.forEach(fn => fn());
    this.refresh$.complete();
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
  }

  private readRouteParams(): void {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['view']) this.state.setView(params['view'] as CalendarView);
      if (params['date']) this.state.setDate(new Date(params['date']));
    });
  }

  private syncRouteParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        view: this.state.view(),
        date: this.state.currentDate().toISOString().slice(0, 10),
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private saveView(): void {
    try {
      const saved: SavedView = {
        view: this.state.view(),
        branchId: this.state.branchId(),
        staffId: '',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch { }
  }

  private restoreSavedView(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: SavedView = JSON.parse(raw);
        if (saved.view) this.state.setView(saved.view);
        if (saved.branchId) this.state.branchId.set(saved.branchId);
      }
    } catch { }
  }

  private loadForCurrentView(): Observable<CalendarBooking[]> {
    const date = this.state.currentDate().toISOString().slice(0, 10);
    const params: Record<string, string> = { date };
    const searchQuery = this.state.filters().searchQuery;
    if (searchQuery) params['search'] = searchQuery;
    const branchId = this.state.branchId();
    if (branchId) params['branchId'] = branchId;
    const v = this.state.view();
    if (v === 'day') return this.calendarService.getCalendarDay(params);
    if (v === 'week') {
      const weekStart = this.getWeekStart(this.state.currentDate()).toISOString().slice(0, 10);
      return this.calendarService.getCalendarWeek({ ...params, startDate: weekStart });
    }
    return this.calendarService.getCalendarMonth(params);
  }

  private loadTimelineData(): Observable<CalendarBooking[]> {
    this.state.timelineLoading.set(true);
    const date = this.state.currentDate().toISOString().slice(0, 10);
    this.timelineDate = date;
    return this.staffTimelineService.loadTimelineDataWithBookings(date).pipe(
      tap(data => {
        this.timelineData = data;
        this.state.timelineLoading.set(false);
      }),
      catchError(err => {
        console.error('[CalendarShell] Timeline load error:', err);
        this.state.timelineLoading.set(false);
        return of([] as CalendarBooking[]);
      }),
      map(() => [] as CalendarBooking[]),
    );
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private loadStaffColors(): void {
    this.bookingsService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches || [];
        if (!this.state.branchId()) {
          this.state.branchId.set(this.branches[0]?.id || '');
        }
      },
      error: () => { this.branches = []; },
    });

    this.bookingsService.getStaff().subscribe({
      next: (staff) => {
        const colors = ['#4A90D9', '#50C878', '#E57373', '#FFB74D', '#9575CD', '#26A69A', '#F06292', '#A1887F', '#4DB6AC', '#7986CB'];
        const map: Record<string, string> = {};
        const sidebar: SidebarStaff[] = [];
        staff.forEach((s, i) => {
          const color = colors[i % colors.length];
          map[s.id] = color;
          sidebar.push({
            id: s.id,
            name: s.fullName,
            color,
            initials: getStaffInitials(s.fullName),
            active: true,
          });
        });
        this.state.staffColorMap.set(map);
        this.state.staffList.set(sidebar);
        this.loadAppointments();
      },
      error: (err) => {
        console.error('[CalendarShell] Failed to load staff colors:', err);
        this.loadAppointments();
      },
    });
  }

  loadAppointments(): void {
    this.refresh$.next();
  }

  goToday(): void {
    this.state.goToday();
    this.loadAppointments();
  }

  navigate(direction: -1 | 1): void {
    this.state.navigate(direction);
    this.loadAppointments();
  }

  setView(v: CalendarView): void {
    this.state.setView(v);
    this.saveView();
    this.loadAppointments();
  }

  onDateSelected(date: Date): void {
    this.state.setDate(date);
    this.state.setView('day');
    this.saveView();
    this.loadAppointments();
  }

  onSearchChange(query: string): void {
    this.state.setFilter('searchQuery', query);
    if (this.allAppointments.length > 0) {
      this.state.allAppointments.set(this.allAppointments);
    } else {
      this.loadAppointments();
    }
  }

  onBranchChange(branchId: string): void {
    this.state.branchId.set(branchId);
    this.loadAppointments();
  }

  onSettings(): void {
    this.router.navigate(['/app/calendar/settings']);
  }

  onStaffFilterChange(activeStaffIds: string[]): void {
    this.state.setFilter('staffIds', activeStaffIds);
    this.state.allAppointments.set(this.allAppointments);
  }

  onOpenAiScheduler(): void {
    this.drawerService.open({
      type: 'ai-assistant',
      title: 'AI Scheduler',
      data: { date: this.state.currentDate().toISOString().slice(0, 10) },
    });
  }

  onOpenConflictCenter(): void {
    this.router.navigate(['/app/calendar/conflicts']);
  }

  onOpenQueue(): void {
    this.router.navigate(['/app/calendar/queue']);
  }

  onOpenResourceMap(): void {
    this.router.navigate(['/app/calendar/resource-map']);
  }

  onAddStaff(): void {
    this.router.navigate(['/app/staff']);
  }

  getCurrentHour(): number {
    return new Date().getHours();
  }

  onSlotClick(event: { date: Date; hour: number }): void {
    const dateStr = event.date.toISOString().slice(0, 10);
    const hourStr = event.hour.toString().padStart(2, '0');
    this.dialogDefaultDate = dateStr;
    this.dialogDefaultTime = `${hourStr}:00`;
    this.dialogDefaultStaffId = '';
    this.dialogDefaultBranchId = this.state.branchId() || this.branches[0]?.id || '';
    this.selectedBooking = null;
    this.dialogVisible = true;
  }

  onTimelineSlotClick(event: { staffId: string; hour: number }): void {
    const dateStr = this.state.currentDate().toISOString().slice(0, 10);
    const hourStr = event.hour.toString().padStart(2, '0');
    this.dialogDefaultDate = dateStr;
    this.dialogDefaultTime = `${hourStr}:00`;
    this.dialogDefaultStaffId = event.staffId;
    this.dialogDefaultBranchId = this.state.branchId() || this.branches[0]?.id || '';
    this.selectedBooking = null;
    this.isDuplicateMode = false;
    this.dialogVisible = true;
  }

  onTimelineSlotRangeClick(event: DragSlotSelection): void {
    const dateStr = this.state.currentDate().toISOString().slice(0, 10);
    this.dialogDefaultDate = dateStr;
    this.dialogDefaultTime = `${event.startHour.toString().padStart(2, '0')}:00`;
    this.dialogDefaultStaffId = event.staffId;
    this.dialogDefaultBranchId = this.state.branchId() || this.branches[0]?.id || '';
    this.selectedBooking = null;
    this.isDuplicateMode = false;
    this.dialogVisible = true;
  }

  onDaySelect(date: Date): void {
    this.state.setDate(date);
    this.state.setView('day');
    this.saveView();
    this.loadAppointments();
  }

  onAppointmentClick(id: string): void {
    this.drawerService.open({
      type: 'quick-view',
      title: 'Appointment Details',
      data: { appointmentId: id },
    });
  }

  onQuickDuplicate(appointmentId: string): void {
    this.bookingsService.getById(appointmentId).subscribe({
      next: (booking) => {
        this.selectedBooking = booking as any;
        this.isDuplicateMode = true;
        this.dialogVisible = true;
      },
      error: () => {
        this.showToast('Failed to load appointment');
      },
    });
  }

  onContextMenuAction(event: { action: string; appointmentId: string }): void {
    switch (event.action) {
      case 'open':
        this.onAppointmentClick(event.appointmentId);
        break;
      case 'checkout':
      case 'reschedule':
        this.bookingsService.getById(event.appointmentId).subscribe({
          next: (booking) => {
            this.selectedBooking = booking as any;
            this.dialogVisible = true;
          },
        });
        break;
      case 'duplicate':
        this.onQuickDuplicate(event.appointmentId);
        break;
      case 'cancel':
        this.bookingsService.cancel(event.appointmentId, { reason: 'Cancelled from calendar' }).subscribe({
          next: () => { this.loadAppointments(); this.showToast('Appointment cancelled'); },
        });
        break;
      case 'delete':
        this.bookingsService.cancel(event.appointmentId, { reason: 'Deleted from calendar' }).subscribe({
          next: () => { this.loadAppointments(); this.showToast('Appointment deleted'); },
        });
        break;
    }
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.toastVisible = true;
    this.cdr.markForCheck();
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.markForCheck();
      this.toastTimer = null;
    }, 3000);
  }

  onDialogSave(event: { data: DialogAppointmentData; id?: string }): void {
    if (event.id) {
      const { data } = event;
      this.bookingsService.update(event.id, data as any).subscribe({
        next: () => { this.closeDialog(); this.loadAppointments(); this.showToast('Appointment updated'); },
      });
    } else {
      const { data } = event;
      const tempId = `temp-${Date.now()}`;
      const optimisticBooking = this.toOptimisticBooking(tempId, data);
      this.allAppointments = [...this.allAppointments, optimisticBooking];
      this.state.allAppointments.set(this.allAppointments);
      this.closeDialog();

      const payload = {
        clientId: data.clientId,
        staffId: data.staffId,
        title: data.title || 'Appointment',
        startTime: data.startTime,
        branchId: data.branchId,
        notes: data.notes || '',
        services: data.services,
        status: data.status,
        resourceId: data.resourceId || undefined,
      };
      this.bookingsService.create(payload as any).subscribe({
        next: (created) => {
          this.allAppointments = this.allAppointments.map((booking) =>
            booking.id === tempId ? created as any : booking
          );
          this.state.allAppointments.set(this.allAppointments);
          this.showToast('Appointment created');
        },
        error: (err) => {
          console.error('[CalendarShell] create failed:', err);
          this.allAppointments = this.allAppointments.filter((booking) => booking.id !== tempId);
          this.state.allAppointments.set(this.allAppointments);
        },
      });
    }
  }

  onDialogDelete(id: string): void {
    this.bookingsService.cancel(id, { reason: 'Cancelled from calendar' }).subscribe({
      next: () => { this.closeDialog(); this.loadAppointments(); },
    });
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.selectedBooking = null;
    this.dialogDefaultDate = '';
    this.dialogDefaultTime = '';
    this.isDuplicateMode = false;
  }

  private toOptimisticBooking(id: string, data: DialogAppointmentData): CalendarBooking {
    return {
      id,
      title: data.title || data.services.map(service => service.name).join(', ') || 'Appointment',
      status: data.status,
      startTime: data.startTime,
      endTime: data.endTime || this.addMinutes(data.startTime, data.durationMin || 0),
      clientId: data.clientId,
      staffId: data.staffId,
      branchId: data.branchId,
      resourceId: data.resourceId,
      notes: data.notes,
      totalAmount: data.estimatedTotal,
      client: data.clientName ? { id: data.clientId, fullName: data.clientName } : undefined,
      staff: data.staffName ? { id: data.staffId, fullName: data.staffName } : undefined,
      branch: data.branchName ? { id: data.branchId, name: data.branchName } : undefined,
      services: data.services,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private addMinutes(startTime: string, minutes: number): string {
    const start = new Date(startTime);
    return new Date(start.getTime() + Math.max(0, minutes) * 60000).toISOString();
  }

  private updateCounts(): void {
    const conflicts = this.conflictVisual.getAllStates();
    this.conflictCount = conflicts.filter(s => s.hasConflict).length;
    this.updateQueueCount();
  }

  private updateQueueCount(): void {
    try {
      const stats = this.queueEngine.getStats();
      this.queueCount = stats.totalWaiting + stats.totalCheckedIn + stats.totalInService;
    } catch {
      this.queueCount = 0;
    }
  }
}
