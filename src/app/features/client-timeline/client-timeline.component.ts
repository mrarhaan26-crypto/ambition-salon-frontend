import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientTimelineService } from './client-timeline.service';

@Component({
  selector: 'app-client-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Client Timeline</h1>
          <p>View complete client activity and notes.</p>
        </div>
      </div>

      <div class="client-select">
        <label>Select Client</label>
        <select [(ngModel)]="selectedClientId" (change)="loadTimeline()">
          <option value="">-- Choose a client --</option>
          <option *ngFor="let c of clients" [value]="c.id">{{ c.fullName }}</option>
        </select>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadTimeline()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error && timelineData">
        <div class="notes-panel">
          <h2>Notes</h2>
          <div class="note-form">
            <textarea [(ngModel)]="newNote" placeholder="Add a note..." rows="3"></textarea>
            <button (click)="addNote()">Add Note</button>
          </div>
          <div class="notes-list" *ngIf="notes.length > 0">
            <div class="note" *ngFor="let n of notes">
              <p>{{ n.content }}</p>
              <span class="note-date">{{ n.createdAt | date:'MMM dd, yyyy HH:mm' }}</span>
              <button class="note-del" (click)="deleteNote(n)">x</button>
            </div>
          </div>
          <div class="empty" *ngIf="notes.length === 0"><p>No notes yet.</p></div>
        </div>

        <div class="timeline-panel">
          <h2>Activity Timeline</h2>
          <div class="empty" *ngIf="timelineData.timeline?.length === 0"><p>No activity recorded.</p></div>
          <div class="timeline" *ngIf="timelineData.timeline?.length > 0">
            <div class="entry" *ngFor="let t of timelineData.timeline">
              <div class="entry-icon" [class]="'icon-'+t.type">
                {{ t.type === 'booking' ? 'B' : t.type === 'sale' ? 'S' : t.type === 'note' ? 'N' : t.type === 'form' ? 'F' : t.type === 'wallet' ? 'W' : 'L' }}
              </div>
              <div class="entry-body">
                <strong>{{ t.type | titlecase }}</strong>
                <span class="entry-date">{{ t.date | date:'MMM dd, yyyy HH:mm' }}</span>
                <p *ngIf="t.type === 'booking'">{{ t.data.title }} — {{ t.data.status }}</p>
                <p *ngIf="t.type === 'sale'">{{ t.data.totalAmount | currency }} — {{ t.data.status }}</p>
                <p *ngIf="t.type === 'note'">{{ t.data.content }}</p>
                <p *ngIf="t.type === 'form'">{{ t.data.form?.name }}</p>
                <p *ngIf="t.type === 'wallet'">{{ t.data.type }} — {{ t.data.amount | currency }}</p>
                <p *ngIf="t.type === 'loyalty'">{{ t.data.type }} — {{ t.data.points }} pts</p>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    h2{font-size:20px;margin:0 0 16px}
    .client-select{display:flex;gap:12px;align-items:center}
    .client-select label{font-weight:700;font-size:14px}
    .client-select select{flex:1;padding:14px;border:1px solid #e5e7eb;border-radius:14px;max-width:400px}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .notes-panel,.timeline-panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .note-form{display:flex;gap:12px;margin-bottom:16px}
    .note-form textarea{flex:1;padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .note-form button{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white;align-self:flex-end}
    .notes-list{display:grid;gap:8px}
    .note{display:flex;gap:12px;align-items:start;padding:12px 14px;background:#f8fafc;border-radius:12px}
    .note p{flex:1;margin:0;font-size:14px}
    .note-date{font-size:11px;color:#6b7280;white-space:nowrap}
    .note-del{border:0;background:#fee2e2;color:#991b1b;border-radius:6px;padding:4px 8px;font-weight:700;cursor:pointer}
    .timeline{display:grid;gap:4px}
    .entry{display:flex;gap:14px;padding:12px;background:#f8fafc;border-radius:12px;align-items:start}
    .entry-icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;flex-shrink:0}
    .icon-booking{background:#dbeafe;color:#1d4ed8}
    .icon-sale{background:#f0fdf4;color:#16a34a}
    .icon-note{background:#fef3c7;color:#a16207}
    .icon-form{background:#e0e7ff;color:#4338ca}
    .icon-wallet{background:#fce7f3;color:#be185d}
    .icon-loyalty{background:#e0f2fe;color:#0284c7}
    .entry-body{flex:1}
    .entry-body strong{display:block;font-size:14px}
    .entry-date{font-size:11px;color:#6b7280}
    .entry-body p{margin:4px 0 0;font-size:13px;color:#374151}
  `]
})
export class ClientTimelineComponent {
  private api = inject(ClientTimelineService);
  clients: any[] = [];
  selectedClientId = '';
  timelineData: any = null;
  notes: any[] = [];
  loading = false;
  error = '';
  newNote = '';

  ngOnInit() {
    this.api.getClients().subscribe({ next: (d) => this.clients = d });
  }

  loadTimeline() {
    if (!this.selectedClientId) return;
    this.loading = true; this.error = '';
    this.api.getTimeline(this.selectedClientId).subscribe({
      next: (d) => { this.timelineData = d; this.loading = false; },
      error: () => { this.error = 'Failed to load timeline.'; this.loading = false; },
    });
    this.api.getClientNotes(this.selectedClientId).subscribe({ next: (d) => this.notes = d });
  }

  addNote() {
    if (!this.newNote.trim()) return;
    this.api.createNote(this.selectedClientId, { content: this.newNote }).subscribe({
      next: () => { this.newNote = ''; this.api.getClientNotes(this.selectedClientId).subscribe({ next: (d) => this.notes = d }); this.loadTimeline(); },
    });
  }

  deleteNote(n: any) {
    if (!confirm('Delete this note?')) return;
    this.api.removeNote(this.selectedClientId, n.id).subscribe({ next: () => this.api.getClientNotes(this.selectedClientId).subscribe({ next: (d) => this.notes = d }) });
  }
}
