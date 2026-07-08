import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PerformanceReview, PerformanceSummary } from './performance.models';

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/performance';

  getAll(params?: { staffId?: string; status?: string }): Observable<PerformanceReview[]> {
    let p = new HttpParams();
    if (params) {
      if (params.staffId) p = p.set('staffId', params.staffId);
      if (params.status) p = p.set('status', params.status);
    }
    return this.http.get<PerformanceReview[]>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<PerformanceReview> {
    return this.http.get<PerformanceReview>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<PerformanceReview>): Observable<PerformanceReview> {
    return this.http.post<PerformanceReview>(this.baseUrl, body);
  }

  update(id: string, body: Partial<PerformanceReview>): Observable<PerformanceReview> {
    return this.http.patch<PerformanceReview>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSummary(): Observable<PerformanceSummary> {
    return this.http.get<PerformanceSummary>(`${this.baseUrl}/summary`);
  }
}
