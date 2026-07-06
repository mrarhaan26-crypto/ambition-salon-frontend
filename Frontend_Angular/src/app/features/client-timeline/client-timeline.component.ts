import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ClientTimelineService } from './client-timeline.service';
import { ClientsService } from '../clients/clients.service';

@Component({
  selector: 'app-client-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Client Timeline</h1>
          <p>View complete client activity and notes.</p>
        </div>
      </div>

      <div class="client-select" *ngIf="!clientFromRoute">
        <label>Select Client</label>
        <select [(ngModel)]="selectedClientId" (change)="onClientChange()">
          <option value="">-- Choose a client --</option>
          <option *ngFor="let c of clients" [value]="c.id">{{ c.fullName }}</option>
        </select>
      </div>

      <div class="client-context" *ngIf="clientFromRoute">
        <div class="cc-avatar">{{ (clientName || '?').charAt(0).toUpperCase() }}</div>
        <div class="cc-info">
          <strong>{{ clientName }}</strong>
          <span class="cc-contact" *ngIf="clientPhone">{{ clientPhone }}</span>
          <span class="cc-contact" *ngIf="clientEmail">{{ clientEmail }}</span>
        </div>
        <a [routerLink]="'/app/clients'" class="cc-back">Back to Clients</a>
        <a [routerLink]="'/app/bookings'" [queryParams]="{clientId: selectedClientId}" class="cc-book-btn">+ Book</a>
      </div>

      <ng-container *ngIf="!noClientSelected; else selectPrompt">
        <div class="notes-panel">
          <h2>Notes</h2>
          <div class="note-form">
            <textarea [(ngModel)]="newNote" placeholder="Add a note about this client..." rows="3" [disabled]="noteBusy"></textarea>
            <button (click)="addNote()" [disabled]="!newNote.trim() || noteBusy">{{ noteBusy ? 'Saving...' : 'Add Note' }}</button>
          </div>
          <div class="note-error" *ngIf="noteError">{{ noteError }}</div>
          <div class="notes-loading" *ngIf="notesLoading"><div class="mini-spinner"></div><span>Loading notes...</span></div>
          <div class="notes-list" *ngIf="!notesLoading && notes.length > 0">
            <div class="note" *ngFor="let n of notes">
              <p>{{ n.content }}</p>
              <span class="note-date">{{ n.createdAt | date:'MMM dd, yyyy h:mm a' }}</span>
              <button class="note-del" (click)="deleteNote(n)" [disabled]="noteBusy">&times;</button>
            </div>
          </div>
          <div class="empty" *ngIf="!notesLoading && notes.length === 0"><p>No notes yet.</p></div>
        </div>

        <div class="timeline-panel">
          <h2>Activity Timeline</h2>
          <div class="tl-loading" *ngIf="tlLoading"><div class="mini-spinner"></div><span>Loading timeline...</span></div>
          <div class="tl-error" *ngIf="tlError">
            <span>{{ tlError }}</span>
            <button (click)="loadTimeline()">Retry</button>
          </div>
          <div class="empty" *ngIf="!tlLoading && !tlError && (!timelineData?.timeline || timelineData.timeline.length === 0)">
            <p>No activity recorded for this client.</p>
          </div>
          <div class="timeline" *ngIf="!tlLoading && !tlError && timelineData?.timeline?.length > 0">
            <div class="entry" *ngFor="let t of timelineData.timeline">
              <div class="entry-icon" [class]="'icon-'+t.type">
                {{ t.type === 'booking' ? 'B' : t.type === 'sale' ? 'S' : t.type === 'note' ? 'N' : t.type === 'form' ? 'F' : t.type === 'wallet' ? 'W' : 'L' }}
              </div>
              <div class="entry-body">
                <strong>{{ t.type | titlecase }}</strong>
                <span class="entry-date">{{ t.date | date:'MMM dd, yyyy h:mm a' }}</span>
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

      <ng-template #selectPrompt>
        <div class="empty select-empty">
          <p>Select a client to view their timeline and notes.</p>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    .head p{color:#6b7280;margin:6px 0 0}
    h2{font-size:20px;margin:0 0 16px}
    .client-select{display:flex;gap:12px;align-items:center}
    .client-select label{font-weight:700;font-size:14px}
    .client-select select{flex:1;padding:14px;border:1px solid #e5e7eb;border-radius:14px;max-width:400px}
    .client-context{display:flex;align-items:center;gap:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:14px 18px;flex-wrap:wrap}
    .cc-avatar{width:40px;height:40px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0}
    .cc-info{flex:1;min-width:120px}
    .cc-info strong{display:block;font-size:15px}
    .cc-contact{font-size:12px;color:#6b7280;display:block}
    .cc-back,.cc-book-btn{border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;text-decoration:none;transition:all .2s;cursor:pointer}
    .cc-back{color:#374151;background:white}.cc-back:hover{background:#f3f4f6}
    .cc-book-btn{color:white;background:#0b0b0b;border-color:#0b0b0b}.cc-book-btn:hover{opacity:.85}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .select-empty{padding:48px}
    .notes-panel,.timeline-panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .note-form{display:flex;gap:12px;margin-bottom:8px}
    .note-form textarea{flex:1;padding:14px;border:1px solid #e5e7eb;border-radius:14px;font-family:inherit;resize:vertical;min-height:60px;transition:border-color .2s}
    .note-form textarea:focus{border-color:#0b0b0b;outline:none}
    .note-form textarea:disabled{background:#f9fafb}
    .note-form button{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white;align-self:flex-end;transition:opacity .2s;white-space:nowrap}
    .note-form button:disabled{opacity:.4;cursor:not-allowed}
    .note-form button:hover:not(:disabled){opacity:.85}
    .note-error{background:#fef2f2;color:#991b1b;padding:8px 12px;border-radius:10px;font-size:12px;margin-bottom:8px;text-align:center}
    .notes-loading,.tl-loading{display:flex;align-items:center;gap:10px;padding:16px;color:#6b7280;font-size:13px;justify-content:center}
    .mini-spinner{width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .tl-error{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;text-align:center;font-size:13px;color:#991b1b}
    .tl-error button{margin-top:8px;background:#0b0b0b;color:white;border:0;border-radius:8px;padding:6px 14px;font-weight:700;cursor:pointer;font-size:12px}
    .notes-list{display:grid;gap:6px}
    .note{display:flex;gap:12px;align-items:start;padding:10px 14px;background:#f8fafc;border-radius:12px}
    .note p{flex:1;margin:0;font-size:14px;line-height:1.4}
    .note-date{font-size:11px;color:#6b7280;white-space:nowrap;margin-top:2px}
    .note-del{border:0;background:#fee2e2;color:#991b1b;border-radius:6px;width:26px;height:26px;font-weight:700;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;transition:opacity .2s}
    .note-del:hover:not(:disabled){opacity:.7}
    .note-del:disabled{opacity:.3;cursor:default}
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
  private clientsApi = inject(ClientsService);
  private route = inject(ActivatedRoute);

  clients: any[] = [];
  selectedClientId = '';
  clientName = '';
  clientPhone = '';
  clientEmail = '';
  clientFromRoute = false;
  timelineData: any = null;
  notes: any[] = [];
  loading = false;
  error = '';
  newNote = '';
  noteBusy = false;
  noteError = '';
  notesLoading = false;
  tlLoading = false;
  tlError = '';

  get noClientSelected(): boolean {
    return !this.selectedClientId;
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const clientId = params['clientId'];
      if (clientId) {
        this.clientFromRoute = true;
        this.selectedClientId = clientId;
        this.clientsApi.getClient(clientId).subscribe({
          next: (client) => {
            this.clientName = client.fullName;
            this.clientPhone = client.phone || '';
            this.clientEmail = client.email || '';
          },
          error: () => { this.clientName = 'Client'; },
        });
        this.loadTimeline();
      }
    });

    this.api.getClients().subscribe({ next: (d) => this.clients = d });
  }

  onClientChange() {
    this.loadTimeline();
  }

  loadTimeline() {
    if (!this.selectedClientId) return;
    this.tlLoading = true; this.tlError = '';
    this.api.getTimeline(this.selectedClientId).subscribe({
      next: (d) => { this.timelineData = d; this.tlLoading = false; },
      error: (e) => {
        this.tlLoading = false;
        this.tlError = e.status === 401 ? 'Session expired. Please log in again.' : 'Failed to load timeline.';
      },
    });
    this.notesLoading = true;
    this.api.getClientNotes(this.selectedClientId).subscribe({
      next: (d) => { this.notes = d || []; this.notesLoading = false; },
      error: () => { this.notes = []; this.notesLoading = false; },
    });
  }

  addNote() {
    if (!this.newNote.trim() || this.noteBusy) return;
    this.noteBusy = true; this.noteError = '';
    this.api.createNote(this.selectedClientId, { content: this.newNote }).subscribe({
      next: () => {
        this.newNote = ''; this.noteBusy = false;
        this.notesLoading = true;
        this.api.getClientNotes(this.selectedClientId).subscribe({
          next: (d) => { this.notes = d || []; this.notesLoading = false; },
          error: () => { this.notesLoading = false; },
        });
        this.loadTimeline();
      },
      error: (e) => { this.noteBusy = false; this.noteError = e.error?.message || 'Failed to save note.'; },
    });
  }

  deleteNote(n: any) {
    if (!confirm('Delete this note?')) return;
    this.noteBusy = true; this.noteError = '';
    this.api.removeNote(this.selectedClientId, n.id).subscribe({
      next: () => {
        this.noteBusy = false;
        this.notesLoading = true;
        this.api.getClientNotes(this.selectedClientId).subscribe({
          next: (d) => { this.notes = d || []; this.notesLoading = false; },
          error: () => { this.notesLoading = false; },
        });
      },
      error: (e) => { this.noteBusy = false; this.noteError = e.error?.message || 'Failed to delete note.'; },
    });
  }
}
