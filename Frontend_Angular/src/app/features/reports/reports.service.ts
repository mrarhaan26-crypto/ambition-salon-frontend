import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/reports';

  getDashboard(query?: any): Observable<any> {
    return this.http.get(this.baseUrl, { params: query });
  }

  getRevenue(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/revenue`, { params: query });
  }

  getBookings(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/bookings`, { params: query });
  }

  getClients(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/clients`, { params: query });
  }

  getStaff(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/staff`, { params: query });
  }

  getInventory(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/inventory`, { params: query });
  }

  getExportSummary(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/export-summary`, { params: query });
  }
}
