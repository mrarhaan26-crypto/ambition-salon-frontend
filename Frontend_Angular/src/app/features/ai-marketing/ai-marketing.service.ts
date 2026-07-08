import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiMarketingService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/ai-marketing';

  getCampaigns(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/campaigns`, { params });
  }

  getAudienceSegments(): Observable<any> {
    return this.http.get(`${this.baseUrl}/audience-segments`);
  }

  getChannelPerformance(): Observable<any> {
    return this.http.get(`${this.baseUrl}/channel-performance`);
  }

  getContentSuggestions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/content-suggestions`);
  }
}
