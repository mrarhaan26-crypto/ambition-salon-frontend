import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MessageCenterService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/message-center';

  getConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/conversations`);
  }

  getConversation(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/conversations/${id}`);
  }

  sendMessage(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/messages`, body);
  }
}
