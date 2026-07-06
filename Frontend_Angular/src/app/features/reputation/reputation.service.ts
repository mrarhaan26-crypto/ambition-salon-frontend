import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReputationService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/reputation';

  getDashboard(): Observable<any> { return this.http.get(this.base); }
  getReviews(query?: any): Observable<any[]> { return this.http.get<any[]>(`${this.base}/reviews`, { params: query }); }
  getReview(id: string): Observable<any> { return this.http.get(`${this.base}/reviews/${id}`); }
  createReview(body: any): Observable<any> { return this.http.post(`${this.base}/reviews`, body); }
  updateReview(id: string, body: any): Observable<any> { return this.http.patch(`${this.base}/reviews/${id}`, body); }
  removeReview(id: string): Observable<any> { return this.http.delete(`${this.base}/reviews/${id}`); }
  getSummary(): Observable<any> { return this.http.get(`${this.base}/summary`); }
}
