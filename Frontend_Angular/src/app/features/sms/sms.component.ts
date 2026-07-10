import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SmsService } from './sms.service';
import { SmsProvider } from './sms.models';

@Component({
  selector: 'app-sms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>SMS</h1><p>SMS provider configuration and test messaging.</p></div><button class="primary" (click)="openForm()">+ Add Provider</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="empty" *ngIf="items.length===0"><p>No SMS providers configured.</p></div>
        <div class="provider-list" *ngIf="items.length>0">
          <div class="provider-card" *ngFor="let p of items" [class.disabled]="!p.isEnabled">
            <div class="prov-head">
              <strong>{{ p.name }}</strong>
              <span class="prov-type">{{ p.provider }}</span>
              <span class="default-badge" *ngIf="p.isDefault">Default</span>
            </div>
            <div class="prov-field"><label>API Key</label><input [(ngModel)]="p.apiKey" placeholder="API Key"></div>
            <div class="prov-field"><label>API Secret</label><input [(ngModel)]="p.apiSecret" type="password" placeholder="Secret"></div>
            <div class="prov-field"><label>From Number</label><input [(ngModel)]="p.fromNumber" placeholder="+1234567890"></div>
            <div class="prov-actions">
              <label><input type="checkbox" [(ngModel)]="p.isEnabled"> Enabled</label>
              <button *ngIf="!p.isDefault" (click)="setDefault(p)">Set Default</button>
              <button class="btn-remove" (click)="confirmDelete(p)">Delete</button>
            </div>
          </div>
        </div>

        <div class="panel" *ngIf="items.length>0">
          <h2>Send Test Message</h2>
          <div class="test-row"><input [(ngModel)]="testTo" placeholder="Phone number" class="input"><input [(ngModel)]="testMsg" placeholder="Message" class="input"><button class="primary" (click)="sendTest()" [disabled]="testSending">{{ testSending ? 'Sending...' : 'Send Test' }}</button></div>
          <div class="msg" *ngIf="testResult">{{ testResult }}</div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>Add SMS Provider</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Name</label><input [(ngModel)]="form.name" placeholder="e.g. Twilio Main"></div>
          <div class="form-group"><label>Provider</label><select [(ngModel)]="form.provider"><option value="TWILIO">Twilio</option><option value="VONAGE">Vonage</option><option value="PLIVO">Plivo</option><option value="AWS">AWS SNS</option></select></div>
          <div class="form-group"><label>API Key</label><input [(ngModel)]="form.apiKey" placeholder="API Key"></div>
          <div class="form-group"><label>API Secret</label><input [(ngModel)]="form.apiSecret" type="password" placeholder="Secret"></div>
          <div class="form-group"><label>From Number</label><input [(ngModel)]="form.fromNumber" placeholder="+1234567890"></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Adding...' : 'Add Provider' }}</button></div>
        </div>
      </div>
    </div>

    <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete=false">
      <div class="confirm-panel" (click)="$event.stopPropagation()"><h3>Delete</h3><p>{{ deleteMsg }}</p>
        <div class="confirm-actions"><button (click)="showDelete=false">Cancel</button><button class="btn-danger" (click)="doDelete()">Delete</button></div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .primary:disabled{opacity:.5;cursor:default}
    .btn-remove{background:#fee2e2!important;color:#991b1b!important}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .provider-list{display:grid;gap:12px}
    .provider-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:24px;display:grid;gap:12px}
    .provider-card.disabled{opacity:.55}
    .prov-head{display:flex;gap:8px;align-items:center}
    .prov-head strong{flex:1;font-size:16px}
    .prov-type{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px;background:#f3f4f6;color:#374151}
    .default-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px;background:#f0fdf4;color:#16a34a}
    .prov-field{display:grid;gap:4px}
    .prov-field label{font-size:12px;font-weight:700;color:#374151}
    .prov-field input{padding:12px;border:1px solid #e5e7eb;border-radius:12px}
    .prov-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .prov-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px}
    .panel h2{font-size:18px;margin:0 0 12px}
    .test-row{display:flex;gap:10px}
    .input{padding:14px;border:1px solid #e5e7eb;border-radius:14px;flex:1}
    .msg{padding:8px 14px;background:#f0fdf4;border-radius:10px;color:#16a34a;font-weight:700;font-size:13px;text-align:center;margin-top:8px}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{font-size:28px;cursor:pointer;color:#6b7280;border:0;background:transparent}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-primary{background:#0b0b0b;color:white}
    .confirm-panel{background:white;border-radius:24px;padding:28px;width:min(420px,90%)}
    .confirm-actions{display:flex;gap:10px;margin-top:12px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-danger{background:#fee2e2;color:#991b1b}
    @media(max-width:900px){.drawer-panel{width:100%}}
  `]
})
export class SmsComponent {
  private api = inject(SmsService);
  items: SmsProvider[] = [];
  loading = true; error = '';
  showForm = false; form: any = { name: '', provider: 'TWILIO', apiKey: '', apiSecret: '', fromNumber: '' };
  formMsg = ''; formBusy = false;
  testTo = ''; testMsg = ''; testResult = ''; testSending = false;
  showDelete = false; deleteMsg = ''; deleteAction: (() => void) | null = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getProviders().subscribe({ next: d => { this.items = d; this.loading = false; }, error: () => { this.error = 'Providers unavailable.'; this.loading = false; } });
  }
  openForm() { this.form = { name: '', provider: 'TWILIO', apiKey: '', apiSecret: '', fromNumber: '' }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  save() {
    this.formBusy = true; this.formMsg = '';
    this.api.create(this.form).subscribe({ next: () => { this.closeForm(); this.formBusy = false; this.load(); }, error: () => { this.formMsg = 'Failed to add provider.'; this.formBusy = false; } });
  }
  setDefault(p: SmsProvider) { this.api.setDefault(p.id).subscribe({ next: () => this.load() }); }
  sendTest() {
    if (!this.testTo || !this.testMsg) return;
    this.testSending = true; this.testResult = '';
    this.api.sendTest(this.testTo, this.testMsg).subscribe({ next: () => { this.testResult = 'Test sent successfully!'; this.testSending = false; }, error: () => { this.testResult = 'Failed to send test.'; this.testSending = false; } });
  }
  confirmDelete(p: SmsProvider) { this.deleteMsg = `Delete provider "${p.name}"?`; this.deleteAction = () => { this.api.remove(p.id).subscribe({ next: () => { this.showDelete = false; this.load(); } }); }; this.showDelete = true; }
  doDelete() { if (this.deleteAction) this.deleteAction(); }
}
