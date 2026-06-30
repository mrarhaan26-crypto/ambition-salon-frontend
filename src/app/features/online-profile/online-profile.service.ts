import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OnlineProfileService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/online-profile`);
  }

  updateProfile(body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/online-profile`, body);
  }

  getServices(): Observable<any> {
    return this.http.get(`${this.baseUrl}/online-profile/services`);
  }

  updateServices(body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/online-profile/services`, body);
  }

  getStaff(): Observable<any> {
    return this.http.get(`${this.baseUrl}/online-profile/staff`);
  }

  updateStaffVisibility(body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/online-profile/staff`, body);
  }

  getAvailability(): Observable<any> {
    return this.http.get(`${this.baseUrl}/online-profile/availability`);
  }

  updateAvailability(body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/online-profile/availability`, body);
  }

  getPublicProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/public/booking-profile`);
  }
}
