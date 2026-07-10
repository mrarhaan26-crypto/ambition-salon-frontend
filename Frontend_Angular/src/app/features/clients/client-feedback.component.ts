import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-client-feedback',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cfb-container" role="region" aria-label="Feedback">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading feedback…</p></div>
      <ng-container *ngIf="!loading()">
        <div class="cfb-header"><h3>Feedback & Reviews</h3><span class="cfb-count">{{ feedback().length }} entries</span></div>
        <div *ngIf="feedback().length === 0" class="empty-state">No feedback yet</div>
        <div class="cfb-card" *ngFor="let f of feedback(); trackBy: trackById">
          <div class="cfb-rating">⭐ {{ f.rating }}/5</div>
          <div class="cfb-meta">{{ f.source || 'In-person' }} · {{ f.createdAt | date:'mediumDate' }}</div>
          <div class="cfb-comment" *ngIf="f.comment || f.message">"{{ f.comment || f.message }}"</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cfb-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .cfb-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .cfb-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cfb-count{font-size:12px;color:var(--text-soft,#64748b)}
    .cfb-card{padding:12px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;margin-bottom:6px}
    .cfb-rating{font-size:14px;font-weight:700;color:var(--text-strong,#111827);margin-bottom:2px}
    .cfb-meta{font-size:12px;color:var(--text-soft,#64748b)}
    .cfb-comment{font-size:13px;color:var(--text-strong,#111827);margin-top:4px;font-style:italic;padding:6px;background:var(--surface-muted,#f9fafb);border-radius:6px}
  `]
})
export class ClientFeedbackComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();
  readonly feedback = signal<any[]>([]);
  readonly loading = signal(true);
  trackById(_i: number, item: any): string { return item.id; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    this.http.get(`${environment.apiUrl}/feedback?clientId=${clientId}`).pipe(
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).subscribe((res: any) => {
      this.feedback.set(Array.isArray(res) ? res : []);
      this.loading.set(false);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
