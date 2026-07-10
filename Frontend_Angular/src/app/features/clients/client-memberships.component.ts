import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-client-memberships',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cm-container" role="region" aria-label="Memberships">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading memberships…</p></div>
      <ng-container *ngIf="!loading()">
        <div class="cm-header"><h3>Memberships</h3></div>
        <div *ngIf="memberships().length === 0" class="empty-state">No memberships found</div>
        <div class="cm-card" *ngFor="let m of memberships(); trackBy: trackById">
          <div class="cm-name">{{ m.membershipPlan?.name || m.name || 'Membership' }}</div>
          <div class="cm-status" [class.active]="m.isActive">{{ m.isActive ? 'Active' : 'Expired' }}</div>
          <div class="cm-meta" *ngIf="m.startDate">Start: {{ m.startDate | date:'mediumDate' }}</div>
          <div class="cm-meta" *ngIf="m.endDate">Ends: {{ m.endDate | date:'mediumDate' }}</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cm-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .cm-header{margin-bottom:12px}
    .cm-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cm-card{padding:14px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px;margin-bottom:8px;position:relative}
    .cm-name{font-size:15px;font-weight:700;color:var(--text-strong,#111827);margin-bottom:2px}
    .cm-status{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;margin-bottom:4px}
    .cm-status.active{background:#f0fdf4;color:#166534}
    .cm-meta{font-size:12px;color:var(--text-soft,#64748b)}
  `]
})
export class ClientMembershipsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();
  readonly memberships = signal<any[]>([]);
  readonly loading = signal(true);
  trackById(_i: number, item: any): string { return item.id; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    this.http.get(`${environment.apiUrl}/clients/${clientId}/memberships`).pipe(
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).subscribe((res: any) => {
      this.memberships.set(Array.isArray(res) ? res : []);
      this.loading.set(false);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
