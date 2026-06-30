import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiInsightsResponse } from './ai-insights.models';

@Injectable({ providedIn: 'root' })
export class AiInsightsService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/ai-insights';

  getAll(): Observable<AiInsightsResponse> {
    return this.http.get<AiInsightsResponse>(this.baseUrl);
  }
}
