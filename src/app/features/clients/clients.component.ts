import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientsService } from './clients.service';
import { Client, ClientBookingSummary, ClientFormSubmission, getClientAge, isBirthdayThisMonth } from './client.model';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="clients">
      <div class="head">
        <div>
          <h1>Clients CRM</h1>
          <p>Manage salon clients, wallet, loyalty and visit history.</p>
        </div>
        <button class="primary" (click)="openForm()">+ Add Client</button>
      </div>

      <div class="toolbar">
        <input [(ngModel)]="search" (input)="onSearch()" placeholder="Search by name, phone, email or city..." class="filter-input">
        <button class="clear-search-btn" *ngIf="search" (click)="clearSearch()">✕</button>
        <select [(ngModel)]="sortBy" (change)="onSortChange()" class="filter-select">
          <option value="name">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="visits">Most Visits</option>
          <option value="spend">Highest Spend</option>
          <option value="lastVisit">Last Visit</option>
        </select>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div><span>Loading clients...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load clients.</strong>
        <p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && clients.length === 0">
        <div class="empty-icon">👥</div>
        <p>No clients found.</p>
        <span class="empty-hint" *ngIf="search">Try a different search term or <a href="#" (click)="clearSearch(); $event.preventDefault()">clear it</a>.</span>
        <span class="empty-hint" *ngIf="!search">Add your first client to get started.</span>
      </div>

      <div class="grid" *ngIf="!loading && !error && clients.length > 0">
        <div class="card" *ngFor="let client of clients">
          <div class="card-top">
            <div class="avatar" [class.birthday-month]="isBirthdayMonth(client.dateOfBirth)">
              {{ (client.fullName || '?').charAt(0).toUpperCase() }}
            </div>
            <div class="card-info">
              <h3>{{ client.fullName }}</h3>
              <span class="contact-line" *ngIf="client.phone">{{ client.phone }}</span>
              <span class="contact-line" *ngIf="client.email">{{ client.email }}</span>
            </div>
          </div>
          <div class="card-indicators">
            <span class="indicator indicator-birthday" *ngIf="isBirthdayMonth(client.dateOfBirth)" title="Birthday this month">🎂</span>
            <span class="indicator indicator-vip" *ngIf="(client.totalVisits || 0) >= 20 || (client.totalSpend || 0) >= 5000" title="VIP Client">⭐ VIP</span>
            <span class="indicator indicator-new" *ngIf="isNewClient(client)" title="New client">🆕 New</span>
            <span class="indicator indicator-recent" *ngIf="client.lastVisitAt" title="Last visit">{{ client.lastVisitAt | date:'MMM dd' }}</span>
          </div>
          <div class="stats">
            <span><strong>{{ client.totalVisits || 0 }}</strong> visits</span>
            <span><strong>{{ (client.totalSpend || 0) | currency }}</strong> spend</span>
            <span><strong>{{ client.loyaltyPoints || 0 }}</strong> pts</span>
          </div>
          <div class="actions">
            <button (click)="openDetail(client)">View</button>
            <button (click)="edit(client)">Edit</button>
            <button class="danger" (click)="remove(client)">Delete</button>
          </div>
        </div>
      </div>

      <div class="pagination-bar" *ngIf="!loading && !error && total > 0">
        <span class="pagination-info">{{ total }} client{{ total === 1 ? '' : 's' }} — Page {{ page }} of {{ totalPages }}</span>
        <div class="pagination-controls">
          <select [(ngModel)]="limit" (change)="page = 1; load()" class="page-size-select">
            <option [value]="12">12 / page</option>
            <option [value]="24">24 / page</option>
            <option [value]="48">48 / page</option>
            <option [value]="96">96 / page</option>
          </select>
          <button class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)">← Prev</button>
          <span class="page-indicator">{{ page }}</span>
          <button class="page-btn" [disabled]="page >= totalPages" (click)="goToPage(page + 1)">Next →</button>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showDetail" (click)="closeDetail()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <ng-container *ngIf="selectedClient; else noClient">
            <div class="drawer-header">
              <div class="drawer-header-info">
                <div class="drawer-avatar-row">
                  <div class="avatar-lg" [class.birthday-month]="isBirthdayMonth(selectedClient.dateOfBirth)">
                    {{ (selectedClient.fullName || '?').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <h2>{{ selectedClient.fullName }}</h2>
                    <span class="header-contact" *ngIf="selectedClient.phone">{{ selectedClient.phone }}</span>
                    <span class="header-contact" *ngIf="selectedClient.email"> &middot; {{ selectedClient.email }}</span>
                  </div>
                </div>
              </div>
              <button class="close-btn" (click)="closeDetail()">&times;</button>
            </div>

            <div class="drawer-body">
              <div class="quick-actions">
                <a [routerLink]="'/app/bookings'" [queryParams]="{clientId: selectedClient.id}" class="qa-btn">📅 Book</a>
                <a [routerLink]="'/app/client-timeline'" [queryParams]="{clientId: selectedClient.id}" class="qa-btn">📋 Timeline</a>
                <a [routerLink]="'/app/wallet'" [queryParams]="{clientId: selectedClient.id}" class="qa-btn qa-disabled" *ngIf="!hasWalletRoute" title="Wallet module">💳 Wallet</a>
                <a *ngIf="hasWalletRoute" [routerLink]="'/app/wallet'" [queryParams]="{clientId: selectedClient.id}" class="qa-btn">💳 Wallet</a>
                <a [routerLink]="'/app/memberships'" [queryParams]="{clientId: selectedClient.id}" class="qa-btn qa-disabled" *ngIf="!hasMembershipsRoute" title="Memberships module">🎫 Memberships</a>
                <a *ngIf="hasMembershipsRoute" [routerLink]="'/app/memberships'" [queryParams]="{clientId: selectedClient.id}" class="qa-btn">🎫 Memberships</a>
                <a [routerLink]="'/app/packages'" [queryParams]="{clientId: selectedClient.id}" class="qa-btn qa-disabled" *ngIf="!hasPackagesRoute" title="Packages module">📦 Packages</a>
                <a *ngIf="hasPackagesRoute" [routerLink]="'/app/packages'" [queryParams]="{clientId: selectedClient.id}" class="qa-btn">📦 Packages</a>
              </div>

              <div class="drawer-section">
                <h3>Contact</h3>
                <div class="contact-card">
                  <div class="info-row" *ngIf="selectedClient.phone"><span>Phone</span><span>{{ selectedClient.phone }}</span></div>
                  <div class="info-row" *ngIf="selectedClient.email"><span>Email</span><span>{{ selectedClient.email }}</span></div>
                  <div class="info-row" *ngIf="selectedClient.dateOfBirth"><span>Date of Birth</span><span>{{ selectedClient.dateOfBirth | date:'MMM dd, yyyy' }} ({{ getAge(selectedClient.dateOfBirth) }} yrs)</span></div>
                  <div class="info-row" *ngIf="selectedClient.gender"><span>Gender</span><span>{{ selectedClient.gender }}</span></div>
                  <div class="info-row" *ngIf="selectedClient.city"><span>City</span><span>{{ selectedClient.city }}</span></div>
                  <div class="info-row" *ngIf="selectedClient.address"><span>Address</span><span>{{ selectedClient.address }}</span></div>
                </div>
              </div>

              <div class="drawer-section">
                <h3>Statistics</h3>
                <div class="stats-grid">
                  <div class="stat-card">
                    <strong>{{ selectedClient.totalVisits || 0 }}</strong>
                    <span>Total Visits</span>
                  </div>
                  <div class="stat-card">
                    <strong>{{ (selectedClient.totalSpend || 0) | currency }}</strong>
                    <span>Total Spend</span>
                  </div>
                  <div class="stat-card">
                    <strong>{{ selectedClient.loyaltyPoints || 0 }}</strong>
                    <span>Loyalty Points</span>
                  </div>
                  <div class="stat-card">
                    <strong>{{ selectedClient.walletBalance || 0 | currency }}</strong>
                    <span>Wallet Balance</span>
                  </div>
                  <div class="stat-card" *ngIf="clientUpcomingBookings.length > 0">
                    <strong>{{ clientUpcomingBookings.length }}</strong>
                    <span>Upcoming</span>
                  </div>
                  <div class="stat-card" *ngIf="selectedClient.lastVisitAt">
                    <strong>{{ selectedClient.lastVisitAt | date:'MMM dd' }}</strong>
                    <span>Last Visit</span>
                  </div>
                </div>
              </div>

              <div class="drawer-section">
                <h3>Recent Bookings</h3>
                <div class="bk-loading" *ngIf="bookingsLoading"><div class="mini-spinner"></div><span>Loading bookings...</span></div>
                <div class="bk-empty" *ngIf="!bookingsLoading && bookingsError">
                  <span>Could not load bookings.</span>
                </div>
                <div class="bk-empty" *ngIf="!bookingsLoading && !bookingsError && clientBookings.length === 0">
                  <span>No bookings yet.</span>
                </div>
                <div class="bk-list" *ngIf="!bookingsLoading && !bookingsError && clientBookings.length > 0">
                  <div class="booking-line" *ngFor="let b of clientBookings.slice(0, 5)">
                    <div class="bl-info">
                      <span class="bl-title">{{ b.title }}</span>
                      <span class="bl-meta">{{ b.startTime | date:'MMM dd, h:mm a' }}</span>
                      <span class="bl-staff" *ngIf="b.staff?.fullName">{{ b.staff.fullName }}</span>
                    </div>
                    <span class="status-badge" [class]="'badge-' + (b.status || '').toLowerCase()">{{ b.status | slice:0:4 }}</span>
                  </div>
                  <a [routerLink]="'/app/bookings'" [queryParams]="{clientId: selectedClient?.id}" class="bk-view-all" *ngIf="clientBookings.length > 0">
                    View all bookings ({{ clientBookings.length }})
                  </a>
                </div>
              </div>

              <div class="drawer-section">
                <h3>Forms &amp; Consents</h3>
                <div class="fr-loading" *ngIf="formsLoading"><div class="mini-spinner"></div><span>Loading forms...</span></div>
                <div class="fr-empty" *ngIf="!formsLoading && formsError">Could not load forms.</div>
                <div class="fr-empty" *ngIf="!formsLoading && !formsError && clientForms.length === 0">No forms submitted yet.</div>
                <div class="fr-list" *ngIf="!formsLoading && !formsError && clientForms.length > 0">
                  <div class="fr-line" *ngFor="let f of clientForms.slice(0, 5)">
                    <div class="fr-info">
                      <span class="fr-name">{{ f.form?.name || 'Unknown Form' }}</span>
                      <span class="fr-meta">{{ f.createdAt | date:'MMM dd, yyyy h:mm a' }}</span>
                    </div>
                    <span class="status-badge badge-completed" *ngIf="f.answers">Complete</span>
                    <span class="status-badge badge-pending" *ngIf="!f.answers">Draft</span>
                  </div>
                </div>
              </div>

              <div class="drawer-section">
                <h3>Notes</h3>
                <div class="drawer-notes-card" *ngIf="selectedClient.notes; else noNotes">
                  <p class="notes-text">{{ selectedClient.notes }}</p>
                </div>
                <ng-template #noNotes>
                  <div class="drawer-notes-empty">No notes yet.</div>
                </ng-template>
              </div>

              <div class="drawer-section-actions">
                <button class="btn-secondary" (click)="edit(selectedClient)">Edit Client</button>
                <button class="btn-danger" (click)="remove(selectedClient)">Delete Client</button>
              </div>
            </div>
          </ng-container>
          <ng-template #noClient>
            <div class="drawer-body">
              <div class="empty-drawer">
                <p>Client information is not available.</p>
                <button class="btn-primary" (click)="closeDetail()">Close</button>
              </div>
            </div>
          </ng-template>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showForm" (click)="closeForm()">
        <div class="create-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>{{ editingId ? 'Edit Client' : 'Add Client' }}</h2>
            <button class="close-btn" (click)="closeForm()">&times;</button>
          </div>
          <div class="drawer-body">
            <form (ngSubmit)="save()" class="create-form">
              <label class="form-label">Full Name *</label>
              <input name="fullName" [(ngModel)]="form.fullName" placeholder="Full name" required class="form-input" [class.field-error]="formErrors.fullName">
              <span class="field-msg" *ngIf="formErrors.fullName">{{ formErrors.fullName }}</span>

              <label class="form-label">Phone</label>
              <input name="phone" [(ngModel)]="form.phone" placeholder="Phone" class="form-input">

              <label class="form-label">Email</label>
              <input name="email" [(ngModel)]="form.email" placeholder="Email" class="form-input" [class.field-error]="formErrors.email">
              <span class="field-msg" *ngIf="formErrors.email">{{ formErrors.email }}</span>

              <label class="form-label">Gender</label>
              <select name="gender" [(ngModel)]="form.gender" class="form-select">
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <label class="form-label">Date of Birth</label>
              <input name="dateOfBirth" [(ngModel)]="form.dateOfBirth" type="date" class="form-input">

              <label class="form-label">City</label>
              <input name="city" [(ngModel)]="form.city" placeholder="City" class="form-input">

              <label class="form-label">Address</label>
              <input name="address" [(ngModel)]="form.address" placeholder="Address" class="form-input">

              <label class="form-label">Notes</label>
              <textarea name="notes" [(ngModel)]="form.notes" placeholder="Notes about this client..." class="form-input form-textarea" rows="3"></textarea>

              <div class="form-error-banner" *ngIf="saveError">{{ saveError }}</div>

              <div class="drawer-actions">
                <button type="button" (click)="closeForm()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="saveBusy">{{ saveBusy ? 'Saving...' : 'Save Client' }}</button>
              </div>
            </form>
            <div class="drawer-loading" *ngIf="saveBusy"><div class="spinner"></div><span>Saving...</span></div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .clients{display:grid;gap:20px;max-width:1200px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0;font-size:14px}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white;font-size:14px;white-space:nowrap;transition:opacity .2s}
    .primary:hover{opacity:.85}
    .toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .filter-input{flex:1;min-width:200px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;transition:border-color .2s}
    .filter-input:focus{border-color:#0b0b0b}
    .filter-select{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;background:white;outline:none;cursor:pointer;transition:border-color .2s}
    .filter-select:focus{border-color:#0b0b0b}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280;min-height:320px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d;margin:8px 0}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px 24px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .empty-icon{font-size:40px;margin-bottom:12px}
    .empty p{font-size:16px;font-weight:600;margin:0 0 6px}
    .empty-hint{font-size:13px;color:#9ca3af}
    .empty-hint a{color:#0b0b0b;text-decoration:underline;cursor:pointer}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;min-height:320px;align-content:start}
    .card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;transition:box-shadow .2s;min-width:0}
    .card:hover{box-shadow:0 12px 35px rgba(15,23,42,.08)}
    .card-top{display:flex;gap:14px;align-items:center;min-width:0}
    .avatar{width:44px;height:44px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0}
    .avatar.birthday-month{background:#eab308}
    .card-info{flex:1;min-width:0}
    .card-info h3{margin:0;font-size:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .contact-line{display:block;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;word-break:break-all}
    .card-indicators{display:flex;gap:4px;flex-wrap:wrap;margin:10px 0 4px}
    .indicator{font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:#f3f4f6;color:#6b7280}
    .indicator-birthday{background:#fefce8;color:#a16207}
    .indicator-vip{background:#fef3c7;color:#92400e}
    .indicator-new{background:#ecfdf5;color:#166534}
    .indicator-recent{background:#f3f4f6;color:#6b7280}
    .stats{display:flex;gap:6px;margin:10px 0}
    .stats span{flex:1;background:#f8fafc;border-radius:10px;padding:8px;font-size:12px;color:#6b7280;text-align:center}
    .stats span strong{display:block;font-size:14px;color:#111827}
    .actions{display:flex;gap:8px}
    .actions button{flex:1;border:0;border-radius:12px;padding:10px 12px;font-weight:700;cursor:pointer;background:#f3f4f6;font-size:13px;transition:opacity .2s}
    .actions button:hover{opacity:.8}
    .danger{background:#fee2e2!important;color:#991b1b!important}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(480px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    .create-panel{background:white;border-radius:24px;width:min(520px,90%);max-height:90vh;overflow-y:auto;animation:fadeIn .2s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white;z-index:1}
    .drawer-header-info{flex:1;min-width:0}
    .drawer-header-info h2{font-size:20px;margin:0}
    .drawer-avatar-row{display:flex;gap:14px;align-items:center}
    .avatar-lg{width:52px;height:52px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;flex-shrink:0}
    .avatar-lg.birthday-month{background:#eab308}
    .header-contact{font-size:13px;color:#6b7280}
    .close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280;padding:0;line-height:1;flex-shrink:0}
    .drawer-body{padding:24px 28px;display:grid;gap:20px}
    .quick-actions{display:flex;gap:8px;flex-wrap:wrap}
    .qa-btn{flex:1;min-width:80px;text-align:center;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:10px 8px;font-weight:700;font-size:12px;color:#374151;text-decoration:none;transition:all .2s;cursor:pointer}
    .qa-btn:hover{background:#f3f4f6;border-color:#d1d5db}
    .qa-disabled{opacity:.4;cursor:default;pointer-events:none}
    .drawer-section h3{font-size:13px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em}
    .contact-card{display:grid;gap:2px}
    .info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
    .info-row span:first-child{color:#6b7280;font-weight:600}
    .info-row span:last-child{text-align:right;max-width:60%;word-break:break-word}
    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .stat-card{background:#f9fafb;border-radius:12px;padding:12px;text-align:center}
    .stat-card strong{display:block;font-size:18px;color:#111827}
    .stat-card span{font-size:11px;color:#6b7280;font-weight:600}
    .bk-loading{display:flex;align-items:center;gap:10px;padding:8px 0;color:#6b7280;font-size:13px}
    .mini-spinner{width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    .bk-empty{padding:12px 0;font-size:13px;color:#9ca3af;text-align:center}
    .bk-list{display:grid;gap:2px}
    .bk-view-all{display:block;text-align:center;padding:8px 0;font-size:12px;font-weight:700;color:#0b0b0b;text-decoration:none;transition:opacity .2s}
    .bk-view-all:hover{opacity:.7}
    .booking-line{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
    .bl-info{flex:1;min-width:0}
    .bl-title{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bl-meta{font-size:12px;color:#6b7280;margin-right:8px}
    .bl-staff{font-size:12px;color:#9ca3af}
    .status-badge{display:inline-block;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;flex-shrink:0;text-transform:uppercase}
    .badge-pending{background:#fefce8;color:#a16207}
    .badge-confirmed{background:#dbeafe;color:#1d4ed8}
    .badge-checked_in{background:#f3e8ff;color:#7c3aed}
    .badge-completed{background:#f0fdf4;color:#16a34a}
    .badge-cancelled{background:#fef2f2;color:#dc2626}
    .badge-no_show{background:#f3f4f6;color:#6b7280}
    .fr-loading{display:flex;align-items:center;gap:8px;padding:8px 0;color:#6b7280;font-size:12px}
    .fr-empty{font-size:12px;color:#9ca3af;padding:8px 0;text-align:center}
    .fr-list{display:grid;gap:2px}
    .fr-line{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:12px}
    .fr-info{flex:1;min-width:0}
    .fr-name{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .fr-meta{font-size:11px;color:#6b7280}
    .drawer-notes-card{background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px}
    .drawer-notes-empty{font-size:13px;color:#9ca3af;padding:8px 0;text-align:center;font-style:italic}
    .notes-text{font-size:14px;color:#374151;margin:0;line-height:1.5}
    .drawer-section-actions{display:flex;gap:10px;padding-top:8px;border-top:1px solid #e5e7eb}
    .drawer-section-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer;font-size:13px;transition:opacity .2s}
    .drawer-section-actions button:hover{opacity:.85}
    .btn-primary{background:#0b0b0b;color:white}
    .btn-secondary{background:#f3f4f6;color:#374151}
    .btn-danger{background:#fee2e2;color:#991b1b}
    .empty-drawer{padding:48px;text-align:center;color:#6b7280}
    .empty-drawer button{margin-top:12px}
    .drawer-loading{display:flex;align-items:center;gap:10px;justify-content:center;padding:12px;color:#6b7280;font-size:13px}
    .create-form{display:grid;gap:10px}
    .form-label{font-size:13px;font-weight:700;color:#374151}
    .form-input,.form-select{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;background:white;transition:border-color .2s}
    .form-input:focus,.form-select:focus{border-color:#0b0b0b}
    .field-error{border-color:#dc2626!important}
    .field-msg{font-size:12px;color:#dc2626;margin:-2px 0 0}
    .form-textarea{resize:vertical;font-family:inherit;min-height:60px}
    .form-error-banner{background:#fef2f2;color:#991b1b;padding:10px 14px;border-radius:10px;font-size:13px;text-align:center}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px}
    .clear-search-btn{border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-weight:700;cursor:pointer;background:white;font-size:13px;line-height:1;transition:all .2s;flex-shrink:0}
    .clear-search-btn:hover{border-color:#dc2626;color:#dc2626}
    .pagination-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 2px;background:white;border-radius:16px;border:1px solid #e5e7eb;padding:12px 18px}
    .pagination-info{font-size:13px;color:#6b7280;font-weight:600}
    .pagination-controls{display:flex;align-items:center;gap:8px}
    .page-size-select{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;font-size:12px;font-weight:600;background:white;outline:none;cursor:pointer}
    .page-btn{border:1px solid #e5e7eb;border-radius:10px;padding:8px 14px;font-weight:700;cursor:pointer;background:white;font-size:12px;transition:all .2s;min-width:80px}
    .page-btn:hover:not(:disabled){border-color:#0b0b0b;background:#f9fafb}
    .page-btn:disabled{opacity:.4;cursor:default}
    .page-indicator{font-size:14px;font-weight:800;min-width:28px;text-align:center;background:#0b0b0b;color:white;border-radius:8px;padding:4px 0}
    @media(max-width:1000px){.grid{grid-template-columns:repeat(2,1fr)}.head{display:grid;gap:14px}.drawer-panel{width:100%}.create-panel{width:100%}}
    @media(max-width:640px){.grid{grid-template-columns:1fr}.stats-grid{grid-template-columns:repeat(2,1fr)}.toolbar{flex-direction:column}.toolbar .filter-input{min-width:0}.pagination-bar{flex-direction:column;align-items:stretch}.pagination-controls{justify-content:center}.page-btn{flex:1;min-width:0}}
  `]
})
export class ClientsComponent {
  private api = inject(ClientsService);

  clients: Client[] = [];
  search = '';
  sortBy = 'name';
  page = 1;
  limit = 24;
  total = 0;
  totalPages = 1;
  loading = true;
  error = '';
  private searchTimer: any = null;

  showDetail = false;
  selectedClient: Client | null = null;
  clientBookings: ClientBookingSummary[] = [];
  clientUpcomingBookings: ClientBookingSummary[] = [];
  bookingsLoading = false;
  bookingsError = false;
  clientForms: ClientFormSubmission[] = [];
  formsLoading = false;
  formsError = false;

  showForm = false;
  editingId = '';
  saveBusy = false;
  saveError = '';
  form: any = { fullName: '', phone: '', email: '', gender: '', dateOfBirth: '', city: '', address: '', notes: '' };
  formErrors: Record<string, string> = {};

  hasWalletRoute = false;
  hasMembershipsRoute = false;
  hasPackagesRoute = false;

  isBirthdayMonth = isBirthdayThisMonth;
  getAge = getClientAge;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    const { sortField, sortOrder } = this.getSortParams();
    this.api.getClients({ search: this.search, page: this.page, limit: this.limit, sortBy: sortField, sortOrder }).subscribe({
      next: (res) => { this.clients = res.items; this.total = res.total; this.totalPages = res.totalPages; this.page = res.page; this.loading = false; },
      error: (e) => {
        this.loading = false;
        if (e.status === 401) {
          this.error = 'Your session has expired. Please log in again.';
        } else {
          this.error = e.error?.message || 'Failed to load clients.';
        }
      },
    });
  }

  private getSortParams(): { sortField: string; sortOrder: string } {
    switch (this.sortBy) {
      case 'name': return { sortField: 'fullName', sortOrder: 'asc' };
      case 'name_desc': return { sortField: 'fullName', sortOrder: 'desc' };
      case 'visits': return { sortField: 'totalVisits', sortOrder: 'desc' };
      case 'spend': return { sortField: 'totalSpend', sortOrder: 'desc' };
      case 'lastVisit': return { sortField: 'lastVisitAt', sortOrder: 'desc' };
      default: return { sortField: 'createdAt', sortOrder: 'desc' };
    }
  }

  isNewClient(client: Client): boolean {
    if (!client.createdAt) return false;
    const created = new Date(client.createdAt);
    const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.showDetail = false; this.load(); }, 300);
  }
  onSortChange() { this.page = 1; this.showDetail = false; this.load(); }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.showDetail = false;
    this.load();
  }

  clearSearch() {
    this.search = '';
    this.page = 1;
    this.showDetail = false;
    this.load();
  }

  openDetail(client: Client) {
    this.selectedClient = client;
    this.showDetail = true;
    this.clientBookings = [];
    this.clientUpcomingBookings = [];
    this.bookingsLoading = false;
    this.bookingsError = false;
    this.clientForms = [];
    this.formsLoading = false;
    this.formsError = false;

    if (client.id) {
      this.formsLoading = true;
      this.api.getClientForms(client.id).subscribe({
        next: (forms) => { this.formsLoading = false; this.clientForms = forms || []; },
        error: () => { this.formsLoading = false; this.formsError = true; },
      });
      this.bookingsLoading = true;
      this.api.getClientBookings(client.id).subscribe({
        next: (bookings) => {
          this.bookingsLoading = false;
          this.clientBookings = bookings || [];
          const now = new Date();
          this.clientUpcomingBookings = (bookings || []).filter(b => new Date(b.startTime) > now);
        },
        error: () => {
          this.bookingsLoading = false;
          this.bookingsError = true;
          this.clientBookings = [];
          this.clientUpcomingBookings = [];
        },
      });
    }
  }

  closeDetail() { this.showDetail = false; }

  openForm() {
    this.editingId = '';
    this.form = { fullName: '', phone: '', email: '', gender: '', dateOfBirth: '', city: '', address: '', notes: '' };
    this.formErrors = {};
    this.saveError = '';
    this.showForm = true;
  }

  closeForm() { this.showForm = false; this.saveBusy = false; this.saveError = ''; }

  edit(client: Client) {
    this.editingId = client.id;
    this.form = {
      fullName: client.fullName || '',
      phone: client.phone || '',
      email: client.email || '',
      gender: client.gender || '',
      dateOfBirth: client.dateOfBirth ? client.dateOfBirth.slice(0, 10) : '',
      city: client.city || '',
      address: client.address || '',
      notes: client.notes || '',
    };
    this.formErrors = {};
    this.saveError = '';
    this.showForm = true;
  }

  private validateForm(): boolean {
    this.formErrors = {};
    if (!this.form.fullName?.trim()) {
      this.formErrors['fullName'] = 'Full name is required.';
    }
    if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) {
      this.formErrors['email'] = 'Please enter a valid email address.';
    }
    return Object.keys(this.formErrors).length === 0;
  }

  save() {
    this.saveError = '';
    if (!this.validateForm()) return;
    this.saveBusy = true;
    const payload = { ...this.form };
    if (!payload.dateOfBirth) delete payload.dateOfBirth;
    const request = this.editingId
      ? this.api.updateClient(this.editingId, payload)
      : this.api.createClient(payload);
    request.subscribe({
      next: () => { this.closeForm(); this.load(); },
      error: (e) => { this.saveBusy = false; this.saveError = e.error?.message || 'Failed to save client.'; },
    });
  }

  remove(client: Client) {
    if (!confirm(`Delete ${client.fullName}? This cannot be undone.`)) return;
    this.api.deleteClient(client.id).subscribe({
      next: () => {
        if (this.showDetail) this.closeDetail();
        if (this.clients.length <= 1 && this.page > 1) this.page--;
        this.load();
      },
      error: (e) => { alert(e.error?.message || 'Failed to delete client.'); },
    });
  }
}
