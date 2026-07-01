import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ClientProfile, ClientBookingItem, ClientPaymentItem } from './client-360.models';

@Injectable({ providedIn: 'root' })
export class Client360Service {
  private http = inject(HttpClient);

  getProfile(clientId: string): Observable<ClientProfile> {
    return this.http.get<ClientProfile>(`http://localhost:3000/api/clients/${clientId}`);
  }

  getAppointments(clientId: string): Observable<ClientBookingItem[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<ClientBookingItem[]>('http://localhost:3000/api/bookings', { params });
  }

  getPayments(clientId: string): Observable<ClientPaymentItem[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<ClientPaymentItem[]>('http://localhost:3000/api/payments', { params });
  }
}
