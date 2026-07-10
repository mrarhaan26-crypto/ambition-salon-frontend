import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffService } from './staff.service';
import { Staff } from './staff.models';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Staff Management</h1>
          <p>Manage your salon team members, schedules, and performance.</p>
        </div>
        <button class="primary" (click)="openForm()">+ Add Staff</button>
      </div>

      <div class="toolbar">
        <input [(ngModel)]="search" (input)="load()" placeholder="Search by name, email, or phone...">
        <select [(ngModel)]="roleFilter" (change)="load()">
          <option value="">All Roles</option>
          <option value="STYLIST">Stylist</option>
          <option value="THERAPIST">Therapist</option>
          <option value="RECEPTIONIST">Receptionist</option>
          <option value="MANAGER">Manager</option>
          <option value="CASHIER">Cashier</option>
        </select>
        <select [(ngModel)]="activeFilter" (change)="load()">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading staff...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load staff.</strong>
        <p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && staffList.length === 0">
        <p>No staff members found. Add your first team member to get started.</p>
      </div>

      <div class="staff-grid" *ngIf="!loading && !error && staffList.length > 0">
        <div class="staff-card" *ngFor="let s of staffList" [class.inactive]="!s.isActive">
          <div class="card-head">
            <div class="avatar">{{ s.fullName.charAt(0) }}</div>
            <div>
              <strong>{{ s.fullName }}</strong>
              <span class="role-badge">{{ s.role }}</span>
            </div>
            <span class="status-dot" [class.active]="s.isActive" [class.inactive]="!s.isActive"></span>
          </div>
          <div class="card-body">
            <p><span>Email:</span> {{ s.email }}</p>
            <p><span>Phone:</span> {{ s.phone || '—' }}</p>
            <p><span>Specialization:</span> {{ s.specialization || '—' }}</p>
            <p><span>Bio:</span> {{ s.bio || '—' }}</p>
          </div>
          <div class="card-actions">
            <button (click)="edit(s)">Edit</button>
            <button (click)="viewPerformance(s)">Performance</button>
            <button class="danger" (click)="toggleActive(s)">
              {{ s.isActive ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <form (ngSubmit)="save()">
            <h2>{{ editingId ? 'Edit Staff' : 'Add Staff' }}</h2>
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
            <div class="form-actions">
              <button type="button" (click)="closeForm()">Cancel</button>
              <button type="submit">{{ editingId ? 'Update' : 'Save Staff' }}</button>
            </div>
          </form>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showPerformance" (click)="closePerformance()">
        <div class="drawer-panel drawer-wide" (click)="$event.stopPropagation()">
          <div class="perf-head">
            <h2>Performance: {{ perfStaff?.fullName }}</h2>
            <button (click)="closePerformance()">Close</button>
          </div>
          <div class="loading" *ngIf="perfLoading">
            <div class="spinner"></div>
            <span>Loading performance...</span>
          </div>
          <div class="perf-kpis" *ngIf="perfData">
            <div class="perf-card"><span>Bookings</span><strong>{{ perfData.summary.totalBookings }}</strong></div>
            <div class="perf-card"><span>Completed</span><strong class="green">{{ perfData.summary.completedBookings }}</strong></div>
            <div class="perf-card"><span>Cancelled</span><strong class="red">{{ perfData.summary.cancelledBookings }}</strong></div>
            <div class="perf-card"><span>No-show</span><strong class="amber">{{ perfData.summary.noShowBookings }}</strong></div>
            <div class="perf-card"><span>Revenue</span><strong>{{ perfData.summary.revenue | currency:'USD':'symbol':'1.0-0' }}</strong></div>
            <div class="perf-card"><span>Completion</span><strong>{{ perfData.summary.completionRate }}%</strong></div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .toolbar{display:flex;gap:12px;flex-wrap:wrap}
    .toolbar input{flex:1;min-width:200px;padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .toolbar select{padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;width:min(460px,90%);max-height:90vh;overflow-y:auto;padding:28px}
    .drawer-panel.drawer-wide{width:min(640px,90%)}
    .drawer-panel h2{margin:0 0 18px}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .staff-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .staff-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .staff-card.inactive{opacity:.6}
    .card-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
    .avatar{width:44px;height:44px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px}
    .card-head strong{font-size:16px;display:block}
    .role-badge{display:inline-block;font-size:11px;background:#f3f4f6;padding:3px 10px;border-radius:20px;margin-top:4px;font-weight:600;color:#374151}
    .status-dot{width:10px;height:10px;border-radius:50%;margin-left:auto}
    .status-dot.active{background:#16a34a}.status-dot.inactive{background:#dc2626}
    .card-body{display:grid;gap:6px;margin-bottom:16px}
    .card-body p{margin:0;font-size:13px;color:#374151;display:flex;gap:4px}
    .card-body span{color:#6b7280;font-weight:600}
    .card-actions{display:flex;gap:8px;flex-wrap:wrap}
    .card-actions button{border:0;border-radius:10px;padding:9px 14px;font-weight:700;cursor:pointer;font-size:12px;background:#f3f4f6;flex:1}
    .card-actions .danger{background:#fee2e2;color:#991b1b}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-wide{justify-content:center;align-items:center}
    form{width:min(440px,100%);background:white;padding:28px;display:grid;gap:14px;overflow-y:auto}
    form input,select,textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    textarea{min-height:80px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    .perf-panel{background:white;border-radius:24px;padding:32px;width:min(600px,90%);max-height:80vh;overflow-y:auto}
    .perf-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
    .perf-head h2{margin:0}
    .perf-head button{border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;background:white}
    .perf-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .perf-card{background:#f8fafc;border-radius:16px;padding:18px;text-align:center}
    .perf-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:6px}
    .perf-card strong{font-size:24px}.green{color:#16a34a}.red{color:#dc2626}.amber{color:#d97706}
    @media(max-width:1200px){.staff-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.staff-grid{grid-template-columns:1fr}.toolbar{flex-direction:column}}
    @media(max-width:600px){.head{flex-direction:column;align-items:flex-start;gap:12px}.perf-kpis{grid-template-columns:1fr}}
  `]
})
export class StaffComponent {
  private api = inject(StaffService);

  staffList: Staff[] = [];
  search = '';
  roleFilter = '';
  activeFilter = '';
  loading = true;
  error = '';

  showForm = false;
  editingId = '';
  form: any = { fullName: '', email: '', phone: '', role: 'STYLIST', specialization: '', bio: '', password: '' };

  showPerformance = false;
  perfStaff: Staff | null = null;
  perfData: any = null;
  perfLoading = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    const params: any = {};
    if (this.search) params.search = this.search;
    if (this.roleFilter) params.role = this.roleFilter;
    if (this.activeFilter) params.isActive = this.activeFilter;
    this.api.getAll(params).subscribe({
      next: (d) => { this.staffList = d; this.loading = false; },
      error: () => { this.error = 'Staff data unavailable. Check backend.'; this.loading = false; },
    });
  }

  openForm() {
    this.editingId = '';
    this.form = { fullName: '', email: '', phone: '', role: 'STYLIST', specialization: '', bio: '', password: '' };
    this.showForm = true;
  }

  closeForm() { this.showForm = false; }

  edit(s: Staff) {
    this.editingId = s.id;
    this.form = { fullName: s.fullName, email: s.email, phone: s.phone, role: s.role, specialization: s.specialization, bio: s.bio, password: '' };
    this.showForm = true;
  }

  save() {
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.load(); } });
  }

  toggleActive(s: Staff) {
    this.api.update(s.id, { isActive: !s.isActive }).subscribe({ next: () => this.load() });
  }

  closePerformance() { this.showPerformance = false; }

  viewPerformance(s: Staff) {
    this.perfStaff = s;
    this.showPerformance = true;
    this.perfLoading = true;
    this.perfData = null;
    this.api.getPerformance(s.id).subscribe({
      next: (d) => { this.perfData = d; this.perfLoading = false; },
      error: () => { this.perfLoading = false; },
    });
  }
}
