import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy } from '@angular/core';
import { Subject, switchMap, of, catchError, finalize, Subscription, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
import type { StaffTimelineViewData } from './calendar-staff-timeline/calendar-staff-timeline.models';

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
          (toggle)="toggleSidebar()"
          (dateSelected)="onDateSelected($event)"
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
      (save)="onDialogSave($event)"
      (delete)="onDialogDelete($event)"
      (close)="closeDialog()"
    >
    </app-appointment-dialog>
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

  view: CalendarView = 'month';
  currentDate = new Date();
  sidebarCollapsed = false;
  loading = false;
  appointments: CalendarBooking[] = [];
  staffColorMap: Record<string, string> = {};
  searchQuery = '';

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

  private refresh$ = new Subject<void>();
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.refresh$.pipe(
        switchMap(() => {
          if (this.view === 'timeline') {
            return this.loadTimelineData();
          }
          this.loading = true;
          return this.loadForCurrentView().pipe(
            catchError(() => of([] as CalendarBooking[])),
            finalize(() => { this.loading = false; }),
          );
        }),
      ).subscribe(bookings => {
        if (this.view !== 'timeline') {
          this.appointments = bookings as CalendarBooking[];
        }
      })
    );
    this.loadStaffColors();
    this.loadAppointments();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
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

    this.staffTimelineService.loadTimelineData(date).subscribe(data => {
      this.timelineData = data;
      this.timelineLoading = false;
    });

    return of([] as CalendarBooking[]);
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
    this.bookingsService.getStaff().subscribe(staff => {
      const colors = ['#4A90D9', '#50C878', '#E57373', '#FFB74D', '#9575CD', '#26A69A', '#F06292', '#A1887F', '#4DB6AC', '#7986CB'];
      const map: Record<string, string> = {};
      staff.forEach((s, i) => {
        map[s.id] = colors[i % colors.length];
      });
      this.staffColorMap = map;
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
    this.loadAppointments();
  }

  onSettings(): void {
    // placeholder
  }

  onSlotClick(event: { date: Date; hour: number }): void {
    const dateStr = event.date.toISOString().slice(0, 10);
    const hourStr = event.hour.toString().padStart(2, '0');
    this.dialogDefaultDate = dateStr;
    this.dialogDefaultTime = `${hourStr}:00`;
    this.dialogDefaultStaffId = '';
    this.dialogDefaultBranchId = '';
    this.selectedBooking = null;
    this.dialogVisible = true;
  }

  onTimelineSlotClick(event: { staffId: string; hour: number }): void {
    const dateStr = this.currentDate.toISOString().slice(0, 10);
    const hourStr = event.hour.toString().padStart(2, '0');
    this.dialogDefaultDate = dateStr;
    this.dialogDefaultTime = `${hourStr}:00`;
    this.dialogDefaultStaffId = event.staffId;
    this.dialogDefaultBranchId = '';
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

  onDialogSave(event: { data: DialogAppointmentData; id?: string }): void {
    if (event.id) {
      const { data } = event;
      this.bookingsService.update(event.id, data as any).subscribe({
        next: () => {
          this.closeDialog();
          this.loadAppointments();
        },
      });
    } else {
      const { data } = event;
      const payload = {
        clientId: data.clientId,
        staffId: data.staffId,
        title: data.title || 'Appointment',
        startTime: data.startTime,
        branchId: data.branchId,
        notes: data.notes || '',
        services: data.services,
        status: data.status,
      };
      this.bookingsService.create(payload as any).subscribe({
        next: () => {
          this.closeDialog();
          this.loadAppointments();
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
}
