import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/payments';

  getAll(query?: any): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl, { params: query });
  }

  get(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  getMethods(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/methods`);
  }

  createIntent(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/create-intent`, body);
  }

  markPaid(id: string, method?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/mark-paid`, { id, method });
  }

  markFailed(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/mark-failed`, { id });
  }

  refund(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/refund`, { id });
  }
}
