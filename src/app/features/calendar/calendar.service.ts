import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/bookings';
  private aiBase = 'http://localhost:3000/api/ai-scheduler';

  getCalendarDay(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/calendar/day`, { params: query });
  }

  getCalendarWeek(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/calendar/week`, { params: query });
  }

  getCalendarMonth(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/calendar/month`, { params: query });
  }

  getCalendarSummary(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/calendar/summary`, { params: query });
  }

  getResources(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/calendar/resources`, { params: query });
  }

  getResourceAvailability(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/calendar/resources/availability`, { params: query });
  }

  getResourceConflicts(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/calendar/resources/conflicts`, { params: query });
  }

  cancelBooking(id: string, body?: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/cancel`, body || {});
  }

  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/status`, { status });
  }

  getAiSuggestions(query: any): Observable<any> {
    return this.http.get(`${this.aiBase}/suggest`, { params: query });
  }

  getAiOptimizeDay(query: any): Observable<any> {
    return this.http.get(`${this.aiBase}/optimize-day`, { params: query });
  }
}
