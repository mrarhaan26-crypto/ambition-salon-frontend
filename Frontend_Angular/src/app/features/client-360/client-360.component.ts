import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import type { ClientProfile, ClientBookingItem, ClientPaymentItem } from './client-360.models';
import { environment } from '../../../environments/environment';

type C360Tab = 'overview' | 'sales' | 'appointments' | 'packages' | 'memberships' | 'wallet' | 'rewards' | 'notes' | 'documents' | 'treatments';

@Component({
  selector: 'app-client-360',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="c360-overlay" (click)="close.emit()">
      <div class="c360-panel" (click)="$event.stopPropagation()">
        <div class="c360-header">
          <div class="c360-h-left">
            <h2>{{ profile?.fullName || 'Client Profile' }}</h2>
            <span class="c360-h-sub" *ngIf="profile?.city">{{ profile.city }}</span>
          </div>
          <button class="c360-close" (click)="close.emit()">&times;</button>
        </div>

        <div class="c360-tabs">
          <button *ngFor="let t of tabList" [class.active]="activeTab === t.id" (click)="activeTab = t.id" class="c360-tab">{{ t.label }}</button>
        </div>

        <div class="c360-body">
          <ng-container [ngSwitch]="activeTab">
            <!-- OVERVIEW -->
            <div class="c360-tab-content" *ngSwitchCase="'overview'">
              <div class="c360-loading" *ngIf="loadingProfile"><div class="spinner"></div><span>Loading profile...</span></div>

              <ng-container *ngIf="!loadingProfile && profile">
                <div class="ov-profile-card">
                  <div class="ov-avatar">{{ (profile.fullName || '?').charAt(0) }}</div>
                  <div class="ov-info">
                    <span class="ov-name">{{ profile.fullName }}</span>
                    <span class="ov-contact" *ngIf="profile.phone">{{ profile.phone }}</span>
                    <span class="ov-contact" *ngIf="profile.email">{{ profile.email }}</span>
                  </div>
                </div>

                <div class="ov-stats">
                  <div class="ov-stat">
                    <span class="ov-stat-val">{{ (profile.totalSpend || 0) | currency }}</span>
                    <span class="ov-stat-lbl">Lifetime Spend</span>
                  </div>
                  <div class="ov-stat">
                    <span class="ov-stat-val">{{ profile.totalVisits || 0 }}</span>
                    <span class="ov-stat-lbl">Total Visits</span>
                  </div>
                  <div class="ov-stat">
                    <span class="ov-stat-val">{{ (profile.walletBalance || 0) | currency }}</span>
                    <span class="ov-stat-lbl">Wallet Balance</span>
                  </div>
                  <div class="ov-stat">
                    <span class="ov-stat-val">{{ profile.loyaltyPoints || 0 }}</span>
                    <span class="ov-stat-lbl">Loyalty Points</span>
                  </div>
                </div>

                <div class="ov-detail" *ngIf="profile.lastVisitAt">
                  <span class="ov-detail-lbl">Last Visit</span>
                  <span class="ov-detail-val">{{ profile.lastVisitAt | date:'MMM dd, yyyy' }}</span>
                </div>
                <div class="ov-detail" *ngIf="profile.createdAt">
                  <span class="ov-detail-lbl">Client Since</span>
                  <span class="ov-detail-val">{{ profile.createdAt | date:'MMM dd, yyyy' }}</span>
                </div>

                <div class="ov-section" *ngIf="upcomingBooking">
                  <h4>Upcoming Appointment</h4>
                  <div class="ov-upcoming">
                    <span class="ov-up-title">{{ upcomingBooking.title }}</span>
                    <span class="ov-up-date">{{ upcomingBooking.startTime | date:'MMM dd, h:mm a' }}</span>
                    <span class="ov-up-staff" *ngIf="upcomingBooking.staff">{{ upcomingBooking.staff.fullName }}</span>
                  </div>
                </div>
              </ng-container>
            </div>

            <!-- SALES -->
            <div class="c360-tab-content" *ngSwitchCase="'sales'">
              <div class="c360-loading" *ngIf="loadingPayments"><div class="spinner"></div><span>Loading sales...</span></div>
              <ng-container *ngIf="!loadingPayments">
                <div class="tab-empty" *ngIf="!payments?.length">
                  <span class="tab-empty-icon">&#x1F4B0;</span>
                  <p>No sales records yet</p>
                  <span class="tab-empty-hint">Payments and invoices will appear here once the client makes a purchase.</span>
                </div>
                <div class="pay-list" *ngIf="payments?.length">
                  <div class="pay-row" *ngFor="let p of payments">
                    <span class="pay-amount">{{ p.amount | currency }}</span>
                    <span class="pay-method">{{ p.method }}</span>
                    <span class="pay-status" [class.pay-paid]="p.status==='PAID'||p.status==='COMPLETED'">{{ p.status }}</span>
                    <span class="pay-date">{{ p.createdAt | date:'MMM dd, yyyy' }}</span>
                  </div>
                </div>
              </ng-container>
            </div>

            <!-- APPOINTMENTS -->
            <div class="c360-tab-content" *ngSwitchCase="'appointments'">
              <div class="c360-loading" *ngIf="loadingAppointments"><div class="spinner"></div><span>Loading appointments...</span></div>
              <ng-container *ngIf="!loadingAppointments">
                <div class="tab-empty" *ngIf="!appointments?.length">
                  <span class="tab-empty-icon">&#x1F4C5;</span>
                  <p>No appointments yet</p>
                  <span class="tab-empty-hint">Booking history will appear here once the client schedules a visit.</span>
                </div>
                <div class="apt-list" *ngIf="appointments?.length">
                  <div class="apt-row" *ngFor="let a of appointments">
                    <div class="apt-main">
                      <span class="apt-title">{{ a.title }}</span>
                      <span class="apt-date">{{ a.startTime | date:'MMM dd, h:mm a' }} – {{ a.endTime | date:'h:mm a' }}</span>
                    </div>
                    <span class="apt-status" [class]="'badge-' + (a.status || '').toLowerCase()">{{ a.status }}</span>
                    <span class="apt-staff" *ngIf="a.staff">{{ a.staff.fullName }}</span>
                  </div>
                </div>
              </ng-container>
            </div>

            <!-- PACKAGES -->
            <div class="c360-tab-content" *ngSwitchCase="'packages'">
              <div class="tab-empty">
                <span class="tab-empty-icon">&#x1F4E6;</span>
                <p>No packages yet</p>
                <span class="tab-empty-hint">Purchased packages will appear here once the client buys a service package.</span>
              </div>
            </div>

            <!-- MEMBERSHIPS -->
            <div class="c360-tab-content" *ngSwitchCase="'memberships'">
              <div class="tab-empty">
                <span class="tab-empty-icon">&#x1F3C6;</span>
                <p>No memberships yet</p>
                <span class="tab-empty-hint">Active memberships and subscription plans will be listed here.</span>
              </div>
            </div>

            <!-- WALLET -->
            <div class="c360-tab-content" *ngSwitchCase="'wallet'">
              <div class="wallet-card" *ngIf="profile">
                <span class="wc-label">Wallet Balance</span>
                <span class="wc-amount">{{ (profile.walletBalance || 0) | currency }}</span>
              </div>
              <div class="tab-empty">
                <span class="tab-empty-icon">&#x1F4BC;</span>
                <p>No wallet transactions yet</p>
                <span class="tab-empty-hint">Wallet top-ups and deductions will appear here.</span>
              </div>
            </div>

            <!-- REWARDS -->
            <div class="c360-tab-content" *ngSwitchCase="'rewards'">
              <div class="rewards-card" *ngIf="profile">
                <span class="rc-label">Loyalty Points</span>
                <span class="rc-points">{{ profile.loyaltyPoints || 0 }}</span>
                <span class="rc-hint">Points can be redeemed against services and products.</span>
              </div>
              <div class="tab-empty">
                <span class="tab-empty-icon">&#x2B50;</span>
                <p>No reward redemptions yet</p>
                <span class="tab-empty-hint">Reward history will appear once points are redeemed.</span>
              </div>
            </div>

            <!-- NOTES -->
            <div class="c360-tab-content" *ngSwitchCase="'notes'">
              <div class="tab-empty" *ngIf="!profile?.notes">
                <span class="tab-empty-icon">&#x1F4DD;</span>
                <p>No notes yet</p>
                <span class="tab-empty-hint">Staff notes and client preferences will appear here.</span>
              </div>
              <div class="notes-display" *ngIf="profile?.notes">
                <p>{{ profile.notes }}</p>
              </div>
            </div>

            <!-- DOCUMENTS -->
            <div class="c360-tab-content" *ngSwitchCase="'documents'">
              <div class="tab-empty">
                <span class="tab-empty-icon">&#x1F4C4;</span>
                <p>No documents yet</p>
                <span class="tab-empty-hint">Uploaded documents, consent forms, and records will be displayed here.</span>
              </div>
            </div>

            <!-- TREATMENTS -->
            <div class="c360-tab-content" *ngSwitchCase="'treatments'">
              <div class="tab-empty">
                <span class="tab-empty-icon">&#x1F3E5;</span>
                <p>No treatment history yet</p>
                <span class="tab-empty-hint">Treatment notes, allergy records, and service history will appear here.</span>
              </div>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .c360-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:60;animation:fadeIn .15s ease}
    .c360-panel{background:white;width:min(520px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .c360-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white;z-index:2}
    .c360-h-left{flex:1;min-width:0}
    .c360-h-left h2{margin:0;font-size:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .c360-h-sub{font-size:13px;color:#6b7280;display:block;margin-top:2px}
    .c360-close{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280;padding:0;line-height:1;flex-shrink:0}
    .c360-tabs{display:flex;gap:4px;padding:12px 20px;overflow-x:auto;border-bottom:1px solid #e5e7eb;position:sticky;top:73px;background:white;z-index:1;scrollbar-width:thin}
    .c360-tab{border:0;background:transparent;padding:8px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;color:#6b7280;white-space:nowrap;transition:all .12s;flex-shrink:0}
    .c360-tab.active{background:#0b0b0b;color:white}
    .c360-tab:hover:not(.active){background:#f3f4f6;color:#374151}
    .c360-body{padding:24px 28px}
    .c360-tab-content{display:grid;gap:16px}
    .c360-loading{display:flex;align-items:center;gap:12px;padding:32px;justify-content:center;color:#6b7280;font-size:14px}
    .spinner{width:20px;height:20px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .ov-profile-card{display:flex;align-items:center;gap:14px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px}
    .ov-avatar{width:48px;height:48px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0}
    .ov-info{flex:1;min-width:0;display:grid;gap:3px}
    .ov-name{font-weight:800;font-size:16px;color:#111827}
    .ov-contact{font-size:13px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ov-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .ov-stat{padding:14px;background:white;border:1px solid #e5e7eb;border-radius:14px;display:grid;gap:4px;text-align:center}
    .ov-stat-val{font-size:20px;font-weight:800;color:#0b0b0b}
    .ov-stat-lbl{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
    .ov-detail{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
    .ov-detail-lbl{color:#6b7280;font-weight:600}
    .ov-detail-val{font-weight:700;color:#374151}
    .ov-section h4{font-size:13px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 10px;letter-spacing:.05em}
    .ov-upcoming{background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:12px 16px;display:grid;gap:4px}
    .ov-up-title{font-weight:700;font-size:14px;color:#1e40af}
    .ov-up-date{font-size:12px;color:#3b82f6}
    .ov-up-staff{font-size:12px;color:#6b7280}
    .pay-list{display:grid;gap:6px}
    .pay-row{display:flex;gap:10px;align-items:center;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;font-size:13px}
    .pay-amount{font-weight:800;font-size:15px;flex:1}
    .pay-method{color:#6b7280;font-size:12px;font-weight:600;min-width:40px}
    .pay-status{font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:#f3f4f6;color:#6b7280;text-transform:uppercase}
    .pay-paid{background:#f0fdf4;color:#16a34a}
    .pay-date{font-size:11px;color:#9ca3af}
    .apt-list{display:grid;gap:8px}
    .apt-row{display:flex;gap:12px;align-items:center;padding:12px 14px;background:white;border:1px solid #e5e7eb;border-radius:12px;transition:border-color .12s}
    .apt-row:hover{border-color:#d1d5db}
    .apt-main{flex:1;min-width:0;display:grid;gap:3px}
    .apt-title{font-weight:700;font-size:14px;color:#111827}
    .apt-date{font-size:12px;color:#6b7280}
    .apt-staff{font-size:12px;color:#6b7280;font-weight:600;min-width:80px;text-align:right}
    .apt-status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:.03em}
    .badge-confirmed{background:#dbeafe;color:#1d4ed8}
    .badge-completed{background:#f0fdf4;color:#16a34a}
    .badge-pending{background:#fefce8;color:#a16207}
    .badge-cancelled{background:#fef2f2;color:#dc2626}
    .badge-no_show{background:#f3f4f6;color:#6b7280}
    .badge-checked_in{background:#f3e8ff;color:#7c3aed}
    .wallet-card{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px;text-align:center;display:grid;gap:4px}
    .wc-label{font-size:12px;font-weight:700;text-transform:uppercase;color:#16a34a;letter-spacing:.04em}
    .wc-amount{font-size:28px;font-weight:800;color:#15803d}
    .rewards-card{background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:20px;text-align:center;display:grid;gap:4px}
    .rc-label{font-size:12px;font-weight:700;text-transform:uppercase;color:#a16207;letter-spacing:.04em}
    .rc-points{font-size:28px;font-weight:800;color:#92400e}
    .rc-hint{font-size:12px;color:#a16207;margin-top:4px}
    .notes-display{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px;font-size:14px;color:#374151;line-height:1.6}
    .tab-empty{padding:40px 24px;text-align:center;color:#6b7280;background:#f9fafb;border-radius:16px;border:1px solid #e5e7eb}
    .tab-empty-icon{font-size:36px;display:block;margin-bottom:10px}
    .tab-empty p{font-size:15px;font-weight:700;margin:0 0 6px;color:#374151}
    .tab-empty-hint{font-size:12px;color:#9ca3af;line-height:1.5;display:block}
    @media(max-width:600px){.c360-panel{width:100%}.c360-tabs{padding:8px 12px}.c360-tab{padding:6px 10px;font-size:11px}.c360-body{padding:16px 18px}.ov-stats{grid-template-columns:1fr 1fr;gap:8px}.ov-stat{padding:10px}.ov-stat-val{font-size:16px}}
  `]
})
export class Client360Component implements OnInit {
  @Input() clientId = '';
  @Output() close = new EventEmitter<void>();

  private http = inject(HttpClient);

  tabList: { id: C360Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'packages', label: 'Packages' },
    { id: 'memberships', label: 'Memberships' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'rewards', label: 'Rewards' },
    { id: 'notes', label: 'Notes' },
    { id: 'documents', label: 'Documents' },
    { id: 'treatments', label: 'Treatments' },
  ];

  activeTab: C360Tab = 'overview';

  profile: ClientProfile | null = null;
  loadingProfile = false;
  appointments: ClientBookingItem[] = [];
  loadingAppointments = false;
  payments: ClientPaymentItem[] = [];
  loadingPayments = false;

  upcomingBooking: ClientBookingItem | null = null;

  ngOnInit() {
    if (this.clientId) {
      this.loadAll();
    }
  }

  private loadAll() {
    this.loadingProfile = true;
    this.loadingAppointments = true;
    this.loadingPayments = true;

    const profileObs = this.http.get<ClientProfile>(`${environment.apiUrl}/clients/${this.clientId}`);
    const bookingsObs = this.http.get<ClientBookingItem[]>(`${environment.apiUrl}/bookings?clientId=${this.clientId}`);

    forkJoin({ profile: profileObs, bookings: bookingsObs }).subscribe({
      next: (results) => {
        this.profile = results.profile;
        this.appointments = Array.isArray(results.bookings) ? results.bookings : [];
        const now = new Date().toISOString();
        this.upcomingBooking = this.appointments.find(a => a.startTime > now && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' && a.status !== 'COMPLETED') || null;
        this.loadingProfile = false;
        this.loadingAppointments = false;
      },
      error: () => {
        this.loadingProfile = false;
        this.loadingAppointments = false;
      },
    });

    this.http.get<ClientPaymentItem[]>(`${environment.apiUrl}/payments?clientId=${this.clientId}`).subscribe({
      next: (d: ClientPaymentItem[]) => { this.payments = Array.isArray(d) ? d : []; this.loadingPayments = false; },
      error: () => { this.loadingPayments = false; },
    });
  }
}
