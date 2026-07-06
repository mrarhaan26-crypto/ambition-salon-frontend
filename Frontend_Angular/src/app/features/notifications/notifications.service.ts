import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification, UnreadCount } from './notifications.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/notifications';

  getAll(params?: { read?: string; archived?: string }): Observable<Notification[]> {
    let httpParams = new HttpParams();
    if (params?.read) httpParams = httpParams.set('read', params.read);
    if (params?.archived) httpParams = httpParams.set('archived', params.archived);
    return this.http.get<Notification[]>(this.baseUrl, { params: httpParams });
  }

  getUnreadCount(): Observable<UnreadCount> {
    return this.http.get<UnreadCount>(`${this.baseUrl}/unread-count`);
  }

  markRead(id: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.baseUrl}/${id}/read`, {});
  }

  markAllRead(): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/read-all`, {});
  }

  archive(id: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.baseUrl}/${id}/archive`, {});
  }
}
