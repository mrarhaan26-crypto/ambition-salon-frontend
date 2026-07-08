import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Coupon } from './coupons.models';

@Injectable({ providedIn: 'root' })
export class CouponsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/coupons';

  getAll(params?: { isActive?: boolean }): Observable<Coupon[]> {
    let p = new HttpParams();
    if (params?.isActive !== undefined) p = p.set('isActive', params.isActive);
    return this.http.get<Coupon[]>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<Coupon> {
    return this.http.get<Coupon>(`${this.baseUrl}/${id}`);
  }

  validateCode(code: string): Observable<Coupon> {
    return this.http.get<Coupon>(`${this.baseUrl}/validate/${code}`);
  }

  create(body: Partial<Coupon>): Observable<Coupon> {
    return this.http.post<Coupon>(this.baseUrl, body);
  }

  update(id: string, body: Partial<Coupon>): Observable<Coupon> {
    return this.http.patch<Coupon>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
