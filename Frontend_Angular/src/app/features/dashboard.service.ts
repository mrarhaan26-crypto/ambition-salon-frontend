import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bookings`);
  }

  getStaff(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/staff`);
  }

  getClients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/clients`);
  }

  getPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/payments`);
  }

  getInventory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/inventory`);
  }

  getLowStock(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/inventory/low-stock`);
  }

  getAdvancedReports(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/advanced-reports`);
  }

  getNotifications(params?: { read?: string; archived?: string }): Observable<any[]> {
    let url = `${this.baseUrl}/notifications`;
    const qp: string[] = [];
    if (params?.read !== undefined) qp.push(`read=${params.read}`);
    if (params?.archived !== undefined) qp.push(`archived=${params.archived}`);
    if (qp.length) url += '?' + qp.join('&');
    return this.http.get<any[]>(url);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/notifications/unread-count`);
  }

  markNotificationRead(id: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/notifications/read-all`, {});
  }

  deleteNotification(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/notifications/${id}`);
  }
}
