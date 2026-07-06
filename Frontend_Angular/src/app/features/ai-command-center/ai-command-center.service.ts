import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommandCenterDashboard, CapacityForecast, StaffPerformance, RecommendationsResponse } from './ai-command-center.models';

@Injectable({ providedIn: 'root' })
export class AiCommandCenterService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/ai-command-center';

  getDashboard() {
    return this.http.get<CommandCenterDashboard>(`${this.baseUrl}/dashboard`);
  }

  getCapacityForecast(days = 7) {
    return this.http.get<CapacityForecast>(`${this.baseUrl}/capacity-forecast?days=${days}`);
  }

  getStaffPerformance() {
    return this.http.get<StaffPerformance>(`${this.baseUrl}/staff-performance`);
  }

  getRecommendations() {
    return this.http.get<RecommendationsResponse>(`${this.baseUrl}/recommendations`);
  }
}
