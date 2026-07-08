import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WaitingEntry } from './waiting-list.models';

@Injectable({ providedIn: 'root' })
export class WaitingListService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/waiting-list';

  getAll(params?: { status?: string }): Observable<WaitingEntry[]> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    return this.http.get<WaitingEntry[]>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<WaitingEntry> {
    return this.http.get<WaitingEntry>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<WaitingEntry>): Observable<WaitingEntry> {
    return this.http.post<WaitingEntry>(this.baseUrl, body);
  }

  markCalled(id: string): Observable<WaitingEntry> {
    return this.http.post<WaitingEntry>(`${this.baseUrl}/${id}/called`, {});
  }

  markServed(id: string): Observable<WaitingEntry> {
    return this.http.post<WaitingEntry>(`${this.baseUrl}/${id}/served`, {});
  }

  cancel(id: string): Observable<WaitingEntry> {
    return this.http.post<WaitingEntry>(`${this.baseUrl}/${id}/cancel`, {});
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
