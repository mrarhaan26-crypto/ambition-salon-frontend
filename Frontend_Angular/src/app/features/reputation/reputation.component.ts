import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReputationService } from './reputation.service';

@Component({
  selector: 'app-reputation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Reputation</h1>
          <p>Customer reviews &amp; ratings.</p>
        </div>
        <button class="primary" (click)="openForm()">+ Add Review</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading reviews...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load reviews.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpi-row" *ngIf="summary">
          <div class="kpi-card"><span class="kpi-val">{{ summary.total }}</span><span class="kpi-lbl">Total Reviews</span></div>
          <div class="kpi-card green"><span class="kpi-val">{{ summary.avgRating }}</span><span class="kpi-lbl">Avg Rating</span></div>
        </div>

        <div class="toolbar">
          <select [(ngModel)]="sourceFilter" (change)="load()"><option value="">All Sources</option><option value="GOOGLE">Google</option><option value="MANUAL">Manual</option><option value="EMAIL">Email</option></select>
          <select [(ngModel)]="statusFilter" (change)="load()"><option value="">All Status</option><option value="PUBLISHED">Published</option><option value="PENDING">Pending</option><option value="HIDDEN">Hidden</option></select>
        </div>

        <div class="empty" *ngIf="reviews.length === 0"><p>No reviews found.</p></div>
        <div class="review-list" *ngIf="reviews.length > 0">
          <div class="review-card" *ngFor="let r of reviews">
            <div class="review-head">
              <strong>{{ r.clientName || 'Anonymous' }}</strong>
              <span class="rating">{{ r.rating }}/5</span>
              <span class="source-badge">{{ r.source }}</span>
              <span class="status-badge" [class.published]="r.status==='PUBLISHED'" [class.pending]="r.status==='PENDING'" [class.hidden]="r.status==='HIDDEN'">{{ r.status }}</span>
            </div>
            <p *ngIf="r.comment">{{ r.comment }}</p>
            <small>{{ r.createdAt | date:'MMM dd, yyyy' }}</small>
            <div class="review-actions">
              <button (click)="editReview(r)">Edit</button>
              <button class="btn-danger" (click)="confirmDelete(r)">Delete</button>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header"><h2>{{ editingId ? 'Edit Review' : 'Add Review' }}</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
          <div class="drawer-body">
            <div class="form-group"><label>Client Name</label><input [(ngModel)]="form.clientName" placeholder="Client name"></div>
            <div class="form-group"><label>Rating (1-5)</label><input [(ngModel)]="form.rating" type="number" min="1" max="5"></div>
            <div class="form-group"><label>Source</label><select [(ngModel)]="form.source"><option value="MANUAL">Manual</option><option value="GOOGLE">Google</option><option value="EMAIL">Email</option></select></div>
            <div class="form-group"><label>Comment</label><textarea [(ngModel)]="form.comment" placeholder="Review comment"></textarea></div>
            <div class="form-group"><label>Status</label><select [(ngModel)]="form.status"><option value="PUBLISHED">Published</option><option value="PENDING">Pending</option><option value="HIDDEN">Hidden</option></select></div>
            <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()">{{ editingId ? 'Update' : 'Save' }}</button></div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete=false">
        <div class="confirm-panel" (click)="$event.stopPropagation()">
          <h3>Delete Review</h3><p>Delete this review?</p>
          <div class="confirm-actions"><button (click)="showDelete=false">Cancel</button><button class="btn-danger" (click)="doDelete()">Delete</button></div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpi-row{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:24px;display:grid;gap:6px}
    .kpi-val{font-size:38px;font-weight:800}.kpi-lbl{font-size:13px;color:#6b7280;font-weight:600}
    .kpi-card.green .kpi-val{color:#16a34a}
    .toolbar{display:flex;gap:12px}.toolbar select{padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .review-list{display:grid;gap:8px}
    .review-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;display:grid;gap:8px}
    .review-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .review-head strong{font-size:15px}.rating{font-weight:800;color:#d97706}
    .source-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:#f3f4f6;color:#374151;text-transform:uppercase}
    .status-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px}
    .status-badge.published{background:#f0fdf4;color:#16a34a}
    .status-badge.pending{background:#fffbeb;color:#d97706}
    .status-badge.hidden{background:#f3f4f6;color:#6b7280}
    .review-card p{margin:0;font-size:14px;color:#374151}
    .review-card small{color:#6b7280;font-size:12px}
    .review-actions{display:flex;gap:6px}
    .review-actions button{border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;background:white;font-size:12px}
    .btn-danger{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}.form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-group textarea{min-height:80px}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-primary{background:#0b0b0b;color:white}
    .confirm-panel{background:white;border-radius:24px;padding:32px;width:min(420px,90%)}
    .confirm-panel h3{margin:0 0 12px}.confirm-panel p{color:#6b7280;margin:0 0 24px}
    .confirm-actions{display:flex;gap:10px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    @media(max-width:900px){.drawer-panel{width:100%}}
  `]
})
export class ReputationComponent {
  private api = inject(ReputationService);
  reviews: any[] = []; summary: any = null;
  loading = true; error = '';
  sourceFilter = ''; statusFilter = '';
  showForm = false; editingId = '';
  form: any = { clientName: '', rating: 5, source: 'MANUAL', comment: '', status: 'PUBLISHED' };
  showDelete = false; deleting: any = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    const q: any = {};
    if (this.sourceFilter) q.source = this.sourceFilter;
    if (this.statusFilter) q.status = this.statusFilter;
    this.api.getReviews(q).subscribe({ next: d => { this.reviews = d; this.loading = false; }, error: () => { this.error = 'Reviews unavailable.'; this.loading = false; } });
    this.api.getSummary().subscribe({ next: d => this.summary = d });
  }
  openForm() { this.editingId = ''; this.form = { clientName: '', rating: 5, source: 'MANUAL', comment: '', status: 'PUBLISHED' }; this.showForm = true; }
  closeForm() { this.showForm = false; }
  editReview(r: any) { this.editingId = r.id; this.form = { clientName: r.clientName, rating: r.rating, source: r.source, comment: r.comment, status: r.status }; this.showForm = true; }
  save() { const obs = this.editingId ? this.api.updateReview(this.editingId, this.form) : this.api.createReview(this.form); obs.subscribe({ next: () => { this.closeForm(); this.load(); } }); }
  confirmDelete(r: any) { this.deleting = r; this.showDelete = true; }
  doDelete() { if (!this.deleting) return; this.api.removeReview(this.deleting.id).subscribe({ next: () => { this.showDelete = false; this.deleting = null; this.load(); } }); }
}
