import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { Notification } from './notifications.models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Notifications</h1>
          <p>Stay updated with alerts and system notifications.</p>
        </div>
        <div class="head-actions">
          <span class="unread-badge" *ngIf="unreadCount > 0">{{ unreadCount }} unread</span>
          <button class="btn-outline" (click)="markAllRead()" [disabled]="loading || unreadCount === 0">Mark All Read</button>
          <button class="refresh-btn" (click)="loadAll()" [disabled]="loading">Refresh</button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading notifications...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load notifications.</strong>
        <p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="notif-list" *ngIf="notifications.length > 0; else emptyState">
          <div class="notif-item" *ngFor="let n of notifications" [class.unread]="!n.read" [class.archived]="n.archived">
            <div class="notif-header">
              <span class="notif-type" [class]="'type-' + n.type.toLowerCase()">{{ n.type }}</span>
              <span class="notif-priority" [class]="'priority-' + n.priority.toLowerCase()">{{ n.priority }}</span>
              <span class="notif-time">{{ n.createdAt | date:'short' }}</span>
            </div>
            <strong class="notif-title">{{ n.title }}</strong>
            <p class="notif-msg">{{ n.message }}</p>
            <div class="notif-actions" *ngIf="!n.archived">
              <button *ngIf="!n.read" class="action-btn" (click)="markRead(n)">Mark Read</button>
              <button class="action-btn archive" (click)="archive(n)">Archive</button>
            </div>
            <span class="archived-label" *ngIf="n.archived">Archived</span>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="empty">
            <p>No notifications yet. New alerts will appear here.</p>
          </div>
        </ng-template>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .head-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .unread-badge{background:#0b0b0b;color:white;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:800}
    .btn-outline{border:1px solid #e5e7eb;background:white;border-radius:14px;padding:10px 16px;font-weight:800;cursor:pointer}
    .btn-outline:disabled{opacity:.4;cursor:default}
    .refresh-btn{border:0;border-radius:14px;padding:10px 16px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .refresh-btn:disabled{opacity:.5;cursor:default}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .notif-list{display:grid;gap:12px}
    .notif-item{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:20px;box-shadow:0 8px 25px rgba(15,23,42,.04);transition:opacity .2s}
    .notif-item.unread{border-left:4px solid #0b0b0b;background:#fafafa}
    .notif-item.archived{opacity:.55}
    .notif-header{display:flex;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
    .notif-type{font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px;text-transform:uppercase}
    .type-booking{background:#eff6ff;color:#2563eb}
    .type-waitlist{background:#fffbeb;color:#d97706}
    .type-walk_in{background:#f0fdf4;color:#16a34a}
    .type-ai_alert{background:#f0f0ff;color:#7c3aed}
    .type-staff_alert{background:#fef2f2;color:#dc2626}
    .type-system_alert{background:#f3f4f6;color:#6b7280}
    .notif-priority{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase}
    .priority-critical{background:#fef2f2;color:#dc2626}
    .priority-high{background:#fffbeb;color:#d97706}
    .priority-medium{background:#eff6ff;color:#2563eb}
    .priority-low{background:#f3f4f6;color:#6b7280}
    .notif-time{font-size:12px;color:#6b7280;margin-left:auto}
    .notif-title{display:block;font-size:16px;margin-bottom:4px}
    .notif-msg{margin:4px 0 0;color:#6b7280;font-size:14px}
    .notif-actions{display:flex;gap:8px;margin-top:12px}
    .action-btn{border:1px solid #e5e7eb;background:white;border-radius:10px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer}
    .action-btn:hover{background:#f8f8f8}
    .action-btn.archive{color:#6b7280}
    .archived-label{display:inline-block;margin-top:8px;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    @media(max-width:600px){.head{flex-direction:column;align-items:flex-start}}
  `]
})
export class NotificationsComponent {
  private api = inject(NotificationsService);

  notifications: Notification[] = [];
  unreadCount = 0;
  loading = true;
  error = '';

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.error = '';
    this.api.getAll().subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadCount = data.filter(n => !n.read).length;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Notifications data unavailable. Please try again.';
        this.loading = false;
      }
    });
  }

  markRead(n: Notification) {
    this.api.markRead(n.id).subscribe({
      next: () => {
        n.read = true;
        n.readAt = new Date().toISOString();
        this.unreadCount = this.notifications.filter(x => !x.read).length;
      }
    });
  }

  markAllRead() {
    this.api.markAllRead().subscribe({
      next: () => {
        this.notifications.forEach(n => { n.read = true; n.readAt = new Date().toISOString(); });
        this.unreadCount = 0;
      }
    });
  }

  archive(n: Notification) {
    this.api.archive(n.id).subscribe({
      next: () => {
        n.archived = true;
      }
    });
  }
}
