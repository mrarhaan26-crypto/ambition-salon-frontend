import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiInsightsResponse } from './ai-insights.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiInsightsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/ai-insights';

  getAll(): Observable<AiInsightsResponse> {
    return this.http.get<AiInsightsResponse>(this.baseUrl);
  }
}
