import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsService } from './forms.service';
import { ClientsService } from '../clients/clients.service';

@Component({
  selector: 'app-forms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Forms</h1>
          <p>Form templates and client submissions.</p>
        </div>
        <button class="primary" (click)="openCreate()">+ New Form</button>
      </div>

      <div class="client-context" *ngIf="filterClientName">
        <div class="cc-avatar">{{ filterClientName.charAt(0).toUpperCase() }}</div>
        <div class="cc-info">
          <strong>{{ filterClientName }}</strong>
          <span>Viewing forms context</span>
        </div>
        <a [routerLink]="'/app/clients'" class="cc-back">Back to Clients</a>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading forms...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="empty" *ngIf="items.length === 0"><p>No form templates yet.</p></div>
        <div class="card-grid" *ngIf="items.length > 0">
          <div class="card" *ngFor="let f of items">
            <div class="card-top">
              <strong>{{ f.name }}</strong>
              <span class="badge" [class.active]="f.isActive" [class.inactive]="!f.isActive">{{ f.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
            <p *ngIf="f.description">{{ f.description }}</p>
            <div class="card-actions">
              <button (click)="editItem(f)">Edit</button>
              <button class="danger" (click)="deleteItem(f)">Delete</button>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer" *ngIf="showForm">
        <div class="drawer-panel">
          <h2>{{ editingId ? 'Edit Form' : 'New Form' }}</h2>
          <div class="form">
            <input [(ngModel)]="form.name" placeholder="Form name" required>
            <textarea [(ngModel)]="form.description" placeholder="Description"></textarea>
            <textarea [(ngModel)]="form.fields" placeholder="Fields (JSON array of field definitions)" rows="6"></textarea>
            <div class="form-actions">
              <button type="button" (click)="showForm = false">Cancel</button>
              <button (click)="save()">{{ editingId ? 'Update' : 'Create' }}</button>
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
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .client-context{display:flex;align-items:center;gap:16px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:24px;padding:16px 20px}
    .cc-avatar{width:44px;height:44px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0}
    .cc-info{flex:1}
    .cc-info strong{display:block;font-size:15px}
    .cc-info span{font-size:12px;color:#6b7280}
    .cc-back{border:1px solid #cbd5e1;border-radius:12px;padding:10px 16px;font-weight:700;font-size:12px;color:#0b0b0b;text-decoration:none}
    .empty{padding:48px;text-align:center;color:#6b7280}
    .card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .card{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .card-top strong{font-size:17px}
    .badge{font-size:10px;padding:2px 10px;border-radius:12px;font-weight:700}
    .active{background:#f0fdf4;color:#16a34a}
    .inactive{background:#f3f4f6;color:#6b7280}
    .card p{font-size:13px;color:#6b7280}
    .card-actions{display:flex;gap:6px;margin-top:14px}
    .card-actions button{border:1px solid #e5e7eb;border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer;background:white;font-size:12px}
    .card-actions .danger{background:#fee2e2;color:#991b1b;border-color:#fecaca}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(520px,90%);max-height:90vh;overflow-y:auto}
    .drawer-panel h2{margin:0 0 20px}
    .form{display:grid;gap:12px}
    .form input,textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px;font-family:inherit}
    textarea{min-height:80px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    @media(max-width:1200px){.card-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.card-grid{grid-template-columns:1fr}}
  `]
})
export class FormsComponent {
  private api = inject(FormsService);
  private route = inject(ActivatedRoute);
  private clientsApi = inject(ClientsService);
  items: any[] = [];
  loading = true;
  error = '';
  showForm = false;
  editingId = '';
  form: any = { name: '', description: '', fields: '' };
  filterClientId = '';
  filterClientName = '';

  ngOnInit() {
    this.loadAll();
    this.route.queryParams.subscribe((qp) => {
      this.filterClientId = qp['clientId'] || '';
      if (this.filterClientId) {
        this.clientsApi.getClient(this.filterClientId).subscribe({
          next: (c) => { this.filterClientName = c.fullName; },
          error: () => { this.filterClientName = 'Client'; },
        });
      } else {
        this.filterClientName = '';
      }
    });
  }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({ next: (d) => { this.items = d; this.loading = false; }, error: () => { this.error = 'Failed to load forms.'; this.loading = false; } });
  }

  openCreate() { this.editingId = ''; this.form = { name: '', description: '', fields: '' }; this.showForm = true; }

  editItem(f: any) { this.editingId = f.id; this.form = { name: f.name, description: f.description || '', fields: f.fields || '' }; this.showForm = true; }

  save() {
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.showForm = false; this.loadAll(); } });
  }

  deleteItem(f: any) { if (!confirm(`Delete form "${f.name}"?`)) return; this.api.remove(f.id).subscribe({ next: () => this.loadAll() }); }
}

