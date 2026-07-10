import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-staff-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sh-container" role="region" aria-label="Staff History">
      <div *ngIf="loading()" class="sh-state loading" role="status">
        <div class="spinner"></div><p>Loading activity timeline…</p>
      </div>
      <div *ngIf="error()" class="sh-state error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="sh-empty" *ngIf="activities().length === 0">
          <p>No activity records found.</p>
        </div>

        <div class="sh-timeline" *ngIf="activities().length > 0">
          <div class="sh-item" *ngFor="let a of activities()">
            <div class="sh-dot"></div>
            <div class="sh-content">
              <div class="sh-head">
                <strong>{{ a.title || a.type || 'Activity' }}</strong>
                <span class="sh-date">{{ a.createdAt | date:'medium' }}</span>
              </div>
              <p *ngIf="a.message || a.description">{{ a.message || a.description }}</p>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .sh-container{padding:0 4px;max-width:960px}
    .sh-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sh-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .sh-empty{padding:40px 20px;text-align:center;color:var(--text-soft,#64748b);background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .sh-timeline{position:relative;padding-left:24px}
    .sh-timeline::before{content:'';position:absolute;left:8px;top:0;bottom:0;width:2px;background:var(--border-subtle,#e5e7eb)}
    .sh-item{position:relative;padding:0 0 20px 16px}
    .sh-dot{position:absolute;left:-20px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--accent,#6366f1);border:2px solid var(--surface-card,#fff)}
    .sh-content{padding:12px 14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px}
    .sh-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:4px}
    .sh-head strong{font-size:13px;color:var(--text-strong,#111827)}
    .sh-date{font-size:11px;color:var(--text-soft,#64748b)}
    .sh-content p{margin:0;font-size:12px;color:var(--text-soft,#64748b)}
  `]
})
export class StaffHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private notificationsApi = inject(NotificationsService);
  state = inject(StaffDetailStateService);
  loading = signal(true);
  error = signal('');
  activities = signal<any[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.notificationsApi.getAll({}).pipe(
        catchError(() => { this.error.set('Activity history unavailable'); this.loading.set(false); return of([]); })
      ).subscribe(d => {
        this.activities.set(Array.isArray(d) ? d : []);
        this.loading.set(false);
      });
    }
  }
}
