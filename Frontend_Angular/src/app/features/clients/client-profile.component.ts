import { Component, inject, computed, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Client360StateService } from './client-360-state.service';
import { ClientsService } from './clients.service';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { getClientAge } from './client.model';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cp-container" role="region" aria-label="Client Profile">
      <div *ngIf="state.loading()" class="state-box loading" role="status">
        <div class="spinner"></div><p>Loading profile…</p>
      </div>
      <div *ngIf="state.error()" class="state-box error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ state.error() }}</p>
      </div>

      <ng-container *ngIf="!state.loading() && !state.error() && state.client()">
        <div class="pf-grid">
          <div class="pf-card">
            <h3 class="pf-card-title">Personal Information</h3>
            <div class="pf-row"><span class="pf-label">Full Name</span><span class="pf-value">{{ state.clientName() }}</span></div>
            <div class="pf-row"><span class="pf-label">Gender</span><span class="pf-value">{{ state.clientGender() || '—' }}</span></div>
            <div class="pf-row"><span class="pf-label">Date of Birth</span><span class="pf-value">{{ state.clientDOB() ? (state.clientDOB() | date:'mediumDate') : '—' }}</span></div>
            <div class="pf-row"><span class="pf-label">Age</span><span class="pf-value">{{ age() !== null ? age() + ' years' : '—' }}</span></div>
            <div class="pf-row"><span class="pf-label">City</span><span class="pf-value">{{ state.clientCity() || '—' }}</span></div>
          </div>
          <div class="pf-card">
            <h3 class="pf-card-title">Contact Details</h3>
            <div class="pf-row"><span class="pf-label">Phone</span><span class="pf-value">{{ state.clientPhone() || '—' }}</span></div>
            <div class="pf-row"><span class="pf-label">Email</span><span class="pf-value">{{ state.clientEmail() || '—' }}</span></div>
          </div>
        </div>

        <div class="pf-card pf-edit-card">
          <h3 class="pf-card-title">Edit Profile</h3>
          <p class="pf-hint">To edit client details, use the edit form available on the Clients list page.</p>
          <a routerLink="/app/clients" class="pf-link">← Back to Clients</a>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cp-container{padding:0 4px;max-width:960px}
    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .state-box.loading{display:flex;align-items:center;justify-content:center;gap:12px}.spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .pf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-bottom:16px}
    .pf-card{padding:16px 18px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .pf-card-title{margin:0 0 12px;font-size:14px;font-weight:800;color:var(--text-strong,#111827);padding-bottom:8px;border-bottom:1px solid var(--border-subtle,#f1f5f9)}
    .pf-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;gap:8px}
    .pf-label{color:var(--text-soft,#64748b);flex-shrink:0}
    .pf-value{color:var(--text-strong,#111827);text-align:right;font-weight:500}
    .pf-edit-card{margin-bottom:16px}
    .pf-hint{font-size:13px;color:var(--text-soft,#64748b);margin:0 0 10px}
    .pf-link{font-size:13px;color:var(--accent,#6366f1);text-decoration:none;font-weight:600}
    .pf-link:hover{text-decoration:underline}
    @media(max-width:600px){.pf-grid{grid-template-columns:1fr}}
  `]
})
export class ClientProfileComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  state = inject(Client360StateService);
  private destroy$ = new Subject<void>();
  readonly age = computed(() => getClientAge(this.state.clientDOB()));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) this.state.load(id);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
