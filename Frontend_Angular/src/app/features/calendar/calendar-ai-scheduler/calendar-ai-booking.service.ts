import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StaffService } from '../../staff/staff.service';
import { CalendarService } from '../calendar.service';
import type { AiBookingSuggestion, AiBookingResult, BookingDetection, NoShowPrediction } from '../calendar.models';
import { UPSELL_SERVICE_MAP } from '../calendar.constants';

interface StaffSlot {
  staffId: string;
  staffName: string;
  color: string;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  score: number;
  overlapCount: number;
  activeBookings: number;
  bookedMinutes: number;
  hasLeave: boolean;
  hasHoliday: boolean;
  hasLunchOverlap: boolean;
  revenue: number;
  isVIP: boolean;
  specialization?: string;
  skillMatch: number;
  clientHistoryScore: number;
  workloadBalance: number;
}

interface StaffAvailability {
  staffId: string;
  staffName: string;
  color: string;
  specialty?: string;
  schedule: { start: string; end: string; type: string; label?: string }[];
  bookings: { startTime: string; endTime: string; id: string; services?: { name: string; durationMin: number; price: number }[]; amount?: number; client?: { fullName: string; id: string } }[];
  leaveDays: { start: string; end: string }[];
  holidays: { start: string; end: string }[];
  isFavorite: boolean;
  performanceScore?: number;
  totalRevenue?: number;
}

interface UpsellOption {
  name: string;
  price: number;
  durationMin: number;
}

@Injectable({ providedIn: 'root' })
export class AiBookingEngineService {
  private staffService = inject(StaffService);
  private calendarService = inject(CalendarService);

  getAiSuggestions(
    staffIds: string[],
    dateStr: string,
    durationMinutes: number,
    serviceName?: string,
    clientId?: string,
    isVIP?: boolean,
  ): Observable<AiBookingResult> {
    const staffObs = staffIds.map(id =>
      forkJoin({
        schedule: this.staffService.getSchedule(id).pipe(catchError(() => of([]))),
        bookings: this.calendarService.getCalendarDay({ date: dateStr, staffId: id }).pipe(catchError(() => of([]))),
        staffInfo: this.staffService.getById(id).pipe(catchError(() => of(null))),
      }).pipe(
        map(({ schedule, bookings, staffInfo }) => ({
          staffId: id,
          staffName: staffInfo?.fullName ?? id,
          color: staffInfo?.color ?? '#4A90D9',
          specialty: staffInfo?.specialization,
          schedule: Array.isArray(schedule) ? schedule : [],
          bookings: Array.isArray(bookings) ? bookings : [],
          leaveDays: [],
          holidays: [],
          isFavorite: staffInfo?.isFavorite ?? false,
          performanceScore: staffInfo?.performanceScore ?? 50,
          totalRevenue: 0,
        }) as StaffAvailability)),
    );

    return forkJoin(staffObs).pipe(
      map((staffList: StaffAvailability[]) => {
        const slots = this.computeSlots(staffList, dateStr, durationMinutes, serviceName);
        const ranked = this.rankSlots(slots, clientId, isVIP, serviceName);
        const detections = this.detectIssues(staffList);

        return {
          suggestions: ranked,
          detections,
        };
      }),
    );
  }

