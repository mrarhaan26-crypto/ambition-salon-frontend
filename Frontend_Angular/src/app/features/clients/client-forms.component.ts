import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ClientsService } from './clients.service';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-client-forms',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cfo-container" role="region" aria-label="Consent Forms">
      <div *ngIf="loading()" class="state-box loading"><div class="spinner"></div><p>Loading forms…</p></div>
      <ng-container *ngIf="!loading()">
        <div class="cfo-header"><h3>Completed Forms</h3><span class="cfo-count">{{ forms().length }} submissions</span></div>
        <div *ngIf="forms().length === 0" class="empty-state">No forms submitted yet</div>
        <div class="cfo-card" *ngFor="let f of forms(); trackBy: trackById">
          <div class="cfo-name">{{ f.form?.name || 'Form' }}</div>
          <div class="cfo-meta">Submitted: {{ f.createdAt | date:'medium' }}</div>
          <div class="cfo-notes" *ngIf="f.notes">{{ f.notes }}</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cfo-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:24px;color:var(--text-soft,#94a3b8);font-size:13px}
    .cfo-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .cfo-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cfo-count{font-size:12px;color:var(--text-soft,#64748b)}
    .cfo-card{padding:12px 16px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;margin-bottom:6px}
    .cfo-name{font-size:14px;font-weight:600;color:var(--text-strong,#111827);margin-bottom:2px}
    .cfo-meta{font-size:12px;color:var(--text-soft,#64748b)}
    .cfo-notes{font-size:12px;color:var(--text-soft,#64748b);margin-top:4px;padding:6px;background:var(--surface-muted,#f9fafb);border-radius:6px}
  `]
})
export class ClientFormsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private clientsService = inject(ClientsService);
  private destroy$ = new Subject<void>();
  readonly forms = signal<any[]>([]);
  readonly loading = signal(true);
  trackById(_i: number, item: any): string { return item.id; }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) { this.loading.set(false); return; }
    this.clientsService.getClientForms(clientId).pipe(
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).subscribe((res: any) => {
      this.forms.set(Array.isArray(res) ? res : []);
      this.loading.set(false);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
