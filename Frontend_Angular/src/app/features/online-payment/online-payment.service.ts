import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentTransaction, PaymentGatewayConfig } from './online-payment.models';

@Injectable({ providedIn: 'root' })
export class OnlinePaymentService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/payments';

  getTransactions(params?: { status?: string; gateway?: string }): Observable<PaymentTransaction[]> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.gateway) p = p.set('gateway', params.gateway);
    return this.http.get<PaymentTransaction[]>(`${this.baseUrl}/transactions`, { params: p });
  }

  getTransaction(id: string): Observable<PaymentTransaction> {
    return this.http.get<PaymentTransaction>(`${this.baseUrl}/transactions/${id}`);
  }

  refund(id: string): Observable<PaymentTransaction> {
    return this.http.post<PaymentTransaction>(`${this.baseUrl}/transactions/${id}/refund`, {});
  }

  getGateways(): Observable<PaymentGatewayConfig[]> {
    return this.http.get<PaymentGatewayConfig[]>(`${this.baseUrl}/gateways`);
  }

  updateGateway(id: string, body: Partial<PaymentGatewayConfig>): Observable<PaymentGatewayConfig> {
    return this.http.patch<PaymentGatewayConfig>(`${this.baseUrl}/gateways/${id}`, body);
  }

  getSummary(): Observable<{ totalRevenue: number; totalTransactions: number; successRate: number }> {
    return this.http.get<any>(`${this.baseUrl}/summary`);
  }
}
