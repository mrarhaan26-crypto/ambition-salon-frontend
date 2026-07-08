import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, interval } from 'rxjs';
import { map, catchError, startWith, switchMap } from 'rxjs/operators';
import { CalendarService } from '../calendar.service';
import { StaffService } from '../../staff/staff.service';
import type { QueueMetrics, StaffWorkloadMetrics } from '../calendar.models';

interface WorkloadInput {
  staffId: string;
  staffName: string;
  schedule: { start: string; end: string; type: string }[];
  bookings: { startTime: string; endTime: string; amount?: number }[];
}

@Injectable({ providedIn: 'root' })
export class AiQueueOptimizationService {
  private calendarService = inject(CalendarService);
  private staffService = inject(StaffService);

  getQueueMetrics(dateStr: string, branchId?: string): Observable<QueueMetrics> {
    const params: Record<string, string> = { date: dateStr };
    if (branchId) params['branchId'] = branchId;

    return this.calendarService.getCalendarDay(params).pipe(
      map(bookings => {
        const allBookings = Array.isArray(bookings) ? bookings : [];
        const activeStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_SERVICE', 'ARRIVED'];
        const active = allBookings.filter(b => activeStatuses.includes(b.status));
        const completed = allBookings.filter(b => b.status === 'COMPLETED');
        const waiting = allBookings.filter(b => b.status === 'WAITING' || b.status === 'PENDING');
        const inService = allBookings.filter(b => b.status === 'IN_SERVICE');

        const totalActive = active.length;
        const queueLoad = totalActive > 0 ? Math.round((waiting.length / Math.max(totalActive, 1)) * 100) : 0;
        const waitingTime = waiting.length > 0 ? waiting.length * 15 : 0;
        const remainingCapacity = Math.max(0, 40 - totalActive);

        const hourCounts = new Array(24).fill(0);
        for (const b of allBookings) {
          const h = new Date(b.startTime).getHours();
          if (h >= 0 && h < 24) hourCounts[h]++;
        }
        let peakHour = 0;
        let peakCount = 0;
        for (let h = 0; h < 24; h++) {
          if (hourCounts[h] > peakCount) {
            peakCount = hourCounts[h];
            peakHour = h;
          }
        }

        const utilization: Record<string, number> = {};
        for (const b of inService) {
          const sid = b.staffId ?? 'unknown';
          utilization[sid] = (utilization[sid] ?? 0) + 1;
        }

        return {
          waitingTime,
          queueLoad,
          staffUtilization: utilization,
          remainingCapacity,
          totalAppointmentsToday: totalActive,
          peakHour,
        };
      }),
      catchError(() => of({
        waitingTime: 0, queueLoad: 0, staffUtilization: {},
        remainingCapacity: 40, totalAppointmentsToday: 0, peakHour: 12,
      })),
    );
  }

  getQueueMetricsLive(dateStr: string, branchId?: string): Observable<QueueMetrics> {
    return interval(60000).pipe(
      startWith(0),
      switchMap(() => this.getQueueMetrics(dateStr, branchId)),
    );
  }

  getStaffWorkloads(dateStr: string, staffIds: string[]): Observable<StaffWorkloadMetrics[]> {
    if (staffIds.length === 0) return of([]);

    const workloadObs = staffIds.map(id =>
      forkJoin({
        bookings: this.calendarService.getCalendarDay({ date: dateStr, staffId: id }).pipe(catchError(() => of([]))),
        staffInfo: this.staffService.getById(id).pipe(catchError(() => of(null))),
        schedule: this.staffService.getSchedule(id).pipe(catchError(() => of([]))),
      }).pipe(
        map(({ bookings, staffInfo, schedule }) => {
          const allBookings = Array.isArray(bookings) ? bookings : [];
          const scheduleData = Array.isArray(schedule) ? schedule : [];
          const workingBlocks = scheduleData.filter((s: { type: string }) => s.type === 'WORKING');
          const totalMinutes = workingBlocks.reduce((sum: number, w: { start: string; end: string }) => {
            const [hs, ms] = w.start.split(':').map(Number);
            const [he, me] = w.end.split(':').map(Number);
            return sum + ((he * 60 + me) - (hs * 60 + ms));
          }, 0);
          const bookedMinutes = allBookings.reduce((sum: number, b: { startTime: string; endTime: string }) => {
            const s = new Date(b.startTime).getHours() * 60 + new Date(b.startTime).getMinutes();
            const e = new Date(b.endTime).getHours() * 60 + new Date(b.endTime).getMinutes();
            return sum + (e - s);
          }, 0);
          const busyPercent = totalMinutes > 0 ? Math.round((bookedMinutes / totalMinutes) * 100) : 0;
          const revenueTotal = allBookings.reduce((sum: number, b: { amount?: number }) => sum + (b.amount ?? 0), 0);
          return {
            staffId: id,
            staffName: staffInfo?.fullName ?? id,
            appointmentsToday: allBookings.length,
            revenueToday: revenueTotal,
            busyPercent,
            freeTimeMinutes: Math.max(0, totalMinutes - bookedMinutes),
            overtimeRisk: bookedMinutes > totalMinutes,
            totalWorkedMinutes: bookedMinutes,
            remainingMinutes: Math.max(0, totalMinutes - bookedMinutes),
          };
        }),
      )),
    );

    return forkJoin(workloadObs);
  }

  getStaffWorkloadsLive(dateStr: string, staffIds: string[]): Observable<StaffWorkloadMetrics[]> {
    return interval(60000).pipe(
      startWith(0),
      switchMap(() => this.getStaffWorkloads(dateStr, staffIds)),
    );
  }
}
