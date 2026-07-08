import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/roles';

  getAll(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<Role>): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  update(id: string, data: Partial<Role>): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getPermissionList(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/permissions/list`);
  }
}
