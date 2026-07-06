import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CalendarService } from '../calendar.service';
import { StaffService } from '../../staff/staff.service';
import { STAFF_TIMELINE_COLORS, STAFF_TIMELINE_BUSINESS_START, STAFF_TIMELINE_BUSINESS_END } from './calendar-staff-timeline.constants';
import type { StaffTimelineStaff, StaffTimelineAppointment, StaffTimelineViewData, StaffGroup, StaffTimelineFilterState } from './calendar-staff-timeline.models';
import type { CalendarBooking } from '../calendar.models';
import type { Staff } from '../../staff/staff.models';
import { getTimelineHours, computeTimelineAppointment, computeOccupancyPercent, getCurrentTimePercent, computeStatus, getTotalWorkingMinutes, getTotalBreakMinutes, getPerformanceScore } from './calendar-staff-timeline-engine';

@Injectable({ providedIn: 'root' })
export class StaffTimelineService {
  private http = inject(HttpClient);
  private calendarService = inject(CalendarService);
  private staffService = inject(StaffService);

  loadTimelineData(date: string, branchId?: string): Observable<StaffTimelineViewData> {
    const params: Record<string, string> = { date };
    if (branchId) params['branchId'] = branchId;

    return this.staffService.getAll(params).pipe(
      map(staffList => this.buildTimelineViewData(staffList, date)),
      catchError(() => of(this.getEmptyTimelineViewData(date))),
    );
  }

  loadTimelineDataWithBookings(date: string, branchId?: string): Observable<StaffTimelineViewData> {
    const params: Record<string, string> = { date };
    if (branchId) params['branchId'] = branchId;

    return this.calendarService.getCalendarDay(params).pipe(
      map(bookings => {
        return {
          ...this.getEmptyTimelineViewData(date),
          appointments: bookings.map(b => computeTimelineAppointment(b, b.staffId ?? '', '#4A90D9')),
        };
      }),
      catchError(() => of(this.getEmptyTimelineViewData(date))),
    );
  }

  private buildTimelineViewData(staffList: Staff[], date: string): StaffTimelineViewData {
    const hours = getTimelineHours();
    const now = new Date();
    const currentTimePercent = getCurrentTimePercent();
    const colors = STAFF_TIMELINE_COLORS;

    const timelineStaff: StaffTimelineStaff[] = staffList.map((s, i) => {
      const workingMinutes = 480;
      const breakMinutes = 60;
      const status = computeStatus(0, s.isActive, false) as StaffTimelineStaff['status'];
      const kpis = {
        revenue: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        noShow: 0,
        occupancy: 0,
        workingHours: workingMinutes / 60,
        breakHours: breakMinutes / 60,
        performanceScore: 0,
      };
      kpis.performanceScore = getPerformanceScore({ completed: 0, cancelled: 0, revenue: 0, workingHours: workingMinutes / 60 });

      return {
        id: s.id,
        fullName: s.fullName,
        firstName: s.fullName.split(' ')[0],
        lastName: s.fullName.split(' ').slice(1).join(' '),
        email: s.email,
        phone: s.phone ?? '',
        role: s.role,
        isActive: s.isActive,
        specialization: s.specialization ?? '',
        color: colors[i % colors.length],
        status,
        kpis,
        bookingsToday: 0,
        revenueToday: 0,
        occupancyPercent: 0,
        isFavorite: false,
        online: false,
        workingHours: [
          {
            start: `${date}T${STAFF_TIMELINE_BUSINESS_START.toString().padStart(2, '0')}:00:00`,
            end: `${date}T${STAFF_TIMELINE_BUSINESS_END.toString().padStart(2, '0')}:00:00`,
            type: 'WORKING',
            label: 'Working',
          },
        ],
      };
    });

    const groups: StaffGroup[] = [
      {
        id: 'all',
        label: 'All Staff',
        type: 'role',
        staffIds: timelineStaff.map(s => s.id),
        collapsed: false,
        count: timelineStaff.length,
      },
    ];

    return {
      staffList: timelineStaff,
      appointments: [],
      groups,
      hours,
      currentTimePercent,
      todayDate: date,
      totalStaff: timelineStaff.length,
      totalAppointments: 0,
      filteredStaff: timelineStaff.length,
    };
  }

  private getEmptyTimelineViewData(date: string): StaffTimelineViewData {
    return {
      staffList: [],
      appointments: [],
      groups: [],
      hours: getTimelineHours(),
      currentTimePercent: 0,
      todayDate: date,
      totalStaff: 0,
      totalAppointments: 0,
      filteredStaff: 0,
    };
  }

  filterStaff(
    staffList: StaffTimelineStaff[],
    filter: StaffTimelineFilterState,
    groups: StaffGroup[],
  ): { filtered: StaffTimelineStaff[]; groups: StaffGroup[] } {
    let filtered = [...staffList];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.specialization && s.specialization.toLowerCase().includes(q))
      );
    }

    if (filter.role) {
      filtered = filtered.filter(s => s.role === filter.role);
    }

    if (filter.availability) {
      filtered = filtered.filter(s => s.status === filter.availability);
    }

    if (filter.branchId) {
      filtered = filtered.filter(s => s.branchId === filter.branchId);
    }

    if (filter.favoritesOnly) {
      filtered = filtered.filter(s => s.isFavorite);
    }

    if (filter.hideInactive) {
      filtered = filtered.filter(s => s.isActive);
    }

    const updatedGroups = groups.map(g => ({
      ...g,
      staffIds: g.staffIds.filter(id => filtered.some(s => s.id === id)),
      count: g.staffIds.filter(id => filtered.some(s => s.id === id)).length,
    }));

    return { filtered, groups: updatedGroups };
  }

  computeStaffBookings(
    staffId: string,
    appointments: StaffTimelineAppointment[],
  ): StaffTimelineAppointment[] {
    return appointments.filter(a => a.staffId === staffId);
  }
}
