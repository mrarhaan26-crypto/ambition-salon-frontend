import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CrmIntelligenceService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/crm-intelligence';

  getDashboard(): Observable<any> { return this.http.get(this.base); }
  getSegments(): Observable<any> { return this.http.get(`${this.base}/segments`); }
  getVips(): Observable<any> { return this.http.get(`${this.base}/vips`); }
  getInactive(): Observable<any> { return this.http.get(`${this.base}/inactive`); }
  getBirthdays(): Observable<any> { return this.http.get(`${this.base}/birthdays`); }
  getRecommendations(): Observable<any> { return this.http.get(`${this.base}/recommendations`); }
}
