import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PosSale, ClientWalletData, ClientLoyaltyData, ClientMembership, ClientPackage, GiftCardInfo, CashDrawerSession } from './pos.models';
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

  getWallet(clientId: string): Observable<ClientWalletData> {
    return this.http.get<ClientWalletData>(`${environment.apiUrl}/wallet/client/${clientId}`);
  }

  getLoyalty(clientId: string): Observable<ClientLoyaltyData> {
    return this.http.get<ClientLoyaltyData>(`${environment.apiUrl}/loyalty/client/${clientId}`);
  }

  getClientMemberships(clientId: string): Observable<ClientMembership[]> {
    return this.http.get<ClientMembership[]>(`${environment.apiUrl}/clients/${clientId}/memberships`);
  }

  getClientPackages(clientId: string): Observable<ClientPackage[]> {
    return this.http.get<ClientPackage[]>(`${environment.apiUrl}/clients/${clientId}/packages`);
  }

  getClientGiftCards(clientId: string): Observable<GiftCardInfo[]> {
    return this.http.get<GiftCardInfo[]>(`${environment.apiUrl}/gift-cards?clientId=${clientId}`);
  }

  debitWallet(clientId: string, amount: number, notes?: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/wallet/debit`, { clientId, amount, notes: notes || 'POS checkout debit', reference: 'POS' });
  }

  redeemLoyalty(clientId: string, points: number, description?: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/loyalty/adjust`, { clientId, points: -Math.abs(points), description: description || 'POS loyalty redemption', reference: 'POS' });
  }

  redeemGiftCard(code: string, amount: number): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/gift-cards/by-code/${code}/redeem`, { amount });
  }

  getAiRecommendations(clientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/crm-intelligence/recommendations?clientId=${clientId}`);
  }

  getCashDrawerOpen(): Observable<CashDrawerSession | null> {
    return this.http.get<CashDrawerSession | null>(`${this.baseUrl}/cash-drawer/open`);
  }

  openCashDrawer(body: any): Observable<CashDrawerSession> {
    return this.http.post<CashDrawerSession>(`${this.baseUrl}/cash-drawer/open`, body);
  }

  closeCashDrawer(id: string, body: any): Observable<CashDrawerSession> {
    return this.http.post<CashDrawerSession>(`${this.baseUrl}/cash-drawer/${id}/close`, body);
  }

  cashInOut(id: string, body: any): Observable<CashDrawerSession> {
    return this.http.post<CashDrawerSession>(`${this.baseUrl}/cash-drawer/${id}/cash-move`, body);
  }

  createClient(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/clients`, data);
  }
}
