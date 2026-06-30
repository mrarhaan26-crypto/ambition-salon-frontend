import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookingsService } from './bookings.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Bookings</h1>
          <p>Manage all salon appointments.</p>
        </div>
        <button class="primary" (click)="openCreateForm()">+ New Booking</button>
      </div>

      <div class="toolbar">
        <input [(ngModel)]="filters.search" (input)="load()" placeholder="Search client or title...">
        <select [(ngModel)]="filters.status" (change)="load()">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NO_SHOW">No Show</option>
        </select>
        <input type="date" [(ngModel)]="filters.date" (change)="load()">
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading bookings...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load bookings.</strong><p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && bookings.length === 0">
        <p>No bookings found. Create your first booking to get started.</p>
      </div>

      <div class="bookings-list" *ngIf="!loading && !error && bookings.length > 0">
        <div class="booking-row" *ngFor="let b of bookings" [class]="'status-' + (b.status || '').toLowerCase()">
          <div class="booking-info">
            <strong>{{ b.client?.fullName || 'Unknown' }}</strong>
            <span>{{ b.title }}</span>
            <small>{{ b.startTime | date:'MMM dd, yyyy h:mm a' }} — {{ b.endTime | date:'h:mm a' }}</small>
          </div>
          <div class="booking-meta">
            <span class="status-badge" [class]="'badge-' + (b.status || '').toLowerCase()">{{ b.status }}</span>
            <b>{{ (b.totalAmount || 0) | currency }}</b>
            <span class="staff-name">{{ b.staff?.fullName || 'Unassigned' }}</span>
          </div>
          <div class="booking-actions">
            <button (click)="openDetail(b)">View</button>
          </div>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showDetail" (click)="closeDetail()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>{{ selectedBooking?.title }}</h2>
            <button class="close-btn" (click)="closeDetail()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="drawer-section">
              <h3>Booking Details</h3>
              <div class="info-row"><span>Status</span><span class="status-badge" [class]="'badge-' + (selectedBooking?.status || '').toLowerCase()">{{ selectedBooking?.status }}</span></div>
              <div class="info-row"><span>Start</span><span>{{ selectedBooking?.startTime | date:'MMM dd, yyyy h:mm a' }}</span></div>
              <div class="info-row"><span>End</span><span>{{ selectedBooking?.endTime | date:'MMM dd, yyyy h:mm a' }}</span></div>
              <div class="info-row"><span>Staff</span><span>{{ selectedBooking?.staff?.fullName || 'Unassigned' }}</span></div>
              <div class="info-row"><span>Amount</span><span>{{ (selectedBooking?.totalAmount || 0) | currency }}</span></div>
              <div class="info-row" *ngIf="selectedBooking?.notes"><span>Notes</span><span>{{ selectedBooking?.notes }}</span></div>
            </div>

            <div class="drawer-section" *ngIf="selectedBooking?.client">
              <h3>Client</h3>
              <div class="info-row"><span>Name</span><span>{{ selectedBooking?.client?.fullName }}</span></div>
              <div class="info-row" *ngIf="selectedBooking?.client?.phone"><span>Phone</span><span>{{ selectedBooking?.client?.phone }}</span></div>
              <div class="info-row" *ngIf="selectedBooking?.client?.email"><span>Email</span><span>{{ selectedBooking?.client?.email }}</span></div>
            </div>

            <div class="drawer-actions" *ngIf="selectedBooking?.status">
              <button *ngIf="canCancel(selectedBooking)" class="btn-danger" (click)="doCancel(selectedBooking)">Cancel Booking</button>
              <button *ngIf="selectedBooking?.status === 'CONFIRMED'" class="btn-primary" (click)="doStatus(selectedBooking, 'CHECKED_IN')">Check In</button>
              <button *ngIf="selectedBooking?.status === 'CHECKED_IN'" class="btn-primary" (click)="doStatus(selectedBooking, 'COMPLETED')">Complete</button>
            </div>

            <div class="drawer-loading" *ngIf="drawerBusy"><div class="spinner"></div><span>Updating...</span></div>
            <div class="drawer-error" *ngIf="drawerError">{{ drawerError }}</div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showCreate" (click)="closeCreate()">
        <div class="create-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>New Booking</h2>
            <button class="close-btn" (click)="closeCreate()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="create-form">
              <input [(ngModel)]="createForm.clientId" placeholder="Client ID">
              <input [(ngModel)]="createForm.staffId" placeholder="Staff ID">
              <input [(ngModel)]="createForm.title" placeholder="Title">
              <input [(ngModel)]="createForm.startTime" type="datetime-local">
               <input [(ngModel)]="createForm.branchId" placeholder="Branch ID">
              <div class="create-services">
                <div class="svc-row" *ngFor="let s of createForm.services; let i = index">
                  <input [(ngModel)]="s.name" placeholder="Service name" style="flex:1">
                  <input [(ngModel)]="s.durationMin" type="number" placeholder="Min" style="width:70px">
                  <input [(ngModel)]="s.price" type="number" step="0.01" placeholder="Price" style="width:90px">
                  <button class="remove-btn" (click)="removeService(i)">x</button>
                </div>
              </div>
              <button class="add-btn" (click)="addService()">+ Add Service</button>
              <div class="drawer-actions">
                <button (click)="closeCreate()">Cancel</button>
                <button class="btn-primary" (click)="doCreate()" [disabled]="createBusy">{{ createBusy ? 'Creating...' : 'Create Booking' }}</button>
              </div>
            </div>
            <div class="drawer-loading" *ngIf="createBusy"><div class="spinner"></div><span>Creating...</span></div>
            <div class="drawer-error" *ngIf="createError">{{ createError }}</div>
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
    .toolbar input{flex:1;min-width:180px;padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .toolbar select{padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .bookings-list{display:grid;gap:8px}
    .booking-row{display:flex;align-items:center;gap:16px;background:white;border:1px solid #e5e7eb;border-radius:18px;padding:16px 20px;border-left:4px solid #e5e7eb;transition:box-shadow .2s}
    .booking-row:hover{box-shadow:0 8px 25px rgba(15,23,42,.08)}
    .booking-row.status-confirmed{border-left-color:#3b82f6}
    .booking-row.status-completed{border-left-color:#16a34a}
    .booking-row.status-pending{border-left-color:#eab308}
    .booking-row.status-cancelled{border-left-color:#dc2626;opacity:.7}
    .booking-row.status-no_show{border-left-color:#6b7280;opacity:.7}
    .booking-row.status-checked_in{border-left-color:#8b5cf6}
    .booking-info{flex:2}
    .booking-info strong{display:block;font-size:16px}
    .booking-info span{display:block;font-size:13px;color:#374151}
    .booking-info small{font-size:12px;color:#6b7280}
    .booking-meta{flex:1;text-align:right;display:grid;gap:4px}
    .status-badge{display:inline-block;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:700}
    .badge-confirmed{background:#dbeafe;color:#1d4ed8}
    .badge-completed{background:#f0fdf4;color:#16a34a}
    .badge-pending{background:#fefce8;color:#a16207}
    .badge-cancelled{background:#fef2f2;color:#dc2626}
    .badge-no_show{background:#f3f4f6;color:#6b7280}
    .badge-checked_in{background:#f3e8ff;color:#7c3aed}
    .booking-meta b{font-size:18px}.staff-name{font-size:12px;color:#6b7280}
    .booking-actions button{border:1px solid #e5e7eb;border-radius:10px;padding:8px 14px;font-weight:700;cursor:pointer;background:white;font-size:12px;white-space:nowrap}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    .create-panel{background:white;border-radius:24px;width:min(520px,90%);max-height:90vh;overflow-y:auto;animation:fadeIn .2s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white;z-index:1}
    .drawer-header h2{margin:0;font-size:20px}
    .close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280;padding:0;line-height:1}
    .drawer-body{padding:24px 28px;display:grid;gap:20px}
    .drawer-section h3{font-size:13px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em}
    .info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
    .info-row span:first-child{color:#6b7280;font-weight:600}
    .info-row span:last-child{text-align:right;max-width:60%}
    .drawer-actions{display:flex;gap:10px;flex-wrap:wrap}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px}
    .btn-primary{background:#0b0b0b;color:white}
    .btn-danger{background:#fee2e2;color:#991b1b}
    .drawer-loading{display:flex;align-items:center;gap:10px;justify-content:center;padding:12px;color:#6b7280;font-size:13px}
    .drawer-error{background:#fef2f2;color:#991b1b;padding:12px;border-radius:12px;font-size:13px;text-align:center}
    .create-form{display:grid;gap:12px}
    .create-form input,select{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .create-services{display:grid;gap:8px}
    .svc-row{display:flex;gap:8px;align-items:center}
    .remove-btn{border:0;background:#fee2e2;color:#991b1b;border-radius:8px;width:32px;height:32px;font-weight:900;cursor:pointer}
    .add-btn{border:1px dashed #e5e7eb;border-radius:12px;padding:12px;background:transparent;cursor:pointer;font-weight:600}
    @media(max-width:900px){.drawer-panel{width:100%}.booking-row{flex-direction:column;align-items:stretch;gap:10px}.booking-meta{text-align:left}.toolbar{flex-direction:column}}
  `]
})
export class BookingsComponent {
  private api = inject(BookingsService);

  bookings: any[] = [];
  filters: any = { search: '', status: '', date: '' };
  loading = true;
  error = '';

  showDetail = false;
  selectedBooking: any = null;
  drawerBusy = false;
  drawerError = '';

  showCreate = false;
  createBusy = false;
  createError = '';
  createForm: any = { clientId: '', staffId: '', title: '', startTime: '', branchId: '', services: [{ name: '', durationMin: 30, price: 0 }] };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    const params: any = {};
    if (this.filters.search) params.search = this.filters.search;
    if (this.filters.status) params.status = this.filters.status;
    if (this.filters.date) params.startTime = this.filters.date;
    this.api.getAll(params).subscribe({
      next: (d) => { this.bookings = d; this.loading = false; },
      error: () => { this.error = 'Bookings data unavailable.'; this.loading = false; },
    });
  }

  openDetail(b: any) { this.selectedBooking = b; this.showDetail = true; this.drawerBusy = false; this.drawerError = ''; }
  closeDetail() { this.showDetail = false; }
  closeCreate() { this.showCreate = false; }

  canCancel(b: any): boolean { return b && ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status); }

  doCancel(b: any) {
    this.drawerBusy = true; this.drawerError = '';
    this.api.cancel(b.id).subscribe({
      next: () => { this.drawerBusy = false; this.closeDetail(); this.load(); },
      error: (e) => { this.drawerBusy = false; this.drawerError = e.error?.message || 'Cancel failed.'; },
    });
  }

  doStatus(b: any, status: string) {
    this.drawerBusy = true; this.drawerError = '';
    this.api.updateStatus(b.id, status).subscribe({
      next: () => { this.drawerBusy = false; this.closeDetail(); this.load(); },
      error: (e) => { this.drawerBusy = false; this.drawerError = e.error?.message || 'Update failed.'; },
    });
  }

  openCreateForm() {
    this.showCreate = true; this.createBusy = false; this.createError = '';
    this.createForm = { clientId: '', staffId: '', title: '', startTime: '', branchId: '', services: [{ name: '', durationMin: 30, price: 0 }] };
  }

  addService() { this.createForm.services.push({ name: '', durationMin: 30, price: 0 }); }
  removeService(i: number) { this.createForm.services.splice(i, 1); }

  doCreate() {
    this.createBusy = true; this.createError = '';
    this.api.create(this.createForm).subscribe({
      next: () => { this.createBusy = false; this.showCreate = false; this.load(); },
      error: (e) => { this.createBusy = false; this.createError = e.error?.message || 'Create failed.'; },
    });
  }
}
