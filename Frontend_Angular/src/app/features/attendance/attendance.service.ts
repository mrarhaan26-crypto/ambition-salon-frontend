import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/attendance';

  getAll(query?: any): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl, { params: query });
  }

  getByStaff(staffId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/staff/${staffId}`);
  }

  clockIn(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/clock-in`, body);
  }

  clockOut(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/clock-out`, body);
  }

  update(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, body);
  }

  getSummary(query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/summary`, { params: query });
  }
}
