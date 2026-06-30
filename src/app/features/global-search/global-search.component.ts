import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { GlobalSearchService } from './global-search.service';
import { GlobalSearchResult } from './global-search.models';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <h1>Global Search</h1>
        <p>Search across clients, bookings, staff, and services.</p>
      </div>

      <div class="search-bar">
        <input
          #searchInput
          [(ngModel)]="query"
          (input)="onSearch(searchInput.value)"
          (keyup.escape)="clearSearch()"
          placeholder="Type to search clients, bookings, staff, services..."
          class="search-input"
          autofocus>
        <button class="clear-btn" *ngIf="query" (click)="clearSearch()" title="Clear search">&times;</button>
      </div>

      <div class="loading" *ngIf="searching">
        <div class="spinner"></div>
        <span>Searching...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Search failed.</strong>
        <p>{{ error }}</p>
      </div>

      <ng-container *ngIf="!searching && !error && query.length >= 2">
        <div class="results" *ngIf="result && result.totalCount > 0; else noResults">
          <p class="result-count">{{ result.totalCount }} result(s) for "{{ query }}"</p>

          <div class="group" *ngIf="result.results.clients.length">
            <h2>Clients ({{ result.results.clients.length }})</h2>
            <div class="result-item" *ngFor="let c of result.results.clients">
              <strong>{{ c.fullName }}</strong>
              <span>{{ c.phone || c.email || 'No contact' }} &middot; {{ c.totalVisits }} visits &middot; {{ '$' + c.totalSpend }}</span>
            </div>
          </div>

          <div class="group" *ngIf="result.results.bookings.length">
            <h2>Bookings ({{ result.results.bookings.length }})</h2>
            <div class="result-item" *ngFor="let b of result.results.bookings">
              <strong>{{ b.title }}</strong>
              <span>{{ b.startTime | date:'medium' }} &middot; {{ b.status }} &middot; {{ '$' + b.totalAmount }}</span>
              <span class="sub" *ngIf="b.client">Client: {{ b.client.fullName }}</span>
            </div>
          </div>

          <div class="group" *ngIf="result.results.staff.length">
            <h2>Staff ({{ result.results.staff.length }})</h2>
            <div class="result-item" *ngFor="let s of result.results.staff">
              <strong>{{ s.fullName }}</strong>
              <span>{{ s.role }} &middot; {{ s.email }}</span>
            </div>
          </div>

          <div class="group" *ngIf="result.results.branches.length">
            <h2>Branches ({{ result.results.branches.length }})</h2>
            <div class="result-item" *ngFor="let b of result.results.branches">
              <strong>{{ b.name }}</strong>
              <span>{{ b.city || 'No city' }}</span>
            </div>
          </div>

          <div class="group" *ngIf="result.results.waitlist.length">
            <h2>Waitlist ({{ result.results.waitlist.length }})</h2>
            <div class="result-item" *ngFor="let w of result.results.waitlist">
              <strong>{{ w.client?.fullName || 'Unknown' }}</strong>
              <span>{{ w.serviceName || 'No service' }} &middot; {{ w.status }} &middot; {{ w.requestedDate | date:'short' }}</span>
            </div>
          </div>

          <div class="group" *ngIf="result.results.walkIns.length">
            <h2>Walk-ins ({{ result.results.walkIns.length }})</h2>
            <div class="result-item" *ngFor="let w of result.results.walkIns">
              <strong>{{ w.customerName || 'Unknown' }}</strong>
              <span>{{ w.serviceName || 'No service' }} &middot; {{ w.status }} &middot; Queue #{{ w.queueNumber }}</span>
            </div>
          </div>
        </div>

        <ng-template #noResults>
          <div class="empty">
            <p>No results found for "{{ query }}". Try a different search term.</p>
          </div>
        </ng-template>
      </ng-container>

      <div class="empty initial" *ngIf="!query && !searching">
        <p>Start typing to search across the entire salon system.</p>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head h1{font-size:34px;margin:0}
    .head p{color:#6b7280;margin:6px 0 0}
    .search-bar{position:relative;display:flex;align-items:center}
    .search-input{width:100%;padding:16px 48px 16px 20px;border:2px solid #e5e7eb;border-radius:18px;font-size:16px;background:white;transition:border-color .2s}
    .search-input:focus{border-color:#0b0b0b;outline:none}
    .clear-btn{position:absolute;right:12px;background:none;border:0;font-size:24px;color:#6b7280;cursor:pointer;padding:4px 8px;line-height:1}
    .loading{display:flex;align-items:center;gap:14px;padding:32px;justify-content:center;color:#6b7280}
    .spinner{width:22px;height:22px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .results{display:grid;gap:24px}
    .result-count{font-size:14px;color:#6b7280;margin:0}
    .group h2{font-size:18px;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9}
    .result-item{padding:14px 16px;background:white;border:1px solid #e5e7eb;border-radius:14px;margin-bottom:8px;transition:box-shadow .15s}
    .result-item:hover{box-shadow:0 4px 12px rgba(0,0,0,.05)}
    .result-item strong{display:block;font-size:15px;margin-bottom:4px}
    .result-item span{display:block;font-size:13px;color:#6b7280}
    .result-item .sub{font-size:12px;color:#9ca3af;margin-top:2px}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .empty.initial{background:transparent;border-color:transparent;color:#9ca3af}
    @media(max-width:600px){.search-input{font-size:15px}}
  `]
})
export class GlobalSearchComponent {
  private api = inject(GlobalSearchService);
  private searchSubject = new Subject<string>();

  query = '';
  result: GlobalSearchResult | null = null;
  searching = false;
  error = '';

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((q: string) => {
        if (q.length < 2) {
          this.result = null;
          return of(null);
        }
        this.searching = true;
        this.error = '';
        return this.api.search(q).pipe(
          catchError((err) => {
            this.error = err.message || 'Search failed. Please try again.';
            this.searching = false;
            return of(null);
          })
        );
      })
    ).subscribe((data) => {
      if (data) {
        this.result = data;
      }
      this.searching = false;
    });
  }

  onSearch(value: string) {
    this.query = value;
    this.searchSubject.next(value);
  }

  clearSearch() {
    this.query = '';
    this.result = null;
    this.searching = false;
    this.error = '';
  }
}
