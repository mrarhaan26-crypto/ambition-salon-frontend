import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiReportsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/ai-reports';

  getPerformanceReport(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/performance`, { params });
  }

  getTrends(): Observable<any> {
    return this.http.get(`${this.baseUrl}/trends`);
  }

  getPredictions(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/predictions`, { params });
  }

  getAnomalies(): Observable<any> {
    return this.http.get(`${this.baseUrl}/anomalies`);
  }
}
