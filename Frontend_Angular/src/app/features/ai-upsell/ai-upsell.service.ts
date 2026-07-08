import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiUpsellService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/ai-upsell';

  getRecommendations(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/recommendations`, { params });
  }

  getPackages(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/packages`, { params });
  }

  getProductSuggestions(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/products`, { params });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`);
  }
}
