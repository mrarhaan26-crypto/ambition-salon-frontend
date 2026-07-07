import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StaffService } from '../staff/staff.service';
import { CalendarService } from './calendar.service';
import type { TimeSuggestion, SmartSuggestions } from './calendar.models';

interface SlotScore {
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  overlapCount: number;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class SmartTimeSuggestionsService {
  private staffService = inject(StaffService);
  private calendarService = inject(CalendarService);

  getSuggestions(
    staffId: string,
    dateStr: string,
    durationMinutes: number,
    excludeBookingId?: string,
  ): Observable<SmartSuggestions> {
    const schedule$ = this.staffService.getSchedule(staffId).pipe(
      catchError(() => of([])),
    );
    const bookings$ = this.calendarService.getCalendarDay({
      date: dateStr,
      staffId,
    }).pipe(
      catchError(() => of([])),
    );

    return forkJoin({ schedule: schedule$, bookings: bookings$ }).pipe(
      map(({ schedule, bookings }) => {
        const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
        const daySchedule = Array.isArray(schedule)
          ? schedule.find((s: any) => s.dayOfWeek === dayOfWeek && s.isActive !== false)
          : null;

        if (!daySchedule) {
          return { earliest: null, leastBusy: null, recommended: null, gapFill: null };
        }

        const slotStart = this.timeToMinutes(daySchedule.startTime);
        const slotEnd = this.timeToMinutes(daySchedule.endTime);

        const workingBlocks = Array.isArray(daySchedule.workingHours)
          ? daySchedule.workingHours.filter((w: any) => w.type === 'WORKING')
          : [{ start: daySchedule.startTime, end: daySchedule.endTime }];

        const breakBlocks = Array.isArray(daySchedule.workingHours)
          ? daySchedule.workingHours.filter((w: any) => w.type === 'BREAK' || w.type === 'LUNCH')
          : [];

        const existingBookings = (Array.isArray(bookings) ? bookings : []).filter((b: any) => {
          if (excludeBookingId && b.id === excludeBookingId) return false;
          return true;
        });

        const existingRanges = existingBookings.map((b: any) => ({
          start: new Date(b.startTime).getHours() * 60 + new Date(b.startTime).getMinutes(),
          end: new Date(b.endTime).getHours() * 60 + new Date(b.endTime).getMinutes(),
          id: b.id,
        }));

        const now = new Date();
        const isToday = dateStr === now.toISOString().slice(0, 10);
        const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : slotStart;

        const candidates: SlotScore[] = [];

        for (const block of workingBlocks) {
          const blockStart = this.timeToMinutes(block.start);
          const blockEnd = this.timeToMinutes(block.end);

          for (let m = Math.max(blockStart, nowMinutes); m + durationMinutes <= blockEnd; m += 15) {
            const candidateEnd = m + durationMinutes;

            const inBreak = breakBlocks.some((br: any) => {
              const brStart = this.timeToMinutes(br.start);
              const brEnd = this.timeToMinutes(br.end);
              return m < brEnd && candidateEnd > brStart;
            });
            if (inBreak) continue;

            const overlaps = existingRanges.filter(r => m < r.end && candidateEnd > r.start);
            if (overlaps.length > 0) continue;

            const hourFactor = this.hourScore(m);
            const gapFactor = this.gapScore(m, candidateEnd, existingRanges);
            const overlapCount = 0;
            const score = Math.round((hourFactor * 0.4 + gapFactor * 0.6) * 100) / 100;

            const startDate = new Date(dateStr + 'T00:00:00');
            startDate.setMinutes(m);
            const endDate = new Date(dateStr + 'T00:00:00');
            endDate.setMinutes(candidateEnd);

            candidates.push({
              startMinutes: m,
              endMinutes: candidateEnd,
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              overlapCount,
              score,
            });
          }
        }

        if (candidates.length === 0) {
          return { earliest: null, leastBusy: null, recommended: null, gapFill: null };
        }

        const earliest = candidates[0];
        const leastBusy = [...candidates].sort((a, b) => a.overlapCount - b.overlapCount || a.score - b.score)[0];
        const recommended = [...candidates].sort((a, b) => b.score - a.score)[0];
        const gapFill = this.findBestGapFill(candidates, existingRanges);

        return {
          earliest: this.toSuggestion(earliest, 'earliest', 'Earliest Available', `First open slot of the day`),
          leastBusy: this.toSuggestion(leastBusy, 'leastBusy', 'Least Busy', `Fewest appointments at this time`),
          recommended: this.toSuggestion(recommended, 'recommended', 'Recommended', `Best balance of availability and staff load`),
          gapFill: gapFill ? this.toSuggestion(gapFill, 'gapFill', 'Gap Filler', `Fills empty gap between appointments`) : null,
        };
      }),
    );
  }

  private toSuggestion(slot: SlotScore, type: TimeSuggestion['type'], label: string, reason: string): TimeSuggestion {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    const fmt = (d: Date) =>
      d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      label,
      score: slot.score,
      reason: `${reason} — ${fmt(start)} to ${fmt(end)}`,
      type,
    };
  }

  private findBestGapFill(candidates: SlotScore[], existingRanges: { start: number; end: number }[]): SlotScore | null {
    if (existingRanges.length < 2) return null;
    const sorted = [...existingRanges].sort((a, b) => a.start - b.start);

    let bestGap = 0;
    let bestSlot: SlotScore | null = null;

    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = sorted[i - 1].end;
      const currStart = sorted[i].start;
      const gapStart = prevEnd;
      const gapEnd = currStart;
      const gapSize = gapEnd - gapStart;

      const match = candidates.find(c => {
        const margin = 15;
        return Math.abs(c.startMinutes - gapStart) < margin && Math.abs(c.endMinutes - gapEnd) < margin;
      });

      if (match && gapSize > bestGap) {
        bestGap = gapSize;
        bestSlot = match;
      }
    }

    if (bestSlot && bestGap >= 30) {
      return bestSlot;
    }

    return candidates.length > 0 ? candidates[0] : null;
  }

  private hourScore(minutes: number): number {
    const h = minutes / 60;
    if (h >= 9 && h <= 11) return 1.0;
    if (h >= 8 && h < 9) return 0.8;
    if (h >= 11 && h <= 14) return 0.7;
    if (h >= 14 && h <= 16) return 0.6;
    return 0.4;
  }

  private gapScore(start: number, end: number, ranges: { start: number; end: number }[]): number {
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const before = sorted.filter(r => r.end <= start);
    const after = sorted.filter(r => r.start >= end);

    const gapBefore = before.length > 0 ? start - before[before.length - 1].end : start;
    const gapAfter = after.length > 0 ? after[0].start - end : 120;

    const avg = (gapBefore + gapAfter) / 2;
    if (avg <= 15) return 0.3;
    if (avg <= 30) return 0.6;
    if (avg <= 60) return 0.8;
    return 1.0;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
