import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientsService } from './clients.service';
import { Client } from './client.model';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="clients">
      <div class="head">
        <div>
          <h1>Clients CRM</h1>
          <p>Manage salon clients, wallet, loyalty and visit history.</p>
        </div>
        <button (click)="openForm()">+ Add Client</button>
      </div>

      <div class="toolbar">
        <input [(ngModel)]="search" (input)="load()" placeholder="Search name, phone, email or city">
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading clients...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load clients.</strong><p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="grid" *ngIf="!loading && !error && clients.length > 0">
        <div class="card" *ngFor="let client of clients">
          <div>
            <h3>{{ client.fullName }}</h3>
            <p>{{ client.phone || 'No phone' }} &#xb7; {{ client.city || 'No city' }}</p>
          </div>
          <div class="stats">
            <span>Visits: {{ client.totalVisits }}</span>
            <span>Spend: {{ (client.totalSpend || 0) | currency }}</span>
            <span>Points: {{ client.loyaltyPoints || 0 }}</span>
          </div>
          <p class="note">{{ client.notes || 'No notes added' }}</p>
          <div class="actions">
            <button (click)="openDetail(client)">View</button>
            <button (click)="edit(client)">Edit</button>
            <button class="danger" (click)="remove(client)">Delete</button>
          </div>
        </div>
      </div>

      <div class="empty" *ngIf="!loading && !error && clients.length === 0">
        <p>No clients found. Add your first client to get started.</p>
      </div>

      <div class="drawer-overlay" *ngIf="showDetail" (click)="closeDetail()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>{{ selectedClient?.fullName }}</h2>
            <button class="close-btn" (click)="closeDetail()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="drawer-section">
              <h3>Contact</h3>
              <div class="info-row"><span>Phone</span><span>{{ selectedClient?.phone || 'N/A' }}</span></div>
              <div class="info-row"><span>Email</span><span>{{ selectedClient?.email || 'N/A' }}</span></div>
              <div class="info-row"><span>Gender</span><span>{{ selectedClient?.gender || 'N/A' }}</span></div>
              <div class="info-row"><span>City</span><span>{{ selectedClient?.city || 'N/A' }}</span></div>
            </div>
            <div class="drawer-section">
              <h3>Statistics</h3>
              <div class="info-row"><span>Total Visits</span><span>{{ selectedClient?.totalVisits || 0 }}</span></div>
              <div class="info-row"><span>Total Spend</span><span>{{ (selectedClient?.totalSpend || 0) | currency }}</span></div>
              <div class="info-row"><span>Loyalty Points</span><span>{{ selectedClient?.loyaltyPoints || 0 }}</span></div>
            </div>
            <div class="drawer-section" *ngIf="selectedClient?.notes">
              <h3>Notes</h3>
              <p class="notes-text">{{ selectedClient?.notes }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>{{ editingId ? 'Edit Client' : 'Add Client' }}</h2>
            <button class="close-btn" (click)="closeForm()">&times;</button>
          </div>
          <div class="drawer-body">
            <form (ngSubmit)="save()" class="create-form">
              <input name="fullName" [(ngModel)]="form.fullName" placeholder="Full name" required>
              <input name="phone" [(ngModel)]="form.phone" placeholder="Phone">
              <input name="email" [(ngModel)]="form.email" placeholder="Email">
              <input name="gender" [(ngModel)]="form.gender" placeholder="Gender">
              <input name="city" [(ngModel)]="form.city" placeholder="City">
              <textarea name="notes" [(ngModel)]="form.notes" placeholder="Notes"></textarea>
              <div class="drawer-actions">
                <button type="button" (click)="closeForm()">Cancel</button>
                <button type="submit" class="btn-primary">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .clients{display:grid;gap:22px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .head button,.btn-primary{border:0;border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .toolbar input{width:100%;padding:15px;border:1px solid #e5e7eb;border-radius:16px}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .card h3{margin:0;font-size:20px}
    .stats{display:grid;gap:8px;margin:16px 0}
    .stats span{background:#f8fafc;border-radius:12px;padding:10px}
    .note{background:#fff7ed;border-radius:12px;padding:12px;color:#9a3412}
    .actions{display:flex;gap:10px}
    .actions button{border:0;border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;background:#f3f4f6}
    .danger{background:#fee2e2;color:#991b1b}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white;z-index:1}
    .drawer-header h2{margin:0;font-size:20px}
    .close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280;padding:0;line-height:1}
    .drawer-body{padding:24px 28px;display:grid;gap:20px}
    .drawer-section h3{font-size:13px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em}
    .info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
    .info-row span:first-child{color:#6b7280;font-weight:600}
    .info-row span:last-child{text-align:right;max-width:60%}
    .notes-text{font-size:14px;color:#374151;line-height:1.5;margin:0}
    .drawer-actions{display:flex;gap:10px;flex-wrap:wrap}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px}
    .create-form{display:grid;gap:12px}
    .create-form input,textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    textarea{min-height:100px}
    @media(max-width:1000px){.grid{grid-template-columns:1fr}.head{display:grid;gap:14px}.drawer-panel{width:100%}}
  `]
})
export class ClientsComponent {
  private api = inject(ClientsService);

  clients: Client[] = [];
  search = '';
  loading = true;
  error = '';

  showDetail = false;
  selectedClient: Client | null = null;

  showForm = false;
  editingId = '';
  form: any = { fullName: '', phone: '', email: '', gender: '', city: '', notes: '' };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.api.getClients(this.search).subscribe({
      next: (data) => { this.clients = data; this.loading = false; },
      error: () => { this.error = 'Failed to load clients.'; this.loading = false; },
    });
  }

  openDetail(client: Client) { this.selectedClient = client; this.showDetail = true; }
  closeDetail() { this.showDetail = false; }

  openForm() {
    this.editingId = '';
    this.form = { fullName: '', phone: '', email: '', gender: '', city: '', notes: '' };
    this.showForm = true;
  }

  closeForm() { this.showForm = false; }

  edit(client: Client) {
    this.editingId = client.id;
    this.form = { ...client };
    this.showForm = true;
  }

  save() {
    const request = this.editingId ? this.api.updateClient(this.editingId, this.form) : this.api.createClient(this.form);
    request.subscribe(() => { this.closeForm(); this.load(); });
  }

  remove(client: Client) {
    if (!confirm(`Delete ${client.fullName}?`)) return;
    this.api.deleteClient(client.id).subscribe(() => this.load());
  }
}
