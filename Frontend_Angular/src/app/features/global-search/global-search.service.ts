import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalSearchResult } from './global-search.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/global-search';

  search(query: string): Observable<GlobalSearchResult> {
    return this.http.get<GlobalSearchResult>(`${this.baseUrl}?q=${encodeURIComponent(query)}`);
  }
}
