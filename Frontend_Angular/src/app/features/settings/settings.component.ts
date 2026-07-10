import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from './settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Settings</h1>
          <p>Business profile, branches, and configuration.</p>
        </div>
        <button class="primary" (click)="saveBusiness()" *ngIf="business">Save Settings</button>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading settings...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load settings.</strong>
        <p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="panel" *ngIf="business">
          <h2>Business Profile</h2>
          <div class="settings-form">
            <label>Business Name</label>
            <input [(ngModel)]="business.businessName" placeholder="Business name">
            <label>Email</label>
            <input [(ngModel)]="business.email" placeholder="Email" type="email">
            <label>Phone</label>
            <input [(ngModel)]="business.phone" placeholder="Phone">
            <label>Address</label>
            <input [(ngModel)]="business.address" placeholder="Address">
            <label>Currency</label>
            <select [(ngModel)]="business.currency">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="AED">AED (د.إ)</option>
            </select>
            <label>Timezone</label>
            <select [(ngModel)]="business.timezone">
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Denver">America/Denver</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="Asia/Singapore">Asia/Singapore</option>
            </select>
            <div class="save-notice" *ngIf="saveMsg">{{ saveMsg }}</div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h2>Branches</h2>
            <button (click)="openBranchForm()">+ Add Branch</button>
          </div>
          <div class="empty" *ngIf="branches.length === 0">
            <p>No branches configured.</p>
          </div>
          <div class="branch-list" *ngIf="branches.length > 0">
            <div class="branch-row" *ngFor="let b of branches">
              <div class="branch-info">
                <strong>{{ b.name }}</strong>
                <span>{{ b.city || 'No city' }} — {{ b._count?.bookings || 0 }} bookings</span>
              </div>
              <div class="branch-actions">
                <button (click)="editBranch(b)">Edit</button>
                <button class="danger" (click)="removeBranch(b)">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer-overlay" *ngIf="showBranchForm" (click)="showBranchForm = false">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <form (ngSubmit)="saveBranch()">
            <h2>{{ editingBranchId ? 'Edit Branch' : 'Add Branch' }}</h2>
            <input name="branchName" [(ngModel)]="branchForm.name" placeholder="Branch name" required>
            <input name="branchCity" [(ngModel)]="branchForm.city" placeholder="City">
            <div class="form-actions">
              <button type="button" (click)="showBranchForm = false">Cancel</button>
              <button type="submit">{{ editingBranchId ? 'Update' : 'Add Branch' }}</button>
            </div>
          </form>
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
    h2{font-size:20px;margin:0}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel h2{margin-bottom:18px}
    .panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
    .panel-head h2{margin:0}
    .panel-head button{border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;background:white}
    .settings-form{display:grid;gap:12px;max-width:600px}
    .settings-form label{font-size:13px;font-weight:600;color:#374151;margin-bottom:-6px}
    .settings-form input,select{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .save-notice{padding:12px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;text-align:center}
    .branch-list{display:grid;gap:8px}
    .branch-row{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#f8fafc;border-radius:14px}
    .branch-info strong{display:block;font-size:15px}
    .branch-info span{font-size:12px;color:#6b7280}
    .branch-actions{display:flex;gap:6px}
    .branch-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    .branch-actions .danger{background:#fee2e2;color:#991b1b}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;width:min(460px,90%);max-height:90vh;overflow-y:auto;padding:28px}
    .drawer-panel h2{margin:0 0 18px}
    form{display:grid;gap:14px}
    form input{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    @media(max-width:900px){.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class SettingsComponent {
  private api = inject(SettingsService);

  business: any = null;
  branches: any[] = [];
  loading = true;
  error = '';
  saveMsg = '';

  showBranchForm = false;
  editingBranchId = '';
  branchForm: any = { name: '', city: '' };

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true;
    this.error = '';
    this.api.getAll().subscribe({
      next: (d) => { this.business = d.business; this.branches = d.branches; this.loading = false; },
      error: () => { this.error = 'Settings data unavailable.'; this.loading = false; },
    });
  }

  saveBusiness() {
    this.saveMsg = '';
    this.api.updateBusiness(this.business).subscribe({
      next: () => { this.saveMsg = 'Settings saved successfully!'; setTimeout(() => this.saveMsg = '', 3000); },
    });
  }

  openBranchForm() {
    this.editingBranchId = '';
    this.branchForm = { name: '', city: '' };
    this.showBranchForm = true;
  }

  editBranch(b: any) {
    this.editingBranchId = b.id;
    this.branchForm = { name: b.name, city: b.city || '' };
    this.showBranchForm = true;
  }

  saveBranch() {
    const obs = this.editingBranchId
      ? this.api.updateBranch(this.editingBranchId, this.branchForm)
      : this.api.createBranch(this.branchForm);
    obs.subscribe({ next: () => { this.showBranchForm = false; this.loadAll(); } });
  }

  removeBranch(b: any) {
    if (!confirm(`Delete branch "${b.name}"?`)) return;
    this.api.removeBranch(b.id).subscribe({ next: () => this.loadAll() });
  }
}
