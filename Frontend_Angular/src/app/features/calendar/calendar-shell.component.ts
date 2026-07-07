import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, switchMap, of, catchError, finalize, Subscription, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { CalendarView } from './calendar.constants';
import { CalendarService } from './calendar.service';
import type { CalendarBooking } from './calendar.models';
import type { DialogAppointmentData } from './appointment-dialog.component';
import { CalendarToolbarComponent } from './calendar-toolbar.component';
import { CalendarSidebarComponent } from './calendar-sidebar.component';
import { CalendarGridComponent } from './calendar-grid.component';
import { AppointmentDialogComponent } from './appointment-dialog.component';
import { BookingsService } from '../bookings/bookings.service';
import { StaffTimelineComponent } from './calendar-staff-timeline/calendar-staff-timeline.component';
import { StaffTimelineService } from './calendar-staff-timeline/calendar-staff-timeline.service';
import { DragEventSystem } from './calendar-drag-engine/calendar-drag-events-system';
import { ConflictVisualService } from './calendar-conflict-engine/calendar-conflict-visual.service';
import { QueueEngineService } from './calendar-queue-engine/calendar-queue-engine.service';
import { getStaffInitials } from './calendar-staff-timeline/calendar-staff-timeline-engine';
import type { StaffTimelineViewData } from './calendar-staff-timeline/calendar-staff-timeline.models';
import type { SidebarStaff } from './calendar-sidebar.component';

