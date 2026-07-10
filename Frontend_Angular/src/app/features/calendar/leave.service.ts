import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { StaffLeave, LeaveStats, CreateLeavePayload, LeaveQueryParams } from './leave.models';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/leaves';

  getAll(query?: LeaveQueryParams): Observable<StaffLeave[]> {
    return this.http.get<StaffLeave[]>(this.baseUrl, { params: query as any });
  }

  getById(id: string): Observable<StaffLeave> {
    return this.http.get<StaffLeave>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateLeavePayload): Observable<StaffLeave> {
    return this.http.post<StaffLeave>(this.baseUrl, dto);
  }

  update(id: string, dto: Partial<CreateLeavePayload>): Observable<StaffLeave> {
    return this.http.patch<StaffLeave>(`${this.baseUrl}/${id}`, dto);
  }

  approve(id: string, notes?: string): Observable<StaffLeave> {
    return this.http.patch<StaffLeave>(`${this.baseUrl}/${id}/approve`, { notes });
  }

  reject(id: string, rejectReason: string, notes?: string): Observable<StaffLeave> {
    return this.http.patch<StaffLeave>(`${this.baseUrl}/${id}/reject`, { rejectReason, notes });
  }

  cancel(id: string): Observable<StaffLeave> {
    return this.http.patch<StaffLeave>(`${this.baseUrl}/${id}/cancel`, {});
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getStats(staffId: string): Observable<LeaveStats> {
    return this.http.get<LeaveStats>(`${this.baseUrl}/stats/${staffId}`);
  }

  getTodayLeaves(branchId?: string): Observable<StaffLeave[]> {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    return this.http.get<StaffLeave[]>(`${this.baseUrl}/today`, { params });
  }
}
