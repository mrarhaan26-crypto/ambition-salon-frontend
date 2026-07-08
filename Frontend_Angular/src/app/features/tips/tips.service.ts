import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TipRecord, TipSummary } from './tips.models';

@Injectable({ providedIn: 'root' })
export class TipsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/tips';

  getAll(params?: { staffId?: string; from?: string; to?: string; type?: string }): Observable<TipRecord[]> {
    let p = new HttpParams();
    if (params) {
      if (params.staffId) p = p.set('staffId', params.staffId);
      if (params.from) p = p.set('from', params.from);
      if (params.to) p = p.set('to', params.to);
      if (params.type) p = p.set('type', params.type);
    }
    return this.http.get<TipRecord[]>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<TipRecord> {
    return this.http.get<TipRecord>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<TipRecord>): Observable<TipRecord> {
    return this.http.post<TipRecord>(this.baseUrl, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSummary(): Observable<TipSummary> {
    return this.http.get<TipSummary>(`${this.baseUrl}/summary`);
  }
}
