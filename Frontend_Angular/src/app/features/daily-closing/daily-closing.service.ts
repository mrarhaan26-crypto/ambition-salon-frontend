import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DailyClosing, ClosingSummary } from './daily-closing.models';

@Injectable({ providedIn: 'root' })
export class DailyClosingService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/daily-closing';

  getAll(params?: { status?: string; from?: string; to?: string }): Observable<DailyClosing[]> {
    let p = new HttpParams();
    if (params) {
      if (params.status) p = p.set('status', params.status);
      if (params.from) p = p.set('from', params.from);
      if (params.to) p = p.set('to', params.to);
    }
    return this.http.get<DailyClosing[]>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<DailyClosing> {
    return this.http.get<DailyClosing>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<DailyClosing>): Observable<DailyClosing> {
    return this.http.post<DailyClosing>(this.baseUrl, body);
  }

  closeDay(id: string, body: { actualCash: number; notes?: string }): Observable<DailyClosing> {
    return this.http.post<DailyClosing>(`${this.baseUrl}/${id}/close`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSummary(): Observable<ClosingSummary> {
    return this.http.get<ClosingSummary>(`${this.baseUrl}/summary`);
  }
}
