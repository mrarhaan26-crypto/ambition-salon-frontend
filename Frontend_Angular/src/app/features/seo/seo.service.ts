import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SeoPage } from './seo.models';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/seo';

  getPages(): Observable<SeoPage[]> {
    return this.http.get<SeoPage[]>(`${this.baseUrl}/pages`);
  }

  getById(id: string): Observable<SeoPage> {
    return this.http.get<SeoPage>(`${this.baseUrl}/pages/${id}`);
  }

  create(body: Partial<SeoPage>): Observable<SeoPage> {
    return this.http.post<SeoPage>(`${this.baseUrl}/pages`, body);
  }

  update(id: string, body: Partial<SeoPage>): Observable<SeoPage> {
    return this.http.patch<SeoPage>(`${this.baseUrl}/pages/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/pages/${id}`);
  }

  generateSitemap(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.baseUrl}/generate-sitemap`, {});
  }
}
