import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PosSale } from './pos.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PosService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/pos';

  getDashboard(query?: any): Observable<any> {
    return this.http.get(this.baseUrl, { params: query });
  }

  checkout(body: any): Observable<PosSale> {
    return this.http.post<PosSale>(`${this.baseUrl}/checkout`, body);
  }

  getSales(query?: any): Observable<PosSale[]> {
    return this.http.get<PosSale[]>(`${this.baseUrl}/sales`, { params: query });
  }

  getSale(id: string): Observable<PosSale> {
    return this.http.get<PosSale>(`${this.baseUrl}/sales/${id}`);
  }

  refund(id: string, body?: any): Observable<PosSale> {
    return this.http.post<PosSale>(`${this.baseUrl}/sales/${id}/refund`, body || {});
  }

  getPaymentMethods(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/payment-methods`);
  }
}
