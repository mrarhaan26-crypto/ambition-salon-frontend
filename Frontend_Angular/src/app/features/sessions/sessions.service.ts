import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/sessions';

  getAll(params?: any): Observable<any> {
    return this.http.get(this.baseUrl, { params });
  }

  revoke(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  revokeAll(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/all`);
  }
}
