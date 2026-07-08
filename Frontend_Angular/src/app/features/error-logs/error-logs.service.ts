import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ErrorLogsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/error-logs';

  getAll(params?: any): Observable<any> {
    return this.http.get(this.baseUrl, { params });
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  getSummary(): Observable<any> {
    return this.http.get(`${this.baseUrl}/summary`);
  }

  resolve(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/resolve`, {});
  }

  clearAll(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/all`);
  }
}
