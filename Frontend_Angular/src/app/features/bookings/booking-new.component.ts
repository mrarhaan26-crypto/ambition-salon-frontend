import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingsService } from './bookings.service';
import type { ClientOption, StaffOption, BranchOption, ServiceOption, BookingServiceFormLine } from './bookings.models';

@Component({
  selector: 'app-booking-new',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="bn-page">
      <div class="bn-header">
        <div>
          <h1 class="bn-title">New Booking</h1>
          <p class="bn-subtitle">Create a new salon appointment</p>
        </div>
        <div class="bn-header-actions">
          <a class="bn-btn bn-btn-ghost" routerLink="/app/bookings">Cancel</a>
        </div>
      </div>

      <div class="bn-loading" *ngIf="loading">Loading form data...</div>

      <form class="bn-form" *ngIf="!loading" (ngSubmit)="doCreate()" #formRef="ngForm">
        <div class="bn-card">
          <h3 class="bn-card-title">Appointment Details</h3>

          <div class="bn-field">
            <label class="bn-label" for="bn-client">Client <span class="required">*</span></label>
            <select id="bn-client" [(ngModel)]="form.clientId" name="clientId" class="bn-input" required [class.field-error]="submitted && !form.clientId">
              <option value="">— Select Client —</option>
              <option *ngFor="let c of clients" [value]="c.id">{{ c.fullName }} <ng-container *ngIf="c.phone">— {{ c.phone }}</ng-container></option>
            </select>
            <span class="field-msg" *ngIf="submitted && !form.clientId">Client is required</span>
          </div>

          <div class="bn-field">
            <label class="bn-label" for="bn-staff">Staff <span class="required">*</span></label>
            <select id="bn-staff" [(ngModel)]="form.staffId" name="staffId" class="bn-input" required [class.field-error]="submitted && !form.staffId">
              <option value="">— Select Staff —</option>
              <option *ngFor="let s of staffList" [value]="s.id">{{ s.fullName }} <ng-container *ngIf="s.specialization">— {{ s.specialization }}</ng-container></option>
            </select>
            <span class="field-msg" *ngIf="submitted && !form.staffId">Staff is required</span>
          </div>

          <div class="bn-field">
            <label class="bn-label" for="bn-branch">Branch <span class="required">*</span></label>
            <select id="bn-branch" [(ngModel)]="form.branchId" name="branchId" class="bn-input" required [class.field-error]="submitted && !form.branchId">
              <option value="">— Select Branch —</option>
              <option *ngFor="let b of branches" [value]="b.id">{{ b.name }} <ng-container *ngIf="b.city">— {{ b.city }}</ng-container></option>
            </select>
            <span class="field-msg" *ngIf="submitted && !form.branchId">Branch is required</span>
          </div>

          <div class="bn-field">
            <label class="bn-label" for="bn-title">Title</label>
            <input id="bn-title" [(ngModel)]="form.title" name="title" placeholder="e.g. Birthday haircut & style" class="bn-input" maxlength="200">
          </div>
        </div>

        <div class="bn-card">
          <h3 class="bn-card-title">Date & Time</h3>

          <div class="bn-field">
            <label class="bn-label">Date & Time <span class="required">*</span></label>
            <div class="bn-time-picker">
              <input [(ngModel)]="createDate" name="createDate" type="date" class="bn-input bn-date-input" (change)="syncTime()" [class.field-error]="submitted && !form.startTime">
              <select [(ngModel)]="createHour" name="createHour" class="bn-input bn-time-input" (change)="syncTime()">
                <option *ngFor="let h of hours" [value]="h">{{ h }}</option>
              </select>
              <span class="bn-time-sep">:</span>
              <select [(ngModel)]="createMinute" name="createMinute" class="bn-input bn-time-input" (change)="syncTime()">
                <option value="00">00</option>
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
              </select>
              <select [(ngModel)]="createAmPm" name="createAmPm" class="bn-input bn-time-input" (change)="syncTime()">
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            <span class="field-msg" *ngIf="submitted && !form.startTime">Date & time is required</span>
            <span class="bn-time-preview" *ngIf="form.startTime">Scheduled: {{ form.startTime | date:'EEE, MMM dd, h:mm a' }}</span>
          </div>
        </div>

        <div class="bn-card">
          <h3 class="bn-card-title">Services <span class="required">*</span></h3>

          <div class="bn-field">
            <select #svcSelect class="bn-input" (change)="addService(svcSelect.value); svcSelect.value = ''">
              <option value="">— Add Service from Catalog —</option>
              <option *ngFor="let sv of catalogServices" [value]="sv.id" [disabled]="isServiceAdded(sv.id)">
                {{ sv.name }} ({{ sv.durationMin }} min — {{ sv.price | currency }})
              </option>
            </select>
          </div>

          <div class="bn-services" *ngIf="form.services.length > 0">
            <div class="bn-svc" *ngFor="let s of form.services; let i = index">
              <div class="bn-svc-info">
                <span class="bn-svc-name">{{ s.name }}</span>
                <span class="bn-svc-dur">{{ s.durationMin }} min</span>
                <span class="bn-svc-price">{{ s.price | currency }}</span>
              </div>
              <button type="button" class="bn-svc-remove" (click)="removeService(i)" aria-label="Remove {{ s.name }}">&times;</button>
            </div>
            <div class="bn-svc-summary">
              <span>Total: <strong>{{ getFormDuration() }} min</strong></span>
              <span><strong>{{ getFormTotal() | currency }}</strong></span>
            </div>
          </div>

          <div class="bn-empty-services" *ngIf="form.services.length === 0 && submitted">
            <span class="field-msg">At least one service is required</span>
          </div>

          <div class="bn-duration-hint" *ngIf="form.services.length > 0 && form.startTime">
            <span>{{ form.startTime | date:'h:mm a' }} – {{ getEstimatedEndTime() | date:'h:mm a' }}</span>
            <span>({{ getFormDuration() }} min)</span>
          </div>
        </div>

        <div class="bn-card">
          <h3 class="bn-card-title">Notes</h3>
          <div class="bn-field">
            <textarea id="bn-notes" [(ngModel)]="form.notes" name="notes" placeholder="Optional notes for this booking..." class="bn-input bn-textarea" rows="3" maxlength="1000"></textarea>
          </div>
        </div>

        <div class="bn-actions">
          <a class="bn-btn bn-btn-ghost" routerLink="/app/bookings">Cancel</a>
          <button type="submit" class="bn-btn bn-btn-primary" [disabled]="busy">
            {{ busy ? 'Creating...' : 'Create Booking' }}
          </button>
        </div>

        <div class="bn-error" *ngIf="error">{{ error }}</div>
      </form>
    </div>
  `,
  styles: [`
    .bn-page{max-width:720px;margin:0 auto;display:grid;gap:24px;padding:8px 0 48px}
    .bn-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .bn-title{font-size:28px;font-weight:800;margin:0 0 4px;color:#1f2937}
    .bn-subtitle{margin:0;color:#6b7280;font-size:14px}
    .bn-header-actions{display:flex;gap:8px;flex-shrink:0}
    .bn-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;border:1px solid transparent;transition:all .15s}
    .bn-btn:disabled{opacity:.5;cursor:not-allowed}
    .bn-btn-primary{background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;border:0;box-shadow:0 8px 20px rgba(124,58,237,.3)}
    .bn-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 28px rgba(124,58,237,.4)}
    .bn-btn-ghost{background:transparent;color:#6b7280;border-color:#e5e7eb}
    .bn-btn-ghost:hover{background:#f9fafb;color:#374151}
    .bn-loading{padding:48px;text-align:center;color:#6b7280}
    .bn-form{display:grid;gap:20px}
    .bn-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    .bn-card-title{font-size:14px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 16px;letter-spacing:.05em;padding-bottom:12px;border-bottom:1px solid #f3f4f6}
    .bn-field{margin-bottom:14px}
    .bn-field:last-child{margin-bottom:0}
    .bn-label{display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px}
    .required{color:#dc2626}
    .bn-input{width:100%;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;outline:none;background:#fff;transition:border-color .2s,box-shadow .2s;box-sizing:border-box;color:#1f2937}
    .bn-input:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.12)}
    .bn-input.field-error{border-color:#dc2626!important}
    select.bn-input{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='%236b7280'%3E%3Cpath d='M1 1l5 5 5-5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
    .field-msg{font-size:12px;color:#dc2626;margin-top:4px;display:block}
    .bn-time-picker{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    .bn-date-input{flex:1;min-width:160px}
    .bn-time-input{width:auto;min-width:0;text-align:center;flex:0 0 64px}
    .bn-time-sep{font-weight:700;color:#6b7280;font-size:16px}
    .bn-time-preview{display:block;margin-top:6px;font-size:13px;color:#7c3aed;font-weight:600;background:rgba(124,58,237,.08);padding:6px 12px;border-radius:8px}
    .bn-services{display:grid;gap:6px;margin-top:8px}
    .bn-svc{display:flex;align-items:center;gap:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px}
    .bn-svc-info{flex:1;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .bn-svc-name{font-weight:600;font-size:14px;flex:1;min-width:80px;color:#374151}
    .bn-svc-dur{font-size:12px;color:#9ca3af}
    .bn-svc-price{font-weight:700;font-size:14px;color:#7c3aed}
    .bn-svc-remove{border:0;background:rgba(220,38,38,.1);color:#991b1b;border-radius:8px;width:30px;height:30px;font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}
    .bn-svc-remove:hover{background:rgba(220,38,38,.2)}
    .bn-svc-summary{display:flex;justify-content:space-between;padding:8px 4px 0;font-size:14px;border-top:1px solid #e5e7eb;margin-top:4px;color:#374151}
    .bn-svc-summary strong{color:#7c3aed}
    .bn-empty-services{margin-top:4px}
    .bn-duration-hint{display:flex;justify-content:space-between;background:#f0fdf4;border:1px solid rgba(22,163,74,.2);border-radius:10px;padding:8px 12px;font-size:13px;color:#15803d;margin-top:8px}
    .bn-textarea{resize:vertical;min-height:70px;font-family:inherit}
    .bn-actions{display:flex;gap:10px;justify-content:flex-end;padding-top:8px}
    .bn-error{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;color:#991b1b;font-size:13px;text-align:center}
  `]
})
export class BookingNewComponent implements OnInit {
  private bookingsService = inject(BookingsService);
  private router = inject(Router);

  hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  clients: ClientOption[] = [];
  staffList: StaffOption[] = [];
  branches: BranchOption[] = [];
  catalogServices: ServiceOption[] = [];
  loading = true;
  busy = false;
  error = '';
  submitted = false;

  createDate = new Date().toISOString().split('T')[0];
  createHour = 9;
  createMinute = '00';
  createAmPm: 'AM' | 'PM' = 'AM';

  form: {
    clientId: string;
    staffId: string;
    branchId: string;
    title: string;
    startTime: string;
    notes: string;
    services: BookingServiceFormLine[];
  } = {
    clientId: '',
    staffId: '',
    branchId: '',
    title: '',
    startTime: '',
    notes: '',
    services: [],
  };

  ngOnInit(): void {
    this.bookingsService.getClients().subscribe(c => this.clients = c);
    this.bookingsService.getStaff().subscribe(s => this.staffList = s);
    this.bookingsService.getBranches().subscribe(b => this.branches = b);
    this.bookingsService.getServices().subscribe(s => {
      this.catalogServices = s;
      this.loading = false;
    });
    this.syncTime();
  }

  syncTime(): void {
    let hour = this.createHour;
    if (this.createAmPm === 'PM' && hour < 12) hour += 12;
    if (this.createAmPm === 'AM' && hour === 12) hour = 0;
    const hh = String(hour).padStart(2, '0');
    const mm = this.createMinute;
    this.form.startTime = `${this.createDate}T${hh}:${mm}:00`;
  }

  addService(serviceId: string): void {
    if (!serviceId) return;
    const svc = this.catalogServices.find(s => s.id === serviceId);
    if (!svc) return;
    this.form.services.push({
      serviceId: svc.id,
      name: svc.name,
      durationMin: svc.durationMin,
      price: svc.price,
    });
  }

  removeService(index: number): void {
    this.form.services.splice(index, 1);
  }

  isServiceAdded(serviceId: string): boolean {
    return this.form.services.some(s => s.serviceId === serviceId);
  }

  getFormDuration(): number {
    return this.form.services.reduce((sum, s) => sum + s.durationMin, 0);
  }

  getFormTotal(): number {
    return this.form.services.reduce((sum, s) => sum + s.price, 0);
  }

  getEstimatedEndTime(): Date | null {
    if (!this.form.startTime) return null;
    const start = new Date(this.form.startTime);
    return new Date(start.getTime() + this.getFormDuration() * 60000);
  }

  doCreate(): void {
    this.submitted = true;
    this.error = '';

    const missing: string[] = [];
    if (!this.form.clientId) missing.push('Client');
    if (!this.form.staffId) missing.push('Staff');
    if (!this.form.branchId) missing.push('Branch');
    if (!this.form.startTime) missing.push('Date & Time');
    if (!this.form.services.length) missing.push('Services');

    if (missing.length) {
      this.error = `Please fill in required fields: ${missing.join(', ')}`;
      return;
    }

    this.busy = true;
    const payload = {
      ...this.form,
      endTime: this.getEstimatedEndTime()?.toISOString().split('.')[0] + 'Z' || '',
    };

    this.bookingsService.create(payload).subscribe({
      next: (booking) => {
        this.router.navigate(['/app/bookings', booking.id]);
      },
      error: (err) => {
        this.error = err.error?.message || err.message || 'Failed to create booking. Please try again.';
        this.busy = false;
      },
    });
  }
}
