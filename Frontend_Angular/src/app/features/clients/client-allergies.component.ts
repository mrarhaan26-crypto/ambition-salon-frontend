import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClientsService } from './clients.service';

@Component({
  selector: 'app-client-allergies',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cal-container" role="region" aria-label="Medical Profile">
      <div class="cal-header"><h3>Medical Profile</h3><span class="cal-badge">Integration Ready</span></div>
      <div class="cal-card">
        <h4 class="cal-card-title">Allergies & Contraindications</h4>
        <p class="cal-empty">No allergies or medical notes recorded yet.</p>
        <p class="cal-hint">A dedicated medical profile module with skin/hair profile, patch tests, and contraindication tracking will be available in a future update.</p>
      </div>
      <div class="cal-card">
        <h4 class="cal-card-title">Client Notes (Medical)</h4>
        <p class="cal-text">{{ clientNotes() || 'No medical notes available.' }}</p>
      </div>
    </div>
  `,
  styles: [`
    .cal-container{padding:0 4px;max-width:960px}
    .cal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .cal-header h3{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .cal-badge{padding:3px 10px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700}
    .cal-card{padding:16px 18px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin-bottom:12px}
    .cal-card-title{margin:0 0 10px;font-size:14px;font-weight:800;color:var(--text-strong,#111827)}
    .cal-empty{font-size:13px;color:var(--text-soft,#94a3b8);margin:0}
    .cal-hint{font-size:12px;color:var(--text-soft,#94a3b8);margin:8px 0 0}
    .cal-text{font-size:13px;color:var(--text-soft,#64748b);margin:0;white-space:pre-wrap}
  `]
})
export class ClientAllergiesComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private clientsService = inject(ClientsService);
  private destroy$ = new Subject<void>();
  readonly clientNotes = signal<string>('');

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!clientId) return;
    this.clientsService.getClient(clientId).pipe(catchError(() => of(null))).subscribe(c => {
      if (c?.notes) this.clientNotes.set(c.notes);
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
