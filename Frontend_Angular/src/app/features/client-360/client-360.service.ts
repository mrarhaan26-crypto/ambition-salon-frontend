import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ClientProfile, ClientBookingItem, ClientPaymentItem } from './client-360.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Client360Service {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getProfile(clientId: string): Observable<ClientProfile> {
    return this.http.get<ClientProfile>(`${this.apiUrl}/clients/${clientId}`);
  }

  getAppointments(clientId: string): Observable<ClientBookingItem[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<ClientBookingItem[]>(`${this.apiUrl}/bookings`, { params });
  }

  getPayments(clientId: string): Observable<ClientPaymentItem[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<ClientPaymentItem[]>(`${this.apiUrl}/payments`, { params });
  }
}
