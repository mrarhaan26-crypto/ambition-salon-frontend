import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TasksService } from './tasks.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Tasks</h1>
          <p>Manage tasks and follow-ups.</p>
        </div>
        <button class="primary" (click)="openForm()">+ Add Task</button>
      </div>

      <div class="tabs">
        <button [class.active]="view === 'all'" (click)="switchView('all')">All Tasks</button>
        <button [class.active]="view === 'mine'" (click)="switchView('mine')">My Tasks</button>
        <button [class.active]="view === 'overdue'" (click)="switchView('overdue')">Overdue</button>
      </div>

      <div class="toolbar">
        <input [(ngModel)]="search" (input)="load()" placeholder="Search tasks...">
        <select [(ngModel)]="statusFilter" (change)="load()">
          <option value="">All Status</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <select [(ngModel)]="priorityFilter" (change)="load()">
          <option value="">All Priority</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading tasks...</span>
      </div>

      <div class="error" *ngIf="error">
        <strong>Failed to load tasks.</strong>
        <p>{{ error }}</p>
        <button (click)="load()">Retry</button>
      </div>

      <div class="empty" *ngIf="!loading && !error && tasks.length === 0">
        <p>{{ view === 'overdue' ? 'No overdue tasks. Great job!' : view === 'mine' ? 'No tasks assigned to you.' : 'No tasks found. Create your first task.' }}</p>
      </div>

      <div class="tasks-list" *ngIf="!loading && !error && tasks.length > 0">
        <div class="task-row" *ngFor="let t of tasks" [class.completed]="t.status === 'COMPLETED'" [class.cancelled]="t.status === 'CANCELLED'">
          <div class="task-info">
            <strong>{{ t.title }}</strong>
            <small *ngIf="t.description">{{ t.description }}</small>
          </div>
          <div class="task-meta">
            <span class="priority-badge" [class.high]="t.priority === 'HIGH'" [class.medium]="t.priority === 'MEDIUM'" [class.low]="t.priority === 'LOW'">
              {{ t.priority || 'LOW' }}
            </span>
            <span class="status-badge" [class.badge-open]="t.status === 'OPEN'" [class.badge-in_progress]="t.status === 'IN_PROGRESS'" [class.badge-completed]="t.status === 'COMPLETED'" [class.badge-cancelled]="t.status === 'CANCELLED'">
              {{ t.status?.replace('_', ' ') || 'OPEN' }}
            </span>
            <span class="due-date" [class.overdue]="isOverdue(t.dueDate)">{{ t.dueDate ? (t.dueDate | date:'MMM dd, yyyy') : 'No due date' }}</span>
            <span class="assigned-to">{{ t.assignedTo || 'Unassigned' }}</span>
          </div>
          <div class="task-actions">
            <button *ngIf="t.status !== 'COMPLETED' && t.status !== 'CANCELLED'" class="btn-complete" (click)="doComplete(t)" title="Mark complete">&#10003;</button>
            <button (click)="edit(t)">Edit</button>
            <button class="btn-danger" (click)="confirmDelete(t)">Delete</button>
          </div>
        </div>
      </div>

      <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>{{ editingId ? 'Edit Task' : 'Add Task' }}</h2>
            <button class="close-btn" (click)="closeForm()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="form-group">
              <label>Title</label>
              <input [(ngModel)]="form.title" placeholder="Task title" required>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="form.description" placeholder="Task description"></textarea>
            </div>
            <div class="form-group">
              <label>Due Date</label>
              <input [(ngModel)]="form.dueDate" type="date">
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select [(ngModel)]="form.priority">
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>
            <div class="form-group">
              <label>Assigned To</label>
              <input [(ngModel)]="form.assignedTo" placeholder="Staff name or ID">
            </div>
            <div class="drawer-actions">
              <button (click)="closeForm()">Cancel</button>
              <button class="btn-primary" (click)="save()">{{ editingId ? 'Update' : 'Save Task' }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-overlay drawer-centered" *ngIf="showDeleteConfirm" (click)="showDeleteConfirm = false">
        <div class="confirm-panel" (click)="$event.stopPropagation()">
          <h3>Delete Task</h3>
          <p>Are you sure you want to delete <strong>{{ deletingTask?.title }}</strong>? This action cannot be undone.</p>
          <div class="confirm-actions">
            <button (click)="showDeleteConfirm = false">Cancel</button>
            <button class="btn-danger" (click)="doDelete()">Delete</button>
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
    .tabs{display:flex;gap:4px;background:#f3f4f6;border-radius:16px;padding:4px;width:fit-content}
    .tabs button{border:0;border-radius:12px;padding:10px 20px;font-weight:700;cursor:pointer;background:transparent;transition:all .2s}
    .tabs button.active{background:white;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .toolbar{display:flex;gap:12px;flex-wrap:wrap}
    .toolbar input{flex:1;min-width:180px;padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .toolbar select{padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:white}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .tasks-list{display:grid;gap:8px}
    .task-row{display:flex;align-items:center;gap:16px;background:white;border:1px solid #e5e7eb;border-radius:18px;padding:16px 20px;border-left:4px solid #e5e7eb;transition:box-shadow .2s}
    .task-row:hover{box-shadow:0 8px 25px rgba(15,23,42,.08)}
    .task-row.completed{opacity:.65}.task-row.cancelled{opacity:.5}
    .task-info{flex:2}
    .task-info strong{display:block;font-size:16px}
    .task-info small{display:block;font-size:12px;color:#6b7280;margin-top:4px}
    .task-meta{flex:1;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .priority-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase}
    .priority-badge.high{background:#fef2f2;color:#dc2626}
    .priority-badge.medium{background:#fffbeb;color:#d97706}
    .priority-badge.low{background:#f3f4f6;color:#6b7280}
    .status-badge{font-size:11px;padding:3px 10px;border-radius:20px;font-weight:700}
    .badge-open{background:#f3f4f6;color:#374151}
    .badge-in_progress{background:#dbeafe;color:#1d4ed8}
    .badge-completed{background:#f0fdf4;color:#16a34a}
    .badge-cancelled{background:#fef2f2;color:#dc2626}
    .due-date{font-size:12px;color:#6b7280}
    .due-date.overdue{color:#dc2626;font-weight:700}
    .assigned-to{font-size:12px;color:#6b7280;background:#f3f4f6;border-radius:8px;padding:2px 10px}
    .task-actions{display:flex;gap:6px}
    .task-actions button{border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;background:white;font-size:12px;white-space:nowrap}
    .btn-complete{border-color:#16a34a;color:#16a34a;background:#f0fdf4!important}
    .btn-danger{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white;z-index:1}
    .drawer-header h2{margin:0;font-size:20px}
    .close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280;padding:0;line-height:1}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group select,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-group textarea{min-height:100px}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px}
    .btn-primary{background:#0b0b0b;color:white}
    .confirm-panel{background:white;border-radius:24px;padding:32px;width:min(420px,90%);animation:fadeIn .2s ease}
    @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    .confirm-panel h3{margin:0 0 12px}.confirm-panel p{color:#6b7280;margin:0 0 24px;line-height:1.5}
    .confirm-actions{display:flex;gap:10px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px}
    @media(max-width:900px){.task-row{flex-direction:column;align-items:stretch;gap:10px}.task-meta{flex-wrap:wrap}.drawer-panel{width:100%}.toolbar{flex-direction:column}}
    @media(max-width:600px){.head{flex-direction:column;align-items:flex-start;gap:12px}.tabs{width:100%}.tabs button{flex:1}}
  `]
})
export class TasksComponent {
  private api = inject(TasksService);

  tasks: any[] = [];
  view: 'all' | 'mine' | 'overdue' = 'all';
  search = '';
  statusFilter = '';
  priorityFilter = '';
  loading = true;
  error = '';

  showForm = false;
  editingId = '';
  form: any = { title: '', description: '', dueDate: '', priority: 'MEDIUM', assignedTo: '' };

  showDeleteConfirm = false;
  deletingTask: any = null;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    const params: any = {};
    if (this.search) params.search = this.search;
    if (this.statusFilter) params.status = this.statusFilter;
    if (this.priorityFilter) params.priority = this.priorityFilter;

    let obs;
    if (this.view === 'mine') {
      obs = this.api.getMyTasks();
    } else if (this.view === 'overdue') {
      obs = this.api.getOverdue();
    } else {
      obs = this.api.getAll(params);
    }
    obs.subscribe({
      next: (d) => { this.tasks = d; this.loading = false; },
      error: () => { this.error = 'Tasks data unavailable.'; this.loading = false; },
    });
  }

  switchView(v: 'all' | 'mine' | 'overdue') {
    this.view = v;
    this.load();
  }

  isOverdue(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  openForm() {
    this.editingId = '';
    this.form = { title: '', description: '', dueDate: '', priority: 'MEDIUM', assignedTo: '' };
    this.showForm = true;
  }

  closeForm() { this.showForm = false; }

  edit(t: any) {
    this.editingId = t.id;
    this.form = { title: t.title, description: t.description, dueDate: t.dueDate ? t.dueDate.substring(0, 10) : '', priority: t.priority || 'MEDIUM', assignedTo: t.assignedTo || '' };
    this.showForm = true;
  }

  save() {
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.load(); } });
  }

  doComplete(t: any) {
    this.api.complete(t.id).subscribe({ next: () => this.load() });
  }

  confirmDelete(t: any) {
    this.deletingTask = t;
    this.showDeleteConfirm = true;
  }

  doDelete() {
    if (!this.deletingTask) return;
    this.api.remove(this.deletingTask.id).subscribe({ next: () => { this.showDeleteConfirm = false; this.deletingTask = null; this.load(); } });
  }
}
