import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WaitingListService } from './waiting-list.service';
import { WaitingEntry } from './waiting-list.models';

@Component({
  selector: 'app-waiting-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Waiting List</h1><p>Walk-in queue management.</p></div><button class="primary" (click)="openForm()">+ Add to Waitlist</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="toolbar">
          <select [(ngModel)]="statusFilter" (change)="load()"><option value="">All</option><option value="WAITING">Waiting</option><option value="CALLED">Called</option><option value="SERVED">Served</option><option value="CANCELLED">Cancelled</option></select>
        </div>
        <div class="empty" *ngIf="items.length===0"><p>No waiting entries.</p></div>
        <div class="queue" *ngIf="items.length>0">
          <div class="queue-card" *ngFor="let w of items" [class.waiting]="w.status==='WAITING'" [class.called]="w.status==='CALLED'" [class.served]="w.status==='SERVED'" [class.cancelled]="w.status==='CANCELLED'">
            <div class="q-pos">{{ w.position }}</div>
            <div class="q-info">
              <strong>{{ w.clientName }}</strong>
              <span>{{ w.serviceName }} <span *ngIf="w.partySize>1">(x{{ w.partySize }})</span></span>
              <small *ngIf="w.notes">{{ w.notes }}</small>
            </div>
            <div class="q-status">
              <span class="status-badge" [class.waiting]="w.status==='WAITING'" [class.called]="w.status==='CALLED'" [class.served]="w.status==='SERVED'" [class.cancelled]="w.status==='CANCELLED'">{{ w.status }}</span>
            </div>
            <div class="q-actions">
              <button *ngIf="w.status==='WAITING'" (click)="markCalled(w)">Call</button>
              <button *ngIf="w.status==='CALLED'" (click)="markServed(w)">Serve</button>
              <button *ngIf="w.status==='WAITING'" class="btn-danger-sm" (click)="cancelEntry(w)">Cancel</button>
              <button *ngIf="w.status==='WAITING'||w.status==='CALLED'" class="btn-remove" (click)="confirmDelete(w)">Remove</button>
            </div>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>Add to Waitlist</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Client Name</label><input [(ngModel)]="form.clientName" placeholder="Full name"></div>
          <div class="form-group"><label>Phone</label><input [(ngModel)]="form.clientPhone" placeholder="Phone number"></div>
          <div class="form-group"><label>Service</label><input [(ngModel)]="form.serviceName" placeholder="e.g. Haircut"></div>
          <div class="form-group"><label>Staff Preference</label><input [(ngModel)]="form.staffPreference" placeholder="Any"></div>
          <div class="form-group"><label>Party Size</label><input [(ngModel)]="form.partySize" type="number" min="1"></div>
          <div class="form-group"><label>Notes</label><textarea [(ngModel)]="form.notes" placeholder="Any notes"></textarea></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Adding...' : 'Add' }}</button></div>
        </div>
      </div>
    </div>

    <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete=false">
      <div class="confirm-panel" (click)="$event.stopPropagation()"><h3>Delete</h3><p>Remove this entry?</p>
        <div class="confirm-actions"><button (click)="showDelete=false">Cancel</button><button class="btn-danger" (click)="doDelete()">Delete</button></div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .btn-remove{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .toolbar select{padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .queue{display:grid;gap:6px}
    .queue-card{display:grid;grid-template-columns:40px 1fr 0.8fr 1fr;gap:12px;padding:14px 16px;background:white;border:1px solid #e5e7eb;border-radius:14px;align-items:center}
    .queue-card.called{border-color:#fde68a;background:#fffbeb}
    .queue-card.served{opacity:.65}
    .queue-card.cancelled{opacity:.5}
    .q-pos{font-size:22px;font-weight:900;color:#0b0b0b;text-align:center}
    .q-info{display:grid;gap:2px}
    .q-info strong{font-size:15px}
    .q-info span{font-size:13px;color:#6b7280}
    .q-info small{font-size:11px;color:#6b7280}
    .status-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px}
    .status-badge.waiting{background:#fffbeb;color:#d97706}
    .status-badge.called{background:#eff6ff;color:#2563eb}
    .status-badge.served{background:#f0fdf4;color:#16a34a}
    .status-badge.cancelled{background:#f3f4f6;color:#6b7280}
    .q-actions{display:flex;gap:4px;flex-wrap:wrap}
    .q-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:5px 10px;font-weight:600;cursor:pointer;background:white;font-size:10px}
    .btn-danger-sm{background:#fee2e2!important;color:#991b1b!important}
    @media(max-width:900px){.queue-card{grid-template-columns:1fr 1fr;gap:6px}}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{font-size:28px;cursor:pointer;color:#6b7280;border:0;background:transparent}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-group textarea{min-height:60px;resize:vertical}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-primary{background:#0b0b0b;color:white}
    .msg{padding:12px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;text-align:center}
    .confirm-panel{background:white;border-radius:24px;padding:28px;width:min(420px,90%)}
    .confirm-actions{display:flex;gap:10px;margin-top:12px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-danger{background:#fee2e2;color:#991b1b}
    @media(max-width:900px){.drawer-panel{width:100%}}
  `]
})
export class WaitingListComponent {
  private api = inject(WaitingListService);
  items: WaitingEntry[] = [];
  loading = true; error = '';
  statusFilter = '';
  showForm = false; form: any = { clientName: '', clientPhone: '', serviceName: '', staffPreference: '', partySize: 1, notes: '' };
  formMsg = ''; formBusy = false;
  showDelete = false; deleting: WaitingEntry | null = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getAll({ status: this.statusFilter || undefined }).subscribe({
      next: d => { this.items = d.sort((a,b) => a.position - b.position); this.loading = false; },
      error: () => { this.error = 'Waiting list unavailable.'; this.loading = false; },
    });
  }
  openForm() { this.form = { clientName: '', clientPhone: '', serviceName: '', staffPreference: '', partySize: 1, notes: '' }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  save() {
    this.formBusy = true; this.formMsg = '';
    this.api.create(this.form).subscribe({ next: () => { this.closeForm(); this.formBusy = false; this.load(); }, error: () => { this.formMsg = 'Failed to add.'; this.formBusy = false; } });
  }
  markCalled(w: WaitingEntry) { this.api.markCalled(w.id).subscribe({ next: () => this.load() }); }
  markServed(w: WaitingEntry) { this.api.markServed(w.id).subscribe({ next: () => this.load() }); }
  cancelEntry(w: WaitingEntry) { this.api.cancel(w.id).subscribe({ next: () => this.load() }); }
  confirmDelete(w: WaitingEntry) { this.deleting = w; this.showDelete = true; }
  doDelete() { if (this.deleting) { this.api.remove(this.deleting.id).subscribe({ next: () => { this.showDelete = false; this.deleting = null; this.load(); } }); } }
}
