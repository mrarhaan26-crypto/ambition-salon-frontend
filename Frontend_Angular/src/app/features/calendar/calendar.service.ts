import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  CalendarBooking,
  CalendarSummaryResponse,
  CalendarDayResponse,
  CalendarWeekResponse,
  CalendarMonthResponse,
  CalendarResource,
  CalendarAvailabilitySlot,
  CalendarConflict,
  AiOptimization,
  CalendarQueryParams,
  CancelBookingPayload,
  PaymentInfo,
  ClientDetail,
} from './calendar.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/bookings';
  private aiBase = environment.apiUrl + '/ai-scheduler';

  getCalendarDay(query?: CalendarQueryParams): Observable<CalendarBooking[]> {
    return this.http.get<CalendarDayResponse>(`${this.baseUrl}/calendar/day`, { params: query as any }).pipe(
      map(res => {
        const bookings = Array.isArray(res) ? res : (res?.bookings ?? []);
        
        return bookings;
      }),
    );
  }

  getCalendarWeek(query?: CalendarQueryParams): Observable<CalendarBooking[]> {
    return this.http.get<CalendarWeekResponse>(`${this.baseUrl}/calendar/week`, { params: query as any }).pipe(
      map(res => {
        const bookings = Array.isArray(res) ? res : (res?.days?.flatMap(d => d.bookings ?? []) ?? []);
        
        return bookings;
      }),
    );
  }

  getCalendarMonth(query?: CalendarQueryParams): Observable<CalendarBooking[]> {
    return this.http.get<CalendarMonthResponse>(`${this.baseUrl}/calendar/month`, { params: query as any }).pipe(
      map(res => {
        const bookings = Array.isArray(res) ? res : (res?.days?.flatMap(d => d.bookings ?? []) ?? []);
        
        return bookings;
      }),
    );
  }

  getCalendarSummary(query?: CalendarQueryParams): Observable<CalendarSummaryResponse> {
    return this.http.get<CalendarSummaryResponse>(`${this.baseUrl}/calendar/summary`, { params: query as any });
  }

  getResources(query?: CalendarQueryParams): Observable<CalendarResource[]> {
    return this.http.get<CalendarResource[]>(`${this.baseUrl}/calendar/resources`, { params: query as any });
  }

  getResourceAvailability(query?: CalendarQueryParams): Observable<CalendarAvailabilitySlot[]> {
    return this.http.get<CalendarAvailabilitySlot[]>(`${this.baseUrl}/calendar/resources/availability`, { params: query as any });
  }

  getResourceConflicts(query?: CalendarQueryParams): Observable<CalendarConflict[]> {
    return this.http.get<CalendarConflict[]>(`${this.baseUrl}/calendar/resources/conflicts`, { params: query as any });
  }

  cancelBooking(id: string, body?: CancelBookingPayload): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/cancel`, body || {});
  }

  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/status`, { status });
  }

  getAiSuggestions(query: CalendarQueryParams): Observable<AiOptimization> {
    return this.http.get<AiOptimization>(`${this.aiBase}/suggest`, { params: query as any });
  }

  getAiOptimizeDay(query: CalendarQueryParams): Observable<AiOptimization> {
    return this.http.get<AiOptimization>(`${this.aiBase}/optimize-day`, { params: query as any });
  }

  getBookingPayments(bookingId: string): Observable<PaymentInfo[]> {
    return this.http.get<PaymentInfo[]>(`${environment.apiUrl}/payments`, { params: { bookingId } as any });
  }

  getClientDetail(clientId: string): Observable<ClientDetail> {
    return this.http.get<ClientDetail>(`${environment.apiUrl}/clients/${clientId}`);
  }

  addPayment(bookingId: string, body: { amount: number; method: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/payments/mark-paid`, { bookingId, ...body });
  }

  getBookingSlots(params: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/slots`, { params });
  }

  getWaitlistSuggestions(params: any): Observable<any> {
    return this.http.get(`${environment.apiUrl}/waitlist/suggestions`, { params });
  }

  autofillWaitlist(body: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/waitlist/autofill`, body);
  }
}
