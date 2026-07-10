import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionsService } from './sessions.service';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Session Management</h1>
          <p>View and manage active user sessions across the platform.</p>
        </div>
        <button class="danger-btn" (click)="revokeAll()">Revoke All Sessions</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading sessions...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load sessions.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>
      <div class="empty" *ngIf="!loading && !error && sessions.length === 0"><strong>No active sessions.</strong><p>There are no active user sessions at this time.</p></div>

      <div class="session-grid" *ngIf="!loading && !error && sessions.length > 0">
        <div class="session-card" *ngFor="let s of sessions">
          <div class="session-icon">
            <span>{{ s.deviceType === 'mobile' ? '📱' : s.deviceType === 'tablet' ? '📟' : '💻' }}</span>
          </div>
          <div class="session-info">
            <strong>{{ s.userName || s.userId || 'Unknown User' }}</strong>
            <span class="device-name">{{ s.deviceName || s.deviceType || 'Unknown Device' }}</span>
            <span class="session-meta">IP: {{ s.ipAddress || '-' }} | Browser: {{ s.browser || '-' }}</span>
            <span class="session-time">Last active: {{ s.lastActive | date:'MMM dd, h:mm a' }}</span>
            <span class="session-time">Created: {{ s.createdAt | date:'MMM dd, yyyy' }}</span>
          </div>
          <div class="session-status" [class.active]="s.isActive !== false">
            {{ s.isActive !== false ? 'Active' : 'Expired' }}
          </div>
          <button class="revoke-btn" (click)="revoke(s.id)" title="Revoke session">&times;</button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .danger-btn{padding:10px 20px;border-radius:12px;background:#dc2626;color:white;font-weight:700;border:0;cursor:pointer;font-size:13px}
    .session-grid{display:flex;flex-direction:column;gap:10px}
    .session-card{display:flex;align-items:center;gap:16px;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:16px 20px;box-shadow:var(--card-shadow)}
    .session-icon{font-size:28px;width:48px;text-align:center;flex-shrink:0}
    .session-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
    .session-info strong{font-size:15px}
    .device-name{font-size:13px;color:var(--muted)}
    .session-meta{font-size:11px;color:var(--muted)}
    .session-time{font-size:11px;color:var(--muted)}
    .session-status{font-size:11px;padding:3px 12px;border-radius:20px;background:#fef3c7;color:#92400e;font-weight:600;flex-shrink:0}
    .session-status.active{background:#d1fae5;color:#065f46}
    .revoke-btn{background:none;border:0;font-size:22px;color:var(--muted);cursor:pointer;padding:4px 8px;border-radius:8px;flex-shrink:0}
    .revoke-btn:hover{background:#fee2e2;color:#dc2626}
    .loading,.error,.empty{text-align:center;padding:48px;color:var(--muted)}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;margin-right:12px;vertical-align:middle}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px}
    .error strong{color:#991b1b}.error p{color:#7f1d1d;margin:8px 0}
    .error button{background:var(--black);color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
  `]
})
export class SessionsComponent implements OnInit {
  private api = inject(SessionsService);
  loading = true; error = '';
  sessions: any[] = [];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({
      next: (res) => { this.sessions = res.data || res.sessions || res || []; this.loading = false; },
      error: (e) => { this.error = e.message || 'Sessions unavailable.'; this.loading = false; }
    });
  }

  revoke(id: string) {
    if (!confirm('Revoke this session?')) return;
    this.api.revoke(id).subscribe({ next: () => this.load() });
  }

  revokeAll() {
    if (!confirm('Revoke ALL active sessions? You will be logged out too.')) return;
    this.api.revokeAll().subscribe({ next: () => this.load() });
  }
}
