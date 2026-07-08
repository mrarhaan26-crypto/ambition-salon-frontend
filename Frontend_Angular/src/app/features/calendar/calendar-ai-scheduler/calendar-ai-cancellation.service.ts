import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CalendarService } from '../calendar.service';
import type { CancellationFillSuggestion } from '../calendar.models';

@Injectable({ providedIn: 'root' })
export class AiCancellationFillService {
  private calendarService = inject(CalendarService);

  findFillsForCancellation(
    cancelledStaffId: string,
    cancelledStartTime: string,
    cancelledEndTime: string,
    cancelledServiceName?: string,
  ): Observable<CancellationFillSuggestion[]> {
    return this.calendarService.getWaitlistSuggestions({
      staffId: cancelledStaffId,
      date: cancelledStartTime.slice(0, 10),
    }).pipe(
      map((response: unknown) => {
        const waitlist = Array.isArray(response) ? response : [];
        if (waitlist.length === 0) return [];

        const durationMin = this.computeDurationMinutes(cancelledStartTime, cancelledEndTime);
        const suggestions: CancellationFillSuggestion[] = [];
        const seen = new Set<string>();

        for (const entry of waitlist) {
          const entryId = entry.id ?? '';
          if (seen.has(entryId)) continue;
          seen.add(entryId);
          const clientName = entry.client?.fullName ?? entry.clientName ?? 'Client';
          const serviceName = entry.serviceName ?? cancelledServiceName ?? 'Service';
          let matchScore = 50;

          if (cancelledServiceName && serviceName) {
            const cs = cancelledServiceName.toLowerCase();
            const ss = serviceName.toLowerCase();
            if (cs === ss) matchScore += 30;
            else if (cs.includes(ss) || ss.includes(cs)) matchScore += 15;
          }

          if (entry.status === 'waiting' || entry.status === 'PENDING') matchScore += 10;

          suggestions.push({
            waitlistEntryId: entryId,
            clientName,
            serviceName,
            serviceDuration: durationMin,
            matchScore,
            reason: matchScore >= 80 ? 'Excellent match' : matchScore >= 60 ? 'Good match' : 'Possible match',
          });
        }

        return suggestions.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
      }),
      catchError(() => of([])),
    );
  }

  private computeDurationMinutes(startTime: string, endTime: string): number {
    const s = new Date(startTime).getTime();
    const e = new Date(endTime).getTime();
    return Math.max(0, Math.round((e - s) / 60000));
  }
}
