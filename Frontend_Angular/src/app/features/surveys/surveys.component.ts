import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SurveysService } from './surveys.service';

@Component({
  selector: 'app-surveys',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Surveys &amp; Feedback</h1>
          <p>Create surveys and collect customer feedback.</p>
        </div>
        <button class="primary" (click)="tab='surveys'; openForm()">+ New Survey</button>
      </div>

      <div class="tabs">
        <button [class.active]="tab==='surveys'" (click)="tab='surveys'; load()">Surveys</button>
        <button [class.active]="tab==='feedback'" (click)="tab='feedback'; load()">Feedback</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <!-- Surveys Tab -->
      <ng-container *ngIf="tab==='surveys' && !loading && !error">
        <div class="empty" *ngIf="surveys.length===0"><p>No surveys yet. Create your first survey.</p></div>
        <div class="survey-list" *ngIf="surveys.length>0">
          <div class="survey-card" *ngFor="let s of surveys" [class.inactive]="!s.isActive">
            <div class="survey-head">
              <strong>{{ s.title }}</strong>
              <span class="resp-count">{{ s._count?.responses || 0 }} responses</span>
              <span class="active-badge" [class.yes]="s.isActive" [class.no]="!s.isActive">{{ s.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
            <div class="survey-actions">
              <button (click)="editSurvey(s)">Edit</button>
              <button (click)="viewResponses(s)">Responses</button>
              <button class="btn-danger" (click)="confirmDelete(s)">Delete</button>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Feedback Tab -->
      <ng-container *ngIf="tab==='feedback' && !loading && !error">
        <div class="empty" *ngIf="feedback.length===0"><p>No feedback received yet.</p></div>
        <div class="feedback-list" *ngIf="feedback.length>0">
          <div class="feedback-card" *ngFor="let f of feedback">
            <div class="fb-head">
              <strong>{{ f.clientName || 'Anonymous' }}</strong>
              <span class="fb-rating" *ngIf="f.rating">{{ f.rating }}/5</span>
            </div>
            <p>{{ f.message }}</p>
            <small>{{ f.createdAt | date:'MMM dd, yyyy' }} | {{ f.source }}</small>
          </div>
        </div>
      </ng-container>

      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header"><h2>{{ editingId ? 'Edit Survey' : 'New Survey' }}</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
          <div class="drawer-body">
            <div class="form-group"><label>Title</label><input [(ngModel)]="form.title" placeholder="Survey title"></div>
            <div class="form-group"><label>Questions (JSON array)</label><textarea [(ngModel)]="form.questions" placeholder='[{"question":"How was your service?","type":"rating"}]'></textarea></div>
            <div class="form-group" *ngIf="editingId"><label><input type="checkbox" [(ngModel)]="form.isActive"> Active</label></div>
            <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="saveSurvey()">{{ editingId ? 'Update' : 'Create' }}</button></div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showResponses" (click)="showResponses=false">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header"><h2>Responses: {{ viewingSurvey?.title }}</h2><button class="close-btn" (click)="showResponses=false">&times;</button></div>
          <div class="drawer-body">
            <div class="empty" *ngIf="responses.length===0"><p>No responses yet.</p></div>
            <div class="response-item" *ngFor="let r of responses">
              <small>{{ r.createdAt | date:'MMM dd, yyyy' }}</small>
              <p>{{ r.answers }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete=false">
        <div class="confirm-panel" (click)="$event.stopPropagation()">
          <h3>Delete Survey</h3><p>Delete <strong>{{ deleting?.title }}</strong>?</p>
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
    .tabs{display:flex;gap:4px;background:#f3f4f6;border-radius:16px;padding:4px;width:fit-content}
    .tabs button{border:0;border-radius:12px;padding:10px 20px;font-weight:700;cursor:pointer;background:transparent}
    .tabs button.active{background:white;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .survey-list,.feedback-list{display:grid;gap:8px}
    .survey-card,.feedback-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;display:grid;gap:8px}
    .survey-card.inactive{opacity:.6}
    .survey-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .survey-head strong{flex:1;font-size:16px}
    .resp-count{font-size:12px;color:#6b7280}
    .active-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px}
    .active-badge.yes{background:#f0fdf4;color:#16a34a}.active-badge.no{background:#f3f4f6;color:#6b7280}
    .survey-actions{display:flex;gap:6px;margin-top:4px}
    .survey-actions button,.feedback-card button{border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;background:white;font-size:12px}
    .btn-danger{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}
    .fb-head{display:flex;gap:8px;align-items:center}
    .fb-rating{font-weight:800;color:#d97706}
    .feedback-card p{margin:0;font-size:14px}.feedback-card small{color:#6b7280}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}.form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
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
export class SurveysComponent {
  private api = inject(SurveysService);
  surveys: any[] = []; feedback: any[] = []; responses: any[] = [];
  tab: 'surveys' | 'feedback' = 'surveys';
  loading = true; error = '';
  showForm = false; editingId = '';
  form: any = { title: '', questions: '' };
  showResponses = false; viewingSurvey: any = null;
  showDelete = false; deleting: any = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    if (this.tab === 'surveys') {
      this.api.getAll().subscribe({ next: d => { this.surveys = d; this.loading = false; }, error: () => { this.error = 'Surveys unavailable.'; this.loading = false; } });
    } else {
      this.api.getFeedback().subscribe({ next: d => { this.feedback = d; this.loading = false; }, error: () => { this.error = 'Feedback unavailable.'; this.loading = false; } });
    }
  }
  openForm() { this.editingId = ''; this.form = { title: '', questions: '' }; this.showForm = true; }
  closeForm() { this.showForm = false; }
  editSurvey(s: any) { this.editingId = s.id; this.form = { title: s.title, questions: s.questions || '', isActive: s.isActive }; this.showForm = true; }
  saveSurvey() {
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.load(); } });
  }
  viewResponses(s: any) { this.viewingSurvey = s; this.api.getResponses(s.id).subscribe({ next: d => { this.responses = d; this.showResponses = true; } }); }
  confirmDelete(s: any) { this.deleting = s; this.showDelete = true; }
  doDelete() { if (!this.deleting) return; this.api.remove(this.deleting.id).subscribe({ next: () => { this.showDelete = false; this.deleting = null; this.load(); } }); }
}
