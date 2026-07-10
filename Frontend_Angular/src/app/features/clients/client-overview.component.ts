import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Client360StateService } from './client-360-state.service';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { ClientsService } from './clients.service';
import { getClientAge, isBirthdayThisMonth } from './client.model';

@Component({
  selector: 'app-client-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="co-container" role="region" aria-label="Client 360 Overview">
      <div *ngIf="state.loading()" class="state-box loading" role="status">
        <div class="spinner"></div><p>Loading client profile…</p>
      </div>
      <div *ngIf="state.error()" class="state-box error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ state.error() }}</p>
      </div>

      <ng-container *ngIf="!state.loading() && !state.error() && state.client()">
        <div class="hero-card">
          <div class="hero-avatar">{{ state.clientName().charAt(0).toUpperCase() }}</div>
          <div class="hero-info">
            <div class="hero-name-row">
              <h2 class="hero-name">{{ state.clientName() }}</h2>
              <span class="hero-vip-badge" *ngIf="isVip()">VIP</span>
              <span class="hero-badge" *ngIf="isBirthday()" style="background:#fef3c7;color:#92400e">🎂 Birthday</span>
            </div>
            <div class="hero-meta">
              <span>ID: {{ state.clientId() }}</span>
              <span *ngIf="state.clientCity()">· {{ state.clientCity() }}</span>
              <span *ngIf="memberSince()">· Member since {{ memberSince() }}</span>
            </div>
            <div class="hero-tags" *ngIf="tags().length">
              <span class="hero-tag" *ngFor="let t of tags(); trackBy: trackByFn">{{ t }}</span>
            </div>
            <div class="hero-contacts">
              <a *ngIf="state.clientPhone()" [href]="'tel:'+state.clientPhone()" class="hero-contact-link">{{ state.clientPhone() }}</a>
              <a *ngIf="state.clientEmail()" [href]="'mailto:'+state.clientEmail()" class="hero-contact-link">{{ state.clientEmail() }}</a>
            </div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card"><span class="kpi-value">₹{{ state.totalSpend().toLocaleString() }}</span><span class="kpi-label">Lifetime Spend</span></div>
          <div class="kpi-card"><span class="kpi-value">{{ state.totalVisits() }}</span><span class="kpi-label">Total Visits</span></div>
          <div class="kpi-card highlight"><span class="kpi-value">{{ upcomingCount() }}</span><span class="kpi-label">Upcoming Booking</span></div>
          <div class="kpi-card"><span class="kpi-value">₹{{ state.walletBalance().toLocaleString() }}</span><span class="kpi-label">Wallet Balance</span></div>
          <div class="kpi-card"><span class="kpi-value">{{ state.loyaltyPoints() }}</span><span class="kpi-label">Loyalty Points</span></div>
          <div class="kpi-card"><span class="kpi-value">₹{{ state.averageTicket().toLocaleString() }}</span><span class="kpi-label">Avg Ticket</span></div>
          <div class="kpi-card"><span class="kpi-value">{{ lastVisitLabel() }}</span><span class="kpi-label">Last Visit</span></div>
          <div class="kpi-card warn" *ngIf="state.cancellationRate() > 0"><span class="kpi-value">{{ state.cancellationRate() }}%</span><span class="kpi-label">Cancellation Rate</span></div>
          <div class="kpi-card warn" *ngIf="state.noShowRate() > 0"><span class="kpi-value">{{ state.noShowRate() }}%</span><span class="kpi-label">No-show Rate</span></div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .co-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .state-box.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .state-icon{font-size:32px;display:block;margin-bottom:8px}

    .hero-card{display:flex;gap:18px;padding:20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px;margin-bottom:16px}
    .hero-avatar{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;flex-shrink:0}
    .hero-info{flex:1;min-width:0}
    .hero-name-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
    .hero-name{margin:0;font-size:20px;font-weight:800;color:var(--text-strong,#111827)}
    .hero-vip-badge{padding:2px 8px;border-radius:6px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#78350f;font-size:11px;font-weight:700;letter-spacing:.5px}
    .hero-badge{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}
    .hero-meta{font-size:12px;color:var(--text-soft,#64748b);margin-bottom:6px;display:flex;flex-wrap:wrap;gap:4px}
    .hero-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
    .hero-tag{padding:2px 8px;border-radius:6px;background:var(--surface-muted,#f1f5f9);color:var(--text-soft,#64748b);font-size:11px;font-weight:600}
    .hero-contacts{display:flex;gap:12px;flex-wrap:wrap;margin-top:4px}
    .hero-contact-link{font-size:13px;color:var(--accent,#6366f1);text-decoration:none;font-weight:500}
    .hero-contact-link:hover{text-decoration:underline}

    .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
    .kpi-card{padding:14px 12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px;text-align:center}
    .kpi-card.highlight{border-color:var(--accent,#6366f1);background:linear-gradient(135deg,#eef2ff,#fff)}
    .kpi-card.warn{border-color:#fca5a5;background:linear-gradient(135deg,#fef2f2,#fff)}
    .kpi-value{display:block;font-size:22px;font-weight:800;color:var(--text-strong,#111827);margin-bottom:2px}
    .kpi-label{font-size:11px;color:var(--text-soft,#64748b);font-weight:500;text-transform:uppercase;letter-spacing:.3px}
    @media(max-width:600px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.hero-card{flex-direction:column;align-items:center;text-align:center}.hero-name-row{justify-content:center}.hero-meta,.hero-contacts{justify-content:center}}
  `]
})
export class ClientOverviewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private clientsService = inject(ClientsService);
  state = inject(Client360StateService);
  private destroy$ = new Subject<void>();

  readonly tags = signal<string[]>([]);

  readonly isVip = computed(() => this.state.totalSpend() >= 5000 || this.state.totalVisits() >= 20);
  readonly isBirthday = computed(() => isBirthdayThisMonth(this.state.clientDOB()));
  readonly memberSince = computed(() => {
    const d = this.state.createdAt();
    return d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;
  });
  readonly upcomingCount = computed(() => this.state.upcomingBookings().length);
  readonly lastVisitLabel = computed(() => {
    const d = this.state.lastVisitAt();
    if (!d) return 'N/A';
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`;
  });

  trackByFn(_i: number, t: string): string { return t; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (clientId) {
      this.state.load(clientId);
      this.loadTags(clientId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTags(clientId: string): void {
    this.clientsService.getClient(clientId).pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$)
    ).subscribe(c => {
      if (c?.notes) {
        this.tags.set(c.notes.split(',').map(t => t.trim()).filter(t => t.length > 0 && t.length < 30));
      }
    });
  }
}
