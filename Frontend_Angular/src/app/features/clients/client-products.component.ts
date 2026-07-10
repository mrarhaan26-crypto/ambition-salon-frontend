import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-client-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cpr-container" role="region" aria-label="Product Purchases">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading purchases…</p></div>
      <div *ngIf="error()" class="state-box error">⚠️ <p>{{ error() }}</p></div>
      <ng-container *ngIf="!loading() && !error()">
        <div class="cpr-header"><h3>Retail Purchases</h3><span class="cpr-count">{{ products().length }} items</span></div>
        <div *ngIf="products().length === 0" class="empty-state">No retail purchases found</div>
        <div class="cpr-card" *ngFor="let p of products(); trackBy: trackById">
          <div class="cpr-name">{{ p.name }}</div>
          <div class="cpr-meta">Qty: {{ p.quantity }} · ₹{{ p.totalAmount }} · {{ p.date | date:'mediumDate' }}</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cpr-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .cpr-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .cpr-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cpr-count{font-size:12px;color:var(--text-soft,#64748b)}
    .cpr-card{padding:12px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;margin-bottom:6px}
    .cpr-name{font-size:14px;font-weight:600;color:var(--text-strong,#111827)}
    .cpr-meta{font-size:12px;color:var(--text-soft,#64748b);margin-top:2px}
  `]
})
export class ClientProductsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();
  readonly products = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  trackById(_i: number, item: any): string { return item.id || item.name; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    this.http.get<any[]>(`${environment.apiUrl}/pos/sales?clientId=${clientId}`).pipe(
      catchError(err => { this.error.set('Product history not available yet'); this.loading.set(false); return of([]); }),
      takeUntil(this.destroy$)
    ).subscribe((sales: any) => {
      const items = Array.isArray(sales) ? sales : [];
      this.products.set(items.map((s: any) => ({
        id: s.id, name: s.description || s.title || 'Product', quantity: s.quantity || 1,
        totalAmount: s.totalAmount || s.amount || 0, date: s.createdAt || s.date || new Date().toISOString()
      })));
      this.loading.set(false);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