  private computeSlots(
    staffList: StaffAvailability[],
    dateStr: string,
    durationMinutes: number,
    serviceName?: string,
  ): StaffSlot[] {
    const now = new Date();
    const isToday = dateStr === now.toISOString().slice(0, 10);
    const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;
    const allSlots: StaffSlot[] = [];

    for (const staff of staffList) {
      const workingBlocks = staff.schedule.filter(s => s.type === 'WORKING');
      const breakBlocks = staff.schedule.filter(s => s.type === 'BREAK' || s.type === 'LUNCH');
      const isOnLeave = staff.schedule.some(s => s.type === 'LEAVE');
      const isOnHoliday = staff.schedule.some(s => s.type === 'HOLIDAY');

      if (isOnLeave || isOnHoliday) continue;

      const existingRanges = staff.bookings.map(b => ({
        start: new Date(b.startTime).getHours() * 60 + new Date(b.startTime).getMinutes(),
        end: new Date(b.endTime).getHours() * 60 + new Date(b.endTime).getMinutes(),
      }));

      const totalBookedMinutes = staff.bookings.reduce((sum, b) => {
        const s = new Date(b.startTime).getHours() * 60 + new Date(b.startTime).getMinutes();
        const e = new Date(b.endTime).getHours() * 60 + new Date(b.endTime).getMinutes();
        return sum + (e - s);
      }, 0);

      const totalRevenue = staff.bookings
        .filter(b => b.amount)
        .reduce((sum, b) => sum + (b.amount ?? 0), 0);

      for (const block of workingBlocks) {
        const blockStart = this.timeToMinutes(block.start);
        const blockEnd = this.timeToMinutes(block.end);
        const startFrom = Math.max(blockStart, isToday ? nowMinutes : blockStart);

        for (let m = startFrom; m + durationMinutes <= blockEnd; m += 15) {
          const candidateEnd = m + durationMinutes;

          const inBreak = breakBlocks.some(br => {
            const brS = this.timeToMinutes(br.start);
            const brE = this.timeToMinutes(br.end);
            return m < brE && candidateEnd > brS;
          });
          if (inBreak) continue;

          const overlaps = existingRanges.filter(r => m < r.end && candidateEnd > r.start);
          if (overlaps.length > 0) continue;

          const hasLunchOverlap = breakBlocks.some(br => {
            if (br.type !== 'LUNCH') return false;
            const brS = this.timeToMinutes(br.start);
            const brE = this.timeToMinutes(br.end);
            return m < brE && candidateEnd > brS;
          });

          const blockDurationMin = blockEnd - blockStart;
          const workloadBalance = blockDurationMin > 0
            ? 1 - (totalBookedMinutes / blockDurationMin)
            : 0.5;

          const skillMatch = this.computeSkillMatch(serviceName, staff.specialty);

          const score = this.computeSlotScore(m, candidateEnd, overlaps.length, staff, workloadBalance, skillMatch);
          const startDate = new Date(dateStr + 'T00:00:00');
          startDate.setMinutes(m);
          const endDate = new Date(dateStr + 'T00:00:00');
          endDate.setMinutes(candidateEnd);

          const upsell = this.suggestUpsell(serviceName);
          const revenue = totalRevenue;

          allSlots.push({
            staffId: staff.staffId,
            staffName: staff.staffName,
            color: staff.color,
            startMinutes: m,
            endMinutes: candidateEnd,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            score,
            overlapCount: 0,
            activeBookings: staff.bookings.length,
            bookedMinutes: totalBookedMinutes,
            hasLeave: false,
            hasHoliday: false,
            hasLunchOverlap,
            revenue,
            isVIP: false,
            specialization: staff.specialty,
            skillMatch,
            clientHistoryScore: 0,
            workloadBalance: Math.round(workloadBalance * 100),
          });
        }
      }
    }

    return allSlots;
  }

  private computeSkillMatch(serviceName?: string, specialty?: string): number {
    if (!serviceName || !specialty) return 0.5;
    const svc = serviceName.toLowerCase();
    const spec = specialty.toLowerCase();
    if (svc.includes(spec) || spec.includes(svc)) return 1.0;
    const specWords = spec.split(/\s+/);
    const matchCount = specWords.filter(w => svc.includes(w)).length;
    return Math.min(1, 0.3 + matchCount * 0.2);
  }

