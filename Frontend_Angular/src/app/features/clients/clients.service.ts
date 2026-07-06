import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client, ClientBookingSummary, ClientFormSubmission, PaginatedClientsResponse } from './client.model';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/clients';
  private bookingApiUrl = 'http://localhost:3000/api/bookings';

  getClients(params?: { search?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string }): Observable<PaginatedClientsResponse> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      map((res) => {
        if (Array.isArray(res)) {
          const arr = res as Client[];
          return { items: arr, total: arr.length, page: 1, limit: arr.length, totalPages: Math.max(1, arr.length) };
        }
        return res as PaginatedClientsResponse;
      }),
    );
  }

  getClient(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  getClientForms(clientId: string): Observable<ClientFormSubmission[]> {
    return this.http.get<ClientFormSubmission[]>(`${this.apiUrl}/${clientId}/forms`);
  }

  getClientBookings(clientId: string): Observable<ClientBookingSummary[]> {
    let params = new HttpParams().set('clientId', clientId);
    return this.http.get<ClientBookingSummary[]>(this.bookingApiUrl, { params });
  }

  createClient(data: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, data);
  }

  updateClient(id: string, data: Partial<Client>): Observable<Client> {
    return this.http.patch<Client>(`${this.apiUrl}/${id}`, data);
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
