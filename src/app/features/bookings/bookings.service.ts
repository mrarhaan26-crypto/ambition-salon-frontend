import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { BookingListItem, BookingServiceLine, CreateBookingForm, ClientOption, StaffOption, BranchOption, ServiceOption } from './bookings.models';

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
  private baseUrl = 'http://localhost:3000/api/bookings';

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
    return this.http.get<ClientOption[]>('http://localhost:3000/api/clients');
  }

  getStaff(): Observable<StaffOption[]> {
    return this.http.get<StaffOption[]>('http://localhost:3000/api/staff');
  }

  getBranches(): Observable<BranchOption[]> {
    return this.http.get<BranchOption[]>('http://localhost:3000/api/branches');
  }

  getServices(): Observable<ServiceOption[]> {
    return this.http.get<ServiceOption[]>('http://localhost:3000/api/services');
  }
}
