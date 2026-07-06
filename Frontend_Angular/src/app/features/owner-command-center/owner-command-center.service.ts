import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OwnerCommandCenterService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/owner-command-center';

  getDashboard(): Observable<any> { return this.http.get(this.base); }
  getHealth(): Observable<any> { return this.http.get(`${this.base}/health`); }
  getActions(): Observable<any> { return this.http.get(`${this.base}/actions`); }
  createAction(body: any): Observable<any> { return this.http.post(`${this.base}/actions`, body); }
}
