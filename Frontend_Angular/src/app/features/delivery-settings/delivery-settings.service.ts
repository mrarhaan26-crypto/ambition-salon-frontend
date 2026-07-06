import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DeliverySettingsService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/delivery-settings';

  getSettings(): Observable<any> { return this.http.get(this.base); }
  updateSettings(body: any): Observable<any> { return this.http.patch(this.base, body); }
  getLogs(query?: any): Observable<any[]> { return this.http.get<any[]>(`${this.base}/logs`, { params: query }); }
  testDelivery(body: any): Observable<any> { return this.http.post(`${this.base}/test`, body); }
}
