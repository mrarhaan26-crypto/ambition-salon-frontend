import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BillingRulesService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  getRules(): Observable<any> {
    return this.http.get(`${this.baseUrl}/billing-rules`);
  }

  updateRules(body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/billing-rules`, body);
  }

  getDiscounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/discounts`);
  }

  createDiscount(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/discounts`, body);
  }

  updateDiscount(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/discounts/${id}`, body);
  }

  removeDiscount(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/discounts/${id}`);
  }

  getTaxes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/taxes`);
  }

  createTax(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/taxes`, body);
  }

  updateTax(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/taxes/${id}`, body);
  }

  removeTax(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/taxes/${id}`);
  }
}
