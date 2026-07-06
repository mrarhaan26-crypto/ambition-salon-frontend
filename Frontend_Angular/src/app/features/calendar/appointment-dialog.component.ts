import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges, inject, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../staff/staff.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { Staff } from '../staff/staff.models';
import { Client } from '../clients/client.model';
import { SalonService } from '../services/services.models';
import { STATUS_LABELS, APPOINTMENT_STATUSES, STATUS_COLORS } from './calendar.constants';
import type { AppointmentStatus } from './calendar.constants';
import type { CalendarBooking } from './calendar-appointment.models';
import { ResourceEngineService } from './calendar-resource-engine/calendar-resource-engine.service';
import type { ResourceEntity } from './calendar-resource-engine/calendar-resource.models';

export interface DialogAppointmentData {
  id?: string;
  clientId: string;
  staffId: string;
  title: string;
  startTime: string;
  branchId: string;
  notes: string;
  status: string;
  resourceId?: string;
  services: { serviceId: string; name: string; durationMin: number; price: number }[];
}

@Component({
  selector: 'app-appointment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-overlay" (click)="close.emit()" role="dialog" aria-modal="true" [attr.aria-label]="isEditing ? 'Edit appointment' : 'New appointment'">
      <div class="dialog-panel" (click)="$event.stopPropagation()">
        <div class="dialog-head">
          <h2 id="dialog-title">{{ isEditing ? 'Edit Appointment' : 'New Appointment' }}</h2>
          <button class="dialog-close" (click)="close.emit()" aria-label="Close dialog">&times;</button>
        </div>

        <div class="dialog-body">
          <div class="form-group">
            <label for="apt-client">Client</label>
            <input
              #firstField
              id="apt-client"
              list="client-list"
              [(ngModel)]="form.clientId"
              (input)="searchClients()"
              placeholder="Search client..."
              aria-label="Client"
            >
            <datalist id="client-list">
              <option *ngFor="let c of clientResults" [value]="c.id">{{ c.fullName }}</option>
            </datalist>
          </div>

          <div class="form-group">
            <label for="apt-staff">Staff</label>
            <select id="apt-staff" [(ngModel)]="form.staffId" aria-label="Staff">
              <option value="">Select staff</option>
              <option *ngFor="let s of staffList" [value]="s.id">{{ s.fullName }}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="apt-service">Service</label>
            <select
              id="apt-service"
              [(ngModel)]="selectedServiceId"
              (change)="onServiceChange()"
              aria-label="Service"
            >
              <option value="">Select service</option>
              <option *ngFor="let s of serviceList" [value]="s.id">{{ s.name }} ({{ s.durationMin }}m, {{ s.price | currency }})</option>
            </select>
          </div>

          <div class="form-group">
            <label for="apt-resource">Resource</label>
            <select id="apt-resource" [(ngModel)]="form.resourceId" aria-label="Resource">
              <option value="">No resource</option>
              <option *ngFor="let r of resourceList" [value]="r.id">{{ r.name }} ({{ r.type }})</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="apt-date">Date</label>
              <input id="apt-date" type="date" [(ngModel)]="formDate" aria-label="Date">
            </div>
            <div class="form-group">
              <label for="apt-time">Time</label>
              <input id="apt-time" type="time" [(ngModel)]="formTime" aria-label="Time">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Duration</label>
              <div class="form-static">{{ getDuration() }} minutes</div>
            </div>
            <div class="form-group">
              <label>Color Preview</label>
              <div class="color-preview-row">
                <span class="color-swatch" [style.background]="getStatusColor()" aria-label="Status color"></span>
                <span class="color-label">{{ getStatusLabel() }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="apt-status">Status</label>
            <select id="apt-status" [(ngModel)]="form.status" aria-label="Status">
              <option *ngFor="let s of statusOptions" [value]="s">{{ STATUS_LABELS[s] || s }}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="apt-notes">Notes</label>
            <textarea id="apt-notes" [(ngModel)]="form.notes" rows="3" placeholder="Optional notes..." aria-label="Notes"></textarea>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="close.emit()">Cancel</button>
          <button *ngIf="isEditing" class="btn btn-danger" (click)="onDelete()">Delete</button>
          <button class="btn btn-primary" (click)="onSave()" [disabled]="!isValid()">
            {{ isEditing ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
    }
    .dialog-panel {
      background: #fff; border-radius: 16px; width: 100%; max-width: 480px;
      max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .dialog-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 0; position: sticky; top: 0; background: #fff;
      border-radius: 16px 16px 0 0;
    }
    .dialog-head h2 { margin: 0; font-size: 18px; font-weight: 700; }
    .dialog-close {
      width: 36px; height: 36px; border: none; background: transparent;
      font-size: 24px; cursor: pointer; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; color: var(--muted, #6b7280);
    }
    .dialog-close:hover { background: var(--soft, #f7f7f7); }
    .dialog-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--text, #111); }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%; border: 1px solid var(--border, #e5e7eb); border-radius: 8px;
      padding: 0 12px; font: inherit; font-size: 14px; background: #fff;
    }
    .form-group input, .form-group select { height: 42px; }
    .form-group textarea { padding-top: 10px; min-height: 80px; resize: vertical; }
    .form-static {
      height: 42px; display: flex; align-items: center; font-size: 14px;
      color: var(--muted, #6b7280); padding: 0 12px;
      border: 1px solid var(--border, #e5e7eb); border-radius: 8px;
      background: var(--soft, #f7f7f7);
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .color-preview-row { display: flex; align-items: center; gap: 8px; height: 42px; }
    .color-swatch { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border, #e5e7eb); flex-shrink: 0; }
    .color-label { font-size: 13px; font-weight: 600; }
    .dialog-actions {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 24px 20px; border-top: 1px solid var(--border, #e5e7eb);
    }
    .dialog-actions .btn { flex: 1; }
    .btn { height: 42px; border-radius: 10px; border: 1px solid var(--border, #e5e7eb); padding: 0 20px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .btn-primary { background: var(--black, #0b0b0b); color: #fff; border-color: var(--black, #0b0b0b); }
    .btn-primary:hover { background: #1a1a1a; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-secondary { background: #fff; }
    .btn-secondary:hover { background: var(--soft, #f7f7f7); }
    .btn-danger { background: #fff; color: #E53935; border-color: #E53935; }
    .btn-danger:hover { background: #FFF5F5; }
    @media (max-width: 640px) {
      .dialog-overlay { padding: 0; align-items: flex-end; }
      .dialog-panel { max-width: 100%; border-radius: 16px 16px 0 0; max-height: 85vh; }
    }
  `]
})
export class AppointmentDialogComponent implements OnChanges, AfterViewInit {
  @Input() booking: CalendarBooking | null = null;
  @Input() defaultDate = '';
  @Input() defaultTime = '';
  @Input() defaultStaffId = '';
  @Input() defaultBranchId = '';
  @Output() save = new EventEmitter<{ data: DialogAppointmentData; id?: string }>();
  @Output() delete = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('firstField') firstFieldRef!: ElementRef<HTMLInputElement>;

  private staffService = inject(StaffService);
  private clientsService = inject(ClientsService);
  private servicesService = inject(ServicesService);
  private resourceEngine = inject(ResourceEngineService);

  STATUS_LABELS = STATUS_LABELS;
  statusOptions = [...APPOINTMENT_STATUSES];

  staffList: Staff[] = [];
  serviceList: SalonService[] = [];
  clientResults: Client[] = [];
  resourceList: ResourceEntity[] = [];

  form: DialogAppointmentData = this.emptyForm();
  selectedServiceId = '';
  formDate = '';
  formTime = '';

  get isEditing(): boolean {
    return !!this.booking;
  }

  ngAfterViewInit(): void {
    if (this.firstFieldRef) {
      this.firstFieldRef.nativeElement.focus();
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['booking']) {
      this.initForm();
    }
    if (changes['defaultDate'] && !this.booking) {
      this.formDate = this.defaultDate;
    }
    if (changes['defaultTime'] && !this.booking) {
      this.formTime = this.defaultTime;
    }
  }

  ngOnInit(): void {
    this.loadStaff();
    this.loadServices();
    this.loadResources();
    this.initForm();
  }

  private initForm(): void {
    if (this.booking) {
      const start = new Date(this.booking.startTime);
      this.form = {
        id: this.booking.id,
        clientId: this.booking.clientId || '',
        staffId: this.booking.staffId || '',
        title: this.booking.title || '',
        startTime: this.booking.startTime,
        branchId: this.booking.branchId || this.defaultBranchId,
        notes: this.booking.notes || '',
        status: this.booking.status || 'CONFIRMED',
        services: (this.booking.services || []).map(s => ({
          serviceId: s.serviceId || '',
          name: s.name,
          durationMin: s.durationMin,
          price: s.price,
        })),
      };
      this.formDate = start.toISOString().slice(0, 10);
      this.formTime = start.toTimeString().slice(0, 5);
      this.selectedServiceId = this.form.services[0]?.serviceId || '';
    } else {
      this.form = this.emptyForm();
      this.form.branchId = this.defaultBranchId;
      this.form.staffId = this.defaultStaffId;
      if (this.defaultDate) {
        this.formDate = this.defaultDate;
      } else {
        const now = new Date();
        this.formDate = now.toISOString().slice(0, 10);
      }
      if (this.defaultTime) {
        this.formTime = this.defaultTime;
      } else {
        const now = new Date();
        this.formTime = now.toTimeString().slice(0, 5);
      }
    }
  }

  private emptyForm(): DialogAppointmentData {
    return {
      clientId: '', staffId: '', title: '', startTime: '',
      branchId: '', notes: '', resourceId: '', status: 'CONFIRMED', services: [],
    };
  }

  loadStaff(): void {
    this.staffService.getAll().subscribe({
      next: list => { this.staffList = list; },
      error: () => { this.staffList = []; },
    });
  }

  loadServices(): void {
    this.servicesService.getAll().subscribe({
      next: list => { this.serviceList = list; },
      error: () => { this.serviceList = []; },
    });
  }

  loadResources(): void {
    this.resourceList = this.resourceEngine.managerService.getAll();
  }

  searchClients(): void {
    if (this.form.clientId.length < 2) return;
    this.clientsService.getClients({ search: this.form.clientId, limit: 10 }).subscribe({
      next: res => {
        const items = Array.isArray(res) ? res : res.items;
        this.clientResults = items || [];
      },
      error: () => { this.clientResults = []; },
    });
  }

  onServiceChange(): void {
    if (!this.selectedServiceId) return;
    const svc = this.serviceList.find(s => s.id === this.selectedServiceId);
    if (svc) {
      this.form.services = [{
        serviceId: svc.id,
        name: svc.name,
        durationMin: svc.durationMin,
        price: svc.price,
      }];
      if (!this.form.title) {
        this.form.title = svc.name;
      }
    }
  }

  getDuration(): number {
    if (this.form.services.length > 0) {
      return this.form.services[0].durationMin;
    }
    if (this.booking && this.booking.startTime && this.booking.endTime) {
      const start = new Date(this.booking.startTime);
      const end = new Date(this.booking.endTime);
      return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    }
    return 0;
  }

  getStatusColor(): string {
    return STATUS_COLORS[this.form.status] || STATUS_COLORS['CONFIRMED'];
  }

  getStatusLabel(): string {
    return STATUS_LABELS[this.form.status] || this.form.status;
  }

  isValid(): boolean {
    return !!(this.form.clientId && this.form.staffId && this.form.services.length > 0 && this.formDate && this.formTime);
  }

  onSave(): void {
    if (!this.isValid()) return;
    const startDateTime = new Date(`${this.formDate}T${this.formTime}:00`);
    this.form.startTime = startDateTime.toISOString();
    const payload = { data: { ...this.form }, id: this.form.id };
    this.save.emit(payload);
  }

  onDelete(): void {
    if (this.form.id) {
      this.delete.emit(this.form.id);
    }
  }
}
