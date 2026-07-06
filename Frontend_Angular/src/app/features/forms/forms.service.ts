import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FormsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getAll(query?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/forms`, { params: query });
  }

  get(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/forms/${id}`);
  }

  create(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/forms`, body);
  }

  update(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/forms/${id}`, body);
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/forms/${id}`);
  }
}
