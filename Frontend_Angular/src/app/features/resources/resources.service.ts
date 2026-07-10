import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export const RESOURCE_TYPES = [
  'CHAIR', 'ROOM', 'EQUIPMENT', 'STATION', 'MACHINE', 'SPA_ROOM', 'VIP_ROOM', 'MIRROR', 'WASH_STATION',
];

export const RESOURCE_STATUSES = ['ACTIVE', 'MAINTENANCE', 'BLOCKED'];

@Injectable({ providedIn: 'root' })
export class ResourcesService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/resources';

  getAll(query?: any): Observable<any[]> { return this.http.get<any[]>(this.base, { params: query }); }
  getById(id: string): Observable<any> { return this.http.get(`${this.base}/${id}`); }
  create(body: any): Observable<any> { return this.http.post(this.base, body); }
  update(id: string, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
  remove(id: string): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
  setStatus(id: string, status: string): Observable<any> { return this.http.patch(`${this.base}/${id}/status`, { status }); }
  getAvailability(query?: any): Observable<any> { return this.http.get(`${this.base}/availability`, { params: query }); }
  getConflicts(query?: any): Observable<any> { return this.http.get(`${this.base}/conflicts`, { params: query }); }
  getStatistics(query?: any): Observable<any> { return this.http.get(`${this.base}/statistics`, { params: query }); }
  getUtilization(query?: any): Observable<any> { return this.http.get(`${this.base}/utilization`, { params: query }); }
  getTimeline(query?: any): Observable<any> { return this.http.get(`${this.base}/timeline`, { params: query }); }
  autoAssign(body: any): Observable<any> { return this.http.post(`${this.base}/auto-assign`, body); }
}
