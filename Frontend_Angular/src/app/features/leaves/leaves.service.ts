import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LeaveRequest, LeaveSummary } from './leaves.models';

@Injectable({ providedIn: 'root' })
export class LeavesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/leaves';

  getAll(params?: { staffId?: string; status?: string; type?: string }): Observable<LeaveRequest[]> {
    let p = new HttpParams();
    if (params) {
      if (params.staffId) p = p.set('staffId', params.staffId);
      if (params.status) p = p.set('status', params.status);
      if (params.type) p = p.set('type', params.type);
    }
    return this.http.get<LeaveRequest[]>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<LeaveRequest> {
    return this.http.get<LeaveRequest>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<LeaveRequest>): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(this.baseUrl, body);
  }

  update(id: string, body: Partial<LeaveRequest>): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/${id}`, body);
  }

  approve(id: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: string, reason?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/${id}/reject`, { reason });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSummary(): Observable<LeaveSummary> {
    return this.http.get<LeaveSummary>(`${this.baseUrl}/summary`);
  }
}
