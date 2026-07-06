import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PackagesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getAll(query?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/packages`, { params: query });
  }

  get(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/packages/${id}`);
  }

  create(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/packages`, body);
  }

  update(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/packages/${id}`, body);
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/packages/${id}`);
  }
}
