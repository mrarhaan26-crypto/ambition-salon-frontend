import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StaffWorkspaceService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/staff-workspace';

  getFull(query?: any): Observable<any> { return this.http.get(this.base, { params: query }); }
  getToday(staffId: string): Observable<any> { return this.http.get(`${this.base}/today`, { params: { staffId } }); }
  getBookings(staffId: string, date?: string): Observable<any> { const p: any = { staffId }; if (date) p.date = date; return this.http.get(`${this.base}/bookings`, { params: p }); }
  getTasks(staffId: string): Observable<any> { return this.http.get(`${this.base}/tasks`, { params: { staffId } }); }
  getCommission(staffId: string): Observable<any> { return this.http.get(`${this.base}/commission`, { params: { staffId } }); }
  getAttendance(staffId: string): Observable<any> { return this.http.get(`${this.base}/attendance`, { params: { staffId } }); }
}
