import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/backup';

  getAll(params?: any): Observable<any> {
    return this.http.get(this.baseUrl, { params });
  }

  create(data: { type: string; description?: string }): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  restore(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/restore`, {});
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  download(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/download`, { responseType: 'blob' });
  }

  getSettings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/settings`);
  }

  updateSettings(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/settings`, data);
  }
}
