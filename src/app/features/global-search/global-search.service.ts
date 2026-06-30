import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalSearchResult } from './global-search.models';

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/global-search';

  search(query: string): Observable<GlobalSearchResult> {
    return this.http.get<GlobalSearchResult>(`${this.baseUrl}?q=${encodeURIComponent(query)}`);
  }
}
