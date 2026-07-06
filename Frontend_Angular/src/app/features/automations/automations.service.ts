import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AutomationsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/automations';

  getAll(): Observable<any[]> { return this.http.get<any[]>(this.baseUrl); }
  getById(id: string): Observable<any> { return this.http.get(`${this.baseUrl}/${id}`); }
  create(body: any): Observable<any> { return this.http.post(this.baseUrl, body); }
  update(id: string, body: any): Observable<any> { return this.http.patch(`${this.baseUrl}/${id}`, body); }
  remove(id: string): Observable<any> { return this.http.delete(`${this.baseUrl}/${id}`); }
  enable(id: string): Observable<any> { return this.http.post(`${this.baseUrl}/${id}/enable`, {}); }
  disable(id: string): Observable<any> { return this.http.post(`${this.baseUrl}/${id}/disable`, {}); }
  getEvents(): Observable<any[]> { return this.http.get<any[]>(`${this.baseUrl}/events`); }
}
