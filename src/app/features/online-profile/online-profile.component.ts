import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OnlineProfileService } from './online-profile.service';

@Component({
  selector: 'app-online-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Online Booking Profile</h1>
          <p>Manage your public booking page settings.</p>
        </div>
        <button class="primary" (click)="saveProfile()">Save Changes</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading profile...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="panel">
          <h2>Business Profile</h2>
          <div class="form-grid">
            <label>Business Name</label>
            <input [(ngModel)]="profile.businessName" placeholder="Business name">
            <label>Description / About</label>
            <textarea [(ngModel)]="profile.description" placeholder="Describe your business" rows="4"></textarea>
            <label>Photos URLs (comma separated)</label>
            <input [(ngModel)]="profile.photos" placeholder="https://...">
          </div>
        </div>

        <div class="panel">
          <h2>Booking Rules</h2>
          <div class="form-grid">
            <label>Cancellation Window (hours)</label>
            <input [(ngModel)]="profile.cancellationWindow" type="number">
            <label>Advance Booking (days)</label>
            <input [(ngModel)]="profile.advanceBookingDays" type="number">
            <label>Slot Size (minutes)</label>
            <input [(ngModel)]="profile.slotSizeMinutes" type="number">
          </div>
        </div>

        <div class="panel">
          <h2>Visibility Toggles</h2>
          <div class="toggle-row">
            <span>Show services on public booking page</span>
            <label class="switch">
              <input type="checkbox" [(ngModel)]="profile.publicServices">
              <span class="slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <span>Show staff on public booking page</span>
            <label class="switch">
              <input type="checkbox" [(ngModel)]="profile.publicStaff">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="panel preview">
          <h2>Public Preview</h2>
          <div class="preview-card">
            <strong>{{ profile.businessName || 'Your Business Name' }}</strong>
            <p>{{ profile.description || 'Business description will appear here.' }}</p>
            <div class="preview-meta">
              <span>{{ profile.publicServices ? 'Services visible' : 'Services hidden' }}</span>
              <span>{{ profile.publicStaff ? 'Staff visible' : 'Staff hidden' }}</span>
              <span>Cancel within {{ profile.cancellationWindow || 24 }}h</span>
            </div>
          </div>
          <div class="save-notice" *ngIf="saveMsg">{{ saveMsg }}</div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    h2{font-size:20px;margin:0 0 16px}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .form-grid{display:grid;gap:12px;max-width:600px}
    .form-grid label{font-size:13px;font-weight:600;color:#374151;margin-bottom:-6px}
    .form-grid input,textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px;font-family:inherit}
    textarea{resize:vertical}
    .toggle-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f3f4f6}
    .toggle-row:last-child{border:0}
    .toggle-row span{font-size:14px;font-weight:500}
    .switch{position:relative;display:inline-block;width:48px;height:26px}
    .switch input{opacity:0;width:0;height:0}
    .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#ddd;border-radius:26px;transition:.3s}
    .slider:before{content:'';position:absolute;height:20px;width:20px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.3s}
    .switch input:checked+.slider{background:#0b0b0b}
    .switch input:checked+.slider:before{transform:translateX(22px)}
    .preview-card{background:#f8fafc;border-radius:14px;padding:20px;max-width:500px}
    .preview-card strong{font-size:18px;display:block;margin-bottom:8px}
    .preview-card p{color:#6b7280;font-size:14px;margin-bottom:12px}
    .preview-meta{display:flex;gap:12px;flex-wrap:wrap}
    .preview-meta span{font-size:11px;background:#e5e7eb;padding:4px 10px;border-radius:12px;font-weight:600}
    .save-notice{padding:12px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;text-align:center;margin-top:12px}
  `]
})
export class OnlineProfileComponent {
  private api = inject(OnlineProfileService);
  profile: any = { businessName: '', description: '', photos: '', cancellationWindow: 24, advanceBookingDays: 30, slotSizeMinutes: 30, publicServices: true, publicStaff: true };
  loading = true;
  error = '';
  saveMsg = '';

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getProfile().subscribe({
      next: (d) => { this.profile = d; this.loading = false; },
      error: () => { this.error = 'Failed to load profile.'; this.loading = false; },
    });
  }

  saveProfile() {
    this.saveMsg = '';
    this.api.updateProfile(this.profile).subscribe({
      next: () => { this.saveMsg = 'Profile saved!'; setTimeout(() => this.saveMsg = '', 3000); },
    });
  }
}
