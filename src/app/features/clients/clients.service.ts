import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client } from './client.model';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/clients';

  getClients(search = '') {
    return this.http.get<Client[]>(`${this.apiUrl}?search=${search}`);
  }

  createClient(data: Partial<Client>) {
    return this.http.post<Client>(this.apiUrl, data);
  }

  updateClient(id: string, data: Partial<Client>) {
    return this.http.patch<Client>(`${this.apiUrl}/${id}`, data);
  }

  deleteClient(id: string) {
    return this.http.delete<Client>(`${this.apiUrl}/${id}`);
  }
}
