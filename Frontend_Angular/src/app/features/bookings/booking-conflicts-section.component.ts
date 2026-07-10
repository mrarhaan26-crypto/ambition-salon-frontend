import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingDetailStateService } from './booking-detail-state.service';
import { environment } from '../../../environments/environment';
import { ConflictVisualService } from '../../features/calendar/calendar-conflict-engine/calendar-conflict-visual.service';
import type { ConflictVisualState } from '../../features/calendar/calendar-conflict-engine/calendar-conflict-visual.service';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

interface BackendConflict {
  id?: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: string;
  affectedStaff?: string;
  affectedClient?: string;
  affectedResource?: string;
  suggestedSolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

@Component({
  selector: 'app-booking-conflicts-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="conflicts-section" role="region" aria-label="Scheduling conflicts">
      <header class="section-header">
        <div class="header-top">
          <h3 class="header-title">Scheduling Conflicts</h3>
          <a class="calendar-link" routerLink="/app/calendar" aria-label="Open Calendar">
            <span aria-hidden="true">📅</span> Open Calendar
          </a>
        </div>
        <p class="header-subtitle">Staff, client, and resource conflicts detected for this booking</p>
      </header>

      <div *ngIf="loading()" class="state-box loading" role="status">
        <div class="spinner" aria-hidden="true"></div>
        <p>Checking for conflicts…</p>
      </div>

      <div *ngIf="error()" class="state-box error" role="alert">
        <span class="state-icon" aria-hidden="true">⚠️</span>
        <p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="summary-bar" *ngIf="allConflicts().length > 0">
          <div class="summary-item error-count">
            <span class="summary-num">{{ conflictCounts().errors }}</span>
            <span class="summary-label">Errors</span>
          </div>
          <div class="summary-item warning-count">
            <span class="summary-num">{{ conflictCounts().warnings }}</span>
            <span class="summary-label">Warnings</span>
          </div>
          <div class="summary-item info-count">
            <span class="summary-num">{{ conflictCounts().infos }}</span>
            <span class="summary-label">Info</span>
          </div>
        </div>

        <div *ngIf="allConflicts().length === 0" class="state-box empty" role="status">
          <span class="state-icon" aria-hidden="true">✅</span>
          <p>No conflicts detected</p>
          <span class="state-hint">This booking has no scheduling conflicts. Conflicts are detected in real-time by the Calendar engine.</span>
        </div>

        <div *ngIf="allConflicts().length > 0" class="conflict-list" role="list">
          <div *ngFor="let c of allConflicts()" class="conflict-card" [class.severity-error]="c.severity === 'error'" [class.severity-warning]="c.severity === 'warning'" [class.severity-info]="c.severity === 'info'" role="listitem">
            <div class="conflict-header">
              <span class="conflict-severity-badge" [class]="'sev-' + c.severity">{{ c.severity | uppercase }}</span>
              <span class="conflict-category-badge">{{ getCategoryLabel(c.category) }}</span>
              <span class="conflict-type">{{ c.type }}</span>
            </div>
            <p class="conflict-message">{{ c.message }}</p>
            <div class="conflict-details" *ngIf="c.details">
              <p>{{ c.details }}</p>
            </div>
            <div class="conflict-entities" *ngIf="c.affectedStaff || c.affectedClient || c.affectedResource">
              <span *ngIf="c.affectedStaff" class="entity-badge staff">👤 {{ c.affectedStaff }}</span>
              <span *ngIf="c.affectedClient" class="entity-badge client">👤 {{ c.affectedClient }}</span>
              <span *ngIf="c.affectedResource" class="entity-badge resource">🪑 {{ c.affectedResource }}</span>
            </div>
            <div class="conflict-solution" *ngIf="c.suggestedSolution">
              <strong>Suggested:</strong> {{ c.suggestedSolution }}
            </div>
            <div class="conflict-actions" *ngIf="!c.resolvedAt">
              <button class="action-btn resolve" (click)="resolveConflict(c)">
                <span aria-hidden="true">✓</span> Resolve
              </button>
              <button class="action-btn ignore" (click)="ignoreConflict(c)">
                <span aria-hidden="true">✕</span> Ignore
              </button>
            </div>
            <div class="conflict-resolution" *ngIf="c.resolvedAt">
              <span class="resolution-badge">Resolved</span>
              <span class="resolution-meta">by {{ c.resolvedBy || 'System' }} · {{ c.resolvedAt }}</span>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .conflicts-section{padding:0 4px;max-width:960px}
    .section-header{margin-bottom:20px}
    .header-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
    .header-title{margin:0;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    .header-subtitle{margin:4px 0 0;font-size:13px;color:var(--text-soft,#64748b)}
    .calendar-link{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:13px;text-decoration:none;transition:transform .15s,box-shadow .15s}
    .calendar-link:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,.3)}

    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin:16px 0}
    .state-icon{font-size:32px;display:block;margin-bottom:8px}
    .state-hint{display:block;margin-top:4px;font-size:12px;color:var(--text-soft,#94a3b8)}
    .state-box.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    .summary-bar{display:flex;gap:12px;margin-bottom:20px}
    .summary-item{flex:1;text-align:center;padding:14px;border-radius:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb)}
    .summary-num{display:block;font-size:28px;font-weight:900;line-height:1}
    .summary-label{font-size:12px;font-weight:600;color:var(--text-soft,#64748b)}
    .error-count .summary-num{color:#dc2626}
    .warning-count .summary-num{color:#eab308}
    .info-count .summary-num{color:#3b82f6}

    .conflict-list{display:flex;flex-direction:column;gap:8px}
    .conflict-card{padding:14px 16px;border-radius:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-left:4px solid var(--border-subtle,#e5e7eb)}
    .conflict-card.severity-error{border-left-color:#dc2626}
    .conflict-card.severity-warning{border-left-color:#eab308}
    .conflict-card.severity-info{border-left-color:#3b82f6}
    .conflict-header{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}
    .conflict-severity-badge{padding:1px 8px;border-radius:4px;font-size:10px;font-weight:800;letter-spacing:.5px}
    .sev-error{background:#fef2f2;color:#dc2626}
    .sev-warning{background:#fefce8;color:#ca8a04}
    .sev-info{background:#eff6ff;color:#2563eb}
    .conflict-category-badge{padding:1px 8px;border-radius:4px;font-size:10px;font-weight:600;background:var(--surface-muted,#f1f5f9);color:var(--text-soft,#64748b)}
    .conflict-type{font-size:12px;color:var(--text-soft,#64748b);font-family:monospace}
    .conflict-message{margin:0 0 6px;font-size:13px;font-weight:700;color:var(--text-strong,#111827)}
    .conflict-details p{margin:0;font-size:12px;color:var(--text-soft,#64748b)}
    .conflict-entities{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
    .entity-badge{font-size:11px;padding:2px 8px;border-radius:6px;background:var(--surface-muted,#f1f5f9);color:var(--text-soft,#64748b)}
    .conflict-solution{margin:6px 0;padding:6px 10px;background:#f0fdf4;border-radius:8px;font-size:12px;color:#16a34a}
    .conflict-actions{display:flex;gap:6px;margin-top:8px}
    .action-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:8px;border:none;font-weight:700;font-size:12px;cursor:pointer;transition:all .15s}
    .action-btn.resolve{background:#f0fdf4;color:#16a34a}
    .action-btn.resolve:hover{background:#16a34a;color:#fff}
    .action-btn.ignore{background:#f1f5f9;color:#64748b}
    .action-btn.ignore:hover{background:#e5e7eb}
    .conflict-resolution{display:flex;align-items:center;gap:8px;margin-top:6px;padding:6px 10px;background:#f0fdf4;border-radius:8px}
    .resolution-badge{font-size:11px;font-weight:700;color:#16a34a;padding:1px 8px;background:#dcfce7;border-radius:4px}
    .resolution-meta{font-size:11px;color:var(--text-soft,#64748b)}
  `]
})
export class BookingConflictsSectionComponent implements OnInit, OnDestroy {
  private state = inject(BookingDetailStateService);
  private http = inject(HttpClient);
  private visualService = inject(ConflictVisualService);

  private destroy$ = new Subject<void>();
  private visualUnsub?: () => void;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly backendConflicts = signal<BackendConflict[]>([]);

  readonly conflictCounts = computed(() => {
    const all = this.allConflicts();
    return {
      errors: all.filter(c => c.severity === 'error').length,
      warnings: all.filter(c => c.severity === 'warning').length,
      infos: all.filter(c => c.severity === 'info').length,
    };
  });

  readonly allConflicts = computed(() => {
    const visual = this.visualConflicts();
    const backend = this.backendConflicts();
    return [...visual, ...backend];
  });

  readonly visualConflicts = signal<BackendConflict[]>([]);

  ngOnInit(): void {
    this.loadBackendConflicts();
    this.syncVisualConflicts();
    this.visualUnsub = this.visualService.onChange(() => this.syncVisualConflicts());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.visualUnsub?.();
  }

  private syncVisualConflicts(): void {
    const states = this.visualService.getAllStates();
    const bookingId = this.state.bookingId();
    const mapped: BackendConflict[] = [];
    for (const s of states) {
      for (const c of s.conflicts) {
        mapped.push({
          type: c.type,
          severity: c.severity,
          category: c.category,
          message: c.message,
          details: c.details,
          affectedStaff: c.conflictingStaffId ? `Staff ${c.conflictingStaffId}` : undefined,
          affectedClient: c.conflictingClientId ? `Client ${c.conflictingClientId}` : undefined,
          affectedResource: c.conflictingResourceId ? `Resource ${c.conflictingResourceId}` : undefined,
          suggestedSolution: c.canOverride ? 'Override conflict or choose a different time slot' : 'Choose a different time slot',
        });
      }
    }
    this.visualConflicts.set(mapped);
  }

  private loadBackendConflicts(): void {
    this.loading.set(true);
    const booking = this.state.booking();
    const branchId = booking?.branchId;

    if (!branchId) {
      this.loading.set(false);
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/bookings/calendar/resources/conflicts`, {
      params: { branchId, date: new Date().toISOString().slice(0, 10) } as any
    }).pipe(
      catchError(err => {
        this.error.set('Unable to fetch backend conflicts');
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(data => {
      if (data) {
        const parsed: BackendConflict[] = [];
        if (data.conflicts) {
          for (const c of data.conflicts) {
            parsed.push({
              type: 'resource_conflict',
              severity: 'error',
              category: 'resource',
              message: c.message || 'Resource conflict detected',
              details: `Between ${c.conflictStart || ''} and ${c.conflictEnd || ''}`,
              affectedResource: c.resourceName,
              suggestedSolution: 'Reschedule one of the conflicting bookings',
            });
          }
        }
        if (data.timeline) {
          for (const t of data.timeline) {
            if (t.conflictStatus === 'CONFLICT') {
              parsed.push({
                type: 'timeline_conflict',
                severity: 'error',
                category: 'resource',
                message: `Booking ${t.title || t.id} has a resource conflict`,
                details: `Resource: ${t.resourceName || 'Unknown'}`,
                affectedResource: t.resourceName,
                suggestedSolution: 'Open Calendar to reassign resource',
              });
            }
          }
        }
        this.backendConflicts.set(parsed);
      }
      this.loading.set(false);
    });
  }

  getCategoryLabel(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  resolveConflict(conflict: BackendConflict): void {
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolvedBy = 'Current User';
    conflict.resolution = 'Manually resolved';
  }

  ignoreConflict(conflict: BackendConflict): void {
    this.backendConflicts.update(list =>
      list.filter(c => c !== conflict)
    );
    this.visualConflicts.update(list =>
      list.filter(c => c !== conflict)
    );
  }
}
