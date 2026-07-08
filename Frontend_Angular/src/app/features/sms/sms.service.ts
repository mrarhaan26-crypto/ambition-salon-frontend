import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SmsProvider } from './sms.models';

@Injectable({ providedIn: 'root' })
export class SmsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/sms';

  getProviders(): Observable<SmsProvider[]> {
    return this.http.get<SmsProvider[]>(`${this.baseUrl}/providers`);
  }

  getById(id: string): Observable<SmsProvider> {
    return this.http.get<SmsProvider>(`${this.baseUrl}/providers/${id}`);
  }

  create(body: Partial<SmsProvider>): Observable<SmsProvider> {
    return this.http.post<SmsProvider>(`${this.baseUrl}/providers`, body);
  }

  update(id: string, body: Partial<SmsProvider>): Observable<SmsProvider> {
    return this.http.patch<SmsProvider>(`${this.baseUrl}/providers/${id}`, body);
  }

  setDefault(id: string): Observable<SmsProvider> {
    return this.http.post<SmsProvider>(`${this.baseUrl}/providers/${id}/default`, {});
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/providers/${id}`);
  }

  sendTest(to: string, message: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/test`, { to, message });
  }
}
