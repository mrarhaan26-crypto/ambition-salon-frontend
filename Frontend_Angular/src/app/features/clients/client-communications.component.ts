import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-client-communications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ccm-container" role="region" aria-label="Communication History">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading communications…</p></div>
      <ng-container *ngIf="!loading()">
        <div class="ccm-header"><h3>Communication History</h3></div>
        <div *ngIf="messages().length === 0" class="empty-state">No communications yet</div>
        <div class="ccm-card" *ngFor="let m of messages(); trackBy: trackById">
          <div class="ccm-channel" [class]="'ccmch-' + m.channel.toLowerCase()">{{ m.channel || 'Message' }}</div>
          <div class="ccm-content">{{ m.content || m.message || '' }}</div>
          <div class="ccm-meta">{{ m.direction || 'OUT' }} · {{ m.createdAt | date:'medium' }}</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .ccm-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .ccm-header{margin-bottom:12px}
    .ccm-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .ccm-card{padding:12px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;margin-bottom:6px}
    .ccm-channel{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;margin-bottom:4px}
    .ccmch-whatsapp{background:#f0fdf4;color:#166534}
    .ccmch-email{background:#dbeafe;color:#1e40af}
    .ccmch-sms{background:#fef3c7;color:#92400e}
    .ccm-content{font-size:13px;color:var(--text-strong,#111827);margin-bottom:2px}
    .ccm-meta{font-size:11px;color:var(--text-soft,#94a3b8)}
  `]
})
export class ClientCommunicationsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();
  readonly messages = signal<any[]>([]);
  readonly loading = signal(true);
  trackById(_i: number, item: any): string { return item.id; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    const apiUrl = environment.apiUrl;
    const whatsapp$ = this.http.get(`${apiUrl}/whatsapp/logs?clientId=${clientId}`).pipe(catchError(() => of([])));
    const message$ = this.http.get(`${apiUrl}/message-center/conversations?clientId=${clientId}`).pipe(catchError(() => of([])));
    whatsapp$.pipe(takeUntil(this.destroy$)).subscribe((w: any) => {
      const msgs = Array.isArray(w) ? w.map((x: any) => ({ ...x, channel: 'WhatsApp' })) : [];
      message$.pipe(takeUntil(this.destroy$)).subscribe((m: any) => {
        const convs = Array.isArray(m) ? m.flatMap((c: any) => (c.messages || [c]).map((msg: any) => ({ ...msg, channel: 'In-App', conversationId: c.id }))) : [];
        this.messages.set([...msgs, ...convs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        this.loading.set(false);
      });
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
