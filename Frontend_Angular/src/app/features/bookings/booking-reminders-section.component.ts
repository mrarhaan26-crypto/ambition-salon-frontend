import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BookingDetailStateService } from './booking-detail-state.service';
import { NotificationsService } from '../../features/notifications/notifications.service';
import { environment } from '../../../environments/environment';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import type { Notification } from '../../features/notifications/notifications.models';

interface ReminderRecord {
  id: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'IN_APP';
  recipient: string;
  status: 'scheduled' | 'queued' | 'sending' | 'sent' | 'failed' | 'retry' | 'cancelled';
  templateName?: string;
  message: string;
  scheduledAt: string;
  sentAt?: string;
  failureReason?: string;
}

@Component({
  selector: 'app-booking-reminders-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reminders-section" role="region" aria-label="Booking reminders">
      <header class="section-header">
        <div class="header-top">
          <h3 class="header-title">Reminders & Notifications</h3>
          <button class="send-btn" (click)="sendReminder()" [disabled]="sending()">
            <span aria-hidden="true">🔔</span> {{ sending() ? 'Sending…' : 'Send Reminder' }}
          </button>
        </div>
        <p class="header-subtitle">WhatsApp, email, SMS, and in-app reminders for this booking</p>
      </header>

      <div *ngIf="sendingError()" class="alert error" role="alert">
        <span aria-hidden="true">⚠️</span> {{ sendingError() }}
        <button class="alert-dismiss" (click)="sendingError.set(null)" aria-label="Dismiss">✕</button>
      </div>

      <div *ngIf="sendSuccess()" class="alert success" role="status">
        <span aria-hidden="true">✓</span> {{ sendSuccess() }}
        <button class="alert-dismiss" (click)="sendSuccess.set(null)" aria-label="Dismiss">✕</button>
      </div>

      <div *ngIf="loading()" class="state-box loading" role="status">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading reminders…</p>
      </div>

      <div *ngIf="error()" class="state-box error" role="alert">
        <span class="state-icon" aria-hidden="true">⚠️</span>
        <p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="channel-grid">
          <div class="channel-card" *ngFor="let ch of channels">
            <span class="channel-icon" aria-hidden="true">{{ ch.icon }}</span>
            <span class="channel-name">{{ ch.name }}</span>
            <span class="channel-status" [class.active]="ch.active" [class.inactive]="!ch.active">
              {{ ch.active ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>

        <div class="section-subheader">
          <h4>Delivery History</h4>
          <span class="reminder-count" *ngIf="reminders().length">{{ reminders().length }} reminder(s)</span>
        </div>

        <div *ngIf="reminders().length === 0 && notifications().length === 0" class="state-box empty" role="status">
          <span class="state-icon" aria-hidden="true">🔔</span>
          <p>No reminders sent yet</p>
          <span class="state-hint">Click "Send Reminder" to notify the client via WhatsApp</span>
        </div>

        <div *ngIf="reminders().length > 0" class="reminder-table" role="list">
          <div *ngFor="let r of reminders()" class="reminder-row" role="listitem">
            <div class="reminder-channel-badge" [class]="'ch-' + r.channel.toLowerCase()">
              {{ r.channel }}
            </div>
            <div class="reminder-info">
              <p class="reminder-msg">{{ r.message }}</p>
              <span class="reminder-meta">{{ r.recipient }} · {{ r.scheduledAt | date:'medium' }}</span>
              <span *ngIf="r.templateName" class="reminder-template">Template: {{ r.templateName }}</span>
            </div>
            <div class="reminder-status" [class]="'status-' + r.status">
              {{ statusLabel(r.status) }}
            </div>
            <div class="reminder-actions">
              <button *ngIf="r.status === 'failed' || r.status === 'retry'" class="action-link" (click)="retryReminder(r)" title="Retry">🔄</button>
              <button *ngIf="r.status === 'scheduled' || r.status === 'queued'" class="action-link danger" (click)="cancelReminder(r)" title="Cancel">✕</button>
            </div>
            <div *ngIf="r.failureReason" class="failure-reason">{{ r.failureReason }}</div>
          </div>
        </div>

        <div *ngIf="notifications().length > 0" class="notif-section">
          <div class="section-subheader">
            <h4>In-App Notifications</h4>
          </div>
          <div class="notif-list" role="list">
            <div *ngFor="let n of notifications()" class="notif-row" role="listitem" [class.unread]="!n.read">
              <div class="notif-priority" [class]="'p-' + n.priority.toLowerCase()"></div>
              <div class="notif-info">
                <p class="notif-title">{{ n.title }}</p>
                <p class="notif-msg">{{ n.message }}</p>
                <span class="notif-time">{{ n.createdAt | date:'medium' }}</span>
              </div>
              <span class="notif-type-badge">{{ n.type }}</span>
              <span *ngIf="!n.read" class="unread-dot" aria-label="Unread"></span>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .reminders-section{padding:0 4px;max-width:960px}
    .section-header{margin-bottom:20px}
    .header-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
    .header-title{margin:0;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    .header-subtitle{margin:4px 0 0;font-size:13px;color:var(--text-soft,#64748b)}
    .send-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:13px;cursor:pointer;transition:transform .15s,box-shadow .15s}
    .send-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,.3)}
    .send-btn:disabled{opacity:.5;cursor:not-allowed}

    .alert{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;margin-bottom:14px;font-size:13px;font-weight:600}
    .alert.error{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
    .alert.success{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
    .alert-dismiss{margin-left:auto;background:none;border:none;cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;color:inherit;opacity:.6}
    .alert-dismiss:hover{opacity:1}

    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin:16px 0}
    .state-icon{font-size:32px;display:block;margin-bottom:8px}
    .state-hint{display:block;margin-top:4px;font-size:12px;color:var(--text-soft,#94a3b8)}
    .state-box.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    .channel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:24px}
    .channel-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border-radius:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);text-align:center}
    .channel-icon{font-size:24px}
    .channel-name{font-size:13px;font-weight:700;color:var(--text-strong,#111827)}
    .channel-status{font-size:11px;font-weight:600;padding:2px 10px;border-radius:10px}
    .channel-status.active{background:#f0fdf4;color:#16a34a}
    .channel-status.inactive{background:#f1f5f9;color:#94a3b8}

    .section-subheader{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .section-subheader h4{margin:0;font-size:14px;font-weight:800;color:var(--text-strong,#111827)}
    .reminder-count{font-size:12px;color:var(--text-soft,#64748b);background:var(--surface-muted,#f1f5f9);padding:3px 10px;border-radius:12px;font-weight:600}

    .reminder-table{display:flex;flex-direction:column;gap:4px;margin-bottom:20px}
    .reminder-row{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);flex-wrap:wrap;position:relative}
    .reminder-channel-badge{padding:2px 10px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.5px;flex-shrink:0}
    .ch-whatsapp{background:#f0fdf4;color:#16a34a}
    .ch-sms{background:#eff6ff;color:#2563eb}
    .ch-email{background:#fefce8;color:#ca8a04}
    .ch-in_app{background:#f5f3ff;color:#7c3aed}
    .reminder-info{flex:1;min-width:140px}
    .reminder-msg{margin:0;font-size:13px;font-weight:600;color:var(--text-strong,#111827)}
    .reminder-meta{font-size:11px;color:var(--text-soft,#94a3b8)}
    .reminder-template{display:block;font-size:11px;color:var(--accent,#6366f1);margin-top:2px}
    .reminder-status{padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0}
    .status-scheduled{background:#f1f5f9;color:#64748b}
    .status-queued{background:#fefce8;color:#ca8a04}
    .status-sending{background:#eff6ff;color:#2563eb}
    .status-sent{background:#f0fdf4;color:#16a34a}
    .status-failed{background:#fef2f2;color:#dc2626}
    .status-retry{background:#fff7ed;color:#ea580c}
    .status-cancelled{background:#f1f5f9;color:#94a3b8}
    .reminder-actions{display:flex;gap:4px;flex-shrink:0}
    .action-link{background:none;border:none;cursor:pointer;font-size:14px;padding:4px;border-radius:6px;transition:background .15s}
    .action-link:hover{background:var(--surface-muted,#f1f5f9)}
    .action-link.danger{color:#dc2626}
    .failure-reason{width:100%;font-size:11px;color:#dc2626;padding:4px 8px;background:#fef2f2;border-radius:6px;margin-top:4px}

    .notif-section{margin-top:8px}
    .notif-list{display:flex;flex-direction:column;gap:4px}
    .notif-row{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb)}
    .notif-row.unread{border-left:3px solid var(--accent,#6366f1)}
    .notif-priority{width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0}
    .p-low{background:#94a3b8}
    .p-medium{background:#eab308}
    .p-high{background:#f97316}
    .p-critical{background:#dc2626}
    .notif-info{flex:1;min-width:0}
    .notif-title{margin:0;font-size:13px;font-weight:700;color:var(--text-strong,#111827)}
    .notif-msg{margin:2px 0 0;font-size:12px;color:var(--text-soft,#64748b)}
    .notif-time{font-size:11px;color:var(--text-soft,#94a3b8)}
    .notif-type-badge{padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;background:var(--surface-muted,#f1f5f9);color:var(--text-soft,#64748b);flex-shrink:0}
    .unread-dot{width:8px;height:8px;border-radius:50%;background:var(--accent,#6366f1);flex-shrink:0;margin-top:6px}
  `]
})
export class BookingRemindersSectionComponent implements OnInit, OnDestroy {
  private state = inject(BookingDetailStateService);
  private http = inject(HttpClient);
  private notificationsService = inject(NotificationsService);

  private destroy$ = new Subject<void>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly sending = signal(false);
  readonly sendingError = signal<string | null>(null);
  readonly sendSuccess = signal<string | null>(null);
  readonly reminders = signal<ReminderRecord[]>([]);
  readonly notifications = signal<Notification[]>([]);

  readonly channels = [
    { name: 'WhatsApp', icon: '💬', active: true },
    { name: 'SMS', icon: '📱', active: false },
    { name: 'Email', icon: '📧', active: false },
    { name: 'Push', icon: '🔔', active: false },
    { name: 'In-App', icon: '📨', active: true },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const bookingId = this.state.bookingId();
    if (!bookingId) {
      this.loading.set(false);
      return;
    }

    this.notificationsService.getAll().pipe(
      catchError(err => {
        this.error.set('Failed to load notifications');
        return of([] as Notification[]);
      }),
      takeUntil(this.destroy$)
    ).subscribe(notifs => {
      this.notifications.set(notifs.slice(0, 10));
      this.loading.set(false);
    });
  }

  sendReminder(): void {
    const bookingId = this.state.bookingId();
    if (!bookingId || this.sending()) return;

    this.sending.set(true);
    this.sendingError.set(null);
    this.sendSuccess.set(null);

    this.http.post(`${environment.apiUrl}/whatsapp/send/reminder`, { bookingId })
      .pipe(
        catchError(err => {
          this.sendingError.set(err.error?.message || 'Failed to send reminder');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        this.sending.set(false);
        if (result) {
          this.sendSuccess.set('Reminder sent successfully via WhatsApp');
          const newReminder: ReminderRecord = {
            id: `rem-${Date.now()}`,
            channel: 'WHATSAPP',
            recipient: 'Client phone',
            status: 'sent',
            message: 'Appointment reminder sent via WhatsApp',
            scheduledAt: new Date().toISOString(),
            sentAt: new Date().toISOString(),
          };
          this.reminders.update(r => [newReminder, ...r]);
        }
      });
  }

  retryReminder(reminder: ReminderRecord): void {
    this.sendReminder();
  }

  cancelReminder(reminder: ReminderRecord): void {
    this.reminders.update(r =>
      r.map(rem => rem.id === reminder.id ? { ...rem, status: 'cancelled' as const } : rem)
    );
  }

  statusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
