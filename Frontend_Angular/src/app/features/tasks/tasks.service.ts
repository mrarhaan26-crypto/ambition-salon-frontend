import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/tasks';

  getAll(query?: any): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl, { params: query });
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  create(body: any): Observable<any> {
    return this.http.post(this.baseUrl, body);
  }

  update(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  complete(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/complete`, {});
  }

  getMyTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/my`);
  }

  getOverdue(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/overdue`);
  }
}
