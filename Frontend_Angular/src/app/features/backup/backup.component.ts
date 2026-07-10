import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackupService } from './backup.service';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Data Backup & Restore</h1>
          <p>Create, manage, and restore database backups.</p>
        </div>
        <button class="primary" (click)="createBackup()" [disabled]="creating">{{ creating ? 'Creating...' : '+ Create Backup' }}</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading backups...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load backups.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>
      <div class="empty" *ngIf="!loading && !error && backups.length === 0"><strong>No backups found.</strong><p>Create your first backup to protect your data.</p></div>

      <div class="backup-grid" *ngIf="!loading && !error && backups.length > 0">
        <div class="backup-card" *ngFor="let b of backups">
          <div class="backup-icon">{{ b.type === 'full' ? '💾' : '📋' }}</div>
          <div class="backup-info">
            <strong>{{ b.type === 'full' ? 'Full Backup' : 'Partial Backup' }}</strong>
            <span class="backup-date">Created: {{ b.createdAt | date:'MMM dd, yyyy h:mm a' }}</span>
            <span class="backup-size" *ngIf="b.size">{{ b.size | number }} KB</span>
            <span class="backup-desc" *ngIf="b.description">{{ b.description }}</span>
          </div>
          <div class="backup-status" [class.success]="b.status === 'completed'" [class.failed]="b.status === 'failed'" [class.running]="b.status === 'running'">
            {{ b.status || 'completed' }}
          </div>
          <div class="backup-actions">
            <button class="act-btn" (click)="restore(b)" [disabled]="b.status !== 'completed'">Restore</button>
            <button class="act-btn" (click)="download(b)" [disabled]="b.status !== 'completed'">Download</button>
            <button class="act-btn danger" (click)="delete(b.id)">Delete</button>
          </div>
        </div>
      </div>

      <div class="settings-card" *ngIf="settings">
        <h3>Auto-Backup Settings</h3>
        <div class="setting-row">
          <label>Enable Auto Backup</label>
          <input type="checkbox" [(ngModel)]="settings.autoBackup" (change)="saveSettings()">
        </div>
        <div class="setting-row" *ngIf="settings.autoBackup">
          <label>Frequency</label>
          <select [(ngModel)]="settings.frequency" (change)="saveSettings()">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div class="setting-row" *ngIf="settings.autoBackup">
          <label>Retention (days)</label>
          <input type="number" [(ngModel)]="settings.retentionDays" (change)="saveSettings()" min="1" max="365">
        </div>
      </div>
    </section>
  `,
  styles: [`
    .backup-grid{display:flex;flex-direction:column;gap:10px}
    .backup-card{display:flex;align-items:center;gap:16px;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:16px 20px;box-shadow:var(--card-shadow)}
    .backup-icon{font-size:24px;width:40px;text-align:center;flex-shrink:0}
    .backup-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
    .backup-info strong{font-size:15px}
    .backup-date,.backup-size,.backup-desc{font-size:12px;color:var(--muted)}
    .backup-status{font-size:11px;padding:3px 12px;border-radius:20px;font-weight:600;flex-shrink:0;background:#fef3c7;color:#92400e}
    .backup-status.success{background:#d1fae5;color:#065f46}
    .backup-status.failed{background:#fee2e2;color:#dc2626}
    .backup-status.running{background:#dbeafe;color:#1d4ed8}
    .backup-actions{display:flex;gap:6px;flex-shrink:0}
    .act-btn{padding:6px 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;font-weight:600}
    .act-btn:disabled{opacity:.5;cursor:not-allowed}
    .act-btn.danger{color:#dc2626;border-color:#fecaca}
    .settings-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:24px;margin-top:24px}
    .settings-card h3{margin:0 0 16px;font-size:18px}
    .setting-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
    .setting-row:last-child{border-bottom:0}
    .setting-row label{font-size:14px;font-weight:500;min-width:140px}
    .setting-row input[type=checkbox]{width:auto;height:auto}
    .setting-row select,.setting-row input[type=number]{max-width:200px}
    .loading,.error,.empty{text-align:center;padding:48px;color:var(--muted)}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;margin-right:12px;vertical-align:middle}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px}
    .error strong{color:#991b1b}.error p{color:#7f1d1d;margin:8px 0}
    .error button{background:var(--black);color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
  `]
})
export class BackupComponent implements OnInit {
  private api = inject(BackupService);
  loading = true; error = '';
  creating = false;
  backups: any[] = [];
  settings: any = null;

  ngOnInit() { this.load(); this.loadSettings(); }

  load() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({
      next: (res) => { this.backups = res.data || res.backups || res || []; this.loading = false; },
      error: (e) => { this.error = e.message || 'Backups unavailable.'; this.loading = false; }
    });
  }

  loadSettings() {
    this.api.getSettings().subscribe({ next: (s) => this.settings = s || { autoBackup: false, frequency: 'daily', retentionDays: 30 } });
  }

  createBackup() {
    this.creating = true;
    this.api.create({ type: 'full', description: 'Manual backup' }).subscribe({
      next: () => { this.creating = false; this.load(); },
      error: () => { this.creating = false; }
    });
  }

  restore(b: any) {
    if (!confirm(`Restore backup from ${b.createdAt}? This will overwrite current data.`)) return;
    this.api.restore(b.id).subscribe({ next: () => alert('Restore initiated.') });
  }

  download(b: any) {
    this.api.download(b.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `backup-${b.id}.sql`; a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  delete(id: string) {
    if (!confirm('Delete this backup?')) return;
    this.api.delete(id).subscribe({ next: () => this.load() });
  }

  saveSettings() {
    this.api.updateSettings(this.settings).subscribe();
  }
}
