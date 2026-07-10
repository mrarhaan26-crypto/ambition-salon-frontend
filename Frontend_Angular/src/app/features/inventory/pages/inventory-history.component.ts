import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryDetailStateService } from '../inventory-detail-state.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-inventory-history',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ih-container">
      <div *ngIf="loading()" class="ih-state loading"><div class="spinner"></div><p>Loading history…</p></div>
      <div *ngIf="error()" class="ih-state error"><span class="state-icon">⚠️</span><p>{{ error() }}</p></div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="ih-empty" *ngIf="activities().length === 0">
          <strong>No activity yet.</strong>
          <p>Product history will appear here as changes are made.</p>
        </div>

        <div class="ih-timeline" *ngIf="activities().length > 0">
          <div class="ih-entry" *ngFor="let a of activities()">
            <div class="ih-dot"></div>
            <div class="ih-content">
              <strong>{{ a.title }}</strong>
              <p>{{ a.message }}</p>
              <span class="ih-date">{{ a.createdAt | date:'MMM dd, yyyy h:mm a' }}</span>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .ih-container{padding:0 4px;max-width:960px}
    .ih-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .ih-state.loading{display:flex;align-items:center;justify-content:center;gap:12px;color:var(--text-soft,#64748b)}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:#84cc16;border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .ih-empty{padding:40px 20px;text-align:center;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;color:var(--text-soft,#64748b)}
    .ih-empty strong{display:block;color:var(--text-strong,#111827);margin-bottom:4px}
    .ih-timeline{position:relative;padding-left:28px}
    .ih-timeline::before{content:'';position:absolute;left:10px;top:4px;bottom:4px;width:2px;background:var(--border-subtle,#e5e7eb)}
    .ih-entry{position:relative;padding:0 0 20px 16px}
    .ih-dot{position:absolute;left:-24px;top:6px;width:12px;height:12px;border-radius:50%;background:#84cc16;border:2px solid var(--surface-card,#fff)}
    .ih-content{background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;padding:12px 14px}
    .ih-content strong{display:block;font-size:13px;color:var(--text-strong,#111827);margin-bottom:2px}
    .ih-content p{margin:0;font-size:12px;color:var(--text-soft,#64748b);line-height:1.4}
    .ih-date{display:block;font-size:11px;color:var(--text-soft,#64748b);margin-top:6px}
  `]
})
export class InventoryHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private notificationsApi = inject(NotificationsService);
  state = inject(InventoryDetailStateService);

  loading = signal(true);
  error = signal('');
  activities = signal<any[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.notificationsApi.getAll().pipe(catchError(err => {
        this.error.set('Activity history unavailable.');
        this.loading.set(false);
        return of([]);
      })).subscribe(list => {
        const items = Array.isArray(list)
          ? list.filter((n: any) => n.title?.toLowerCase().includes('stock') || n.title?.toLowerCase().includes('inventory') || n.title?.toLowerCase().includes('product') || n.message?.toLowerCase().includes('stock'))
          : [];
        this.activities.set(items);
        this.loading.set(false);
      });
    }
  }
}
