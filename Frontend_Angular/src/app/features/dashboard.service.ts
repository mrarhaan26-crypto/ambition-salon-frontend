import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DashboardBooking,
  DashboardStaff,
  DashboardClient,
  DashboardPayment,
  DashboardNotification,
  DashboardInventoryItem,
  DashboardReport,
} from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getBookings(): Observable<DashboardBooking[]> {
    return this.http.get<DashboardBooking[]>(`${this.baseUrl}/bookings`);
  }

  getStaff(): Observable<DashboardStaff[]> {
    return this.http.get<DashboardStaff[]>(`${this.baseUrl}/staff`);
  }

  getClients(): Observable<DashboardClient[]> {
    return this.http.get<DashboardClient[]>(`${this.baseUrl}/clients`);
  }

  getPayments(): Observable<DashboardPayment[]> {
    return this.http.get<DashboardPayment[]>(`${this.baseUrl}/payments`);
  }

  getInventory(): Observable<DashboardInventoryItem[]> {
    return this.http.get<DashboardInventoryItem[]>(`${this.baseUrl}/inventory`);
  }

  getLowStock(): Observable<DashboardInventoryItem[]> {
    return this.http.get<DashboardInventoryItem[]>(`${this.baseUrl}/inventory/low-stock`);
  }

  getAdvancedReports(): Observable<DashboardReport> {
    return this.http.get<DashboardReport>(`${this.baseUrl}/advanced-reports`);
  }

  getNotifications(params?: { read?: string; archived?: string }): Observable<DashboardNotification[]> {
    let url = `${this.baseUrl}/notifications`;
    const qp: string[] = [];
    if (params?.read !== undefined) qp.push(`read=${params.read}`);
    if (params?.archived !== undefined) qp.push(`archived=${params.archived}`);
    if (qp.length) url += '?' + qp.join('&');
    return this.http.get<DashboardNotification[]>(url);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/notifications/unread-count`);
  }

  markNotificationRead(id: string): Observable<DashboardNotification> {
    return this.http.patch<DashboardNotification>(`${this.baseUrl}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/notifications/read-all`, {});
  }

  deleteNotification(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/notifications/${id}`);
  }
}
