import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/branches';

  getAll(query?: any): Observable<any> {
    return this.http.get(this.baseUrl, { params: query });
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  getOverview(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/overview`);
  }

  getStaff(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/staff`);
  }

  getServices(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/services`);
  }

  getBookings(id: string, query?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/bookings`, { params: query });
  }

  getInventory(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/inventory`);
  }
}
