import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingDetailStateService } from './booking-detail-state.service';
import { SettingsService } from '../../features/settings/settings.service';
import { OnlineProfileService } from '../../features/online-profile/online-profile.service';
import { BookingsService } from './bookings.service';
import { environment } from '../../../environments/environment';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-booking-settings-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="settings-section" role="region" aria-label="Booking settings">
      <header class="section-header">
        <h3 class="header-title">Booking Settings</h3>
        <p class="header-subtitle">Cancellation/deposit policy, communication preferences, and booking-level options</p>
      </header>

      <div *ngIf="loading()" class="state-box loading" role="status">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading settings…</p>
      </div>

      <div *ngIf="error()" class="state-box error" role="alert">
        <span class="state-icon" aria-hidden="true">⚠️</span>
        <p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="settings-grid">
          <div class="settings-card">
            <h4 class="card-title">Cancellation Policy</h4>
            <div class="setting-row" *ngIf="cancellationWindow() !== null">
              <span class="setting-label">Cancellation window</span>
              <span class="setting-value"><strong>{{ cancellationWindow() }}</strong> hours before appointment</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Cancellation policy text</span>
              <span class="setting-value hint">{{ cancellationPolicyText() || 'Not configured' }}</span>
            </div>
            <a class="settings-link" routerLink="/app/online-profile">Edit in Online Profile →</a>
          </div>

          <div class="settings-card">
            <h4 class="card-title">Deposit Policy</h4>
            <div class="setting-row">
              <span class="setting-label">Require deposit</span>
              <span class="setting-value"><strong>{{ requireDeposit() ? 'Yes' : 'No' }}</strong></span>
            </div>
            <div class="setting-row" *ngIf="requireDeposit()">
              <span class="setting-label">Deposit percentage</span>
              <span class="setting-value"><strong>{{ depositPercent() }}%</strong></span>
            </div>
            <a class="settings-link" routerLink="/app/online-portal">Edit in Portal Settings →</a>
          </div>

          <div class="settings-card">
            <h4 class="card-title">Reminder Preferences</h4>
            <div class="setting-row">
              <span class="setting-label">WhatsApp reminders</span>
              <span class="setting-value"><strong>Enabled</strong></span>
            </div>
            <div class="setting-row">
              <span class="setting-label">SMS reminders</span>
              <span class="setting-value"><strong>Not configured</strong></span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Email reminders</span>
              <span class="setting-value"><strong>Not configured</strong></span>
            </div>
            <a class="settings-link" routerLink="/app/delivery-settings">Edit Delivery Settings →</a>
          </div>

          <div class="settings-card">
            <h4 class="card-title">Communication Permissions</h4>
            <div class="setting-toggle">
              <label class="toggle-row">
                <span>Allow SMS notifications</span>
                <input type="checkbox" [ngModel]="allowSms()" (ngModelChange)="toggle('allowSms')">
                <span class="toggle-track" aria-hidden="true"></span>
              </label>
              <label class="toggle-row">
                <span>Allow WhatsApp notifications</span>
                <input type="checkbox" [ngModel]="allowWhatsApp()" (ngModelChange)="toggle('allowWhatsApp')">
                <span class="toggle-track" aria-hidden="true"></span>
              </label>
              <label class="toggle-row">
                <span>Allow email notifications</span>
                <input type="checkbox" [ngModel]="allowEmail()" (ngModelChange)="toggle('allowEmail')">
                <span class="toggle-track" aria-hidden="true"></span>
              </label>
            </div>
          </div>

          <div class="settings-card">
            <h4 class="card-title">Booking Behavior</h4>
            <div class="setting-toggle">
              <label class="toggle-row">
                <span>Allow rescheduling</span>
                <input type="checkbox" [ngModel]="allowReschedule()" (ngModelChange)="toggle('allowReschedule')">
                <span class="toggle-track" aria-hidden="true"></span>
              </label>
              <label class="toggle-row">
                <span>Allow cancellation</span>
                <input type="checkbox" [ngModel]="allowCancel()" (ngModelChange)="toggle('allowCancel')">
                <span class="toggle-track" aria-hidden="true"></span>
              </label>
              <label class="toggle-row">
                <span>Auto-confirm on create</span>
                <input type="checkbox" [ngModel]="autoConfirm()" (ngModelChange)="toggle('autoConfirm')">
                <span class="toggle-track" aria-hidden="true"></span>
              </label>
            </div>
          </div>

          <div class="settings-card">
            <h4 class="card-title">Privacy & Visibility</h4>
            <div class="setting-toggle">
              <label class="toggle-row">
                <span>Visible on client portal</span>
                <input type="checkbox" [ngModel]="portalVisible()" (ngModelChange)="toggle('portalVisible')">
                <span class="toggle-track" aria-hidden="true"></span>
              </label>
              <label class="toggle-row">
                <span>Visible in staff calendar</span>
                <input type="checkbox" [ngModel]="staffVisible()" (ngModelChange)="toggle('staffVisible')">
                <span class="toggle-track" aria-hidden="true"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="settings-card tags-card">
          <h4 class="card-title">Internal Tags</h4>
          <div class="tags-input-row">
            <div class="tags-list" *ngIf="tags().length">
              <span class="tag" *ngFor="let t of tags(); let i = index">
                {{ t }}
                <button class="tag-remove" (click)="removeTag(i)" aria-label="Remove tag {{ t }}">✕</button>
              </span>
            </div>
            <div class="tag-add-row">
              <input type="text" class="tag-input" placeholder="Add a tag…" #tagInput
                (keydown.enter)="addTag(tagInput.value); tagInput.value = ''">
              <button class="tag-add-btn" (click)="addTag(tagInput.value); tagInput.value = ''">Add</button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <h4 class="card-title">Booking Priority</h4>
          <div class="priority-selector">
            <button *ngFor="let p of priorities" class="priority-btn"
              [class.active]="priority() === p.value"
              (click)="priority.set(p.value)">
              {{ p.label }}
            </button>
          </div>
          <div class="color-picker-row">
            <span class="setting-label">Booking color</span>
            <div class="color-options">
              <button *ngFor="let c of colors" class="color-btn"
                [style.background]="c"
                [class.active]="bookingColor() === c"
                (click)="bookingColor.set(c)"
                [attr.aria-label]="'Color ' + c">
              </button>
            </div>
          </div>
        </div>

        <div class="settings-card audit-card">
          <h4 class="card-title">Audit Trail</h4>
          <p class="audit-desc">Track all changes made to this booking, including status updates, reschedules, and settings modifications.</p>
          <a class="settings-link" routerLink="/app/audit-logs">View Full Audit Logs →</a>
        </div>

        <div class="save-bar">
          <button class="save-btn" (click)="saveSettings()" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save Changes' }}
          </button>
          <span *ngIf="saveMessage()" class="save-message" [class.error]="saveError()">
            {{ saveMessage() }}
          </span>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .settings-section{padding:0 4px;max-width:960px}
    .section-header{margin-bottom:20px}
    .header-title{margin:0;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    .header-subtitle{margin:4px 0 0;font-size:13px;color:var(--text-soft,#64748b)}

    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin:16px 0}
    .state-icon{font-size:32px;display:block;margin-bottom:8px}
    .state-box.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    .settings-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:16px}
    .settings-card{padding:16px 18px;border-radius:14px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb)}
    .card-title{margin:0 0 14px;font-size:14px;font-weight:800;color:var(--text-strong,#111827);padding-bottom:8px;border-bottom:1px solid var(--border-subtle,#f1f5f9)}
    .setting-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px;gap:8px}
    .setting-label{color:var(--text-soft,#64748b)}
    .setting-value{color:var(--text-strong,#111827);text-align:right}
    .setting-value.hint{color:var(--text-soft,#94a3b8);font-style:italic;max-width:60%;text-align:right}
    .settings-link{display:inline-block;margin-top:10px;font-size:12px;font-weight:600;color:var(--accent,#6366f1);text-decoration:none}
    .settings-link:hover{text-decoration:underline}

    .setting-toggle{display:flex;flex-direction:column;gap:8px}
    .toggle-row{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:var(--text-strong,#111827);position:relative;padding:4px 0}
    .toggle-row input{position:absolute;opacity:0;width:0;height:0}
    .toggle-track{position:relative;width:36px;height:20px;background:var(--surface-muted,#d1d5db);border-radius:10px;transition:background .2s;flex-shrink:0;margin-left:auto}
    .toggle-track::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .2s}
    .toggle-row input:checked + .toggle-track{background:var(--accent,#6366f1)}
    .toggle-row input:checked + .toggle-track::after{transform:translateX(16px)}
    .toggle-row input:focus-visible + .toggle-track{outline:2px solid var(--accent,#6366f1);outline-offset:2px}

    .tags-card{margin-bottom:14px}
    .tags-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
    .tag{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;background:var(--surface-muted,#f1f5f9);color:var(--text-soft,#64748b);font-size:12px;font-weight:600}
    .tag-remove{background:none;border:none;cursor:pointer;font-size:10px;color:var(--text-soft,#94a3b8);padding:0 2px}
    .tag-remove:hover{color:#dc2626}
    .tag-add-row{display:flex;gap:6px}
    .tag-input{flex:1;padding:7px 12px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:8px;font-size:13px;background:var(--surface-card,#fff);color:var(--text-strong,#111827);outline:none}
    .tag-input:focus{border-color:var(--accent,#6366f1)}
    .tag-add-btn{padding:7px 14px;border-radius:8px;border:none;background:var(--accent,#6366f1);color:#fff;font-weight:700;font-size:12px;cursor:pointer}

    .priority-selector{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
    .priority-btn{padding:6px 16px;border-radius:8px;border:1px solid var(--border-subtle,#e5e7eb);background:var(--surface-card,#fff);font-size:12px;font-weight:600;color:var(--text-soft,#64748b);cursor:pointer;transition:all .15s}
    .priority-btn:hover{border-color:var(--accent,#6366f1)}
    .priority-btn.active{background:var(--accent,#6366f1);color:#fff;border-color:var(--accent,#6366f1)}
    .color-picker-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .color-options{display:flex;gap:6px}
    .color-btn{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:all .15s}
    .color-btn:hover{transform:scale(1.1)}
    .color-btn.active{border-color:var(--text-strong,#111827);box-shadow:0 0 0 2px #fff,0 0 0 4px currentColor}

    .audit-card{margin-bottom:16px}
    .audit-desc{font-size:13px;color:var(--text-soft,#64748b);margin:0 0 10px}

    .save-bar{display:flex;align-items:center;gap:12px;padding:14px 18px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px}
    .save-btn{padding:8px 22px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:13px;cursor:pointer;transition:transform .15s,box-shadow .15s}
    .save-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,.3)}
    .save-btn:disabled{opacity:.5;cursor:not-allowed}
    .save-message{font-size:13px;font-weight:600;color:#16a34a}
    .save-message.error{color:#dc2626}
  `]
})
export class BookingSettingsSectionComponent implements OnInit, OnDestroy {
  private state = inject(BookingDetailStateService);
  private settingsService = inject(SettingsService);
  private profileService = inject(OnlineProfileService);
  private bookingsService = inject(BookingsService);
  private http = inject(HttpClient);

  private destroy$ = new Subject<void>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveMessage = signal<string | null>(null);
  readonly saveError = signal(false);

  readonly cancellationWindow = signal<number | null>(null);
  readonly cancellationPolicyText = signal<string | null>(null);
  readonly requireDeposit = signal(false);
  readonly depositPercent = signal(0);

  readonly allowSms = signal(true);
  readonly allowWhatsApp = signal(true);
  readonly allowEmail = signal(true);
  readonly allowReschedule = signal(true);
  readonly allowCancel = signal(true);
  readonly autoConfirm = signal(false);
  readonly portalVisible = signal(true);
  readonly staffVisible = signal(true);

  readonly tags = signal<string[]>([]);
  readonly priority = signal<'low' | 'medium' | 'high'>('medium');
  readonly bookingColor = signal('#6366f1');

  readonly priorities = [
    { label: 'Low', value: 'low' as const },
    { label: 'Medium', value: 'medium' as const },
    { label: 'High', value: 'high' as const },
  ];

  readonly colors = ['#6366f1', '#ec4899', '#f97316', '#eab308', '#16a34a', '#06b6d4', '#8b5cf6', '#dc2626'];

  ngOnInit(): void {
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSettings(): void {
    this.loading.set(true);

    this.profileService.getProfile().pipe(
      catchError(() => of({ cancellationWindow: null })),
      takeUntil(this.destroy$)
    ).subscribe(profile => {
      if (profile?.cancellationWindow !== undefined) {
        this.cancellationWindow.set(profile.cancellationWindow);
      }
    });

    this.settingsService.getBusiness().pipe(
      catchError(() => of({})),
      takeUntil(this.destroy$)
    ).subscribe(business => {
      this.loading.set(false);
    });

    const branchId = this.state.booking()?.branchId || 'current';
    this.http.get(`${environment.apiUrl}/online-bookings/settings/${branchId}`)
      .pipe(
        catchError(() => {
          this.loading.set(false);
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((settings: any) => {
        if (settings) {
          this.cancellationPolicyText.set(settings.cancellationPolicy || null);
          this.requireDeposit.set(settings.requireDeposit || false);
          this.depositPercent.set(settings.depositPercent || 0);
        }
        this.loading.set(false);
      });
  }

  toggle(field: string): void {
    const signals: Record<string, import('@angular/core').WritableSignal<boolean>> = {
      allowSms: this.allowSms,
      allowWhatsApp: this.allowWhatsApp,
      allowEmail: this.allowEmail,
      allowReschedule: this.allowReschedule,
      allowCancel: this.allowCancel,
      autoConfirm: this.autoConfirm,
      portalVisible: this.portalVisible,
      staffVisible: this.staffVisible,
    };
    if (signals[field]) {
      signals[field].update(v => !v);
    }
  }

  addTag(value: string): void {
    const tag = value.trim();
    if (tag && !this.tags().includes(tag)) {
      this.tags.update(t => [...t, tag]);
    }
  }

  removeTag(index: number): void {
    this.tags.update(t => t.filter((_, i) => i !== index));
  }

  saveSettings(): void {
    this.saving.set(true);
    this.saveMessage.set(null);
    this.saveError.set(false);

    const bookingId = this.state.bookingId();
    if (!bookingId) {
      this.saveMessage.set('No booking loaded');
      this.saveError.set(true);
      this.saving.set(false);
      return;
    }

    this.bookingsService.update(bookingId, {
      notes: `Tags: ${this.tags().join(', ')} | Priority: ${this.priority()} | Color: ${this.bookingColor()}`,
    } as any).pipe(
      catchError(err => {
        this.saveMessage.set('Failed to save settings');
        this.saveError.set(true);
        this.saving.set(false);
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saving.set(false);
      this.saveMessage.set('Settings saved successfully');
      setTimeout(() => this.saveMessage.set(null), 3000);
    });
  }
}
