import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OwnerCommandCenterService {
  private http = inject(HttpClient);
  private base = 'http://localhost:3000/api/owner-command-center';

  getDashboard(): Observable<any> { return this.http.get(this.base); }
  getHealth(): Observable<any> { return this.http.get(`${this.base}/health`); }
  getActions(): Observable<any> { return this.http.get(`${this.base}/actions`); }
  createAction(body: any): Observable<any> { return this.http.post(`${this.base}/actions`, body); }
}
