import { CommonModule } from '@angular/common';
import { Component, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from './chat.service';
import { ChatConversation, ChatMessage } from './chat.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Chat</h1><p>Internal staff messaging.</p></div></div>

      <div class="chat-layout">
        <div class="conversations-panel">
          <div class="conv-header">Conversations</div>
          <div class="loading-sm" *ngIf="convLoading"><div class="spinner"></div></div>
          <div class="conv-list" *ngIf="!convLoading">
            <div class="conv-item" *ngFor="let c of conversations" [class.active]="activeConversation?.id === c.id" (click)="selectConversation(c)">
              <div class="conv-name">
                <strong>{{ conversationName(c) }}</strong>
                <span class="unread-badge" *ngIf="c.unreadCount > 0">{{ c.unreadCount }}</span>
              </div>
              <div class="conv-last">
                <small>{{ c.lastSenderName }}: {{ c.lastMessage }}</small>
                <small class="conv-time">{{ c.lastMessageAt | date:'MMM dd, h:mm a' }}</small>
              </div>
            </div>
            <div class="empty-sm" *ngIf="conversations.length===0"><p>No conversations yet.</p></div>
          </div>
        </div>

        <div class="messages-panel">
          <ng-container *ngIf="activeConversation; else noConv">
            <div class="msg-header">
              <strong>{{ conversationName(activeConversation) }}</strong>
            </div>
            <div class="msg-list" #msgContainer>
              <div class="loading-sm" *ngIf="msgLoading"><div class="spinner"></div></div>
              <div class="empty-sm" *ngIf="!msgLoading && messages.length===0"><p>No messages yet.</p></div>
              <div class="msg-bubble" *ngFor="let m of messages" [class.own]="m.senderId === currentUserId">
                <div class="msg-sender">{{ m.senderName }}</div>
                <div class="msg-text">{{ m.message }}</div>
                <div class="msg-time">{{ m.createdAt | date:'h:mm a' }}</div>
              </div>
            </div>
            <div class="msg-input-area">
              <input [(ngModel)]="newMessage" (keyup.enter)="sendMessage()" placeholder="Type a message..." class="msg-input">
              <button (click)="sendMessage()" [disabled]="!newMessage.trim()" class="send-btn">Send</button>
            </div>
          </ng-container>
          <ng-template #noConv>
            <div class="no-conv"><p>Select a conversation to start chatting.</p></div>
          </ng-template>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px;height:100%}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .chat-layout{display:grid;grid-template-columns:320px 1fr;gap:0;background:white;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;flex:1;min-height:500px}
    .conversations-panel{border-right:1px solid #e5e7eb;display:grid;grid-template-rows:auto 1fr;overflow:hidden}
    .conv-header{padding:18px 20px;font-weight:800;font-size:15px;border-bottom:1px solid #e5e7eb;background:#fafafa}
    .loading-sm{padding:24px;display:flex;justify-content:center}
    .spinner{width:20px;height:20px;border:2px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    
    .conv-list{overflow-y:auto}
    .conv-item{padding:14px 20px;border-bottom:1px solid #f3f4f6;cursor:pointer;display:grid;gap:4px}
    .conv-item:hover{background:#f8fafc}
    .conv-item.active{background:#f0f0f0}
    .conv-name{display:flex;justify-content:space-between;align-items:center}
    .conv-name strong{font-size:13px}
    .unread-badge{background:#0b0b0b;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;min-width:18px;text-align:center}
    .conv-last{display:grid;gap:2px}
    .conv-last small{font-size:11px;color:#6b7280;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
    .conv-time{font-size:10px;color:#9ca3af}
    .messages-panel{display:grid;grid-template-rows:auto 1fr auto;overflow:hidden}
    .msg-header{padding:18px 24px;font-weight:800;font-size:15px;border-bottom:1px solid #e5e7eb}
    .msg-list{padding:20px 24px;overflow-y:auto;display:grid;gap:12px;align-content:end}
    .msg-bubble{max-width:70%;padding:12px 16px;border-radius:16px;background:#f3f4f6;display:grid;gap:4px}
    .msg-bubble.own{margin-left:auto;background:#0b0b0b;color:white}
    .msg-sender{font-size:11px;font-weight:700;color:#6b7280}
    .msg-bubble.own .msg-sender{color:#9ca3af}
    .msg-text{font-size:14px;line-height:1.4}
    .msg-time{font-size:10px;color:#9ca3af;text-align:right}
    .msg-input-area{display:flex;gap:8px;padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa}
    .msg-input{flex:1;padding:14px 18px;border:1px solid #e5e7eb;border-radius:14px;font-size:14px}
    .send-btn{border:0;border-radius:14px;padding:14px 24px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .send-btn:disabled{opacity:.4;cursor:default}
    .no-conv{display:flex;align-items:center;justify-content:center;color:#6b7280}
    .empty-sm{padding:24px;text-align:center;color:#6b7280}
    @media(max-width:900px){.chat-layout{grid-template-columns:1fr}}
  `]
})
export class ChatComponent implements AfterViewChecked {
  private api = inject(ChatService);
  @ViewChild('msgContainer') private msgContainer!: ElementRef;

  readonly currentUserId = 'current'; // would be from auth

  conversations: ChatConversation[] = [];
  convLoading = true;
  activeConversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];
  msgLoading = false;
  newMessage = '';

  ngOnInit() { this.loadConversations(); }

  conversationName(c: ChatConversation): string {
    return c.name || c.participants.map(p => p.name).join(', ');
  }

  loadConversations() {
    this.convLoading = true;
    this.api.getConversations().subscribe({
      next: d => { this.conversations = d; this.convLoading = false; },
      error: () => { this.convLoading = false; },
    });
  }

  selectConversation(c: ChatConversation) {
    this.activeConversation = c;
    this.msgLoading = true;
    this.api.getMessages(c.id).subscribe({
      next: d => { this.messages = d; this.msgLoading = false; },
      error: () => { this.msgLoading = false; },
    });
    if (c.unreadCount > 0) {
      this.api.markRead(c.id).subscribe(() => { c.unreadCount = 0; });
    }
  }

  sendMessage() {
    const text = this.newMessage.trim();
    if (!text || !this.activeConversation) return;
    this.api.sendMessage(this.activeConversation.id, text).subscribe({
      next: m => {
        this.messages.push(m);
        this.newMessage = '';
      },
    });
  }

  ngAfterViewChecked() {
    if (this.msgContainer) {
      try { this.msgContainer.nativeElement.scrollTop = this.msgContainer.nativeElement.scrollHeight; } catch {}
    }
  }
}
