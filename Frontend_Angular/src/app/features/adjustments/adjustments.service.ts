import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdjustmentsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getAdjustments(query?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/adjustments`, { params: query });
  }

  getAdjustment(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/adjustments/${id}`);
  }

  createAdjustment(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/adjustments`, body);
  }

  getRefunds(query?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/refunds`, { params: query });
  }

  createRefund(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/refunds`, body);
  }

  getCancellations(query?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cancellations`, { params: query });
  }

  createCancellation(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/cancellations`, body);
  }
}
