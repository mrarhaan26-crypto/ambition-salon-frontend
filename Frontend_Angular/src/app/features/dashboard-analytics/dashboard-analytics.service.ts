import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardOverview, RevenueAnalytics, OperationsAnalytics, StaffAnalytics, ClientActivity } from './dashboard-analytics.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardAnalyticsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/dashboard-analytics';

  getOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${this.baseUrl}/overview`);
  }

  getRevenue(): Observable<RevenueAnalytics> {
    return this.http.get<RevenueAnalytics>(`${this.baseUrl}/revenue`);
  }

  getOperations(): Observable<OperationsAnalytics> {
    return this.http.get<OperationsAnalytics>(`${this.baseUrl}/operations`);
  }

  getStaff(): Observable<StaffAnalytics> {
    return this.http.get<StaffAnalytics>(`${this.baseUrl}/staff`);
  }

  getClientActivity(): Observable<ClientActivity> {
    return this.http.get<ClientActivity>(`${this.baseUrl}/client-activity`);
  }
}
