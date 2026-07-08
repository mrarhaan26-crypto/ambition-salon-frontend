import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StaffTarget, TargetSummary } from './targets.models';

@Injectable({ providedIn: 'root' })
export class TargetsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/targets';

  getAll(params?: { staffId?: string; period?: string; status?: string }): Observable<StaffTarget[]> {
    let p = new HttpParams();
    if (params) {
      if (params.staffId) p = p.set('staffId', params.staffId);
      if (params.period) p = p.set('period', params.period);
    }
    return this.http.get<StaffTarget[]>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<StaffTarget> {
    return this.http.get<StaffTarget>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<StaffTarget>): Observable<StaffTarget> {
    return this.http.post<StaffTarget>(this.baseUrl, body);
  }

  update(id: string, body: Partial<StaffTarget>): Observable<StaffTarget> {
    return this.http.patch<StaffTarget>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSummary(): Observable<TargetSummary> {
    return this.http.get<TargetSummary>(`${this.baseUrl}/summary`);
  }
}
