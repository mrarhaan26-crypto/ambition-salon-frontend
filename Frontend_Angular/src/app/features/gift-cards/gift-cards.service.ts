import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GiftCardsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getAll(query?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/gift-cards`, { params: query });
  }

  get(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/gift-cards/${id}`);
  }

  create(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/gift-cards`, body);
  }

  update(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/gift-cards/${id}`, body);
  }
}
