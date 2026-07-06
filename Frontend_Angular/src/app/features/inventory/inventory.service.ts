import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryProduct, InventoryTransaction } from './inventory.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/inventory';

  getAll(query?: any): Observable<InventoryProduct[]> {
    return this.http.get<InventoryProduct[]>(this.baseUrl, { params: query });
  }

  getById(id: string): Observable<InventoryProduct> {
    return this.http.get<InventoryProduct>(`${this.baseUrl}/${id}`);
  }

  create(body: any): Observable<InventoryProduct> {
    return this.http.post<InventoryProduct>(this.baseUrl, body);
  }

  update(id: string, body: any): Observable<InventoryProduct> {
    return this.http.patch<InventoryProduct>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getLowStock(query?: any): Observable<InventoryProduct[]> {
    return this.http.get<InventoryProduct[]>(`${this.baseUrl}/low-stock`, { params: query });
  }

  adjustStock(id: string, body: any): Observable<InventoryProduct> {
    return this.http.post<InventoryProduct>(`${this.baseUrl}/${id}/adjust-stock`, body);
  }
}
