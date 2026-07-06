import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { BookingListItem, BookingServiceLine, CreateBookingForm, ClientOption, StaffOption, BranchOption, ServiceOption, PaymentInfo, ClientDetail } from './bookings.models';
import { environment } from '../../../environments/environment';

export interface BookingQueryParams {
  search?: string;
  status?: string;
  startTime?: string;
  branchId?: string;
  staffId?: string;
  clientId?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/bookings';

  getAll(query?: BookingQueryParams): Observable<BookingListItem[]> {
    let params = new HttpParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value) params = params.set(key, value);
      }
    }
    return this.http.get<BookingListItem[]>(this.baseUrl, { params });
  }

  getById(id: string): Observable<BookingListItem> {
    return this.http.get<BookingListItem>(`${this.baseUrl}/${id}`);
  }

  create(body: CreateBookingForm): Observable<BookingListItem> {
    return this.http.post<BookingListItem>(this.baseUrl, body);
  }

  update(id: string, body: Partial<BookingListItem>): Observable<BookingListItem> {
    return this.http.patch<BookingListItem>(`${this.baseUrl}/${id}`, body);
  }

  reschedule(id: string, body: { startTime: string; resourceId?: string }): Observable<BookingListItem> {
    return this.http.patch<BookingListItem>(`${this.baseUrl}/${id}/reschedule`, body);
  }

  cancel(id: string, body?: { reason?: string }): Observable<BookingListItem> {
    return this.http.patch<BookingListItem>(`${this.baseUrl}/${id}/cancel`, body || {});
  }

  updateStatus(id: string, status: string): Observable<BookingListItem> {
    return this.http.patch<BookingListItem>(`${this.baseUrl}/${id}/status`, { status });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSlots(query: { branchId: string; staffId: string; date: string; serviceIds: string; slotSizeMinutes?: string }): Observable<any> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get(`${this.baseUrl}/slots`, { params });
  }

  getClientBookingCount(clientId: string): Observable<number> {
    let params = new HttpParams().set('clientId', clientId);
    return this.http.get<BookingListItem[]>(this.baseUrl, { params }).pipe(
      (d) => new Observable<number>((sub) => d.subscribe({ next: (b) => { sub.next(b.length); sub.complete(); }, error: (e) => { sub.next(0); sub.complete(); } }))
    );
  }

  getClients(): Observable<ClientOption[]> {
    return this.http.get<ClientOption[] | { items?: ClientOption[] }>(`${environment.apiUrl}/clients`, { params: { limit: 100 } as any }).pipe(
      map((res) => Array.isArray(res) ? res : (res.items || [])),
    );
  }

  getStaff(): Observable<StaffOption[]> {
    return this.http.get<StaffOption[]>(`${environment.apiUrl}/staff`);
  }

  getBranches(): Observable<BranchOption[]> {
    return this.http.get<BranchOption[]>(`${environment.apiUrl}/branches`);
  }

  getServices(): Observable<ServiceOption[]> {
    return this.http.get<ServiceOption[]>(`${environment.apiUrl}/services`);
  }

  getBookingPayments(bookingId: string): Observable<PaymentInfo[]> {
    return this.http.get<PaymentInfo[]>(`${this.baseUrl}/${bookingId}/payments`);
  }

  getClientDetail(clientId: string): Observable<ClientDetail> {
    return this.http.get<ClientDetail>(`${environment.apiUrl}/clients/${clientId}`);
  }

  addPayment(bookingId: string, body: { amount: number; method: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/payments/mark-paid`, { bookingId, ...body });
  }
}
