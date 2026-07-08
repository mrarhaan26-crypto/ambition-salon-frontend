import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessage, ChatConversation } from './chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/chat';

  getConversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(`${this.baseUrl}/conversations`);
  }

  getMessages(conversationId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.baseUrl}/conversations/${conversationId}/messages`);
  }

  sendMessage(conversationId: string, message: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.baseUrl}/conversations/${conversationId}/messages`, { message });
  }

  startConversation(participantIds: string[]): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(`${this.baseUrl}/conversations`, { participantIds });
  }

  markRead(conversationId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/conversations/${conversationId}/read`, {});
  }

  getUnreadCount(): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${this.baseUrl}/unread`);
  }
}
