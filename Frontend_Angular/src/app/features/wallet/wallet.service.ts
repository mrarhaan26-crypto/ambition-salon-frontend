import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  getWallets(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/wallet`, { params: query });
  }

  getClientWallet(clientId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/wallet/client/${clientId}`);
  }

  credit(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/wallet/credit`, body);
  }

  debit(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/wallet/debit`, body);
  }
}
