import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DataExportService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/data-export';

  getInfo(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  getModules(): Observable<any> {
    return this.http.get(`${this.baseUrl}/modules`);
  }

  runExport(module: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/run`, { module });
  }

  getHistory(): Observable<any> {
    return this.http.get(`${this.baseUrl}/history`);
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }
}
