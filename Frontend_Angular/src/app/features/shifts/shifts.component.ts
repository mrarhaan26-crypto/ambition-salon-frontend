import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ShiftsService } from './shifts.service';
import { Shift, ShiftTemplate } from './shifts.models';

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Shifts</h1><p>Staff shift scheduling and templates.</p></div><button class="primary" (click)="openForm()">+ Add Shift</button></div>

      <div class="tabs">
        <button [class.active]="subTab==='shifts'" (click)="subTab='shifts';load()">Shifts</button>
        <button [class.active]="subTab==='templates'" (click)="subTab='templates';loadTemplates()">Templates</button>
      </div>

      <div class="toolbar" *ngIf="subTab==='shifts'">
        <input [(ngModel)]="dateFrom" type="date" (change)="load()">
        <input [(ngModel)]="dateTo" type="date" (change)="load()">
        <select [(ngModel)]="statusFilter" (change)="load()"><option value="">All Status</option><option value="SCHEDULED">Scheduled</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option><option value="ABSENT">Absent</option></select>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="subTab==='shifts'?load():loadTemplates()">Retry</button></div>

      <ng-container *ngIf="subTab==='shifts' && !loading && !error">
        <div class="empty" *ngIf="items.length===0"><p>No shifts found.</p></div>
        <div class="shift-grid" *ngIf="items.length>0">
          <div class="shift-card" *ngFor="let s of items" [class.completed]="s.status==='COMPLETED'" [class.absent]="s.status==='ABSENT'" [class.in-progress]="s.status==='IN_PROGRESS'">
            <div class="shift-head">
              <strong>{{ s.staffName }}</strong>
              <span class="status-badge" [class.scheduled]="s.status==='SCHEDULED'" [class.in-progress]="s.status==='IN_PROGRESS'" [class.completed]="s.status==='COMPLETED'" [class.absent]="s.status==='ABSENT'">{{ s.status }}</span>
            </div>
            <div class="shift-time">{{ s.date | date:'MMM dd, yyyy' }}</div>
            <div class="shift-time">{{ s.startTime }} – {{ s.endTime }} <span *ngIf="s.breakDuration">({{ s.breakDuration }}m break)</span></div>
            <small *ngIf="s.notes">{{ s.notes }}</small>
            <div class="shift-actions"><button (click)="editShift(s)">Edit</button><button class="btn-remove" (click)="confirmDelete(s)">Remove</button></div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="subTab==='templates' && !loading && !error">
        <div class="empty" *ngIf="templates.length===0"><p>No templates yet.</p></div>
        <div class="template-list" *ngIf="templates.length>0">
          <div class="template-card" *ngFor="let t of templates" [class.inactive]="!t.isActive">
            <strong>{{ t.name }}</strong>
            <div class="template-time">{{ t.startTime }} – {{ t.endTime }} <span *ngIf="t.breakDuration">({{ t.breakDuration }}m break)</span></div>
            <div class="template-days">Days: {{ t.daysOfWeek.join(', ') || 'None' }}</div>
            <div class="template-actions"><button (click)="editTemplate(t)">Edit</button><button class="btn-remove" (click)="confirmDeleteTemplate(t)">Delete</button></div>
          </div>
        </div>
        <button class="btn-outline" style="margin-top:12px" (click)="openTemplateForm()">+ New Template</button>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>{{ editingId ? 'Edit Shift' : 'New Shift' }}</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Staff ID</label><input [(ngModel)]="form.staffId" placeholder="Staff ID"></div>
          <div class="form-group"><label>Date</label><input [(ngModel)]="form.date" type="date"></div>
          <div class="form-group"><label>Start Time</label><input [(ngModel)]="form.startTime" type="time"></div>
          <div class="form-group"><label>End Time</label><input [(ngModel)]="form.endTime" type="time"></div>
          <div class="form-group"><label>Break (minutes)</label><input [(ngModel)]="form.breakDuration" type="number" min="0"></div>
          <div class="form-group"><label>Notes</label><textarea [(ngModel)]="form.notes" placeholder="Optional notes"></textarea></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="saveShift()" [disabled]="formBusy">{{ formBusy ? 'Saving...' : (editingId ? 'Update' : 'Create') }}</button></div>
        </div>
      </div>
    </div>

    <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete=false">
      <div class="confirm-panel" (click)="$event.stopPropagation()">
        <h3>Confirm Delete</h3><p>{{ deleteMsg }}</p>
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
    .btn-outline{border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;background:white;color:#374151}
    .btn-remove{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}
    .tabs{display:flex;gap:4px;background:#f3f4f6;border-radius:16px;padding:4px;width:fit-content}
    .tabs button{border:0;border-radius:12px;padding:10px 20px;font-weight:700;cursor:pointer;background:transparent}
    .tabs button.active{background:white;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .toolbar{display:flex;gap:10px;flex-wrap:wrap}
    .toolbar input[type=date],.toolbar select{padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .shift-grid,.template-list{display:grid;gap:8px}
    .shift-card,.template-card{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:18px;display:grid;gap:6px}
    .shift-card.completed{opacity:.65}
    .shift-card.absent{opacity:.5;border-color:#fecaca}
    .shift-card.in-progress{border-color:#fde68a}
    .shift-head,.template-card strong{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:16px}
    .status-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px}
    .status-badge.scheduled{background:#f3f4f6;color:#374151}
    .status-badge.in-progress{background:#fffbeb;color:#d97706}
    .status-badge.completed{background:#f0fdf4;color:#16a34a}
    .status-badge.absent{background:#fef2f2;color:#991b1b}
    .shift-time{font-size:13px;color:#6b7280}
    .shift-card small,.template-card .template-days{font-size:12px;color:#6b7280}
    .template-time{font-size:13px;color:#374151;font-weight:600}
    .template-card.inactive{opacity:.55}
    .shift-actions,.template-actions{display:flex;gap:6px;margin-top:4px}
    .shift-actions button,.template-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    @media(max-width:900px){.shift-grid{grid-template-columns:1fr}}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-group textarea{min-height:60px;resize:vertical}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-primary{background:#0b0b0b;color:white}
    .msg{padding:12px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;text-align:center}
    .confirm-panel{background:white;border-radius:24px;padding:28px;width:min(420px,90%)}
    .confirm-panel h3{margin:0 0 8px}
    .confirm-actions{display:flex;gap:10px;margin-top:12px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-danger{background:#fee2e2;color:#991b1b}
    @media(max-width:900px){.drawer-panel{width:100%}}
  `]
})
export class ShiftsComponent {
  private api = inject(ShiftsService);
  items: Shift[] = []; templates: ShiftTemplate[] = [];
  loading = true; error = '';
  subTab: 'shifts' | 'templates' = 'shifts';
  dateFrom = ''; dateTo = ''; statusFilter = '';
  showForm = false; editingId = '';
  form: any = { staffId: '', date: '', startTime: '', endTime: '', breakDuration: 30, notes: '' };
  formMsg = ''; formBusy = false;
  showDelete = false; deleteMsg = ''; deleteAction: (() => void) | null = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getAll({
      from: this.dateFrom || undefined, to: this.dateTo || undefined,
      status: this.statusFilter || undefined,
    }).subscribe({ next: d => { this.items = d; this.loading = false; }, error: () => { this.error = 'Shifts unavailable.'; this.loading = false; } });
  }
  loadTemplates() {
    this.loading = true; this.error = '';
    this.api.getTemplates().subscribe({ next: d => { this.templates = d; this.loading = false; }, error: () => { this.error = 'Templates unavailable.'; this.loading = false; } });
  }
  openForm() { this.editingId = ''; this.form = { staffId: '', date: '', startTime: '', endTime: '', breakDuration: 30, notes: '' }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  editShift(s: Shift) { this.editingId = s.id; this.form = { staffId: s.staffId, date: s.date?.slice(0,10), startTime: s.startTime, endTime: s.endTime, breakDuration: s.breakDuration, notes: s.notes }; this.showForm = true; }
  saveShift() {
    this.formBusy = true; this.formMsg = '';
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.formBusy = false; this.load(); }, error: () => { this.formMsg = 'Failed to save shift.'; this.formBusy = false; } });
  }
  openTemplateForm() { this.editingId = ''; this.form = { name: '', startTime: '', endTime: '', breakDuration: 30, daysOfWeek: [1,2,3,4,5], isActive: true }; this.showForm = true; }
  editTemplate(t: ShiftTemplate) { this.editingId = t.id; this.form = { name: t.name, startTime: t.startTime, endTime: t.endTime, breakDuration: t.breakDuration, daysOfWeek: t.daysOfWeek, isActive: t.isActive }; this.showForm = true; }
  confirmDelete(item: any) { this.deleteMsg = `Delete this shift?`; this.deleteAction = () => { this.api.remove(item.id).subscribe({ next: () => { this.showDelete = false; this.load(); } }); }; this.showDelete = true; }
  confirmDeleteTemplate(t: ShiftTemplate) { this.deleteMsg = `Delete template "${t.name}"?`; this.deleteAction = () => { this.api.deleteTemplate(t.id).subscribe({ next: () => { this.showDelete = false; this.loadTemplates(); } }); }; this.showDelete = true; }
  doDelete() { if (this.deleteAction) this.deleteAction(); }
}
