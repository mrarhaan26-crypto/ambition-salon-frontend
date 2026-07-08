import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PayrollRecord, PayrollSummary } from './payroll.models';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/payroll';

  getAll(params?: { staffId?: string; period?: string; status?: string }): Observable<PayrollRecord[]> {
    let p = new HttpParams();
    if (params) {
      if (params.staffId) p = p.set('staffId', params.staffId);
      if (params.period) p = p.set('period', params.period);
      if (params.status) p = p.set('status', params.status);
    }
    return this.http.get<PayrollRecord[]>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<PayrollRecord> {
    return this.http.get<PayrollRecord>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<PayrollRecord>): Observable<PayrollRecord> {
    return this.http.post<PayrollRecord>(this.baseUrl, body);
  }

  process(id: string): Observable<PayrollRecord> {
    return this.http.post<PayrollRecord>(`${this.baseUrl}/${id}/process`, {});
  }

  markPaid(id: string): Observable<PayrollRecord> {
    return this.http.post<PayrollRecord>(`${this.baseUrl}/${id}/pay`, {});
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSummary(): Observable<PayrollSummary> {
    return this.http.get<PayrollSummary>(`${this.baseUrl}/summary`);
  }
}
