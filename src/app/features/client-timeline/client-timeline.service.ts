import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClientTimelineService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  getClients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/clients`);
  }

  getTimeline(clientId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/clients/${clientId}/timeline`);
  }

  getClientNotes(clientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/clients/${clientId}/notes`);
  }

  createNote(clientId: string, body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/clients/${clientId}/notes`, body);
  }

  updateNote(clientId: string, noteId: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/clients/${clientId}/notes/${noteId}`, body);
  }

  removeNote(clientId: string, noteId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/clients/${clientId}/notes/${noteId}`);
  }
}
