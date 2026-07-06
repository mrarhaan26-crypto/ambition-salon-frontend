import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getSummary(): Observable<any> {
    return this.http.get(`${this.baseUrl}/loyalty`);
  }

  getClient(clientId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/loyalty/client/${clientId}`);
  }

  adjust(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/loyalty/adjust`, body);
  }
}
