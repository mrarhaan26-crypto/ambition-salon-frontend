import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PackagesService } from './packages.service';
import { ClientsService } from '../clients/clients.service';

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Packages</h1>
          <p>Prepaid service packages and deals.</p>
        </div>
        <button class="primary" (click)="openCreate()">+ New Package</button>
      </div>

      <div class="client-context" *ngIf="filterClientName">
        <div class="cc-avatar">{{ filterClientName.charAt(0).toUpperCase() }}</div>
        <div class="cc-info">
          <strong>{{ filterClientName }}</strong>
          <span>Viewing packages context</span>
        </div>
        <a [routerLink]="'/app/clients'" class="cc-back">Back to Clients</a>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading packages...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="empty" *ngIf="items.length === 0"><p>No packages yet. Create your first package.</p></div>
        <div class="card-grid" *ngIf="items.length > 0">
          <div class="card" *ngFor="let p of items">
            <div class="card-top">
              <strong>{{ p.name }}</strong>
              <span class="badge" [class.active]="p.isActive" [class.inactive]="!p.isActive">{{ p.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
            <div class="price">{{ p.price | currency:'USD':'symbol':'1.2-2' }}</div>
            <div class="meta">Validity: {{ p.validityDays }} days</div>
            <div class="services-list" *ngIf="p.services?.length">
              <span class="service-chip" *ngFor="let s of p.services">{{ s.service?.name || s.serviceId }} ({{ s.sessions }}x)</span>
            </div>
            <p *ngIf="p.description" class="desc">{{ p.description }}</p>
            <div class="card-actions">
              <button (click)="toggleActive(p)">{{ p.isActive ? 'Deactivate' : 'Activate' }}</button>
              <button (click)="editItem(p)">Edit</button>
              <button class="danger" (click)="deleteItem(p)">Delete</button>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer" *ngIf="showForm">
        <div class="drawer-panel">
          <h2>{{ editingId ? 'Edit Package' : 'New Package' }}</h2>
          <div class="form">
            <input [(ngModel)]="form.name" placeholder="Package name" required>
            <input [(ngModel)]="form.price" type="number" step="0.01" placeholder="Price">
            <input [(ngModel)]="form.validityDays" type="number" placeholder="Validity (days)">
            <textarea [(ngModel)]="form.description" placeholder="Description"></textarea>
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
    .client-context{display:flex;align-items:center;gap:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:14px 18px}
    .cc-avatar{width:40px;height:40px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0}
    .cc-info{flex:1}
    .cc-info strong{display:block;font-size:15px}
    .cc-info span{font-size:12px;color:#6b7280}
    .cc-back{border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;color:#374151;text-decoration:none;transition:all .2s}
    .cc-back:hover{background:#f3f4f6}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280}
    .card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .card{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .card-top strong{font-size:17px}
    .badge{font-size:10px;padding:2px 10px;border-radius:12px;font-weight:700}
    .active{background:#f0fdf4;color:#16a34a}
    .inactive{background:#f3f4f6;color:#6b7280}
    .price{font-size:28px;font-weight:900;margin-bottom:8px}
    .meta{font-size:13px;color:#6b7280;margin-bottom:8px}
    .services-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
    .service-chip{font-size:11px;background:#e5e7eb;padding:4px 10px;border-radius:12px;font-weight:600}
    .desc{font-size:13px;color:#374151}
    .card-actions{display:flex;gap:6px;margin-top:14px}
    .card-actions button{border:1px solid #e5e7eb;border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer;background:white;font-size:12px}
    .card-actions .danger{background:#fee2e2;color:#991b1b;border-color:#fecaca}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(480px,90%);max-height:90vh;overflow-y:auto}
    .drawer-panel h2{margin:0 0 20px}
    .form{display:grid;gap:12px}
    .form input,textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    textarea{min-height:80px}
    .form-actions{display:flex;gap:12px;justify-content:flex-end}
    .form-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
    .form-actions button:last-child{background:#0b0b0b;color:white}
    @media(max-width:1200px){.card-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.card-grid{grid-template-columns:1fr}}
  `]
})
export class PackagesComponent {
  private api = inject(PackagesService);
  private route = inject(ActivatedRoute);
  private clientsApi = inject(ClientsService);
  items: any[] = [];
  loading = true;
  error = '';
  showForm = false;
  editingId = '';
  form: any = { name: '', price: 0, validityDays: 90, description: '' };
  filterClientId = '';
  filterClientName = '';

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const clientId = params['clientId'];
      if (clientId) {
        this.filterClientId = clientId;
        this.clientsApi.getClient(clientId).subscribe({
          next: (c) => { this.filterClientName = c.fullName; },
        });
      }
    });
    this.loadAll();
  }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({ next: (d) => { this.items = d; this.loading = false; }, error: () => { this.error = 'Failed to load packages.'; this.loading = false; } });
  }

  openCreate() { this.editingId = ''; this.form = { name: '', price: 0, validityDays: 90, description: '' }; this.showForm = true; }

  editItem(p: any) { this.editingId = p.id; this.form = { name: p.name, price: p.price, validityDays: p.validityDays, description: p.description || '' }; this.showForm = true; }

  save() {
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.showForm = false; this.loadAll(); } });
  }

  toggleActive(p: any) { this.api.update(p.id, { isActive: !p.isActive }).subscribe({ next: () => this.loadAll() }); }

  deleteItem(p: any) { if (!confirm(`Delete "${p.name}"?`)) return; this.api.remove(p.id).subscribe({ next: () => this.loadAll() }); }
}
