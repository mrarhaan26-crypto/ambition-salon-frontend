import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CustomerPortalService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/customer-portal';

  getProfile(clientId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/profile`, { params: { clientId } });
  }

  updateProfile(body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/profile`, body);
  }

  getBookings(clientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bookings`, { params: { clientId } });
  }

  getBooking(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/bookings/${id}`);
  }

  getWallet(clientId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/wallet`, { params: { clientId } });
  }

  getMemberships(clientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/memberships`, { params: { clientId } });
  }

  getPackages(clientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/packages`, { params: { clientId } });
  }

  getLoyalty(clientId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/loyalty`, { params: { clientId } });
  }
}
