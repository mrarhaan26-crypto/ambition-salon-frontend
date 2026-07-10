import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Staff } from './staff.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/staff';

  getAll(query?: any): Observable<Staff[]> {
    return this.http.get<Staff[]>(this.baseUrl, { params: query });
  }

  getById(id: string): Observable<Staff> {
    return this.http.get<Staff>(`${this.baseUrl}/${id}`);
  }

  create(body: any): Observable<Staff> {
    return this.http.post<Staff>(this.baseUrl, body);
  }

  update(id: string, body: any): Observable<Staff> {
    return this.http.patch<Staff>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getPerformance(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/performance`);
  }

  getSchedule(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/schedule`);
  }

  updateSchedule(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/schedule`, body);
  }

  getBookings(id: string, query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/bookings`, { params: query });
  }

  getWorkspace(id: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/staff-workspace?id=${id}`);
  }

  getWorkspaceToday(id: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/staff-workspace/today`, { params: { staffId: id } });
  }

  getWorkspaceBookings(staffId: string, date?: string): Observable<any> {
    const params: any = { staffId };
    if (date) params.date = date;
    return this.http.get(`${environment.apiUrl}/staff-workspace/bookings`, { params });
  }

  getWorkspaceTasks(staffId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/staff-workspace/tasks`, { params: { staffId } });
  }

  getWorkspaceCommission(staffId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/staff-workspace/commission`, { params: { staffId } });
  }

  getWorkspaceAttendance(staffId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/staff-workspace/attendance`, { params: { staffId } });
  }
}
