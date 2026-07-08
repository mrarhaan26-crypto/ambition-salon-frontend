import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiSchedulingService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/ai-scheduling';

  getOptimization(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/optimization`, { params });
  }

  getPeakTimes(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/peak-times`, { params });
  }

  getStaffAllocation(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/staff-allocation`, { params });
  }

  getSuggestions(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/suggestions`, { params });
  }

  applySuggestion(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/suggestions/${id}/apply`, {});
  }
}
