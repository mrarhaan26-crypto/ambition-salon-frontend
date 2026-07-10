import { Component, inject, computed, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StaffDetailStateService } from '../staff-detail-state.service';
import { StaffService } from '../staff.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-staff-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="so-container" role="region" aria-label="Staff Overview">
      <div *ngIf="state.loading()" class="so-state loading" role="status">
        <div class="spinner"></div><p>Loading staff profile…</p>
      </div>
      <div *ngIf="state.error()" class="so-state error" role="alert">
        <span class="state-icon">⚠️</span><p>{{ state.error() }}</p>
      </div>

      <ng-container *ngIf="!state.loading() && !state.error() && state.staff()">
        <div class="so-hero">
          <div class="so-hero-avatar">{{ state.staffName().charAt(0).toUpperCase() }}</div>
          <div class="so-hero-info">
            <div class="so-hero-name-row">
              <h2 class="so-hero-name">{{ state.staffName() }}</h2>
              <span class="so-role-badge">{{ state.staffRole() }}</span>
              <span class="so-status-badge" [class.active]="state.staffIsActive()" [class.inactive]="!state.staffIsActive()">
                {{ state.staffIsActive() ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="so-hero-meta">
              <span>ID: {{ state.staffId() }}</span>
              <span *ngIf="state.staffSpecialization()">· {{ state.staffSpecialization() }}</span>
              <span *ngIf="state.staffBranch()">· {{ state.staffBranch() }}</span>
            </div>
            <div class="so-hero-contacts">
              <a *ngIf="state.staffPhone()" [href]="'tel:'+state.staffPhone()" class="so-contact-link">{{ state.staffPhone() }}</a>
              <a *ngIf="state.staffEmail()" [href]="'mailto:'+state.staffEmail()" class="so-contact-link">{{ state.staffEmail() }}</a>
            </div>
          </div>
        </div>

        <div class="so-grid">
          <a class="so-card" routerLink="./profile"><span class="so-card-icon">👤</span><span class="so-card-label">Profile</span></a>
          <a class="so-card" routerLink="./calendar"><span class="so-card-icon">📅</span><span class="so-card-label">Calendar</span></a>
          <a class="so-card" routerLink="./appointments"><span class="so-card-icon">🗓️</span><span class="so-card-label">Appointments</span></a>
          <a class="so-card" routerLink="./attendance"><span class="so-card-icon">📍</span><span class="so-card-label">Attendance</span></a>
          <a class="so-card" routerLink="./leaves"><span class="so-card-icon">🏖️</span><span class="so-card-label">Leaves</span></a>
          <a class="so-card" routerLink="./performance"><span class="so-card-icon">📈</span><span class="so-card-label">Performance</span></a>
          <a class="so-card" routerLink="./commission"><span class="so-card-icon">💸</span><span class="so-card-label">Commission</span></a>
          <a class="so-card" routerLink="./payroll"><span class="so-card-icon">🧮</span><span class="so-card-label">Payroll</span></a>
        </div>

        <div class="so-insights">
          <h3>Quick Insights</h3>
          <div class="so-insight-grid">
            <div class="so-insight-card">
              <span class="so-insight-icon">📊</span>
              <div><strong>{{ perfData()?.summary?.totalBookings || '—' }}</strong><span>Total Bookings</span></div>
            </div>
            <div class="so-insight-card">
              <span class="so-insight-icon">💰</span>
              <div><strong>{{ perfData()?.summary?.revenue ? (perfData()?.summary?.revenue | currency:'USD':'symbol':'1.0-0') : '—' }}</strong><span>Revenue</span></div>
            </div>
            <div class="so-insight-card">
              <span class="so-insight-icon">✅</span>
              <div><strong>{{ perfData()?.summary?.completionRate ?? '—' }}{{ perfData()?.summary?.completionRate ? '%' : '' }}</strong><span>Completion Rate</span></div>
            </div>
            <div class="so-insight-card">
              <span class="so-insight-icon">⭐</span>
              <div><strong>{{ perfData()?.summary?.averageRating ?? '—' }}</strong><span>Rating</span></div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .so-container{padding:0 4px;max-width:960px}
    .so-state{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .so-state.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}.state-icon{font-size:32px;display:block;margin-bottom:8px}
    .so-hero{display:flex;gap:18px;padding:20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:16px;margin-bottom:16px}
    .so-hero-avatar{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;flex-shrink:0}
    .so-hero-info{flex:1;min-width:0}
    .so-hero-name-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
    .so-hero-name{margin:0;font-size:20px;font-weight:800;color:var(--text-strong,#111827)}
    .so-role-badge{padding:2px 10px;border-radius:6px;background:var(--surface-muted,#f1f5f9);color:var(--text-soft,#64748b);font-size:11px;font-weight:700}
    .so-status-badge{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .so-status-badge.active{background:#dcfce7;color:#166534}
    .so-status-badge.inactive{background:#fef2f2;color:#991b1b}
    .so-hero-meta{font-size:12px;color:var(--text-soft,#64748b);margin-bottom:6px;display:flex;flex-wrap:wrap;gap:4px}
    .so-hero-contacts{display:flex;gap:12px;flex-wrap:wrap;margin-top:4px}
    .so-contact-link{color:var(--accent,#6366f1);text-decoration:none;font-size:13px;font-weight:600}
    .so-contact-link:hover{text-decoration:underline}
    .so-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:16px}
    .so-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px;text-decoration:none;transition:transform .15s,box-shadow .15s}
    .so-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.08)}
    .so-card-icon{font-size:24px}
    .so-card-label{font-size:12px;font-weight:700;color:var(--text-strong,#111827);text-align:center}
    .so-insights h3{margin:0 0 12px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .so-insight-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
    .so-insight-card{display:flex;align-items:center;gap:12px;padding:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px}
    .so-insight-icon{font-size:22px}
    .so-insight-card div{display:flex;flex-direction:column}
    .so-insight-card strong{font-size:18px;color:var(--text-strong,#111827)}
    .so-insight-card span{font-size:12px;color:var(--text-soft,#64748b)}
    @media(max-width:600px){.so-grid{grid-template-columns:repeat(2,1fr)}.so-insight-grid{grid-template-columns:1fr}}
  `]
})
export class StaffOverviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(StaffService);
  state = inject(StaffDetailStateService);
  perfData = signal<any>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (id) {
      this.state.load(id);
      this.api.getPerformance(id).pipe(catchError(() => of(null))).subscribe(d => this.perfData.set(d));
    }
  }
}
