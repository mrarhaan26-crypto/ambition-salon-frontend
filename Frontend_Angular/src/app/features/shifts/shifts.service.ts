import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Shift, ShiftTemplate } from './shifts.models';

@Injectable({ providedIn: 'root' })
export class ShiftsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/shifts';

  getAll(params?: { staffId?: string; from?: string; to?: string; status?: string }): Observable<Shift[]> {
    let p = new HttpParams();
    if (params) {
      if (params.staffId) p = p.set('staffId', params.staffId);
      if (params.from) p = p.set('from', params.from);
      if (params.to) p = p.set('to', params.to);
      if (params.status) p = p.set('status', params.status);
    }
    return this.http.get<Shift[]>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<Shift> {
    return this.http.get<Shift>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<Shift>): Observable<Shift> {
    return this.http.post<Shift>(this.baseUrl, body);
  }

  update(id: string, body: Partial<Shift>): Observable<Shift> {
    return this.http.patch<Shift>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getTemplates(): Observable<ShiftTemplate[]> {
    return this.http.get<ShiftTemplate[]>(`${this.baseUrl}/templates`);
  }

  createTemplate(body: Partial<ShiftTemplate>): Observable<ShiftTemplate> {
    return this.http.post<ShiftTemplate>(`${this.baseUrl}/templates`, body);
  }

  updateTemplate(id: string, body: Partial<ShiftTemplate>): Observable<ShiftTemplate> {
    return this.http.patch<ShiftTemplate>(`${this.baseUrl}/templates/${id}`, body);
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/templates/${id}`);
  }
}
