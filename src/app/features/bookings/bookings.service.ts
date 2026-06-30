import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/bookings';

  getAll(query?: any): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl, { params: query });
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  create(body: any): Observable<any> {
    return this.http.post(this.baseUrl, body);
  }

  update(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, body);
  }

  reschedule(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/reschedule`, body);
  }

  cancel(id: string, body?: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/cancel`, body || {});
  }

  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/status`, { status });
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getSlots(query: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/slots`, { params: query });
  }
}