@Component({
  selector: 'app-calendar-shell',
  standalone: true,
  imports: [CommonModule, CalendarToolbarComponent, CalendarSidebarComponent, CalendarGridComponent, AppointmentDialogComponent, StaffTimelineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="calendar-page" role="application" aria-label="Calendar">
      <app-calendar-toolbar
        [view]="view"
        [currentDate]="currentDate"
        [searchQuery]="searchQuery"
        (goToday)="goToday()"
        (prev)="navigate(-1)"
        (next)="navigate(1)"
        (viewChange)="setView($event)"
        (searchChange)="onSearchChange($event)"
        (refresh)="loadAppointments()"
        (settings)="onSettings()"
      >
      </app-calendar-toolbar>

      <div class="calendar-layout" [class.sidebar-collapsed]="sidebarCollapsed">
        <app-calendar-sidebar
          [collapsed]="sidebarCollapsed"
          [currentDate]="currentDate"
          [appointments]="appointments"
          [sidebarStaff]="sidebarStaff"
          (toggle)="toggleSidebar()"
          (dateSelected)="onDateSelected($event)"
          (newAppointment)="onSlotClick({ date: currentDate, hour: getCurrentHour() })"
          (newWalkIn)="onSlotClick({ date: currentDate, hour: getCurrentHour() })"
          (openAiScheduler)="onOpenAiScheduler()"
          (staffFilterChange)="onStaffFilterChange($event)"
        >
        </app-calendar-sidebar>

        <app-calendar-grid
          *ngIf="view !== 'timeline'"
          [view]="view"
          [currentDate]="currentDate"
          [loading]="loading"
          [empty]="appointments.length === 0"
          [appointments]="appointments"
          [staffColorMap]="staffColorMap"
          (appointmentClick)="onAppointmentClick($event)"
          (slotClick)="onSlotClick($event)"
          (daySelect)="onDaySelect($event)"
          (dayClick)="onDaySelect($event)"
        >
        </app-calendar-grid>

        <ng-container *ngIf="view === 'timeline'">
          <app-staff-timeline
            [date]="timelineDate"
            [loading]="timelineLoading"
            [data]="timelineData"
            (appointmentClick)="onAppointmentClick($event)"
            (slotClick)="onTimelineSlotClick($event)"
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
      [appointments]="allAppointments"
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
      border-radius: 16px;
      overflow: hidden;
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
      padding: 16px;
    }
    app-staff-timeline {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 16px;
    }
    app-calendar-sidebar {
      flex-shrink: 0;
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
    @media (max-width: 1024px) {
      .calendar-layout.sidebar-collapsed app-calendar-sidebar {
        width: 40px;
        min-width: 40px;
      }
    }
    @media (max-width: 768px) {
      app-calendar-grid { padding: 8px; }
      app-staff-timeline { padding: 8px; }
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

  view: CalendarView = 'month';
  currentDate = new Date();
  sidebarCollapsed = false;
  loading = false;
  appointments: CalendarBooking[] = [];
  staffColorMap: Record<string, string> = {};
  searchQuery = '';
  conflictStates = this.conflictVisual.getAllStates();
  sidebarStaff: SidebarStaff[] = [];

  timelineLoading = false;
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

  toastMessage = '';
  toastVisible = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private refresh$ = new Subject<void>();
  private subs: Subscription[] = [];
  private cleanupFns: (() => void)[] = [];
  private allAppointments: CalendarBooking[] = [];
  private activeStaffFilter: string[] = [];
  private branches: { id: string; name?: string; city?: string }[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.refresh$.pipe(
        switchMap(() => {
          if (this.view === 'timeline') {
            return this.loadTimelineData();
          }
          this.loading = true;
          return this.loadForCurrentView().pipe(
            catchError((err) => {
              console.error('[CalendarShell] load error:', err);
              return of([] as CalendarBooking[]);
            }),
            finalize(() => { this.loading = false; }),
          );
        }),
      ).subscribe(bookings => {
        if (this.view !== 'timeline') {
          this.allAppointments = bookings as CalendarBooking[];
          this.applyFilters();
        }
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
      this.conflictStates = this.conflictVisual.getAllStates();
      this.cdr.markForCheck();
    });
    this.cleanupFns.push(conflictCleanup);

    this.loadStaffColors();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.cleanupFns.forEach(fn => fn());
    this.refresh$.complete();
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
  }

  private loadForCurrentView(): Observable<CalendarBooking[]> {
    const date = this.currentDate.toISOString().slice(0, 10);
    const params: Record<string, string> = { date };
    if (this.searchQuery) params['search'] = this.searchQuery;
    if (this.view === 'day') return this.calendarService.getCalendarDay(params);
    if (this.view === 'week') {
      const weekStart = this.getWeekStart(this.currentDate).toISOString().slice(0, 10);
      return this.calendarService.getCalendarWeek({ ...params, startDate: weekStart });
    }
    return this.calendarService.getCalendarMonth(params);
  }

  private loadTimelineData(): Observable<CalendarBooking[]> {
    this.timelineLoading = true;
    const date = this.currentDate.toISOString().slice(0, 10);
    this.timelineDate = date;
    return this.staffTimelineService.loadTimelineDataWithBookings(date).pipe(
      tap(data => {
        this.timelineData = data;
        this.timelineLoading = false;
      }),
      catchError(err => {
        console.error('[CalendarShell] Timeline load error:', err);
        this.timelineLoading = false;
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
        this.dialogDefaultBranchId = this.branches[0]?.id || '';
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
        this.staffColorMap = map;
        this.sidebarStaff = sidebar;
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
    this.currentDate = new Date();
    this.loadAppointments();
  }

  navigate(direction: -1 | 1): void {
    const d = new Date(this.currentDate);
    if (this.view === 'day') {
      d.setDate(d.getDate() + direction);
    } else if (this.view === 'week') {
      d.setDate(d.getDate() + 7 * direction);
    } else if (this.view === 'timeline') {
      d.setDate(d.getDate() + direction);
    } else {
      d.setMonth(d.getMonth() + direction);
    }
    this.currentDate = d;
    this.loadAppointments();
  }

  setView(v: CalendarView): void {
    this.view = v;
    this.loadAppointments();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onDateSelected(date: Date): void {
    this.currentDate = date;
    this.view = 'day';
    this.loadAppointments();
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    if (this.allAppointments.length > 0) {
      this.applyFilters();
    } else {
      this.loadAppointments();
    }
  }

  private filterAppointments(bookings: CalendarBooking[], query: string): CalendarBooking[] {
    const q = query.toLowerCase();
    return bookings.filter(b => {
      if (b.id?.toLowerCase().includes(q)) return true;
      if (b.client?.fullName?.toLowerCase().includes(q)) return true;
      if (b.client?.phone?.toLowerCase().includes(q)) return true;
      if (b.staff?.fullName?.toLowerCase().includes(q)) return true;
      if (b.title?.toLowerCase().includes(q)) return true;
      if (b.services?.some(s => s.name?.toLowerCase().includes(q))) return true;
      if (b.notes?.toLowerCase().includes(q)) return true;
      return false;
    });
  }

  onSettings(): void {
    // placeholder
  }

  onStaffFilterChange(activeStaffIds: string[]): void {
    this.activeStaffFilter = activeStaffIds;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = this.allAppointments;
    if (this.activeStaffFilter.length > 0) {
      filtered = filtered.filter(b => this.activeStaffFilter.includes(b.staffId || b.staff?.id || ''));
    }
    if (this.searchQuery) {
      filtered = this.filterAppointments(filtered, this.searchQuery);
    }
    this.appointments = filtered;
    this.cdr.markForCheck();
  }

  onOpenAiScheduler(): void {
    // placeholder
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
    this.dialogDefaultBranchId = this.dialogDefaultBranchId || this.branches[0]?.id || '';
    this.selectedBooking = null;
    this.dialogVisible = true;
  }

  onTimelineSlotClick(event: { staffId: string; hour: number }): void {
    const dateStr = this.currentDate.toISOString().slice(0, 10);
    const hourStr = event.hour.toString().padStart(2, '0');
    this.dialogDefaultDate = dateStr;
    this.dialogDefaultTime = `${hourStr}:00`;
    this.dialogDefaultStaffId = event.staffId;
    this.dialogDefaultBranchId = this.dialogDefaultBranchId || this.branches[0]?.id || '';
    this.selectedBooking = null;
    this.dialogVisible = true;
  }

  onDaySelect(date: Date): void {
    this.currentDate = date;
    this.view = 'day';
    this.loadAppointments();
  }

  onAppointmentClick(id: string): void {
    this.bookingsService.getById(id).subscribe({
      next: (booking) => {
        this.selectedBooking = booking as any;
        this.dialogDefaultDate = '';
        this.dialogDefaultTime = '';
        this.dialogDefaultStaffId = '';
        this.dialogDefaultBranchId = '';
        this.dialogVisible = true;
      },
      error: () => {
        // booking not found
      },
    });
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
        next: () => {
          this.closeDialog();
          this.loadAppointments();
          this.showToast('Appointment updated');
        },
      });
    } else {
      const { data } = event;
      const tempId = `temp-${Date.now()}`;
      const optimisticBooking = this.toOptimisticBooking(tempId, data);
      this.allAppointments = [...this.allAppointments, optimisticBooking];
      this.applyFilters();
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
          this.applyFilters();
          this.showToast('Appointment created');
        },
        error: (err) => {
          console.error('[CalendarShell] create failed:', err);
          this.allAppointments = this.allAppointments.filter((booking) => booking.id !== tempId);
          this.applyFilters();
        },
      });
    }
  }

  onDialogDelete(id: string): void {
    this.bookingsService.cancel(id, { reason: 'Cancelled from calendar' }).subscribe({
      next: () => {
        this.closeDialog();
        this.loadAppointments();
      },
    });
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.selectedBooking = null;
    this.dialogDefaultDate = '';
    this.dialogDefaultTime = '';
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
}
