import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarketingService } from './marketing.service';

@Component({
  selector: 'app-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Marketing</h1>
          <p>Campaigns, audience, and communication templates.</p>
        </div>
        <button class="primary" (click)="openCreate()">+ New Campaign</button>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading marketing data...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load marketing data.</strong>
        <p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="dashboard">
          <div class="kpi-card"><span>Campaigns</span><strong>{{ dashboard.summary.totalCampaigns }}</strong></div>
          <div class="kpi-card"><span>Active</span><strong>{{ dashboard.summary.activeCampaigns }}</strong></div>
          <div class="kpi-card"><span>Sent</span><strong>{{ dashboard.summary.totalSent }}</strong></div>
          <div class="kpi-card"><span>Delivered</span><strong class="green">{{ dashboard.summary.totalDelivered }}</strong></div>
          <div class="kpi-card"><span>Failed</span><strong class="red">{{ dashboard.summary.totalFailed }}</strong></div>
        </div>

        <div class="audience-cards" *ngIf="audience">
          <h2>Audience Reach</h2>
          <div class="audience-grid">
            <div class="audience-card"><span>Total Clients</span><b>{{ audience.total }}</b></div>
            <div class="audience-card"><span>SMS Reachable</span><b>{{ audience.reachableBySMS }}</b></div>
            <div class="audience-card"><span>Email Reachable</span><b>{{ audience.reachableByEmail }}</b></div>
          </div>
        </div>

        <div class="campaigns-section">
          <h2>Campaigns</h2>
          <div class="empty" *ngIf="campaigns.length === 0">
            <p>No campaigns yet. Create your first marketing campaign.</p>
          </div>
          <div class="campaign-list" *ngIf="campaigns.length > 0">
            <div class="campaign-row" *ngFor="let c of campaigns">
              <div class="campaign-info">
                <strong>{{ c.name }}</strong>
                <span class="type-badge">{{ c.type }}</span>
                <span class="status-badge" [class]="'camp-'+ (c.status || '').toLowerCase()">{{ c.status }}</span>
              </div>
              <div class="campaign-meta">
                <span>Audience: {{ c.audienceCount }}</span>
                <span *ngIf="c.scheduledAt">Scheduled: {{ c.scheduledAt | date:'MMM dd, yyyy' }}</span>
              </div>
              <div class="campaign-perf" *ngIf="c.status === 'SENT'">
                <span>Sent: {{ c.sentCount }}</span>
                <span>Delivered: {{ c.deliveredCount }}</span>
              </div>
              <div class="campaign-actions">
                <button (click)="editCampaign(c)">Edit</button>
                <button class="danger" (click)="deleteCampaign(c)">Delete</button>
              </div>
            </div>
          </div>
        </div>

        <div class="templates-section" *ngIf="templates.length > 0">
          <h2>Templates</h2>
          <div class="template-list">
            <div class="template-card" *ngFor="let t of templates">
              <strong>{{ t.name }}</strong>
              <span class="type-badge">{{ t.type }}</span>
              <p>{{ t.content }}</p>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer-overlay" *ngIf="showForm" (click)="showForm = false">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <h2>{{ editingId ? 'Edit Campaign' : 'New Campaign' }}</h2>
          <div class="create-form">
            <input [(ngModel)]="form.name" placeholder="Campaign name" required>
            <select [(ngModel)]="form.type">
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <select [(ngModel)]="form.status">
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="SENT">Sent</option>
            </select>
            <input [(ngModel)]="form.audienceCount" type="number" placeholder="Audience count">
            <input [(ngModel)]="form.scheduledAt" type="datetime-local" placeholder="Scheduled at">
            <textarea [(ngModel)]="form.content" placeholder="Campaign content/message"></textarea>
            <div class="form-actions">
              <button type="button" (click)="showForm = false">Cancel</button>
              <button (click)="saveCampaign()">{{ editingId ? 'Update' : 'Create Campaign' }}</button>
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
    h2{font-size:20px;margin:0 0 16px}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:24px}
    .green{color:#16a34a}.red{color:#dc2626}
    .audience-cards,.campaigns-section,.templates-section{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .audience-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .audience-card{background:#f8fafc;border-radius:14px;padding:16px;text-align:center}
    .audience-card span{display:block;color:#6b7280;font-size:12px;margin-bottom:4px}
    .audience-card b{font-size:22px}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .campaign-list{display:grid;gap:8px}
    .campaign-row{display:flex;align-items:center;gap:16px;padding:14px 16px;background:#f8fafc;border-radius:14px;flex-wrap:wrap}
    .campaign-info{flex:2;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .campaign-info strong{font-size:15px}
    .type-badge{font-size:10px;background:#e5e7eb;padding:2px 8px;border-radius:12px;font-weight:700}
    .status-badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .camp-draft{background:#f3f4f6;color:#6b7280}
    .camp-scheduled{background:#fefce8;color:#a16207}
    .camp-sent{background:#f0fdf4;color:#16a34a}
    .campaign-meta{flex:1;display:grid;gap:2px;font-size:12px;color:#6b7280}
    .campaign-perf{display:grid;gap:2px;font-size:12px;color:#6b7280}
    .campaign-actions{display:flex;gap:6px}
    .campaign-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    .campaign-actions .danger{background:#fee2e2;color:#991b1b}
    .template-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .template-card{background:#f8fafc;border-radius:14px;padding:16px}
    .template-card strong{display:block;font-size:14px;margin-bottom:4px}
    .template-card p{font-size:13px;color:#6b7280;margin:8px 0 0}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(520px,90%);max-height:90vh;overflow-y:auto}
    .drawer-panel h2{margin:0 0 20px}
    .create-form{display:grid;gap:12px}
    .create-form input,select,textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    textarea{min-height:100px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    @media(max-width:1200px){.kpis{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.audience-grid,.template-list{grid-template-columns:1fr}.campaign-row{flex-direction:column;align-items:stretch}}
  `]
})
export class MarketingComponent {
  private api = inject(MarketingService);

  dashboard: any = null;
  campaigns: any[] = [];
  audience: any = null;
  templates: any[] = [];
  loading = true;
  error = '';

  showForm = false;
  editingId = '';
  form: any = { name: '', type: 'SMS', status: 'DRAFT', audienceCount: 0, scheduledAt: '', content: '' };

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true;
    this.error = '';
    this.api.getDashboard().subscribe({
      next: (d) => { this.dashboard = d; this.loading = false; },
      error: () => { this.error = 'Marketing data unavailable.'; this.loading = false; },
    });
    this.api.getCampaigns().subscribe({ next: (d) => this.campaigns = d });
    this.api.getAudience().subscribe({ next: (d) => this.audience = d });
    this.api.getTemplates().subscribe({ next: (d) => this.templates = d });
  }

  openCreate() {
    this.editingId = '';
    this.form = { name: '', type: 'SMS', status: 'DRAFT', audienceCount: 0, scheduledAt: '', content: '' };
    this.showForm = true;
  }

  editCampaign(c: any) {
    this.editingId = c.id;
    this.form = { name: c.name, type: c.type, status: c.status, audienceCount: c.audienceCount, scheduledAt: c.scheduledAt ? c.scheduledAt.slice(0, 16) : '', content: c.content };
    this.showForm = true;
  }

  saveCampaign() {
    const obs = this.editingId ? this.api.updateCampaign(this.editingId, this.form) : this.api.createCampaign(this.form);
    obs.subscribe({ next: () => { this.showForm = false; this.loadAll(); } });
  }

  deleteCampaign(c: any) {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    this.api.removeCampaign(c.id).subscribe({ next: () => this.loadAll() });
  }
}
