import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeviceLoginService } from './device-login.service';

@Component({
  selector: 'app-device-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Device Login</h1>
          <p>Manage trusted devices and login history.</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading devices...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load devices.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>
      <div class="empty" *ngIf="!loading && !error && devices.length === 0"><strong>No devices found.</strong><p>No devices have been used to log in yet.</p></div>

      <table class="device-table" *ngIf="!loading && !error && devices.length > 0">
        <thead>
          <tr>
            <th>Device</th>
            <th>Type</th>
            <th>Browser / OS</th>
            <th>Last Login</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let d of devices">
            <td><strong>{{ d.deviceName || 'Unknown' }}</strong></td>
            <td>{{ d.deviceType || '-' }}</td>
            <td class="mono">{{ d.browser || '-' }} / {{ d.os || '-' }}</td>
            <td>{{ d.lastLogin | date:'MMM dd, yyyy h:mm a' }}</td>
            <td>
              <span class="status-badge" [class.trusted]="d.isTrusted" [class.untrusted]="!d.isTrusted">
                {{ d.isTrusted ? 'Trusted' : 'Untrusted' }}
              </span>
            </td>
            <td>
              <button class="action-btn" (click)="toggleTrust(d)" *ngIf="d.isTrusted">Untrust</button>
              <button class="action-btn primary" (click)="toggleTrust(d)" *ngIf="!d.isTrusted">Trust</button>
              <button class="action-btn danger" (click)="remove(d.id)">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
  styles: [`
    .device-table{width:100%;border-collapse:collapse;font-size:14px;background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden}
    .device-table th,.device-table td{padding:14px 16px;text-align:left;border-bottom:1px solid var(--border)}
    .device-table th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;background:var(--soft)}
    .device-table tr:last-child td{border-bottom:0}
    .mono{font-family:monospace;font-size:12px}
    .status-badge{font-size:11px;padding:3px 12px;border-radius:20px;font-weight:600}
    .status-badge.trusted{background:#d1fae5;color:#065f46}
    .status-badge.untrusted{background:#fef3c7;color:#92400e}
    .action-btn{padding:6px 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;font-weight:600;margin-right:6px}
    .action-btn.primary{border-color:var(--gold);color:var(--black)}
    .action-btn.danger{color:#dc2626;border-color:#fecaca}
    .loading,.error,.empty{text-align:center;padding:48px;color:var(--muted)}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;margin-right:12px;vertical-align:middle}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px}
    .error strong{color:#991b1b}.error p{color:#7f1d1d;margin:8px 0}
    .error button{background:var(--black);color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    @media(max-width:768px){.device-table{font-size:13px}.device-table th,.device-table td{padding:10px 12px}}
  `]
})
export class DeviceLoginComponent implements OnInit {
  private api = inject(DeviceLoginService);
  loading = true; error = '';
  devices: any[] = [];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({
      next: (res) => { this.devices = res.data || res.devices || res || []; this.loading = false; },
      error: (e) => { this.error = e.message || 'Devices unavailable.'; this.loading = false; }
    });
  }

  toggleTrust(d: any) {
    const obs = d.isTrusted ? this.api.untrust(d.id) : this.api.trust(d.id);
    obs.subscribe({ next: () => this.load() });
  }

  remove(id: string) {
    if (!confirm('Remove this device?')) return;
    this.api.remove(id).subscribe({ next: () => this.load() });
  }
}
