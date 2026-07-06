import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SalonService, ServiceCategory } from './services.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/services';

  getAll(query?: any): Observable<SalonService[]> {
    return this.http.get<SalonService[]>(this.baseUrl, { params: query });
  }

  getById(id: string): Observable<SalonService> {
    return this.http.get<SalonService>(`${this.baseUrl}/${id}`);
  }

  create(body: any): Observable<SalonService> {
    return this.http.post<SalonService>(this.baseUrl, body);
  }

  update(id: string, body: any): Observable<SalonService> {
    return this.http.patch<SalonService>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getCategories(): Observable<ServiceCategory[]> {
    return this.http.get<ServiceCategory[]>(`${this.baseUrl}/categories`);
  }

  createCategory(body: any): Observable<ServiceCategory> {
    return this.http.post<ServiceCategory>(`${this.baseUrl}/categories`, body);
  }

  updateCategory(id: string, body: any): Observable<ServiceCategory> {
    return this.http.patch<ServiceCategory>(`${this.baseUrl}/categories/${id}`, body);
  }

  removeCategory(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/categories/${id}`);
  }
}
