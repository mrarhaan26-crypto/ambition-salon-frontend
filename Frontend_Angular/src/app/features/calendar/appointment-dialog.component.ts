import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges, inject, HostListener, ElementRef, ViewChild, AfterViewInit, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, of, Subscription, forkJoin, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from 'rxjs/operators';
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
  endTime?: string;
  branchId: string;
  notes: string;
  status: string;
  resourceId?: string;
  services: { serviceId: string; name: string; durationMin: number; price: number }[];
  durationMin?: number;
  estimatedTotal?: number;
  clientName?: string;
  staffName?: string;
  branchName?: string;
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
            <div class="client-search-wrap">
              <input
                #firstField
                id="apt-client"
                type="text"
                [(ngModel)]="clientSearchText"
                (input)="onClientSearchInput()"
                (focus)="onClientSearchFocus()"
                (blur)="onClientSearchBlur()"
                (keydown)="onClientSearchKeydown($event)"
                placeholder="Search client by name or phone..."
                autocomplete="off"
                aria-label="Search client"
                class="client-search-input"
              >
              <div class="client-dropdown" *ngIf="showClientDropdown && (clientSearching || filteredClients.length > 0 || clientSearchText.length >= 2)">
                <div class="cd-loading" *ngIf="clientSearching">
                  <div class="mini-spinner"></div><span>Searching...</span>
                </div>
                <button class="cd-item" *ngFor="let c of filteredClients; let i = index"
                  (mousedown)="selectClient(c)" [class.cd-selected]="i === clientHighlightIndex"
                  type="button">
                  <span class="cd-main">
                    <span class="cd-name">{{ c.fullName }}</span>
                    <span class="cd-email" *ngIf="c.email">{{ c.email }}</span>
                  </span>
                  <span class="cd-phone" *ngIf="c.phone">{{ c.phone }}</span>
                </button>
                <div class="cd-empty" *ngIf="!clientSearching && filteredClients.length === 0 && clientSearchText.length >= 2">
                  <span>No matching client found.</span>
                  <button class="cd-create-btn" (mousedown)="showNewClientForm = true; showClientDropdown = false" type="button">+ Create new client</button>
                </div>
              </div>
            </div>
            <div class="client-card" *ngIf="selectedClient && !showNewClientForm">
              <div class="cc-avatar">{{ selectedClient.fullName.charAt(0) }}</div>
              <div class="cc-info">
                <strong class="cc-name">{{ selectedClient.fullName }}</strong>
                <span class="cc-detail" *ngIf="selectedClient.phone">{{ selectedClient.phone }}</span>
                <span class="cc-detail" *ngIf="selectedClient.email">{{ selectedClient.email }}</span>
              </div>
              <div class="cc-stats" *ngIf="selectedClient.totalVisits !== undefined">
                <span class="cc-stat" title="Total visits"><strong>{{ selectedClient.totalVisits }}</strong> visits</span>
                <span class="cc-stat" title="Total spend"><strong>{{ selectedClient.totalSpend | currency }}</strong></span>
              </div>
              <button class="cc-clear" type="button" (click)="clearClient()" aria-label="Clear client">&times;</button>
            </div>
            <div class="new-client-section" *ngIf="showNewClientForm">
              <div class="nc-grid">
                <input [(ngModel)]="newClientName" placeholder="Client name" class="nc-input nc-full" (keydown.enter)="createNewClient()">
                <input [(ngModel)]="newClientPhone" placeholder="Phone number" class="nc-input" (keydown.enter)="createNewClient()">
                <input [(ngModel)]="newClientEmail" placeholder="Email (optional)" class="nc-input" (keydown.enter)="createNewClient()">
              </div>
              <div class="nc-duplicate" *ngIf="duplicateClients.length > 0">
                <span class="nc-dup-label">Possible duplicate:</span>
                <span class="nc-dup-name" *ngFor="let d of duplicateClients" (click)="selectClient(d)">{{ d.fullName }} ({{ d.phone || d.email }})</span>
              </div>
              <div class="nc-error" *ngIf="newClientError">{{ newClientError }}</div>
              <div class="nc-actions">
                <button class="btn btn-sm btn-primary" (click)="createNewClient()" [disabled]="newClientBusy || !newClientName">{{ newClientBusy ? 'Adding...' : 'Add Client' }}</button>
                <button class="btn btn-sm btn-secondary" (click)="cancelNewClient()">Cancel</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="apt-service">Service</label>
            <select id="apt-service" [(ngModel)]="selectedServiceId" (change)="onServiceChange()" aria-label="Service" class="form-select">
              <option value="">Select service...</option>
              <option *ngFor="let s of serviceList" [value]="s.id">{{ s.name }} &mdash; {{ s.durationMin }}m / {{ s.price | currency }}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="apt-staff">Staff</label>
            <select id="apt-staff" [(ngModel)]="form.staffId" (change)="onStaffChange()" aria-label="Staff" class="form-select">
              <option value="">Select staff...</option>
              <option *ngFor="let s of staffList" [value]="s.id" [class.staff-unavailable]="!isStaffAvailable(s.id)">
                {{ s.fullName }} <ng-container *ngIf="!isStaffAvailable(s.id)">(unavailable)</ng-container>
              </option>
            </select>
            <span class="field-hint av-status" *ngIf="form.staffId && formDate && formTime && availabilityStatus !== 'unknown'">
              <span *ngIf="availabilityStatus === 'available' && !conflictExists" class="hint-ok">✓ Available</span>
              <span *ngIf="conflictExists" class="hint-warn">⚠ Conflict</span>
              <span *ngIf="availabilityStatus === 'outside-hours'" class="hint-warn">⚠ Outside working hours</span>
              <span *ngIf="availabilityStatus === 'not-scheduled'" class="hint-error">🚫 Staff not scheduled</span>
            </span>
            <span class="field-hint hint-info" *ngIf="validationBusy">Checking availability...</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="apt-date">Date</label>
              <input id="apt-date" type="date" [(ngModel)]="formDate" (change)="onDateTimeChange()" aria-label="Date" class="form-input">
            </div>
            <div class="form-group">
              <label for="apt-time">Time</label>
              <input id="apt-time" type="time" [(ngModel)]="formTime" (change)="onDateTimeChange()" aria-label="Time" class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label for="apt-resource">Resource</label>
            <select id="apt-resource" [(ngModel)]="form.resourceId" aria-label="Resource" class="form-select">
              <option value="">No resource</option>
              <option *ngFor="let r of resourceList" [value]="r.id">{{ r.name }} ({{ r.type }})</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Duration</label>
              <div class="form-static">{{ getDuration() }} minutes</div>
            </div>
            <div class="form-group">
              <label>Total</label>
              <div class="form-static form-static-price">{{ getTotal() | currency }}</div>
            </div>
          </div>

          <div class="conflict-banner" *ngIf="conflictWarning">
            <span class="conflict-icon">&#x26A0;</span>
            <span>{{ conflictWarning }}</span>
          </div>

          <div class="form-group">
            <label for="apt-status">Status</label>
            <select id="apt-status" [(ngModel)]="form.status" aria-label="Status" class="form-select">
              <option *ngFor="let s of statusOptions" [value]="s">{{ STATUS_LABELS[s] || s }}</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group form-group-full">
              <label>Color Preview</label>
              <div class="color-preview-row">
                <span class="color-swatch" [style.background]="getStatusColor()" aria-label="Status color"></span>
                <span class="color-label">{{ getStatusLabel() }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="apt-notes">Notes</label>
            <textarea id="apt-notes" [(ngModel)]="form.notes" rows="3" placeholder="Optional notes..." aria-label="Notes" class="form-textarea"></textarea>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="close.emit()">Cancel</button>
          <button *ngIf="isEditing" class="btn btn-danger" (click)="onDelete()">Delete</button>
          <button class="btn btn-primary" (click)="onSave()" [disabled]="!isValid() || saveBusy || validationBusy">
            {{ saveBusy ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
          </button>
        </div>
        <div class="dialog-error" *ngIf="saveError">{{ saveError }}</div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
      animation: fadeOverlay 0.15s ease;
    }
    @keyframes fadeOverlay { from { opacity: 0; } to { opacity: 1; } }
    .dialog-panel {
      background: #fff; border-radius: 16px; width: 100%; max-width: 500px;
      max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
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
    .dialog-error {
      padding: 12px 24px 20px; font-size: 13px; color: #991b1b; background: #fef2f2;
    }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--text, #111); }
    .form-input, .form-select, .form-textarea {
      width: 100%; border: 1px solid var(--border, #e5e7eb); border-radius: 8px;
      padding: 0 12px; font: inherit; font-size: 14px; background: #fff; box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: #6366f1; outline: none;
    }
    .form-input, .form-select { height: 42px; }
    .form-textarea { padding-top: 10px; min-height: 80px; resize: vertical; }
    .form-static {
      height: 42px; display: flex; align-items: center; font-size: 14px;
      color: var(--muted, #6b7280); padding: 0 12px;
      border: 1px solid var(--border, #e5e7eb); border-radius: 8px;
      background: var(--soft, #f7f7f7);
    }
    .form-static-price { font-weight: 700; color: #059669; font-size: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group-full { grid-column: 1 / -1; }
    .field-hint { font-size: 11px; padding: 2px 0 0; }
    .av-status { display: flex; align-items: center; gap: 4px; }
    .hint-ok { color: #059669; font-weight: 600; }
    .hint-warn { color: #d97706; font-weight: 600; }
    .hint-error { color: #dc2626; font-weight: 600; }
    .hint-info { color: #6b7280; font-style: italic; }
    .color-preview-row { display: flex; align-items: center; gap: 8px; height: 42px; }
    .color-swatch { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border, #e5e7eb); flex-shrink: 0; }
    .color-label { font-size: 13px; font-weight: 600; }
    .dialog-actions {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 24px 20px; border-top: 1px solid var(--border, #e5e7eb);
    }
    .dialog-actions .btn { flex: 1; }
    .btn { height: 42px; border-radius: 10px; border: 1px solid var(--border, #e5e7eb); padding: 0 20px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .btn-sm { height: 36px; padding: 0 14px; font-size: 13px; }
    .btn-primary { background: var(--black, #0b0b0b); color: #fff; border-color: var(--black, #0b0b0b); }
    .btn-primary:hover { background: #1a1a1a; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-secondary { background: #fff; }
    .btn-secondary:hover { background: var(--soft, #f7f7f7); }
    .btn-danger { background: #fff; color: #E53935; border-color: #E53935; }
    .btn-danger:hover { background: #FFF5F5; }
    .btn-danger:disabled { opacity: 0.4; cursor: not-allowed; }
    .client-search-wrap { position: relative; }
    .client-search-input {
      width: 100%; height: 42px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px;
      padding: 0 12px; font: inherit; font-size: 14px; background: #fff; box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .client-search-input:focus { border-color: #6366f1; outline: none; }
    .client-dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff;
      border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      z-index: 20; max-height: 220px; overflow-y: auto;
    }
    .cd-loading, .cd-empty { padding: 12px 14px; text-align: center; font-size: 13px; color: #6b7280; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .cd-item {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px;
      border: 0; background: transparent; font-size: 13px; cursor: pointer; text-align: left;
      transition: background 0.1s;
    }
    .cd-item:hover, .cd-selected { background: #f3f4f6; }
    .cd-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .cd-name { font-weight: 700; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cd-email { color: #6b7280; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cd-phone { color: #374151; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .cd-create-btn { border: 0; background: #0b0b0b; color: #fff; border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .cd-create-btn:hover { background: #1a1a1a; }
    .client-card {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; margin-top: 6px;
    }
    .cc-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: #6366f1; color: #fff;
      display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px;
      flex-shrink: 0;
    }
    .cc-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
    .cc-name { font-size: 14px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cc-detail { font-size: 12px; color: #4b5563; }
    .cc-stats { display: flex; gap: 8px; flex-shrink: 0; }
    .cc-stat { font-size: 11px; color: #6b7280; background: #f9fafb; padding: 3px 8px; border-radius: 6px; text-align: center; }
    .cc-stat strong { display: block; font-size: 13px; color: #111827; }
    .cc-clear { border: 0; background: transparent; color: #4338ca; font-size: 18px; cursor: pointer; padding: 0; line-height: 1; opacity: 0.65; flex-shrink: 0; }
    .cc-clear:hover { opacity: 1; }
    .new-client-section {
      margin-top: 6px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb;
      border-radius: 10px; display: flex; flex-direction: column; gap: 8px;
    }
    .nc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .nc-input { padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; box-sizing: border-box; width: 100%; }
    .nc-input:focus { border-color: #6366f1; outline: none; }
    .nc-full { grid-column: 1 / -1; }
    .nc-actions { display: flex; gap: 8px; }
    .nc-error { font-size: 12px; color: #991b1b; background: #fef2f2; border-radius: 8px; padding: 8px 10px; }
    .nc-duplicate { font-size: 12px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
    .nc-dup-label { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .nc-dup-name { cursor: pointer; color: #6366f1; }
    .nc-dup-name:hover { text-decoration: underline; }
    .staff-unavailable { color: #9ca3af; }
    .mini-spinner {
      width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #6366f1;
      border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .conflict-banner {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 13px; color: #991b1b;
    }
    .conflict-icon { font-size: 16px; flex-shrink: 0; }
    @media (max-width: 640px) {
      .dialog-overlay { padding: 0; align-items: flex-end; }
      .dialog-panel { max-width: 100%; border-radius: 16px 16px 0 0; max-height: 85vh; }
      .form-row { grid-template-columns: 1fr; }
      .nc-grid { grid-template-columns: 1fr; }
      .nc-full { grid-column: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .dialog-overlay, .dialog-panel { animation: none; }
    }
  `]
})
export class AppointmentDialogComponent implements OnChanges, AfterViewInit, OnInit {
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
  private cdr = inject(ChangeDetectorRef);

  STATUS_LABELS = STATUS_LABELS;
  statusOptions = [...APPOINTMENT_STATUSES];

  staffList: Staff[] = [];
  serviceList: SalonService[] = [];
  resourceList: ResourceEntity[] = [];

  form: DialogAppointmentData = this.emptyForm();
  selectedServiceId = '';
  formDate = '';
  formTime = '';

  clientSearchText = '';
  filteredClients: Client[] = [];
  selectedClient: Client | null = null;
  clientSearching = false;
  showClientDropdown = false;
  clientHighlightIndex = -1;

  showNewClientForm = false;
  newClientName = '';
  newClientPhone = '';
  newClientEmail = '';
  newClientBusy = false;
  newClientError = '';
  duplicateClients: Client[] = [];

  conflictWarning = '';
  conflictExists = false;
  availabilityStatus: 'unknown' | 'available' | 'unavailable' | 'outside-hours' | 'not-scheduled' = 'unknown';
  saveBusy = false;
  saveError = '';
  validationBusy = false;

  private searchSubject = new Subject<string>();
  private subs: Subscription[] = [];
  private searchBlurTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduleCache = new Map<string, any[]>();
  private validationSubject = new Subject<void>();

  get isEditing(): boolean {
    return !!this.booking;
  }

  ngOnInit(): void {
    this.subs.push(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (query.length < 2) return of([]);
          this.clientSearching = true;
          this.cdr.markForCheck();
          return this.clientsService.getClients({ search: query, limit: 10 }).pipe(
            catchError(() => of({ items: [] })),
          );
        }),
      ).subscribe(res => {
        this.clientSearching = false;
        const items = Array.isArray(res) ? res : (res as any).items || [];
        this.filteredClients = items || [];
        this.clientHighlightIndex = -1;
        this.cdr.markForCheck();
      }),
    );

    this.subs.push(
      this.validationSubject.pipe(
        debounceTime(300),
        switchMap(() => this.performValidation()),
      ).subscribe(result => {
        this.validationBusy = false;
        if (result) {
          this.applyValidation(result.schedule, result.bookings, result.staffId, result.dateStr, result.timeStr);
        } else {
          this.availabilityStatus = 'unknown';
          this.conflictExists = false;
          this.conflictWarning = '';
          this.cdr.markForCheck();
        }
      }),
    );
  }

  ngAfterViewInit(): void {
    if (this.firstFieldRef) {
      setTimeout(() => this.firstFieldRef.nativeElement.focus(), 100);
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

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.searchSubject.complete();
    this.validationSubject.complete();
    if (this.searchBlurTimer !== null) clearTimeout(this.searchBlurTimer);
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
      if (this.booking.client) {
        this.selectedClient = this.booking.client as any;
        this.clientSearchText = this.booking.client.fullName || '';
      }
    } else {
      this.form = this.emptyForm();
      this.form.branchId = this.defaultBranchId;
      this.form.staffId = this.defaultStaffId;
      const now = new Date();
      this.formDate = this.defaultDate || now.toISOString().slice(0, 10);
      this.formTime = this.defaultTime || now.toTimeString().slice(0, 5);
    }
    this.checkConflicts();
  }

  private emptyForm(): DialogAppointmentData {
    return {
      clientId: '', staffId: '', title: '', startTime: '',
      branchId: '', notes: '', resourceId: '', status: 'CONFIRMED', services: [],
    };
  }

  loadStaff(): void {
    this.staffService.getAll().subscribe({
      next: list => { this.staffList = list; this.cdr.markForCheck(); },
      error: () => { this.staffList = []; },
    });
  }

  loadServices(): void {
    this.servicesService.getAll().subscribe({
      next: list => { this.serviceList = list; this.cdr.markForCheck(); },
      error: () => { this.serviceList = []; },
    });
  }

  loadResources(): void {
    this.resourceList = this.resourceEngine.managerService.getAll();
    this.cdr.markForCheck();
  }

  onClientSearchInput(): void {
    this.searchSubject.next(this.clientSearchText);
    if (this.clientSearchText.length >= 2) {
      this.showClientDropdown = true;
    } else {
      this.showClientDropdown = false;
      this.filteredClients = [];
    }
  }

  onClientSearchFocus(): void {
    if (this.filteredClients.length > 0) {
      this.showClientDropdown = true;
    }
  }

  onClientSearchBlur(): void {
    this.searchBlurTimer = setTimeout(() => {
      this.showClientDropdown = false;
      this.cdr.markForCheck();
      this.searchBlurTimer = null;
    }, 200);
  }

  onClientSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.clientHighlightIndex = Math.min(this.clientHighlightIndex + 1, this.filteredClients.length - 1);
      this.cdr.markForCheck();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.clientHighlightIndex = Math.max(this.clientHighlightIndex - 1, -1);
      this.cdr.markForCheck();
    } else if (event.key === 'Enter' && this.clientHighlightIndex >= 0) {
      event.preventDefault();
      this.selectClient(this.filteredClients[this.clientHighlightIndex]);
    }
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
    this.form.clientId = client.id;
    this.clientSearchText = client.fullName;
    this.showClientDropdown = false;
    this.showNewClientForm = false;
    this.cdr.markForCheck();
  }

  clearClient(): void {
    this.selectedClient = null;
    this.form.clientId = '';
    this.clientSearchText = '';
    this.showNewClientForm = false;
    this.cdr.markForCheck();
  }

  cancelNewClient(): void {
    this.showNewClientForm = false;
    this.newClientName = '';
    this.newClientPhone = '';
    this.newClientEmail = '';
    this.newClientError = '';
    this.duplicateClients = [];
    this.cdr.markForCheck();
  }

  createNewClient(): void {
    if (!this.newClientName || this.newClientBusy) return;
    this.newClientBusy = true;
    this.newClientError = '';
    this.duplicateClients = [];

    const payload: any = { fullName: this.newClientName };
    if (this.newClientPhone) payload.phone = this.newClientPhone;
    if (this.newClientEmail) payload.email = this.newClientEmail;

    this.clientsService.createClient(payload).subscribe({
      next: (client) => {
        this.selectClient(client);
        this.showNewClientForm = false;
        this.newClientBusy = false;
        this.newClientName = '';
        this.newClientPhone = '';
        this.newClientEmail = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.newClientBusy = false;
        if (err.error?.message?.includes('phone') || err.error?.message?.includes('email')) {
          this.duplicateClients = [];
          this.newClientError = 'A client with this information may already exist.';
          this.clientsService.getClients({ search: this.newClientPhone || this.newClientEmail || this.newClientName, limit: 5 })
            .subscribe(res => {
              const items = Array.isArray(res) ? res : (res as any).items || [];
              this.duplicateClients = items || [];
              this.cdr.markForCheck();
            });
        } else {
          this.newClientError = err.error?.message || 'Failed to create client';
        }
        this.cdr.markForCheck();
      },
    });
  }

  onStaffChange(): void {
    this.checkConflicts();
    this.cdr.markForCheck();
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
    this.checkConflicts();
    this.cdr.markForCheck();
  }

  onDateTimeChange(): void {
    this.checkConflicts();
    this.cdr.markForCheck();
  }

  isStaffAvailable(staffId: string): boolean {
    if (!this.formDate) return true;
    const schedule = this.scheduleCache.get(staffId);
    if (!schedule) return true;
    const dayOfWeek = new Date(this.formDate + 'T12:00:00').getDay();
    return schedule.some((s: any) => s.dayOfWeek === dayOfWeek && s.isActive !== false);
  }

  isStaffAvailableAtTime(): boolean {
    return this.availabilityStatus === 'available' || this.availabilityStatus === 'unknown';
  }

  checkConflicts(): void {
    this.validationSubject.next();
  }

  private performValidation(): Observable<{
    schedule: any[];
    bookings: any[];
    staffId: string;
    dateStr: string;
    timeStr: string;
  } | null> {
    if (!this.form.staffId || !this.formDate || !this.formTime) {
      return of(null);
    }
    this.validationBusy = true;
    this.cdr.markForCheck();

    const staffId = this.form.staffId;
    const dateStr = this.formDate;
    const timeStr = this.formTime;

    const schedule$ = this.getScheduleObs(staffId).pipe(
      catchError(() => of([] as any[])),
    );
    const bookings$ = this.getDayBookingsObs(staffId, dateStr).pipe(
      catchError(() => of([] as any[])),
    );

    return forkJoin({ schedule: schedule$, bookings: bookings$ }).pipe(
      map(({ schedule, bookings }) => ({ schedule, bookings, staffId, dateStr, timeStr })),
    );
  }

  private getScheduleObs(staffId: string): Observable<any[]> {
    const cached = this.scheduleCache.get(staffId);
    if (cached) return of(cached);
    return this.staffService.getSchedule(staffId).pipe(
      map((res: any) => {
        const items = Array.isArray(res) ? res : [];
        this.scheduleCache.set(staffId, items);
        return items;
      }),
    );
  }

  private getDayBookingsObs(staffId: string, dateStr: string): Observable<any[]> {
    const dayStart = new Date(dateStr + 'T00:00:00');
    const dayEnd = new Date(dateStr + 'T23:59:59');
    return this.staffService.getBookings(staffId, {
      from: dayStart.toISOString(),
      to: dayEnd.toISOString(),
    }).pipe(
      map((res: any) => Array.isArray(res) ? res : []),
    );
  }

  private runValidation(): void {
    this.checkConflicts();
  }

  private applyValidation(schedule: any[], bookings: any[], staffId: string, dateStr: string, timeStr: string): void {
    this.validationBusy = false;

    const date = new Date(dateStr + 'T' + timeStr + ':00');
    const dayOfWeek = date.getDay();
    const timeMinutes = date.getHours() * 60 + date.getMinutes();
    const duration = this.getDuration();
    const endTimeMinutes = timeMinutes + duration;

    const scheduledSlot = schedule.find((s: any) => s.dayOfWeek === dayOfWeek && s.isActive !== false);

    if (!scheduledSlot) {
      this.availabilityStatus = 'not-scheduled';
      this.conflictExists = false;
      this.conflictWarning = '';
      this.cdr.markForCheck();
      return;
    }

    const slotStartMinutes = this.timeToMinutes(scheduledSlot.startTime);
    const slotEndMinutes = this.timeToMinutes(scheduledSlot.endTime);

    if (timeMinutes < slotStartMinutes || endTimeMinutes > slotEndMinutes) {
      this.availabilityStatus = 'outside-hours';
      this.conflictExists = false;
      this.conflictWarning = '';
      this.cdr.markForCheck();
      return;
    }

    const activeStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN'];
    const bookingStart = date;
    const bookingEnd = new Date(date.getTime() + duration * 60000);
    const excludeId = this.isEditing ? this.form.id : undefined;

    const conflict = (bookings || []).find((b: any) => {
      if (excludeId && b.id === excludeId) return false;
      if (!activeStatuses.includes(b.status)) return false;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return bookingStart < bEnd && bookingEnd > bStart;
    });

    if (conflict) {
      this.availabilityStatus = 'available';
      this.conflictExists = true;
      const fmtTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };
      this.conflictWarning = `"${conflict.title || 'Appointment'}" (${fmtTime(conflict.startTime)} - ${fmtTime(conflict.endTime)}) overlaps with this slot`;
      this.cdr.markForCheck();
      return;
    }

    this.availabilityStatus = 'available';
    this.conflictExists = false;
    this.conflictWarning = '';
    this.cdr.markForCheck();
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  getDuration(): number {
    if (this.form.services.length > 0) {
      return this.form.services.reduce((sum, s) => sum + (s.durationMin || 0), 0);
    }
    if (this.booking && this.booking.startTime && this.booking.endTime) {
      const start = new Date(this.booking.startTime);
      const end = new Date(this.booking.endTime);
      return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    }
    return 0;
  }

  getTotal(): number {
    if (this.form.services.length > 0) {
      return this.form.services.reduce((sum, s) => sum + (s.price || 0), 0);
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
    return !!(this.form.clientId && this.form.staffId && this.form.services.length > 0 && this.formDate && this.formTime && !this.saveBusy && !this.conflictExists);
  }

  onSave(): void {
    if (!this.isValid()) return;
    this.saveBusy = true;
    this.saveError = '';
    const startDateTime = new Date(`${this.formDate}T${this.formTime}:00`);
    this.form.startTime = startDateTime.toISOString();
    const duration = this.getDuration();
    const endTime = new Date(startDateTime.getTime() + duration * 60000).toISOString();
    const staff = this.staffList.find(s => s.id === this.form.staffId);
    const branchName = '';
    const payload = {
      data: {
        ...this.form,
        endTime,
        durationMin: duration,
        estimatedTotal: this.getTotal(),
        clientName: this.selectedClient?.fullName || '',
        staffName: staff?.fullName || '',
        branchName,
      },
      id: this.form.id,
    };
    this.save.emit(payload);
  }

  onDelete(): void {
    if (this.form.id) {
      this.delete.emit(this.form.id);
    }
  }
}
