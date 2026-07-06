import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  getAll(query?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/invoices`, { params: query });
  }

  get(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/invoices/${id}`);
  }

  create(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/invoices`, body);
  }

  update(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/invoices/${id}`, body);
  }

  issue(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/invoices/${id}/issue`, {});
  }

  voidInvoice(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/invoices/${id}/void`, {});
  }

  getReceipts(query?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/receipts`, { params: query });
  }

  getReceipt(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/receipts/${id}`);
  }
}
