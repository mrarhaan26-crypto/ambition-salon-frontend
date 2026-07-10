import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationTemplatesService } from './notification-templates.service';

@Component({
  selector: 'app-notification-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Notification Templates</h1>
          <p>Manage message templates for notifications.</p>
        </div>
        <button class="primary" (click)="openDrawer()">+ New Template</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading templates...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <div class="success" *ngIf="successMsg">
        <span>{{ successMsg }}</span>
        <button (click)="successMsg = ''">&times;</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card"><span>Total Templates</span><strong>{{ items.length }}</strong></div>
          <div class="kpi-card"><span>Active</span><strong class="green">{{ countActive() }}</strong></div>
          <div class="kpi-card"><span>Inactive</span><strong class="red">{{ items.length - countActive() }}</strong></div>
        </div>

        <div class="panel">
          <h2>All Templates</h2>
          <div class="empty" *ngIf="items.length === 0"><p>No notification templates yet.</p></div>
          <div class="table" *ngIf="items.length > 0">
            <div class="th"><span>Name</span><span>Channel</span><span>Status</span><span>Created</span><span>Actions</span></div>
            <div class="tr" *ngFor="let t of items">
              <span class="name">{{ t.name }}</span>
              <span><span class="badge" [class]="'ch-' + (t.channel || 'other').toLowerCase()">{{ t.channel }}</span></span>
              <span><span class="badge" [class.green]="t.isActive" [class.red]="!t.isActive">{{ t.isActive ? 'Active' : 'Inactive' }}</span></span>
              <span>{{ t.createdAt | date:'MMM dd, yyyy' }}</span>
              <span class="actions">
                <button (click)="editTemplate(t)">Edit</button>
                <button class="danger" (click)="deleteTemplate(t)">Delete</button>
              </span>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer" *ngIf="showDrawer">
        <div class="drawer-panel">
          <div class="drawer-head">
            <h2>{{ isEditing ? 'Edit' : 'New' }} Template</h2>
            <button (click)="closeDrawer()">&times;</button>
          </div>
          <div class="form">
            <input [(ngModel)]="form.name" placeholder="Template name">
            <input [(ngModel)]="form.subject" placeholder="Subject line">
            <textarea [(ngModel)]="form.body" placeholder="Message body..."></textarea>
            <select [(ngModel)]="form.channel">
              <option value="">Select channel</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <label class="toggle">
              <input type="checkbox" [(ngModel)]="form.isActive">
              <span>Active</span>
            </label>
            <div class="form-actions">
              <button type="button" (click)="closeDrawer()">Cancel</button>
              <button (click)="saveTemplate()">{{ isEditing ? 'Update' : 'Create' }}</button>
            </div>
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
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .success{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:24px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;color:#16a34a;font-weight:700}
    .success button{background:none;border:none;font-size:22px;cursor:pointer;color:#16a34a;line-height:1}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:24px}
    .green{color:#16a34a}.amber{color:#d97706}.red{color:#dc2626}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .table{display:grid;gap:2px;font-size:13px}
    .th,.tr{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;padding:10px 12px;align-items:center;gap:8px}
    .th{font-weight:700;color:#6b7280;background:transparent}
    .tr{background:#f8fafc;border-radius:8px}
    .name{font-weight:700}
    .badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .badge.green{background:#f0fdf4;color:#16a34a}
    .badge.red{background:#fee2e2;color:#dc2626}
    .ch-email{background:#dbeafe;color:#1d4ed8}
    .ch-sms{background:#f0fdf4;color:#16a34a}
    .ch-whatsapp{background:#f0fdf4;color:#16a34a}
    .ch-other{background:#f3f4f6;color:#6b7280}
    .actions{display:flex;gap:4px}
    .actions button{border:1px solid #e5e7eb;border-radius:6px;padding:4px 10px;font-weight:600;cursor:pointer;background:white;font-size:10px}
    .actions .danger{background:#fee2e2;color:#991b1b}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(440px,90%);max-height:90vh;overflow-y:auto;display:grid;gap:16px}
    .drawer-panel h2{margin:0}
    .drawer-head{display:flex;justify-content:space-between;align-items:center}
    .drawer-head button{background:none;border:none;font-size:28px;cursor:pointer;color:#6b7280;line-height:1}
    .form{display:grid;gap:12px}
    .form input,textarea,select{padding:12px;border:1px solid #e5e7eb;border-radius:12px;font-family:inherit}
    textarea{min-height:100px;resize:vertical}
    .toggle{display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:600;font-size:14px}
    .toggle input{width:20px;height:20px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    @media(max-width:1000px){.kpis{grid-template-columns:repeat(3,1fr)}.th,.tr{grid-template-columns:1fr 1fr 1fr;gap:4px}}
  `]
})
export class NotificationTemplatesComponent {
  private api = inject(NotificationTemplatesService);
  items: any[] = [];
  loading = true;
  error = '';
  successMsg = '';
  showDrawer = false;
  isEditing = false;
  form: any = { name: '', subject: '', body: '', channel: '', isActive: true };

  ngOnInit() { this.loadAll(); }

  countActive() { return this.items.filter(t => t.isActive).length; }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({ next: (d) => { this.items = d; this.loading = false; }, error: () => { this.error = 'Failed to load templates.'; this.loading = false; } });
  }

  openDrawer() {
    this.isEditing = false;
    this.form = { name: '', subject: '', body: '', channel: '', isActive: true };
    this.showDrawer = true;
  }

  editTemplate(t: any) {
    this.isEditing = true;
    this.form = { ...t };
    this.showDrawer = true;
  }

  closeDrawer() { this.showDrawer = false; }

  saveTemplate() {
    if (this.isEditing) {
      this.api.update(this.form.id, this.form).subscribe({ next: () => { this.successMsg = 'Template updated.'; this.closeDrawer(); this.loadAll(); } });
    } else {
      this.api.create(this.form).subscribe({ next: () => { this.successMsg = 'Template created.'; this.closeDrawer(); this.loadAll(); } });
    }
  }

  deleteTemplate(t: any) {
    if (confirm('Delete template "' + t.name + '"? This cannot be undone.')) {
      this.api.remove(t.id).subscribe({ next: () => { this.successMsg = 'Template deleted.'; this.loadAll(); } });
    }
  }
}
