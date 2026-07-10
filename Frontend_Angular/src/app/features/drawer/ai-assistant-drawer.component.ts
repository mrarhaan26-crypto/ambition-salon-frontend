import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-assistant-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-overlay" *ngIf="visible" (click)="close.emit()"></div>
    <div class="ai-drawer" *ngIf="visible" [class.ai-open]="visible">
      <div class="ai-header">
        <h3>AI Assistant</h3>
        <button class="ai-close" (click)="close.emit()">&times;</button>
      </div>
      <div class="ai-body">
        <div class="ai-welcome">
          <span class="ai-icon">&#129302;</span>
          <p>How can I help you today?</p>
        </div>
        <div class="ai-suggestions">
          <button class="ai-chip" (click)="prompt = 'Show today schedule'; ask()">Show today's schedule</button>
          <button class="ai-chip" (click)="prompt = 'Find open slot for haircut'; ask()">Find open slot</button>
          <button class="ai-chip" (click)="prompt = 'Suggest upsell for VIP client'; ask()">Suggest upsell</button>
          <button class="ai-chip" (click)="prompt = 'Optimize staff schedule'; ask()">Optimize schedule</button>
        </div>
        <div class="ai-conversation" *ngIf="conversation.length > 0">
          <div class="ai-msg" *ngFor="let msg of conversation" [class.ai-user]="msg.role === 'user'" [class.ai-bot]="msg.role === 'assistant'">
            {{ msg.text }}
          </div>
        </div>
      </div>
      <div class="ai-footer">
        <input class="ai-input" [(ngModel)]="prompt" (keyup.enter)="ask()" placeholder="Ask the AI assistant..." />
        <button class="ai-send" (click)="ask()" [disabled]="!prompt.trim()">Send</button>
      </div>
    </div>
  `,
  styles: [`
    .ai-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:1100;animation:ai-fade .2s}
    .ai-drawer{position:fixed;top:0;right:0;bottom:0;width:400px;max-width:100vw;background:white;z-index:1110;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.12);transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1)}
    .ai-drawer.ai-open{transform:translateX(0)}
    .ai-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb;flex-shrink:0}
    .ai-header h3{margin:0;font-size:16px;font-weight:700}
    .ai-close{background:none;border:0;font-size:24px;color:#6b7280;cursor:pointer;line-height:1;padding:4px}
    .ai-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
    .ai-welcome{text-align:center;padding:20px 0}
    .ai-icon{font-size:48px;display:block;margin-bottom:8px}
    .ai-welcome p{color:#6b7280;margin:0}
    .ai-suggestions{display:flex;flex-wrap:wrap;gap:8px}
    .ai-chip{padding:8px 14px;border:1px solid #e5e7eb;border-radius:20px;background:white;font-size:13px;color:#374151;cursor:pointer;transition:all .15s}
    .ai-chip:hover{border-color:#0b0b0b;background:#f9fafb}
    .ai-conversation{display:flex;flex-direction:column;gap:8px}
    .ai-msg{padding:10px 14px;border-radius:14px;font-size:14px;max-width:85%}
    .ai-bot{background:#f3f4f6;color:#111;align-self:flex-start}
    .ai-user{background:#0b0b0b;color:white;align-self:flex-end}
    .ai-footer{display:flex;gap:8px;padding:12px 20px;border-top:1px solid #e5e7eb;flex-shrink:0}
    .ai-input{flex:1;padding:10px 14px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;transition:border-color .15s}
    .ai-input:focus{border-color:#0b0b0b}
    .ai-send{padding:10px 18px;background:#0b0b0b;color:white;border:0;border-radius:12px;font-size:14px;cursor:pointer;white-space:nowrap}
    .ai-send:disabled{opacity:.5;cursor:default}
    @media(max-width:768px){.ai-drawer{width:100vw}}
    @keyframes ai-fade{from{opacity:0}to{opacity:1}}
  `]
})
export class AiAssistantDrawerComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();

  prompt = '';
  conversation: { role: 'user' | 'assistant'; text: string }[] = [];

  ask(): void {
    const text = this.prompt.trim();
    if (!text) return;
    this.conversation.push({ role: 'user', text });
    this.conversation.push({ role: 'assistant', text: `I'll help with "${text}". This is a placeholder response.` });
    this.prompt = '';
  }
}