  private computeSlotScore(
    startMinutes: number,
    endMinutes: number,
    overlapCount: number,
    staff: StaffAvailability,
    workloadBalance: number,
    skillMatch: number,
  ): number {
    const hour = startMinutes / 60;
    let score = 50;

    if (hour >= 9 && hour <= 11) score += 20;
    else if (hour >= 8 && hour < 9) score += 10;
    else if (hour >= 11 && hour <= 14) score += 5;
    else if (hour >= 14 && hour <= 16) score += 0;
    else score -= 10;

    score -= overlapCount * 10;

    if (staff.isFavorite) score += 10;

    score += Math.round(skillMatch * 15);

    score += Math.round(workloadBalance * 10);

    if (staff.performanceScore) score += Math.round((staff.performanceScore - 50) * 0.5);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private rankSlots(slots: StaffSlot[], clientId?: string, isVIP?: boolean, serviceName?: string): AiBookingSuggestion[] {
    const sorted = [...slots].sort((a, b) => b.score - a.score);

    return sorted.slice(0, 10).map((slot, i) => {
      const reasonParts: string[] = [];
      if (i === 0) reasonParts.push('Best overall match');
      if (slot.skillMatch >= 0.8) reasonParts.push('Specialized staff');
      if (slot.workloadBalance >= 60) reasonParts.push('Balanced workload');
      if (slot.score >= 80) reasonParts.push('Prime time slot');
      if (slot.revenue > 0) reasonParts.push(`$${slot.revenue} revenue today`);

      return {
        staffId: slot.staffId,
        staffName: slot.staffName,
        roomId: undefined,
        roomName: undefined,
        startTime: slot.startTime,
        endTime: slot.endTime,
        score: slot.score,
        confidenceLabel: slot.score >= 80 ? 'High' : slot.score >= 50 ? 'Medium' : 'Low',
        type: i === 0 ? 'recommended' : i < 3 ? 'fastest' : 'gapFill',
        reason: reasonParts.join(' · ') || 'Available slot',
        revenue: slot.revenue,
        isVIP: isVIP ?? false,
        upsellServices: undefined,
      };
    });
  }

  private detectIssues(staffList: StaffAvailability[]): BookingDetection[] {
    const detections: BookingDetection[] = [];

    for (const staff of staffList) {
      const onLeave = staff.schedule.some(s => s.type === 'LEAVE');
      if (onLeave) {
        detections.push({
          type: 'staffLeave',
          severity: 'error',
          message: `${staff.staffName} is on leave`,
        });
      }

      const onHoliday = staff.schedule.some(s => s.type === 'HOLIDAY');
      if (onHoliday) {
        detections.push({
          type: 'holiday',
          severity: 'error',
          message: `${staff.staffName} is on holiday`,
        });
      }

      const staffBookings = staff.bookings;
      for (let i = 0; i < staffBookings.length; i++) {
        for (let j = i + 1; j < staffBookings.length; j++) {
          const a = staffBookings[i];
          const b = staffBookings[j];
          const aS = new Date(a.startTime).getTime();
          const aE = new Date(a.endTime).getTime();
          const bS = new Date(b.startTime).getTime();
          const bE = new Date(b.endTime).getTime();
          if (aS < bE && aE > bS) {
            detections.push({
              type: 'doubleBooking',
              severity: 'error',
              message: `${staff.staffName} has overlapping bookings`,
            });
            break;
          }
        }
      }

      if (staff.schedule.length > 0) {
        const workedMinutes = staff.bookings.reduce((sum, b) => {
          const s = new Date(b.startTime).getHours() * 60 + new Date(b.startTime).getMinutes();
          const e = new Date(b.endTime).getHours() * 60 + new Date(b.endTime).getMinutes();
          return sum + (e - s);
        }, 0);
        const workingBlocks = staff.schedule.filter(s => s.type === 'WORKING');
        const totalMinutes = workingBlocks.reduce((sum, w) => {
          return sum + (this.timeToMinutes(w.end) - this.timeToMinutes(w.start));
        }, 0);
        if (totalMinutes > 0 && workedMinutes > totalMinutes) {
          detections.push({
            type: 'staffOvertime',
            severity: 'warning',
            message: `${staff.staffName} has overtime`,
          });
        }
      }
    }

    return detections;
  }

  suggestUpsell(serviceName?: string): UpsellOption[] | undefined {
    if (!serviceName) return undefined;
    const match = Object.entries(UPSELL_SERVICE_MAP).find(([key]) =>
      serviceName.toLowerCase().includes(key.toLowerCase()),
    );
    return match ? match[1].map(u => ({ name: u.name, price: u.priceMin, durationMin: u.durationMin })) : undefined;
  }

  getDurationPrediction(services: { name: string; durationMin: number }[], staffSpecialty?: string): number {
    const base = services.reduce((sum, s) => sum + s.durationMin, 0);
    const buffer = Math.ceil(base * 0.1);
    let adjustment = 0;
    if (staffSpecialty) {
      const hasMatch = services.some(s => {
        const sn = s.name.toLowerCase();
        const sp = staffSpecialty.toLowerCase();
        return sn.includes(sp) || sp.includes(sn);
      });
      adjustment = hasMatch ? -Math.ceil(base * 0.05) : Math.ceil(base * 0.08);
    }
    return Math.max(base, base + buffer + adjustment);
  }

  predictNoShowRisk(clientId: string, previousBookings?: { status: string; startTime: string }[]): NoShowPrediction {
    if (!previousBookings || previousBookings.length === 0) {
      return { riskLevel: 'low', score: 10, factors: ['No prior history'], previousNoShows: 0, lateArrivals: 0, cancellationHistory: 0 };
    }
    const noShows = previousBookings.filter(b => b.status === 'NO_SHOW').length;
    const cancellations = previousBookings.filter(b => b.status === 'CANCELLED').length;
    const total = previousBookings.length;
    const noShowRate = total > 0 ? noShows / total : 0;
    const cancelRate = total > 0 ? cancellations / total : 0;
    let score = 0;
    const factors: string[] = [];
    if (noShowRate > 0.3) { score += 40; factors.push(`High no-show rate (${Math.round(noShowRate * 100)}%)`); }
    else if (noShowRate > 0.1) { score += 20; factors.push(`Moderate no-show rate (${Math.round(noShowRate * 100)}%)`); }
    if (cancelRate > 0.3) { score += 25; factors.push(`Frequent cancellations (${Math.round(cancelRate * 100)}%)`); }
    else if (cancelRate > 0.1) { score += 10; factors.push(`Some cancellations (${Math.round(cancelRate * 100)}%)`); }
    if (total >= 20 && score < 15) { score = 5; factors.push('Reliable regular client'); }
    const riskLevel = score >= 50 ? 'high' : score >= 20 ? 'medium' : 'low';
    return { riskLevel, score, factors, previousNoShows: noShows, lateArrivals: 0, cancellationHistory: cancellations };
  }

  computeWorkloadMetrics(
    staffId: string,
    staffName: string,
    schedule: { start: string; end: string; type: string }[],
    bookings: { startTime: string; endTime: string }[],
  ): { appointmentsToday: number; revenueToday: number; busyPercent: number; freeTimeMinutes: number; overtimeRisk: boolean; totalWorkedMinutes: number; remainingMinutes: number } {
    const workingBlocks = schedule.filter(s => s.type === 'WORKING');
    const totalMinutes = workingBlocks.reduce((sum, w) => sum + (this.timeToMinutes(w.end) - this.timeToMinutes(w.start)), 0);
    const bookedMinutes = bookings.reduce((sum, b) => {
      const s = new Date(b.startTime).getHours() * 60 + new Date(b.startTime).getMinutes();
      const e = new Date(b.endTime).getHours() * 60 + new Date(b.endTime).getMinutes();
      return sum + (e - s);
    }, 0);
    const busyPercent = totalMinutes > 0 ? Math.round((bookedMinutes / totalMinutes) * 100) : 0;
    const freeTimeMinutes = Math.max(0, totalMinutes - bookedMinutes);
    const overtimeRisk = bookedMinutes > totalMinutes;
    return {
      appointmentsToday: bookings.length,
      revenueToday: 0,
      busyPercent,
      freeTimeMinutes,
      overtimeRisk,
      totalWorkedMinutes: bookedMinutes,
      remainingMinutes: freeTimeMinutes,
    };
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
