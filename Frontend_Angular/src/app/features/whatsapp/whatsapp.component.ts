import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppSettings, WhatsAppTemplate } from './whatsapp.models';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>WhatsApp</h1><p>WhatsApp integration settings and message templates.</p></div></div>

      <div class="tabs">
        <button [class.active]="tab==='settings'" (click)="tab='settings'">Settings</button>
        <button [class.active]="tab==='templates'" (click)="tab='templates';loadTemplates()">Templates</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="loadSettings()">Retry</button></div>

      <ng-container *ngIf="tab==='settings' && !loading && !error && settings">
        <div class="panel">
          <h2>API Configuration</h2>
          <div class="field"><label>Phone Number</label><input [(ngModel)]="settings.phoneNumber" placeholder="+1234567890"></div>
          <div class="field"><label>Business Account ID</label><input [(ngModel)]="settings.businessAccountId" placeholder="Business account ID"></div>
          <div class="field"><label>API Token</label><input [(ngModel)]="settings.apiToken" type="password" placeholder="API token"></div>
          <div class="field"><label><input type="checkbox" [(ngModel)]="settings.isEnabled"> Enabled</label></div>
          <button class="primary" (click)="saveSettings()" [disabled]="saving">{{ saving ? 'Saving...' : 'Save Settings' }}</button>
          <span class="msg" *ngIf="saveMsg">{{ saveMsg }}</span>
        </div>
      </ng-container>

      <ng-container *ngIf="tab==='templates' && !loading && !error">
        <div class="toolbar"><button class="primary" (click)="openTemplateForm()">+ New Template</button></div>
        <div class="empty" *ngIf="templates.length===0"><p>No templates yet.</p></div>
        <div class="template-list" *ngIf="templates.length>0">
          <div class="tpl-card" *ngFor="let t of templates" [class.inactive]="!t.isActive">
            <div class="tpl-head"><strong>{{ t.name }}</strong><span class="cat-badge">{{ t.category }}</span></div>
            <div class="tpl-body">{{ t.body }}</div>
            <div class="tpl-vars" *ngIf="t.variables.length>0">Variables: {{ t.variables.join(', ') }}</div>
            <div class="tpl-actions"><button (click)="editTemplate(t)">Edit</button><button class="btn-remove" (click)="confirmDelete(t)">Delete</button></div>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showTemplateForm" (click)="showTemplateForm=false">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>{{ templateEditingId ? 'Edit Template' : 'New Template' }}</h2><button class="close-btn" (click)="showTemplateForm=false">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Name</label><input [(ngModel)]="templateForm.name" placeholder="Template name"></div>
          <div class="form-group"><label>Category</label><select [(ngModel)]="templateForm.category"><option value="APPOINTMENT">Appointment</option><option value="REMINDER">Reminder</option><option value="PROMOTION">Promotion</option><option value="NOTIFICATION">Notification</option></select></div>
          <div class="form-group"><label>Body</label><textarea [(ngModel)]="templateForm.body" placeholder="Message body. Use {{1}}, {{2}} for variables" rows="5"></textarea></div>
          <div class="form-group"><label>Variables (comma-separated)</label><input [(ngModel)]="templateVars" placeholder="clientName, date, time"></div>
          <div class="msg" *ngIf="templateMsg">{{ templateMsg }}</div>
          <div class="drawer-actions"><button (click)="showTemplateForm=false">Cancel</button><button class="btn-primary" (click)="saveTemplate()" [disabled]="templateBusy">{{ templateBusy ? 'Saving...' : (templateEditingId ? 'Update' : 'Create') }}</button></div>
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
    .tabs{display:flex;gap:4px;background:#f3f4f6;border-radius:16px;padding:4px;width:fit-content}
    .tabs button{border:0;border-radius:12px;padding:10px 20px;font-weight:700;cursor:pointer;background:transparent}
    .tabs button.active{background:white;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .primary:disabled{opacity:.5;cursor:default}
    .btn-remove{background:#fee2e2!important;color:#991b1b!important}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;display:grid;gap:16px}
    .panel h2{font-size:20px;margin:0}
    .field{display:grid;gap:4px}
    .field label{font-size:13px;font-weight:700;color:#374151}
    .field input{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .msg{padding:8px 14px;background:#f0fdf4;border-radius:10px;color:#16a34a;font-weight:700;font-size:13px;text-align:center}
    .toolbar{display:flex;gap:10px}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .template-list{display:grid;gap:8px}
    .tpl-card{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:18px;display:grid;gap:6px}
    .tpl-card.inactive{opacity:.55}
    .tpl-head{display:flex;gap:8px;align-items:center}
    .tpl-head strong{flex:1}
    .cat-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px;background:#f3f4f6;color:#374151}
    .tpl-body{font-size:13px;color:#374151;line-height:1.5}
    .tpl-vars{font-size:11px;color:#6b7280}
    .tpl-actions{display:flex;gap:6px}
    .tpl-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{font-size:28px;cursor:pointer;color:#6b7280;border:0;background:transparent}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-group textarea{min-height:80px;resize:vertical}
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
export class WhatsappComponent {
  private api = inject(WhatsappService);
  tab: 'settings' | 'templates' = 'settings';
  settings: WhatsAppSettings | null = null;
  templates: WhatsAppTemplate[] = [];
  loading = true; error = '';
  saving = false; saveMsg = '';
  showTemplateForm = false; templateEditingId = '';
  templateForm: any = { name: '', category: 'NOTIFICATION', body: '', isActive: true };
  templateVars = ''; templateMsg = ''; templateBusy = false;
  showDelete = false; deleteMsg = ''; deleteAction: (() => void) | null = null;

  ngOnInit() { this.loadSettings(); }
  loadSettings() {
    this.loading = true; this.error = '';
    this.api.getSettings().subscribe({ next: d => { this.settings = d; this.loading = false; }, error: () => { this.error = 'Settings unavailable.'; this.loading = false; } });
  }
  loadTemplates() {
    this.api.getTemplates().subscribe({ next: d => this.templates = d });
  }
  saveSettings() {
    if (!this.settings) return;
    this.saving = true; this.saveMsg = '';
    this.api.updateSettings(this.settings).subscribe({ next: () => { this.saveMsg = 'Settings saved!'; this.saving = false; setTimeout(() => this.saveMsg = '', 3000); }, error: () => { this.saveMsg = 'Failed to save.'; this.saving = false; } });
  }
  openTemplateForm() { this.templateEditingId = ''; this.templateForm = { name: '', category: 'NOTIFICATION', body: '', isActive: true }; this.templateVars = ''; this.templateMsg = ''; this.showTemplateForm = true; }
  editTemplate(t: WhatsAppTemplate) {
    this.templateEditingId = t.id;
    this.templateForm = { name: t.name, category: t.category, body: t.body, isActive: t.isActive };
    this.templateVars = t.variables.join(', ');
    this.showTemplateForm = true;
  }
  saveTemplate() {
    this.templateBusy = true; this.templateMsg = '';
    const body = { ...this.templateForm, variables: this.templateVars.split(',').map((v: string) => v.trim()).filter((v: string) => v) };
    const obs = this.templateEditingId ? this.api.updateTemplate(this.templateEditingId, body) : this.api.createTemplate(body);
    obs.subscribe({ next: () => { this.showTemplateForm = false; this.templateBusy = false; this.loadTemplates(); }, error: () => { this.templateMsg = 'Failed to save.'; this.templateBusy = false; } });
  }
  confirmDelete(t: any) { this.deleteMsg = `Delete template "${t.name}"?`; this.deleteAction = () => { this.api.deleteTemplate(t.id).subscribe({ next: () => { this.showDelete = false; this.loadTemplates(); } }); }; this.showDelete = true; }
  doDelete() { if (this.deleteAction) this.deleteAction(); }
}
