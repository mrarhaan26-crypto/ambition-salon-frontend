import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BookOnlineService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/public';

  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/booking-profile`);
  }

  getServices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/booking-services`);
  }

  getStaff(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/booking-staff`);
  }

  getSlots(date: string, staffId?: string, serviceId?: string): Observable<any[]> {
    const params: any = { date };
    if (staffId) params.staffId = staffId;
    if (serviceId) params.serviceId = serviceId;
    return this.http.get<any[]>(`${this.baseUrl}/booking-slots`, { params });
  }

  createBooking(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bookings`, body);
  }
}
