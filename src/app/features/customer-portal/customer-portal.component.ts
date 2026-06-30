import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerPortalService } from './customer-portal.service';

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <h1>Customer Portal</h1>
        <p>View customer profile, bookings, wallet, memberships & loyalty.</p>
      </div>

      <div class="client-picker">
        <input [(ngModel)]="clientId" placeholder="Enter Client ID" class="input">
        <button class="primary" (click)="loadAll()">Load Portal</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading portal data...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error && profile">
        <div class="profile-card">
          <h2>Profile</h2>
          <div class="profile-info">
            <span><strong>Name:</strong> {{ profile.fullName }}</span>
            <span><strong>Phone:</strong> {{ profile.phone || 'N/A' }}</span>
            <span><strong>Email:</strong> {{ profile.email || 'N/A' }}</span>
            <span><strong>Visits:</strong> {{ profile.totalVisits }}</span>
            <span><strong>Total Spend:</strong> {{ profile.totalSpend | currency }}</span>
          </div>
        </div>

        <div class="grid-2col">
          <div class="panel">
            <h2>Upcoming Bookings</h2>
            <div class="empty" *ngIf="upcoming.length === 0"><p>No upcoming bookings.</p></div>
            <div class="booking-item" *ngFor="let b of upcoming">
              <strong>{{ b.title }}</strong>
              <span>{{ b.startTime | date:'MMM dd, yyyy HH:mm' }}</span>
              <span class="badge" [class]="'st-'+b.status.toLowerCase()">{{ b.status }}</span>
            </div>
          </div>

          <div class="panel">
            <h2>Past Bookings</h2>
            <div class="empty" *ngIf="past.length === 0"><p>No past bookings.</p></div>
            <div class="booking-item" *ngFor="let b of past">
              <strong>{{ b.title }}</strong>
              <span>{{ b.startTime | date:'MMM dd, yyyy' }}</span>
              <span class="badge" [class]="'st-'+b.status.toLowerCase()">{{ b.status }}</span>
            </div>
          </div>
        </div>

        <div class="grid-3col">
          <div class="panel">
            <h2>Wallet</h2>
            <div class="balance">{{ (wallet?.balance || 0) | currency }}</div>
            <p class="small">{{ wallet?.transactions?.length || 0 }} transactions</p>
          </div>

          <div class="panel">
            <h2>Memberships</h2>
            <div class="empty" *ngIf="memberships.length === 0"><p>No active memberships.</p></div>
            <div class="item" *ngFor="let m of memberships">
              <strong>{{ m.membershipPlan?.name }}</strong>
              <span class="small">Exp: {{ m.endDate | date:'MMM dd, yyyy' }}</span>
            </div>
          </div>

          <div class="panel">
            <h2>Loyalty</h2>
            <div class="balance">{{ loyalty?.points || 0 }} pts</div>
            <p class="small">{{ loyalty?.rewards?.length || 0 }} rewards</p>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head h1{font-size:34px;margin:0}
    .head p{color:#6b7280;margin:6px 0 0}
    .client-picker{display:flex;gap:12px}
    .input{flex:1;max-width:400px;padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    h2{font-size:20px;margin:0 0 16px}
    .profile-card,.panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .profile-info{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .profile-info span{font-size:14px}
    .grid-2col,.grid-3col{display:grid;gap:16px}
    .grid-2col{grid-template-columns:1fr 1fr}
    .grid-3col{grid-template-columns:1fr 1fr 1fr}
    .empty{padding:16px;text-align:center;color:#6b7280;font-size:13px}
    .booking-item{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
    .booking-item:last-child{border:0}
    .booking-item strong{flex:1}
    .badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .st-pending{background:#fef3c7;color:#a16207}
    .st-confirmed{background:#dbeafe;color:#1d4ed8}
    .st-completed{background:#f0fdf4;color:#16a34a}
    .st-cancelled{background:#fee2e2;color:#991b1b}
    .balance{font-size:28px;font-weight:900}
    .small{font-size:12px;color:#6b7280;margin:4px 0 0}
    .item{padding:8px 0;border-bottom:1px solid #f3f4f6}
    .item strong{display:block;font-size:14px}
    @media(max-width:900px){.grid-2col,.grid-3col{grid-template-columns:1fr}}
  `]
})
export class CustomerPortalComponent {
  private api = inject(CustomerPortalService);
  clientId = '';
  profile: any = null;
  bookings: any[] = [];
  wallet: any = null;
  memberships: any[] = [];
  packages: any[] = [];
  loyalty: any = null;
  loading = false;
  error = '';

  get upcoming() { return this.bookings.filter(b => new Date(b.startTime) > new Date() && b.status !== 'CANCELLED'); }
  get past() { return this.bookings.filter(b => new Date(b.startTime) <= new Date() || b.status === 'CANCELLED'); }

  ngOnInit() { if (this.clientId) this.loadAll(); }

  loadAll() {
    if (!this.clientId) return;
    this.loading = true; this.error = '';
    this.api.getProfile(this.clientId).subscribe({
      next: (d) => { this.profile = d; this.loading = false; },
      error: () => { this.error = 'Failed to load portal.'; this.loading = false; },
    });
    this.api.getBookings(this.clientId).subscribe({ next: (d) => this.bookings = d });
    this.api.getWallet(this.clientId).subscribe({ next: (d) => this.wallet = d });
    this.api.getMemberships(this.clientId).subscribe({ next: (d) => this.memberships = d });
    this.api.getPackages(this.clientId).subscribe({ next: (d) => this.packages = d });
    this.api.getLoyalty(this.clientId).subscribe({ next: (d) => this.loyalty = d });
  }
}
