import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageCenterService } from './message-center.service';

@Component({
  selector: 'app-message-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Message Center</h1>
          <p>Conversations and messages.</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading conversations...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card"><span>Total Conversations</span><strong>{{ conversations.length }}</strong></div>
          <div class="kpi-card"><span>Unread</span><strong class="amber">{{ unreadCount }}</strong></div>
        </div>

        <div class="panel">
          <h2>Conversations</h2>
          <div class="empty" *ngIf="conversations.length === 0"><p>No conversations yet.</p></div>
          <div class="conv-list" *ngIf="conversations.length > 0">
            <div class="conv-item" *ngFor="let c of conversations" (click)="selectConversation(c)">
              <div class="conv-main">
                <div class="conv-subject">{{ c.subject }}</div>
                <div class="conv-meta">
                  <span class="badge" [class]="'ch-' + (c.channel || 'other').toLowerCase()">{{ c.channel }}</span>
                  <span class="conv-date">{{ c.lastMessageAt || c.createdAt | date:'MMM dd, h:mm a' }}</span>
                </div>
              </div>
              <div class="conv-indicator" *ngIf="c.unreadCount > 0">{{ c.unreadCount }}</div>
            </div>
          </div>
        </div>

        <div class="drawer" *ngIf="selectedConv">
          <div class="drawer-panel wide">
            <div class="drawer-head">
              <h2>{{ selectedConv.subject }}</h2>
              <button (click)="selectedConv = null">&times;</button>
            </div>
            <div class="messages">
              <div class="empty" *ngIf="messages.length === 0"><p>No messages in this conversation.</p></div>
              <div class="msg" *ngFor="let m of messages" [class.own]="m.isFromUser">
                <div class="msg-sender">{{ m.sender || 'User' }}</div>
                <div class="msg-body">{{ m.content }}</div>
                <div class="msg-time">{{ m.createdAt | date:'MMM dd, h:mm a' }}</div>
              </div>
            </div>
            <div class="send-form">
              <input [(ngModel)]="newMessage" placeholder="Type your message..." (keyup.enter)="sendMsg()">
              <button (click)="sendMsg()" [disabled]="!newMessage.trim()">Send</button>
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
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:24px}
    .green{color:#16a34a}.amber{color:#d97706}.red{color:#dc2626}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .conv-list{display:grid;gap:4px}
    .conv-item{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#f8fafc;border-radius:12px;cursor:pointer;transition:background .15s}
    .conv-item:hover{background:#eff6ff}
    .conv-main{display:grid;gap:4px;flex:1}
    .conv-subject{font-weight:700;font-size:14px}
    .conv-meta{display:flex;gap:12px;align-items:center}
    .badge{font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700}
    .ch-email{background:#dbeafe;color:#1d4ed8}
    .ch-sms{background:#f0fdf4;color:#16a34a}
    .ch-whatsapp{background:#f0fdf4;color:#16a34a}
    .ch-web{background:#f3f4f6;color:#6b7280}
    .ch-other{background:#f3f4f6;color:#6b7280}
    .conv-date{font-size:11px;color:#6b7280}
    .conv-indicator{background:#dc2626;color:white;font-size:11px;font-weight:800;min-width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:center;align-items:center;z-index:50}
    .drawer-panel{background:white;border-radius:24px;padding:28px;width:min(440px,90%);max-height:90vh;overflow-y:auto;display:grid;gap:16px}
    .drawer-panel.wide{width:min(560px,95%)}
    .drawer-panel h2{margin:0}
    .drawer-head{display:flex;justify-content:space-between;align-items:center}
    .drawer-head button{background:none;border:none;font-size:28px;cursor:pointer;color:#6b7280;line-height:1}
    .messages{display:grid;gap:12px;max-height:50vh;overflow-y:auto;padding:4px 0}
    .msg{background:#f8fafc;border-radius:14px;padding:12px 16px;max-width:85%}
    .msg.own{background:#eff6ff;margin-left:auto}
    .msg-sender{font-weight:700;font-size:12px;margin-bottom:4px;color:#374151}
    .msg-body{font-size:14px;line-height:1.5;white-space:pre-wrap}
    .msg-time{font-size:10px;color:#6b7280;margin-top:6px}
    .send-form{display:flex;gap:10px;border-top:1px solid #e5e7eb;padding-top:16px}
    .send-form input{flex:1;padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px}
    .send-form button{border:0;border-radius:12px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .send-form button:disabled{opacity:.5;cursor:not-allowed}
    @media(max-width:1000px){.kpis{grid-template-columns:repeat(2,1fr)}}
  `]
})
export class MessageCenterComponent {
  private api = inject(MessageCenterService);
  conversations: any[] = [];
  loading = true;
  error = '';
  selectedConv: any = null;
  messages: any[] = [];
  newMessage = '';

  get unreadCount() {
    return this.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getConversations().subscribe({ next: (d) => { this.conversations = d; this.loading = false; }, error: () => { this.error = 'Failed to load conversations.'; this.loading = false; } });
  }

  selectConversation(c: any) {
    this.selectedConv = c;
    this.messages = [];
    this.api.getConversation(c.id).subscribe({ next: (d) => { this.messages = d.messages || d; }, error: () => {} });
  }

  sendMsg() {
    if (!this.newMessage.trim() || !this.selectedConv) return;
    const body = { conversationId: this.selectedConv.id, content: this.newMessage };
    this.api.sendMessage(body).subscribe({ next: () => { this.newMessage = ''; this.selectConversation(this.selectedConv); this.loadAll(); } });
  }
}
