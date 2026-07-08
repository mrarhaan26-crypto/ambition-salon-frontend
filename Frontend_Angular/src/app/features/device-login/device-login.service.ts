import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DeviceLoginService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/devices';

  getAll(params?: any): Observable<any> {
    return this.http.get(this.baseUrl, { params });
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  trust(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/trust`, {});
  }

  untrust(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/untrust`, {});
  }
}
