import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/marketing';

  getDashboard(query?: any): Observable<any> {
    return this.http.get(this.baseUrl, { params: query });
  }

  getCampaigns(query?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/campaigns`, { params: query });
  }

  getCampaign(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/campaigns/${id}`);
  }

  createCampaign(body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/campaigns`, body);
  }

  updateCampaign(id: string, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/campaigns/${id}`, body);
  }

  removeCampaign(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/campaigns/${id}`);
  }

  getAudience(): Observable<any> {
    return this.http.get(`${this.baseUrl}/audience`);
  }

  getTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/templates`);
  }
}
