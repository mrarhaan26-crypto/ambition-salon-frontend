import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CommissionsService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/commissions';

  getAll(query?: any): Observable<any> {
    return this.http.get(this.baseUrl, { params: query });
  }

  getByStaff(staffId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/staff/${staffId}`);
  }

  getSummary(): Observable<any> {
    return this.http.get(`${this.baseUrl}/summary`);
  }

  getRules(): Observable<any> {
    return this.http.get(`${this.baseUrl}/rules`);
  }

  createRule(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/rules`, body);
  }

  updateRule(id: string, body: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/rules/${id}`, body);
  }

  deleteRule(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/rules/${id}`);
  }
}
