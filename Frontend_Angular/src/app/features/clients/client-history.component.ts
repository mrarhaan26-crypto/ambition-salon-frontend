import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ClientTimelineService } from '../client-timeline/client-timeline.service';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-client-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ch-container" role="region" aria-label="Activity Timeline">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading timeline…</p></div>
      <ng-container *ngIf="!loading()">
        <div class="ch-header"><h3>Activity Timeline</h3></div>
        <div *ngIf="events().length === 0" class="empty-state">No activity recorded yet</div>
        <div class="ch-timeline">
          <div class="ch-event" *ngFor="let e of events(); trackBy: trackById">
            <div class="ch-dot" [class]="'chd-' + (e.type || 'info').toLowerCase()"></div>
            <div class="ch-content">
              <div class="ch-title">{{ e.action || e.title || 'Activity' }}</div>
              <div class="ch-detail" *ngIf="e.details || e.description">{{ e.details || e.description }}</div>
              <div class="ch-time">{{ e.timestamp || e.createdAt | date:'medium' }}</div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .ch-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .ch-header{margin-bottom:16px}
    .ch-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .ch-timeline{padding-left:20px;border-left:2px solid var(--border-subtle,#e5e7eb)}
    .ch-event{position:relative;padding:0 0 18px 20px}
    .ch-dot{position:absolute;left:-26px;top:4px;width:12px;height:12px;border-radius:50%;border:2px solid var(--accent,#6366f1);background:#fff}
    .chd-booking{background:#6366f1;border-color:#6366f1}
    .chd-payment{background:#16a34a;border-color:#16a34a}
    .chd-note{background:#f59e0b;border-color:#f59e0b}
    .chd-form{background:#06b6d4;border-color:#06b6d4}
    .chd-wallet{background:#8b5cf6;border-color:#8b5cf6}
    .chd-info{border-color:#94a3b8}
    .ch-title{font-size:14px;font-weight:600;color:var(--text-strong,#111827)}
    .ch-detail{font-size:12px;color:var(--text-soft,#64748b);margin-top:2px}
    .ch-time{font-size:11px;color:var(--text-soft,#94a3b8);margin-top:2px}
  `]
})
export class ClientHistoryComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private timelineService = inject(ClientTimelineService);
  private destroy$ = new Subject<void>();
  readonly events = signal<any[]>([]);
  readonly loading = signal(true);
  trackById(_i: number, item: any): string { return item.id || Math.random().toString(); }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    this.timelineService.getTimeline(clientId).pipe(
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).subscribe((res: any) => {
      this.events.set(Array.isArray(res) ? res : []);
      this.loading.set(false);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
