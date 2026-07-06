import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/settings';

  getAll(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  update(body: any): Observable<any> {
    return this.http.patch(this.baseUrl, body);
  }

  getBusiness(): Observable<any> {
    return this.http.get(`${this.baseUrl}/business`);
  }

  updateBusiness(body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/business`, body);
  }

  getBranches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/branches`);
  }

  createBranch(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/branches`, body);
  }

  updateBranch(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/branches/${id}`, body);
  }

  removeBranch(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/branches/${id}`);
  }
}
