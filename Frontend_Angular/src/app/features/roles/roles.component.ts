import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolesService, Role } from './roles.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Roles & Permissions</h1>
          <p>Manage user roles and their permission assignments.</p>
        </div>
        <button class="primary" (click)="openForm()">+ New Role</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading roles...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load roles.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>
      <div class="empty" *ngIf="!loading && !error && roles.length === 0"><strong>No roles found.</strong><p>Create your first role to get started.</p></div>

      <div class="role-grid" *ngIf="!loading && !error">
        <div class="role-card" *ngFor="let r of roles">
          <div class="role-head">
            <h3>{{ r.name }}</h3>
            <span *ngIf="r.isSystem" class="system-badge">System</span>
          </div>
          <p class="role-desc">{{ r.description || 'No description' }}</p>
          <div class="perm-list">
            <span class="perm-tag" *ngFor="let p of (r.permissions || []).slice(0,8)">{{ p }}</span>
            <span *ngIf="(r.permissions || []).length > 8" class="perm-tag more">+{{ (r.permissions || []).length - 8 }} more</span>
          </div>
          <div class="role-actions">
            <button class="btn-sm" (click)="editRole(r)" [disabled]="r.isSystem">Edit</button>
            <button class="btn-sm danger" (click)="deleteRole(r)" [disabled]="r.isSystem">Delete</button>
          </div>
        </div>
      </div>
    </section>

    <div class="overlay" *ngIf="showForm" (click)="closeForm()"></div>
    <div class="drawer" *ngIf="showForm">
      <div class="drawer-head">
        <h2>{{ editingRole ? 'Edit Role' : 'New Role' }}</h2>
        <button class="close-btn" (click)="closeForm()">&times;</button>
      </div>
      <div class="drawer-body">
        <label>Role Name</label>
        <input [(ngModel)]="form.name" placeholder="e.g. Manager">
        <label>Description</label>
        <textarea [(ngModel)]="form.description" placeholder="Role description"></textarea>
        <label>Permissions <small>({{ selectedPerms.length }} selected)</small></label>
        <div class="perm-select" *ngIf="permissionList.length > 0">
          <label class="perm-check" *ngFor="let p of permissionList">
            <input type="checkbox" [checked]="selectedPerms.includes(p)" (change)="togglePerm(p)">
            <span>{{ p }}</span>
          </label>
        </div>
        <div class="drawer-actions">
          <button class="btn-secondary" (click)="closeForm()">Cancel</button>
          <button class="primary" (click)="saveRole()" [disabled]="saving">{{ saving ? 'Saving...' : 'Save Role' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .role-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
    .role-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:20px;box-shadow:var(--card-shadow)}
    .role-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .role-head h3{margin:0;font-size:18px}
    .system-badge{font-size:10px;background:var(--gold);color:var(--black);padding:2px 8px;border-radius:10px;font-weight:700}
    .role-desc{color:var(--muted);font-size:13px;margin:0 0 14px}
    .perm-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
    .perm-tag{font-size:11px;background:var(--soft);padding:3px 10px;border-radius:12px;color:var(--muted)}
    .perm-tag.more{background:var(--border);font-weight:600}
    .role-actions{display:flex;gap:8px}
    .btn-sm{padding:7px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-weight:600;font-size:13px}
    .btn-sm.danger{color:#dc2626;border-color:#fecaca}
    .btn-sm:disabled{opacity:.5;cursor:not-allowed}
    .drawer-body label{font-size:13px;font-weight:600;color:var(--muted);margin-top:8px;display:block}
    .drawer-body input,.drawer-body textarea{margin-top:4px}
    .perm-select{max-height:400px;overflow-y:auto;border:1px solid var(--border);border-radius:14px;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px}
    .perm-check{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 0}
    .perm-check input{width:auto;height:auto}
    .drawer-actions{display:flex;gap:10px;margin-top:16px;justify-content:flex-end}
    .head-actions{display:flex;gap:10px}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:99}
    .drawer{position:fixed;top:0;right:0;bottom:0;width:480px;max-width:100vw;background:var(--surface);z-index:100;box-shadow:-8px 0 40px rgba(0,0,0,.1);display:grid;grid-template-rows:auto 1fr;overflow-y:auto}
    .drawer-head{display:flex;justify-content:space-between;align-items:center;padding:24px;border-bottom:1px solid var(--border)}
    .drawer-head h2{margin:0;font-size:22px}
    .close-btn{background:none;border:0;font-size:28px;cursor:pointer;color:var(--muted);padding:0 4px}
    .drawer-body{padding:24px}
  `]
})
export class RolesComponent implements OnInit {
  private api = inject(RolesService);
  loading = true; error = '';
  roles: Role[] = [];
  showForm = false; saving = false;
  editingRole: Role | null = null;
  form: any = { name: '', description: '' };
  selectedPerms: string[] = [];
  permissionList: string[] = [];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({
      next: (res) => { this.roles = res.data || res.roles || res || []; this.loading = false; },
      error: (e) => { this.error = e.message || 'Roles unavailable.'; this.loading = false; }
    });
    this.api.getPermissionList().subscribe({
      next: (res) => { this.permissionList = res.data || res.permissions || res || []; }
    });
  }

  openForm() { this.showForm = true; this.editingRole = null; this.form = { name: '', description: '' }; this.selectedPerms = []; }
  editRole(r: Role) { this.showForm = true; this.editingRole = r; this.form = { name: r.name, description: r.description }; this.selectedPerms = [...(r.permissions || [])]; }
  closeForm() { this.showForm = false; this.editingRole = null; }
  togglePerm(p: string) { const i = this.selectedPerms.indexOf(p); if (i >= 0) this.selectedPerms.splice(i, 1); else this.selectedPerms.push(p); }

  saveRole() {
    this.saving = true;
    const data = { ...this.form, permissions: this.selectedPerms };
    const obs = this.editingRole
      ? this.api.update(this.editingRole.id, data)
      : this.api.create(data);
    obs.subscribe({ next: () => { this.saving = false; this.closeForm(); this.load(); }, error: () => { this.saving = false; } });
  }

  deleteRole(r: Role) {
    if (!confirm(`Delete role "${r.name}"?`)) return;
    this.api.delete(r.id).subscribe({ next: () => this.load() });
  }
}
