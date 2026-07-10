import { CommonModule } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StaffService } from './staff.service';
import { Staff } from './staff.models';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { StateViewComponent } from '../../shared/components/state-view/state-view.component';
import { EnterpriseAction } from '../../shared/theme/module-theme.config';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EnterpriseFeaturePageComponent, StateViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-enterprise-feature-page
      themeKey="staff"
      title="Staff Management"
      subtitle="Manage your salon team members, schedules, and performance."
      icon="🧑‍💼"
      [breadcrumbs]="[]"
      [primaryAction]="addAction"
      (action)="handleAction($event)">
    </app-enterprise-feature-page>

    <div class="st-toolbar">
      <input [(ngModel)]="search" (input)="load()" placeholder="Search by name, email, or phone..." class="st-search">
      <select [(ngModel)]="roleFilter" (change)="load()" class="st-select">
        <option value="">All Roles</option>
        <option value="STYLIST">Stylist</option>
        <option value="THERAPIST">Therapist</option>
        <option value="RECEPTIONIST">Receptionist</option>
        <option value="MANAGER">Manager</option>
        <option value="CASHIER">Cashier</option>
      </select>
      <select [(ngModel)]="activeFilter" (change)="load()" class="st-select">
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>

    <app-state-view *ngIf="loading()" type="loading" message="Loading staff..."></app-state-view>
    <app-state-view *ngIf="error()" type="error" title="Failed to load staff" [message]="error()"></app-state-view>
    <app-state-view *ngIf="!loading() && !error() && staffList().length === 0" type="empty" title="No staff members found" message="Add your first team member to get started."></app-state-view>

    <div class="st-grid" *ngIf="!loading() && !error() && staffList().length > 0">
      <div class="st-card" *ngFor="let s of staffList(); trackBy: trackById" [class.inactive]="!s.isActive">
        <div class="st-card-head">
          <div class="st-avatar">{{ s.fullName.charAt(0) }}</div>
          <div>
            <strong>{{ s.fullName }}</strong>
            <span class="st-role-badge">{{ s.role }}</span>
          </div>
          <span class="st-status-dot" [class.active]="s.isActive" [class.inactive]="!s.isActive" [attr.aria-label]="s.isActive ? 'Active' : 'Inactive'"></span>
        </div>
        <div class="st-card-body">
          <p><span>Email:</span> {{ s.email }}</p>
          <p><span>Phone:</span> {{ s.phone || '—' }}</p>
          <p><span>Specialization:</span> {{ s.specialization || '—' }}</p>
          <p><span>Bio:</span> {{ s.bio || '—' }}</p>
        </div>
        <div class="st-card-actions">
          <a class="st-btn st-btn-primary" [routerLink]="['/app/staff', s.id]">View Profile</a>
          <button class="st-btn st-btn-ghost" (click)="edit(s)">Edit</button>
          <button class="st-btn st-btn-danger" (click)="toggleActive(s)">
            {{ s.isActive ? 'Deactivate' : 'Activate' }}
          </button>
        </div>
      </div>
    </div>

    <div class="st-drawer-overlay" *ngIf="showForm()" (click)="closeForm()" role="dialog" aria-modal="true" aria-label="Staff form">
      <div class="st-drawer" (click)="$event.stopPropagation()">
        <form (ngSubmit)="save()">
          <h2>{{ editingId() ? 'Edit Staff' : 'Add Staff' }}</h2>
          <input name="fullName" [(ngModel)]="form.fullName" placeholder="Full name" required>
          <input name="email" [(ngModel)]="form.email" placeholder="Email" required>
          <input name="phone" [(ngModel)]="form.phone" placeholder="Phone">
          <select name="role" [(ngModel)]="form.role">
            <option value="STYLIST">Stylist</option>
            <option value="THERAPIST">Therapist</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
          </select>
          <input name="specialization" [(ngModel)]="form.specialization" placeholder="Specialization">
          <textarea name="bio" [(ngModel)]="form.bio" placeholder="Bio"></textarea>
          <input name="password" [(ngModel)]="form.password" placeholder="Password" type="password" required>
          <div class="st-form-actions">
            <button type="button" (click)="closeForm()">Cancel</button>
            <button type="submit">{{ editingId() ? 'Update' : 'Save Staff' }}</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .st-toolbar{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px}
    .st-search{flex:1;min-width:200px;padding:14px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;background:var(--surface-card,#fff);color:var(--text-strong,#111827)}
    .st-select{padding:14px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;background:var(--surface-card,#fff);color:var(--text-strong,#111827)}
    .st-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .st-card{background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .st-card.inactive{opacity:.6}
    .st-card-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
    .st-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;flex-shrink:0}
    .st-card-head strong{font-size:16px;display:block;color:var(--text-strong,#111827)}
    .st-role-badge{display:inline-block;font-size:11px;background:var(--surface-muted,#f1f5f9);padding:3px 10px;border-radius:20px;margin-top:4px;font-weight:600;color:var(--text-soft,#64748b)}
    .st-status-dot{width:10px;height:10px;border-radius:50%;margin-left:auto}
    .st-status-dot.active{background:#16a34a}.st-status-dot.inactive{background:#dc2626}
    .st-card-body{display:grid;gap:6px;margin-bottom:16px}
    .st-card-body p{margin:0;font-size:13px;color:var(--text-strong,#111827);display:flex;gap:4px}
    .st-card-body span{color:var(--text-soft,#64748b);font-weight:600}
    .st-card-actions{display:flex;gap:8px;flex-wrap:wrap}
    .st-btn{border:0;border-radius:10px;padding:9px 14px;font-weight:700;cursor:pointer;font-size:12px;flex:1;text-align:center;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
    .st-btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
    .st-btn-ghost{background:var(--surface-muted,#f1f5f9);color:var(--text-strong,#111827)}
    .st-btn-danger{background:#fee2e2;color:#991b1b}
    .st-drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .st-drawer{background:var(--surface-card,#fff);border-radius:24px;width:min(460px,90%);max-height:90vh;overflow-y:auto;padding:28px}
    .st-drawer h2{margin:0 0 18px;color:var(--text-strong,#111827)}
    form{display:grid;gap:14px}
    form input,select,textarea{padding:14px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;background:var(--surface-app,#f8fafc);color:var(--text-strong,#111827)}
    textarea{min-height:80px}
    .st-form-actions{display:flex;gap:12px;justify-content:flex-end}
    .st-form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .st-form-actions button:last-child{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
    @media(max-width:1200px){.st-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.st-grid{grid-template-columns:1fr}.st-toolbar{flex-direction:column}}
    @media(max-width:600px){.st-card-actions{flex-direction:column}}
  `]
})
export class StaffComponent {
  private api = inject(StaffService);

  staffList = signal<Staff[]>([]);
  search = '';
  roleFilter = '';
  activeFilter = '';
  loading = signal(true);
  error = signal('');

  showForm = signal(false);
  editingId = signal('');
  form: any = { fullName: '', email: '', phone: '', role: 'STYLIST', specialization: '', bio: '', password: '' };

  addAction: EnterpriseAction = { key: 'add', label: 'Add Staff', icon: '➕', variant: 'primary' };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    const params: any = {};
    if (this.search) params.search = this.search;
    if (this.roleFilter) params.role = this.roleFilter;
    if (this.activeFilter) params.isActive = this.activeFilter;
    this.api.getAll(params).pipe(
      catchError(() => {
        this.error.set('Staff data unavailable. Check backend.');
        this.loading.set(false);
        return of([]);
      })
    ).subscribe(d => {
      this.staffList.set(d);
      this.loading.set(false);
    });
  }

  handleAction(e: EnterpriseAction) {
    if (e.key === 'add') this.openForm();
  }

  openForm() {
    this.editingId.set('');
    this.form = { fullName: '', email: '', phone: '', role: 'STYLIST', specialization: '', bio: '', password: '' };
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  edit(s: Staff) {
    this.editingId.set(s.id);
    this.form = { fullName: s.fullName, email: s.email, phone: s.phone, role: s.role, specialization: s.specialization, bio: s.bio, password: '' };
    this.showForm.set(true);
  }

  save() {
    const obs = this.editingId() ? this.api.update(this.editingId(), this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.load(); } });
  }

  toggleActive(s: Staff) {
    this.api.update(s.id, { isActive: !s.isActive }).subscribe({ next: () => this.load() });
  }

  trackById(_: number, s: Staff): string { return s.id; }
}
