import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ResourcesService } from './resources.service';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Resources</h1>
          <p>Manage rooms, chairs &amp; equipment.</p>
        </div>
        <button class="primary" (click)="openForm()">+ Add Resource</button>
      </div>

      <div class="toolbar">
        <select [(ngModel)]="typeFilter" (change)="load()">
          <option value="">All Types</option>
          <option value="ROOM">ROOM</option>
          <option value="CHAIR">CHAIR</option>
          <option value="EQUIPMENT">EQUIPMENT</option>
          <option value="STATION">STATION</option>
        </select>
        <select [(ngModel)]="activeFilter" (change)="load()">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading resources...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load resources.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>
      <div class="empty" *ngIf="!loading && !error && resources.length === 0"><p>No resources found.</p></div>

      <div class="resource-grid" *ngIf="!loading && !error && resources.length > 0">
        <div class="resource-card" *ngFor="let r of resources" [class.inactive]="!r.isActive">
          <div class="card-head">
            <strong>{{ r.name }}</strong>
            <span class="type-badge">{{ r.type }}</span>
          </div>
          <small *ngIf="r.description">{{ r.description }}</small>
          <small *ngIf="r.branch?.name" class="branch-name">{{ r.branch.name }}</small>
          <span class="status-dot" [class.active]="r.isActive" [class.inactive-dot]="!r.isActive">{{ r.isActive ? 'Active' : 'Inactive' }}</span>
          <div class="card-actions">
            <button (click)="edit(r)">Edit</button>
            <button class="btn-danger" (click)="confirmDelete(r)">Delete</button>
          </div>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>{{ editingId ? 'Edit Resource' : 'Add Resource' }}</h2>
            <button class="close-btn" (click)="closeForm()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="form-group"><label>Name</label><input [(ngModel)]="form.name" placeholder="Resource name" required></div>
            <div class="form-group"><label>Type</label><select [(ngModel)]="form.type"><option value="ROOM">ROOM</option><option value="CHAIR">CHAIR</option><option value="EQUIPMENT">EQUIPMENT</option><option value="STATION">STATION</option></select></div>
            <div class="form-group"><label>Description</label><textarea [(ngModel)]="form.description" placeholder="Optional description"></textarea></div>
            <div class="form-group"><label>Branch ID</label><input [(ngModel)]="form.branchId" placeholder="Branch ID"></div>
            <div class="form-group" *ngIf="editingId"><label><input type="checkbox" [(ngModel)]="form.isActive"> Active</label></div>
            <div class="drawer-actions">
              <button (click)="closeForm()">Cancel</button>
              <button class="btn-primary" (click)="save()">{{ editingId ? 'Update' : 'Save' }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete = false">
        <div class="confirm-panel" (click)="$event.stopPropagation()">
          <h3>Delete Resource</h3>
          <p>Delete <strong>{{ deleting?.name }}</strong>? This cannot be undone.</p>
          <div class="confirm-actions"><button (click)="showDelete = false">Cancel</button><button class="btn-danger" (click)="doDelete()">Delete</button></div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .toolbar{display:flex;gap:12px}.toolbar select{padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .loading,.error{text-align:center;padding:48px}.spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .resource-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
    .resource-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;display:grid;gap:8px}
    .resource-card.inactive{opacity:.55}
    .card-head{display:flex;justify-content:space-between;align-items:center}
    .card-head strong{font-size:16px}.type-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:#f3f4f6;color:#374151;text-transform:uppercase}
    .branch-name{color:#6b7280;font-size:12px}
    .status-dot{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;width:fit-content}
    .status-dot.active{background:#f0fdf4;color:#16a34a}.status-dot.inactive-dot{background:#f3f4f6;color:#6b7280}
    .card-actions{display:flex;gap:6px;margin-top:4px}
    .card-actions button{border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;background:white;font-size:12px}
    .btn-danger{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}
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
    .form-group textarea{min-height:80px}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px}
    .btn-primary{background:#0b0b0b;color:white}
    .confirm-panel{background:white;border-radius:24px;padding:32px;width:min(420px,90%)}
    .confirm-panel h3{margin:0 0 12px}.confirm-panel p{color:#6b7280;margin:0 0 24px}
    .confirm-actions{display:flex;gap:10px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    @media(max-width:900px){.drawer-panel{width:100%}}
  `]
})
export class ResourcesComponent {
  private api = inject(ResourcesService);
  resources: any[] = [];
  loading = true; error = '';
  typeFilter = ''; activeFilter = '';
  showForm = false; editingId = '';
  form: any = { name: '', type: 'ROOM', description: '', branchId: '' };
  showDelete = false; deleting: any = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    const q: any = {};
    if (this.typeFilter) q.type = this.typeFilter;
    if (this.activeFilter) q.isActive = this.activeFilter;
    this.api.getAll(q).subscribe({ next: d => { this.resources = d; this.loading = false; }, error: () => { this.error = 'Resources unavailable.'; this.loading = false; } });
  }
  openForm() { this.editingId = ''; this.form = { name: '', type: 'ROOM', description: '', branchId: '' }; this.showForm = true; }
  closeForm() { this.showForm = false; }
  edit(r: any) { this.editingId = r.id; this.form = { name: r.name, type: r.type, description: r.description || '', branchId: r.branchId || '', isActive: r.isActive }; this.showForm = true; }
  save() {
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.load(); } });
  }
  confirmDelete(r: any) { this.deleting = r; this.showDelete = true; }
  doDelete() { if (!this.deleting) return; this.api.remove(this.deleting.id).subscribe({ next: () => { this.showDelete = false; this.deleting = null; this.load(); } }); }
}
