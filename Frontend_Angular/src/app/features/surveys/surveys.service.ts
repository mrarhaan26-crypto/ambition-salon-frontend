import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SurveysService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/surveys';
  private fb = environment.apiUrl + '/feedback';

  getAll(query?: any): Observable<any[]> { return this.http.get<any[]>(this.base, { params: query }); }
  getById(id: string): Observable<any> { return this.http.get(`${this.base}/${id}`); }
  create(body: any): Observable<any> { return this.http.post(this.base, body); }
  update(id: string, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
  remove(id: string): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
  getResponses(id: string): Observable<any[]> { return this.http.get<any[]>(`${this.base}/${id}/responses`); }
  submitResponse(id: string, body: any): Observable<any> { return this.http.post(`${this.base}/${id}/responses`, body); }
  getFeedback(): Observable<any[]> { return this.http.get<any[]>(this.fb); }
  createFeedback(body: any): Observable<any> { return this.http.post(this.fb, body); }
}
