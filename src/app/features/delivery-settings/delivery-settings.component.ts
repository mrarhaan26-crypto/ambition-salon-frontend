import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliverySettingsService } from './delivery-settings.service';

@Component({
  selector: 'app-delivery-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Delivery Settings</h1>
          <p>Configure email, SMS &amp; WhatsApp providers.</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading settings...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load settings.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error && settings">
        <h2>Provider Status</h2>
        <div class="provider-grid">
          <div class="provider-card" *ngFor="let key of providerKeys" [class.active]="settings[key]?.isActive">
            <div class="provider-head">
              <strong>{{ key | uppercase }}</strong>
              <span class="status-badge" [class.on]="settings[key]?.isActive" [class.off]="!settings[key]?.isActive">{{ settings[key]?.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
            <span class="provider-name">{{ settings[key]?.provider || 'Not configured' }}</span>
          </div>
        </div>

        <h2>Test Delivery</h2>
        <div class="test-card">
          <select [(ngModel)]="test.channel" class="form-input">
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
          <input [(ngModel)]="test.recipient" placeholder="Recipient (email/phone)" class="form-input">
          <input [(ngModel)]="test.subject" placeholder="Subject" class="form-input">
          <button class="primary" (click)="doTest()">Send Test</button>
        </div>
        <div class="alert success" *ngIf="testResult">{{ testResult }}</div>

        <h2>Delivery Logs</h2>
        <div class="empty" *ngIf="logs.length===0"><p>No delivery logs yet.</p></div>
        <div class="data-table-wrap" *ngIf="logs.length>0">
          <table class="data-table">
            <thead><tr><th>Channel</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              <tr *ngFor="let l of logs">
                <td>{{ l.channel }}</td>
                <td>{{ l.recipient || '—' }}</td>
                <td>{{ l.subject || '—' }}</td>
                <td><span class="log-status">{{ l.status }}</span></td>
                <td>{{ l.createdAt | date:'MMM dd, h:mm a' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}h2{font-size:20px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .provider-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
    .provider-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:24px;display:grid;gap:10px}
    .provider-card.active{border-color:#16a34a;background:#f0fdf4}
    .provider-head{display:flex;justify-content:space-between;align-items:center}
    .provider-head strong{font-size:18px}
    .status-badge{font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px}
    .status-badge.on{background:#f0fdf4;color:#16a34a}.status-badge.off{background:#f3f4f6;color:#6b7280}
    .provider-name{font-size:14px;color:#6b7280}
    .test-card{display:flex;gap:12px;flex-wrap:wrap;background:white;border:1px solid #e5e7eb;border-radius:20px;padding:24px}
    .form-input{flex:1;min-width:120px;padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .primary{border:0;border-radius:14px;padding:12px 24px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white;white-space:nowrap}
    .alert{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:14px 18px;color:#16a34a;font-weight:600}
    .data-table-wrap{background:white;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden}
    .data-table{width:100%;border-collapse:collapse}
    .data-table th{text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:14px 18px;background:#f9fafb;border-bottom:1px solid #e5e7eb}
    .data-table td{padding:12px 18px;border-bottom:1px solid #f3f4f6;font-size:14px}
    .log-status{font-size:11px;font-weight:700;background:#f3f4f6;padding:3px 10px;border-radius:20px}
    @media(max-width:600px){.head{flex-direction:column;align-items:flex-start;gap:12px}}
  `]
})
export class DeliverySettingsComponent {
  private api = inject(DeliverySettingsService);
  settings: any = null;
  logs: any[] = [];
  providerKeys = ['email', 'sms', 'whatsapp'];
  loading = true; error = '';
  test: any = { channel: 'EMAIL', recipient: '', subject: '' };
  testResult = '';

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getSettings().subscribe({ next: d => { this.settings = d; this.loading = false; }, error: () => { this.error = 'Settings unavailable.'; this.loading = false; } });
    this.api.getLogs().subscribe({ next: d => this.logs = d });
  }
  doTest() {
    this.testResult = '';
    this.api.testDelivery(this.test).subscribe({ next: (d) => { this.testResult = d.message || 'Test sent.'; this.api.getLogs().subscribe(d2 => this.logs = d2); }, error: () => { this.testResult = 'Test failed.'; } });
  }
}
