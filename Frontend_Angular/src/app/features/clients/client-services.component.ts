import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Client360StateService } from './client-360-state.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-services',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cs-container" role="region" aria-label="Client Services">
      <div *ngIf="state.loading()" class="state-box loading"><div class="spinner"></div><p>Loading…</p></div>
      <ng-container *ngIf="!state.loading()">
        <div class="cs-header"><h3>Services History</h3><span class="cs-count">{{ allServices().length }} total</span></div>
        <div *ngIf="allServices().length === 0" class="empty-state">No services recorded</div>
        <div class="cs-card" *ngFor="let s of allServices(); trackBy: trackById">
          <div class="cs-service">{{ s.name }}</div>
          <div class="cs-meta">{{ s.count }}x · ₹{{ s.total }} · Last: {{ s.lastDate | date:'mediumDate' }}</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cs-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .cs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .cs-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cs-count{font-size:12px;color:var(--text-soft,#64748b)}
    .cs-card{padding:12px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;margin-bottom:6px}
    .cs-service{font-size:14px;font-weight:600;color:var(--text-strong,#111827)}
    .cs-meta{font-size:12px;color:var(--text-soft,#64748b);margin-top:2px}
  `]
})
export class ClientServicesComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  state = inject(Client360StateService);
  private destroy$ = new Subject<void>();

  readonly allServices = computed(() => {
    const svcMap = new Map<string, { name: string; count: number; total: number; lastDate: string }>();
    for (const b of this.state.completedBookings()) {
      for (const s of b.services || []) {
        const existing = svcMap.get(s.id || s.name);
        if (existing) { existing.count++; existing.total += s.price; }
        else { svcMap.set(s.id || s.name, { name: s.name, count: 1, total: s.price, lastDate: b.startTime }); }
      }
    }
    return Array.from(svcMap.values()).sort((a, b) => b.count - a.count);
  });

  trackById(_i: number, item: any): string { return item.name; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
