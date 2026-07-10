import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { InventoryProduct, InventoryTransaction, StockLedgerEntry, Warehouse, Supplier, PurchaseOrder, BatchInfo, StockCount } from './inventory.models';
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

  getTransactions(productId: string): Observable<InventoryTransaction[]> {
    return this.http.get<InventoryTransaction[]>(`${this.baseUrl}/${productId}/transactions`);
  }

  getStockLedger(productId: string): Observable<StockLedgerEntry[]> {
    return this.http.get<StockLedgerEntry[]>(`${this.baseUrl}/${productId}/ledger`);
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(`${environment.apiUrl}/warehouses`);
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${environment.apiUrl}/suppliers`);
  }

  getPurchaseOrders(query?: any): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${environment.apiUrl}/purchase-orders`, { params: query });
  }

  getBatches(productId: string): Observable<BatchInfo[]> {
    return this.http.get<BatchInfo[]>(`${this.baseUrl}/${productId}/batches`);
  }

  getStockCounts(query?: any): Observable<StockCount[]> {
    return this.http.get<StockCount[]>(`${environment.apiUrl}/stock-counts`, { params: query });
  }
}
