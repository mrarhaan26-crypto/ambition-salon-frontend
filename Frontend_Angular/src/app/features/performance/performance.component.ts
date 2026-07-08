import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PerformanceService } from './performance.service';
import { PerformanceReview, PerformanceSummary } from './performance.models';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Performance</h1><p>Staff performance reviews and ratings.</p></div><button class="primary" (click)="openForm()">+ New Review</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="summary">
          <div class="kpi-card"><span class="kpi-lbl">Total Reviews</span><span class="kpi-val">{{ summary.totalReviews }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Average Rating</span><span class="kpi-val good">{{ summary.averageRating }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Highest</span><span class="kpi-val">{{ summary.highestRating }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">This Month</span><span class="kpi-val">{{ summary.recentReviews }}</span></div>
        </div>

        <div class="toolbar">
          <select [(ngModel)]="statusFilter" (change)="load()"><option value="">All Status</option><option value="DRAFT">Draft</option><option value="SUBMITTED">Submitted</option></select>
        </div>

        <div class="empty" *ngIf="items.length===0"><p>No reviews yet.</p></div>
        <div class="review-list" *ngIf="items.length>0">
          <div class="review-card" *ngFor="let r of items">
            <div class="rev-head">
              <strong>{{ r.staffName }}</strong>
              <span class="rating-stars">{{ r.rating }}/5</span>
              <span class="status-badge" [class.draft]="r.status==='DRAFT'" [class.submitted]="r.status==='SUBMITTED'">{{ r.status }}</span>
            </div>
            <div class="rev-meta">Reviewed by {{ r.reviewerName }} on {{ r.reviewDate | date:'MMM dd, yyyy' }}</div>
            <div class="rev-score">Overall Score: <strong>{{ r.overallScore }}%</strong></div>
            <div class="rev-sections" *ngIf="r.strengths">
              <div><small>Strengths</small><p>{{ r.strengths }}</p></div>
              <div *ngIf="r.improvements"><small>To Improve</small><p>{{ r.improvements }}</p></div>
              <div *ngIf="r.goals"><small>Goals</small><p>{{ r.goals }}</p></div>
            </div>
            <div class="rev-actions" *ngIf="r.status==='DRAFT'">
              <button (click)="editReview(r)">Edit</button>
              <button class="btn-remove" (click)="confirmDelete(r)">Delete</button>
            </div>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>{{ editingId ? 'Edit Review' : 'New Review' }}</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Staff ID</label><input [(ngModel)]="form.staffId" placeholder="Staff ID"></div>
          <div class="form-group"><label>Reviewer ID</label><input [(ngModel)]="form.reviewerId" placeholder="Reviewer ID"></div>
          <div class="form-group"><label>Rating (1-5)</label><input [(ngModel)]="form.rating" type="number" min="1" max="5"></div>
          <div class="form-group"><label>Overall Score (%)</label><input [(ngModel)]="form.overallScore" type="number" min="0" max="100"></div>
          <div class="form-group"><label>Review Date</label><input [(ngModel)]="form.reviewDate" type="date"></div>
          <div class="form-group"><label>Strengths</label><textarea [(ngModel)]="form.strengths" placeholder="Key strengths"></textarea></div>
          <div class="form-group"><label>Areas to Improve</label><textarea [(ngModel)]="form.improvements" placeholder="Areas to improve"></textarea></div>
          <div class="form-group"><label>Goals</label><textarea [(ngModel)]="form.goals" placeholder="Goals for next period"></textarea></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Saving...' : (editingId ? 'Update' : 'Create') }}</button></div>
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
    .btn-remove{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;display:grid;gap:4px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-lbl{font-size:13px;color:#6b7280;font-weight:600}.kpi-val{font-size:28px;font-weight:800}
    .kpi-val.good{color:#16a34a}
    .toolbar{display:flex;gap:10px;margin-bottom:4px}
    .toolbar select{padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .review-list{display:grid;gap:10px}
    .review-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;display:grid;gap:8px}
    .rev-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .rev-head strong{flex:1;font-size:16px}
    .rating-stars{font-weight:800;color:#d97706}
    .status-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px}
    .status-badge.draft{background:#f3f4f6;color:#6b7280}
    .status-badge.submitted{background:#f0fdf4;color:#16a34a}
    .rev-meta{font-size:12px;color:#6b7280}
    .rev-score{font-size:14px;color:#374151}
    .rev-sections{display:grid;gap:8px;margin-top:4px}
    .rev-sections small{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase}
    .rev-sections p{margin:0;font-size:13px;color:#374151}
    .rev-actions{display:flex;gap:6px;margin-top:4px}
    .rev-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    @media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}}
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
export class PerformanceComponent {
  private api = inject(PerformanceService);
  items: PerformanceReview[] = []; summary: PerformanceSummary | null = null;
  loading = true; error = '';
  statusFilter = '';
  showForm = false; editingId = '';
  form: any = { staffId: '', reviewerId: '', rating: 5, overallScore: 80, reviewDate: '', strengths: '', improvements: '', goals: '' };
  formMsg = ''; formBusy = false;
  showDelete = false; deleteMsg = ''; deleteAction: (() => void) | null = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getAll({ status: this.statusFilter || undefined }).subscribe({
      next: d => { this.items = d; this.loading = false; },
      error: () => { this.error = 'Reviews unavailable.'; this.loading = false; },
    });
    this.api.getSummary().subscribe({ next: d => this.summary = d });
  }
  openForm() { this.editingId = ''; this.form = { staffId: '', reviewerId: '', rating: 5, overallScore: 80, reviewDate: '', strengths: '', improvements: '', goals: '' }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  editReview(r: PerformanceReview) {
    this.editingId = r.id;
    this.form = { staffId: r.staffId, reviewerId: r.reviewerId, rating: r.rating, overallScore: r.overallScore, reviewDate: r.reviewDate?.slice(0,10), strengths: r.strengths, improvements: r.improvements, goals: r.goals };
    this.showForm = true;
  }
  save() {
    this.formBusy = true; this.formMsg = '';
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.formBusy = false; this.load(); }, error: () => { this.formMsg = 'Failed to save review.'; this.formBusy = false; } });
  }
  confirmDelete(r: PerformanceReview) { this.deleteMsg = `Delete review for ${r.staffName}?`; this.deleteAction = () => { this.api.remove(r.id).subscribe({ next: () => { this.showDelete = false; this.load(); } }); }; this.showDelete = true; }
  doDelete() { if (this.deleteAction) this.deleteAction(); }
}
