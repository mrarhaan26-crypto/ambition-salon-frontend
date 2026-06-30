import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookOnlineService } from './book-online.service';

@Component({
  selector: 'app-book-online',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="header" *ngIf="profile">
        <h1>{{ profile.businessName || 'Book Online' }}</h1>
        <p>{{ profile.description }}</p>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>

      <ng-container *ngIf="!loading">
        <div class="steps">
          <div class="step" [class.active]="step === 1">
            <div class="step-num">1</div>
            <div class="step-info"><strong>Service</strong><span>{{ selectedService?.name || 'Select' }}</span></div>
          </div>
          <div class="step" [class.active]="step === 2">
            <div class="step-num">2</div>
            <div class="step-info"><strong>Date & Time</strong><span>{{ selectedDate || 'Select' }} {{ selectedTime || '' }}</span></div>
          </div>
          <div class="step" [class.active]="step === 3">
            <div class="step-num">3</div>
            <div class="step-info"><strong>Details</strong><span>{{ customerName || 'Your info' }}</span></div>
          </div>
          <div class="step" [class.active]="step === 4">
            <div class="step-num">4</div>
            <div class="step-info"><strong>Confirm</strong></div>
          </div>
        </div>

        <div class="panel" *ngIf="step === 1">
          <h2>Select Service</h2>
          <div class="service-list">
            <div class="service-card" *ngFor="let s of services" (click)="selectService(s)" [class.selected]="selectedService?.id === s.id">
              <strong>{{ s.name }}</strong>
              <span class="meta">{{ s.durationMin }} min</span>
              <span class="price">{{ s.price | currency }}</span>
            </div>
          </div>
          <div class="nav"><button class="primary" [disabled]="!selectedService" (click)="step = 2">Next</button></div>
        </div>

        <div class="panel" *ngIf="step === 2">
          <h2>Select Staff (optional)</h2>
          <select [(ngModel)]="selectedStaffId" class="input">
            <option value="">Any staff</option>
            <option *ngFor="let s of staff" [value]="s.id">{{ s.fullName }} {{ s.specialization ? '- '+s.specialization : '' }}</option>
          </select>

          <h2>Select Date</h2>
          <input [(ngModel)]="selectedDate" type="date" class="input" (change)="loadSlots()" [min]="today">

          <div class="slots" *ngIf="slots.length > 0">
            <button class="slot-btn" *ngFor="let sl of slots" [class.selected]="selectedTime === sl.time" (click)="selectedTime = sl.time">
              {{ sl.time }}
            </button>
          </div>
          <div class="empty" *ngIf="selectedDate && slots.length === 0"><p>No available slots for this date.</p></div>

          <div class="nav">
            <button (click)="step = 1">Back</button>
            <button class="primary" [disabled]="!selectedDate || !selectedTime" (click)="step = 3">Next</button>
          </div>
        </div>

        <div class="panel" *ngIf="step === 3">
          <h2>Your Details</h2>
          <input [(ngModel)]="customerName" placeholder="Full name *" class="input">
          <input [(ngModel)]="customerPhone" placeholder="Phone" class="input">
          <input [(ngModel)]="customerEmail" placeholder="Email" class="input">
          <div class="nav">
            <button (click)="step = 2">Back</button>
            <button class="primary" [disabled]="!customerName" (click)="confirmBooking()">Confirm Booking</button>
          </div>
        </div>

        <div class="panel success" *ngIf="step === 4 && createdBooking">
          <h2>Booking Confirmed!</h2>
          <p><strong>Service:</strong> {{ createdBooking.title }}</p>
          <p><strong>Date:</strong> {{ createdBooking.startTime | date:'MMM dd, yyyy h:mm a' }}</p>
          <p><strong>Status:</strong> {{ createdBooking.status }}</p>
          <button class="primary" (click)="reset()">Book Another</button>
        </div>
      </ng-container>

      <div class="error" *ngIf="error">
        <strong>Error.</strong><p>{{ error }}</p>
        <button (click)="error = ''">Dismiss</button>
      </div>
    </section>
  `,
  styles: [`
    .page{max-width:720px;margin:0 auto;padding:24px;display:grid;gap:20px}
    .header h1{font-size:34px;margin:0}
    .header p{color:#6b7280}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .steps{display:flex;gap:12px;overflow-x:auto}
    .step{display:flex;gap:10px;align-items:center;padding:12px 16px;background:#f3f4f6;border-radius:14px;flex:1;min-width:140px}
    .step.active{background:#0b0b0b;color:white}
    .step-num{width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px}
    .step.active .step-num{background:rgba(255,255,255,.2)}
    .step-info{font-size:13px}
    .step-info strong{display:block}
    .step-info span{font-size:11px;opacity:.7}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel.success{text-align:center}
    .panel.success p{margin:8px 0}
    .input{width:100%;padding:14px;border:1px solid #e5e7eb;border-radius:14px;margin-bottom:12px;box-sizing:border-box}
    .service-list{display:grid;gap:8px}
    .service-card{display:flex;align-items:center;gap:14px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:14px;cursor:pointer}
    .service-card.selected{border-color:#0b0b0b;background:#f8f8f8}
    .service-card strong{flex:1}
    .meta{color:#6b7280;font-size:13px}
    .price{font-weight:800}
    .slots{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
    .slot-btn{padding:10px 18px;border:1px solid #e5e7eb;border-radius:12px;cursor:pointer;background:white;font-weight:600}
    .slot-btn.selected{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .empty{padding:16px;text-align:center;color:#6b7280}
    .nav{display:flex;gap:12px;justify-content:space-between;margin-top:16px}
    .nav button{border:0;border-radius:12px;padding:12px 20px;font-weight:800;cursor:pointer}
    .nav button:first-child{background:#f3f4f6}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .primary:disabled{opacity:.4;cursor:default}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
  `]
})
export class BookOnlineComponent {
  private api = inject(BookOnlineService);
  profile: any = null;
  services: any[] = [];
  staff: any[] = [];
  slots: any[] = [];
  step = 1;
  selectedService: any = null;
  selectedStaffId = '';
  selectedDate = '';
  selectedTime = '';
  customerName = '';
  customerPhone = '';
  customerEmail = '';
  createdBooking: any = null;
  loading = true;
  error = '';

  get today() { return new Date().toISOString().slice(0, 10); }

  ngOnInit() {
    this.loading = true;
    this.api.getProfile().subscribe({ next: (d) => { this.profile = d; this.loading = false; } });
    this.api.getServices().subscribe({ next: (d) => this.services = d });
    this.api.getStaff().subscribe({ next: (d) => this.staff = d });
  }

  selectService(s: any) { this.selectedService = s; }

  loadSlots() {
    if (!this.selectedDate) return;
    this.selectedTime = '';
    this.slots = [];
    this.api.getSlots(this.selectedDate, this.selectedStaffId, this.selectedService?.id).subscribe({ next: (d) => this.slots = d });
  }

  confirmBooking() {
    this.error = '';
    this.api.createBooking({
      serviceId: this.selectedService.id,
      staffId: this.selectedStaffId || undefined,
      date: this.selectedDate,
      time: this.selectedTime,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      customerEmail: this.customerEmail,
    }).subscribe({
      next: (d) => { this.createdBooking = d; this.step = 4; },
      error: (e) => { this.error = e.error?.message || 'Booking failed.'; },
    });
  }

  reset() {
    this.step = 1;
    this.selectedService = null;
    this.selectedStaffId = '';
    this.selectedDate = '';
    this.selectedTime = '';
    this.customerName = '';
    this.customerPhone = '';
    this.customerEmail = '';
    this.createdBooking = null;
  }
}
