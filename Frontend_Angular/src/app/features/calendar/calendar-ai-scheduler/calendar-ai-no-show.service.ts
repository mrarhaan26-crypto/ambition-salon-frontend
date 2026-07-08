import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { CalendarService } from '../calendar.service';
import { ClientsService } from '../../clients/clients.service';
import type { NoShowPrediction } from '../calendar.models';

@Injectable({ providedIn: 'root' })
export class AiNoShowPredictionService {
  private calendarService = inject(CalendarService);
  private clientsService = inject(ClientsService);

  predictRisk(clientId: string): Observable<NoShowPrediction> {
    if (!clientId) {
      return of({
        riskLevel: 'low', score: 0, factors: ['No client selected'],
        previousNoShows: 0, lateArrivals: 0, cancellationHistory: 0,
      });
    }

    return this.calendarService.getClientDetail(clientId).pipe(
      switchMap(client =>
        this.clientsService.getClientBookings(clientId).pipe(
          map(bookings => {
            const totalVisits = client.totalVisits ?? 0;
            const noShows = bookings.filter(b => b.status === 'NO_SHOW').length;
            const cancellations = bookings.filter(b => b.status === 'CANCELLED').length;
            const lateArrivals = 0;
            let score = 0;
            const factors: string[] = [];

            if (totalVisits === 0) {
              score = 15;
              factors.push('New client (no history)');
            } else if (totalVisits >= 20) {
              score = 5;
              factors.push('Regular client');
            }

            if (noShows > 0) {
              score += 30;
              factors.push(`${noShows} previous no-show(s)`);
            }

            if (cancellations > 2) {
              score += 20;
              factors.push(`${cancellations} previous cancellation(s)`);
            }

            if (lateArrivals > 3) {
              score += 15;
              factors.push(`${lateArrivals} late arrival(s)`);
            }

            const riskLevel = score >= 50 ? 'high' : score >= 20 ? 'medium' : 'low';

            return {
              riskLevel,
              score,
              factors: factors.length > 0 ? factors : ['No risk indicators'],
              previousNoShows: noShows,
              lateArrivals,
              cancellationHistory: cancellations,
            };
          }),
        ),
      ),
      catchError(() => of({
        riskLevel: 'low', score: 0, factors: ['Unable to fetch data'],
        previousNoShows: 0, lateArrivals: 0, cancellationHistory: 0,
      })),
    );
  }
}
