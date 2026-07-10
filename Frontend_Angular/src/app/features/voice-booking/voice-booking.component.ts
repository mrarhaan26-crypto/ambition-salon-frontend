import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ChatMessage {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface ParsedIntent {
  intent: string;
  slots: Record<string, string>;
  confidence: number;
}

interface VoiceCommand {
  id: number;
  text: string;
  intent: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'failed';
}

interface QuickCommand {
  label: string;
  icon: string;
  command: string;
}

interface ChannelStatus {
  name: string;
  icon: string;
  status: 'online' | 'offline' | 'busy';
  activeConversations: number;
}

interface PerformanceStat {
  label: string;
  value: string | number;
  change: number;
  icon: string;
}

@Component({
  selector: 'app-voice-booking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div class="head-text">
          <div class="head-icon">&#127908;</div>
          <div>
            <h1>Voice Booking & AI Receptionist</h1>
            <p>Natural language booking through voice, chat, and multi-channel AI.</p>
          </div>
        </div>
        <div class="head-actions">
          <button class="btn-outline" (click)="toggleListening()">
            {{ isListening ? 'Stop Listening' : 'Start Voice' }}
          </button>
          <button class="btn-primary" (click)="clearConversation()">New Session</button>
        </div>
      </div>

      <div class="main-grid">
        <div class="left-col">
          <div class="voice-panel glass-panel">
            <div class="voice-area" [class.listening]="isListening">
              <div class="mic-ring ring-1"></div>
              <div class="mic-ring ring-2"></div>
              <div class="mic-ring ring-3"></div>
              <button class="mic-btn" (click)="toggleListening()" [class.active]="isListening">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
              <div class="voice-status">
                <span class="status-dot" [class.active]="isListening"></span>
                {{ isListening ? 'Listening...' : 'Tap to speak' }}
              </div>
              <div class="voice-wave" *ngIf="isListening">
                <span></span><span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>
            <div class="transcript-area" *ngIf="currentTranscript">
              <div class="transcript-label">Live Transcript</div>
              <div class="transcript-text">{{ currentTranscript }}</div>
            </div>
          </div>

          <div class="chat-panel glass-panel">
            <div class="chat-header">
              <span class="chat-title">AI Conversation</span>
              <span class="chat-count">{{ messages.length }} messages</span>
            </div>
            <div class="chat-messages">
              <div class="empty-chat" *ngIf="messages.length === 0">
                <div class="empty-icon">&#128172;</div>
                <p>Start a voice command or type a message to begin.</p>
              </div>
              <div class="msg" *ngFor="let m of messages" [class.user]="m.sender === 'user'" [class.ai]="m.sender === 'ai'">
                <div class="msg-avatar">{{ m.sender === 'ai' ? '&#129302;' : '&#128100;' }}</div>
                <div class="msg-content">
                  <div class="msg-bubble">{{ m.text }}</div>
                  <div class="msg-time">{{ m.timestamp | date:'h:mm:ss a' }}</div>
                </div>
              </div>
            </div>
            <div class="chat-input-area">
              <input
                [(ngModel)]="typedMessage"
                (keyup.enter)="sendTypedMessage()"
                placeholder="Type a booking command..."
                class="chat-input"
              />
              <button class="send-btn" (click)="sendTypedMessage()" [disabled]="!typedMessage.trim()">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="right-col">
          <div class="intent-panel glass-panel" *ngIf="parsedIntent">
            <div class="panel-header">
              <span class="panel-icon">&#9881;</span>
              <span>Parsed Intent</span>
            </div>
            <div class="intent-card">
              <div class="intent-row">
                <span class="intent-label">Intent</span>
                <span class="intent-value tag">{{ parsedIntent.intent }}</span>
              </div>
              <div class="intent-row">
                <span class="intent-label">Confidence</span>
                <div class="confidence-bar">
                  <div class="confidence-fill" [style.width.%]="parsedIntent.confidence * 100"></div>
                </div>
                <span class="confidence-val">{{ (parsedIntent.confidence * 100) | number:'1.0-0' }}%</span>
              </div>
              <div class="slots-grid" *ngIf="parsedIntent.slots | keyvalue as slots">
                <div class="slot-item" *ngFor="let s of slots">
                  <span class="slot-key">{{ s.key }}</span>
                  <span class="slot-val">{{ s.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="quick-panel glass-panel">
            <div class="panel-header">
              <span class="panel-icon">&#9889;</span>
              <span>Quick Commands</span>
            </div>
            <div class="quick-grid">
              <button class="quick-btn" *ngFor="let qc of quickCommands" (click)="runQuickCommand(qc)">
                <span class="qc-icon">{{ qc.icon }}</span>
                <span class="qc-label">{{ qc.label }}</span>
              </button>
            </div>
          </div>

          <div class="channels-panel glass-panel">
            <div class="panel-header">
              <span class="panel-icon">&#128225;</span>
              <span>AI Receptionist Channels</span>
            </div>
            <div class="channel-list">
              <div class="channel-item" *ngFor="let ch of channels">
                <div class="ch-icon">{{ ch.icon }}</div>
                <div class="ch-info">
                  <span class="ch-name">{{ ch.name }}</span>
                  <span class="ch-active">{{ ch.activeConversations }} active</span>
                </div>
                <span class="ch-status" [class]="'status-' + ch.status">{{ ch.status }}</span>
              </div>
            </div>
          </div>

          <div class="recent-panel glass-panel">
            <div class="panel-header">
              <span class="panel-icon">&#128336;</span>
              <span>Recent Voice Commands</span>
            </div>
            <div class="recent-list">
              <div class="recent-item" *ngFor="let rc of recentCommands">
                <div class="rc-status" [class]="'st-' + rc.status"></div>
                <div class="rc-info">
                  <span class="rc-text">{{ rc.text }}</span>
                  <span class="rc-meta">{{ rc.intent }} &middot; {{ rc.timestamp | date:'h:mm a' }}</span>
                </div>
              </div>
              <div class="empty-recent" *ngIf="recentCommands.length === 0">
                <p>No recent commands.</p>
              </div>
            </div>
          </div>

          <div class="stats-panel glass-panel">
            <div class="panel-header">
              <span class="panel-icon">&#128200;</span>
              <span>AI Performance</span>
            </div>
            <div class="stats-grid">
              <div class="stat-card" *ngFor="let s of performanceStats">
                <div class="stat-icon">{{ s.icon }}</div>
                <div class="stat-val">{{ s.value }}</div>
                <div class="stat-label">{{ s.label }}</div>
                <div class="stat-change" [class.positive]="s.change > 0" [class.negative]="s.change < 0">
                  {{ s.change > 0 ? '+' : '' }}{{ s.change }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .page {
      display: grid;
      gap: 20px;
      height: 100%;
      min-height: 0;
    }

    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      padding: 20px 28px;
      border-radius: 20px;
      position: relative;
      overflow: hidden;
    }

    .head::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .head::after {
      content: '';
      position: absolute;
      bottom: -40%;
      left: 20%;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .head-text {
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 1;
    }

    .head-icon {
      font-size: 36px;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      color: #f0f0ff;
      letter-spacing: -0.5px;
    }

    .head-text p {
      margin: 4px 0 0;
      color: rgba(200, 200, 230, 0.7);
      font-size: 13px;
    }

    .head-actions {
      display: flex;
      gap: 10px;
      z-index: 1;
    }

    .btn-outline {
      padding: 10px 20px;
      border-radius: 12px;
      border: 1px solid rgba(139, 92, 246, 0.4);
      background: transparent;
      color: #c4b5fd;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-outline:hover {
      background: rgba(139, 92, 246, 0.15);
      border-color: #8b5cf6;
      color: #e0d4ff;
    }

    .btn-primary {
      padding: 10px 20px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      color: white;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #7c3aed, #5b21b6);
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
    }

    .main-grid {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 20px;
      flex: 1;
      min-height: 0;
    }

    .glass-panel {
      background: rgba(15, 15, 35, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(139, 92, 246, 0.12);
      border-radius: 18px;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 18px;
      font-weight: 700;
      font-size: 13px;
      color: #c4b5fd;
      border-bottom: 1px solid rgba(139, 92, 246, 0.1);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .panel-icon {
      font-size: 16px;
    }

    .left-col {
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 20px;
      min-height: 0;
    }

    .right-col {
      display: grid;
      gap: 16px;
      overflow-y: auto;
      max-height: calc(100vh - 160px);
    }

    .right-col::-webkit-scrollbar {
      width: 4px;
    }

    .right-col::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.3);
      border-radius: 4px;
    }

    /* ── Voice Panel ── */
    .voice-panel {
      padding: 24px;
    }

    .voice-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 20px 0;
      position: relative;
    }

    .mic-ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid rgba(139, 92, 246, 0.15);
      pointer-events: none;
      transition: all 0.6s ease;
    }

    .ring-1 {
      width: 120px;
      height: 120px;
    }

    .ring-2 {
      width: 160px;
      height: 160px;
    }

    .ring-3 {
      width: 200px;
      height: 200px;
    }

    .voice-area.listening .ring-1 {
      border-color: rgba(139, 92, 246, 0.5);
      animation: pulse-ring 1.5s ease-out infinite;
    }

    .voice-area.listening .ring-2 {
      border-color: rgba(139, 92, 246, 0.3);
      animation: pulse-ring 1.5s ease-out infinite 0.3s;
    }

    .voice-area.listening .ring-3 {
      border-color: rgba(139, 92, 246, 0.15);
      animation: pulse-ring 1.5s ease-out infinite 0.6s;
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.85); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .mic-btn {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      color: #a78bfa;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 1;
      transition: all 0.3s ease;
      box-shadow: 0 4px 30px rgba(139, 92, 246, 0.2);
    }

    .mic-btn:hover {
      background: linear-gradient(135deg, #312e81, #4c1d95);
      transform: scale(1.05);
      box-shadow: 0 6px 40px rgba(139, 92, 246, 0.35);
    }

    .mic-btn.active {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white;
      box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
      animation: mic-glow 1.2s ease-in-out infinite alternate;
    }

    @keyframes mic-glow {
      0% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.4); }
      100% { box-shadow: 0 0 60px rgba(139, 92, 246, 0.7); }
    }

    .voice-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: rgba(200, 200, 230, 0.7);
      font-weight: 500;
      z-index: 1;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4b5563;
      transition: all 0.3s ease;
    }

    .status-dot.active {
      background: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
      animation: dot-blink 0.8s ease-in-out infinite alternate;
    }

    @keyframes dot-blink {
      0% { opacity: 1; }
      100% { opacity: 0.4; }
    }

    .voice-wave {
      display: flex;
      align-items: center;
      gap: 3px;
      height: 30px;
      z-index: 1;
    }

    .voice-wave span {
      width: 3px;
      background: linear-gradient(to top, #8b5cf6, #06b6d4);
      border-radius: 3px;
      animation: wave-bar 0.6s ease-in-out infinite alternate;
    }

    .voice-wave span:nth-child(1) { height: 8px; animation-delay: 0s; }
    .voice-wave span:nth-child(2) { height: 16px; animation-delay: 0.05s; }
    .voice-wave span:nth-child(3) { height: 24px; animation-delay: 0.1s; }
    .voice-wave span:nth-child(4) { height: 18px; animation-delay: 0.15s; }
    .voice-wave span:nth-child(5) { height: 28px; animation-delay: 0.2s; }
    .voice-wave span:nth-child(6) { height: 14px; animation-delay: 0.25s; }
    .voice-wave span:nth-child(7) { height: 22px; animation-delay: 0.3s; }
    .voice-wave span:nth-child(8) { height: 10px; animation-delay: 0.35s; }
    .voice-wave span:nth-child(9) { height: 20px; animation-delay: 0.4s; }
    .voice-wave span:nth-child(10) { height: 12px; animation-delay: 0.45s; }

    @keyframes wave-bar {
      0% { transform: scaleY(0.4); }
      100% { transform: scaleY(1); }
    }

    .transcript-area {
      margin-top: 12px;
      padding: 12px 16px;
      background: rgba(139, 92, 246, 0.06);
      border: 1px solid rgba(139, 92, 246, 0.12);
      border-radius: 12px;
    }

    .transcript-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #7c3aed;
      margin-bottom: 6px;
    }

    .transcript-text {
      font-size: 15px;
      color: #e0d4ff;
      line-height: 1.5;
    }

    /* ── Chat Panel ── */
    .chat-panel {
      display: grid;
      grid-template-rows: auto 1fr auto;
      min-height: 0;
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(139, 92, 246, 0.1);
    }

    .chat-title {
      font-weight: 700;
      font-size: 14px;
      color: #c4b5fd;
    }

    .chat-count {
      font-size: 11px;
      color: rgba(200, 200, 230, 0.5);
    }

    .chat-messages {
      overflow-y: auto;
      padding: 16px;
      display: grid;
      gap: 12px;
      align-content: start;
    }

    .chat-messages::-webkit-scrollbar {
      width: 4px;
    }

    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.2);
      border-radius: 4px;
    }

    .empty-chat {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
      opacity: 0.4;
    }

    .empty-chat p {
      color: rgba(200, 200, 230, 0.4);
      font-size: 13px;
      margin: 0;
    }

    .msg {
      display: flex;
      gap: 10px;
      max-width: 85%;
      animation: msg-in 0.3s ease-out;
    }

    .msg.user {
      align-self: end;
      flex-direction: row-reverse;
    }

    @keyframes msg-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .msg-avatar {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .msg.ai .msg-avatar {
      background: rgba(139, 92, 246, 0.15);
    }

    .msg.user .msg-avatar {
      background: rgba(6, 182, 212, 0.15);
    }

    .msg-content {
      display: grid;
      gap: 4px;
    }

    .msg-bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.5;
    }

    .msg.ai .msg-bubble {
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.15);
      color: #e0d4ff;
      border-top-left-radius: 4px;
    }

    .msg.user .msg-bubble {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(14, 116, 144, 0.2));
      border: 1px solid rgba(6, 182, 212, 0.2);
      color: #cffafe;
      border-top-right-radius: 4px;
    }

    .msg-time {
      font-size: 10px;
      color: rgba(200, 200, 230, 0.3);
    }

    .msg.user .msg-time {
      text-align: right;
    }

    .chat-input-area {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid rgba(139, 92, 246, 0.1);
    }

    .chat-input {
      flex: 1;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid rgba(139, 92, 246, 0.15);
      background: rgba(30, 27, 75, 0.5);
      color: #e0d4ff;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .chat-input::placeholder {
      color: rgba(200, 200, 230, 0.3);
    }

    .chat-input:focus {
      border-color: rgba(139, 92, 246, 0.4);
    }

    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .send-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .send-btn:not(:disabled):hover {
      background: linear-gradient(135deg, #7c3aed, #5b21b6);
      transform: translateY(-1px);
    }

    /* ── Intent Panel ── */
    .intent-card {
      padding: 16px;
      display: grid;
      gap: 12px;
    }

    .intent-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .intent-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(200, 200, 230, 0.5);
      min-width: 80px;
    }

    .intent-value.tag {
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      background: rgba(139, 92, 246, 0.15);
      color: #c4b5fd;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .confidence-bar {
      flex: 1;
      height: 6px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .confidence-fill {
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6, #06b6d4);
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .confidence-val {
      font-size: 13px;
      font-weight: 700;
      color: #06b6d4;
      min-width: 40px;
      text-align: right;
    }

    .slots-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .slot-item {
      display: grid;
      gap: 2px;
      padding: 8px 12px;
      background: rgba(6, 182, 212, 0.06);
      border: 1px solid rgba(6, 182, 212, 0.1);
      border-radius: 10px;
    }

    .slot-key {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(6, 182, 212, 0.6);
    }

    .slot-val {
      font-size: 13px;
      color: #cffafe;
      font-weight: 500;
    }

    /* ── Quick Commands ── */
    .quick-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 14px;
    }

    .quick-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid rgba(139, 92, 246, 0.12);
      background: rgba(30, 27, 75, 0.4);
      color: #c4b5fd;
      cursor: pointer;
      transition: all 0.25s ease;
      text-align: left;
    }

    .quick-btn:hover {
      background: rgba(139, 92, 246, 0.12);
      border-color: rgba(139, 92, 246, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.15);
    }

    .qc-icon {
      font-size: 20px;
    }

    .qc-label {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.3;
    }

    /* ── Channels ── */
    .channel-list {
      padding: 8px;
    }

    .channel-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      transition: background 0.2s;
    }

    .channel-item:hover {
      background: rgba(139, 92, 246, 0.06);
    }

    .ch-icon {
      font-size: 22px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 10px;
    }

    .ch-info {
      flex: 1;
      display: grid;
      gap: 2px;
    }

    .ch-name {
      font-size: 13px;
      font-weight: 600;
      color: #e0d4ff;
    }

    .ch-active {
      font-size: 11px;
      color: rgba(200, 200, 230, 0.4);
    }

    .ch-status {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .status-online {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .status-offline {
      background: rgba(107, 114, 128, 0.15);
      color: #6b7280;
    }

    .status-busy {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    /* ── Recent Commands ── */
    .recent-list {
      padding: 8px;
      max-height: 220px;
      overflow-y: auto;
    }

    .recent-list::-webkit-scrollbar {
      width: 3px;
    }

    .recent-list::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.2);
      border-radius: 3px;
    }

    .recent-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      transition: background 0.2s;
    }

    .recent-item:hover {
      background: rgba(139, 92, 246, 0.06);
    }

    .rc-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }

    .st-success {
      background: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
    }

    .st-pending {
      background: #f59e0b;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
    }

    .st-failed {
      background: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    }

    .rc-info {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .rc-text {
      font-size: 12px;
      color: #e0d4ff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rc-meta {
      font-size: 10px;
      color: rgba(200, 200, 230, 0.35);
    }

    .empty-recent {
      padding: 20px;
      text-align: center;
    }

    .empty-recent p {
      color: rgba(200, 200, 230, 0.3);
      font-size: 12px;
      margin: 0;
    }

    /* ── Performance Stats ── */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 14px;
    }

    .stat-card {
      padding: 14px;
      border-radius: 12px;
      background: rgba(30, 27, 75, 0.3);
      border: 1px solid rgba(139, 92, 246, 0.08);
      display: grid;
      gap: 4px;
      transition: all 0.25s ease;
    }

    .stat-card:hover {
      border-color: rgba(139, 92, 246, 0.2);
      transform: translateY(-1px);
    }

    .stat-icon {
      font-size: 18px;
      margin-bottom: 2px;
    }

    .stat-val {
      font-size: 20px;
      font-weight: 800;
      color: #f0f0ff;
      letter-spacing: -0.5px;
    }

    .stat-label {
      font-size: 11px;
      color: rgba(200, 200, 230, 0.5);
      font-weight: 500;
    }

    .stat-change {
      font-size: 11px;
      font-weight: 700;
    }

    .stat-change.positive {
      color: #22c55e;
    }

    .stat-change.negative {
      color: #ef4444;
    }

    /* ── Scrollbar Global ── */
    .right-col::-webkit-scrollbar,
    .chat-messages::-webkit-scrollbar,
    .recent-list::-webkit-scrollbar {
      width: 4px;
    }

    .right-col::-webkit-scrollbar-thumb,
    .chat-messages::-webkit-scrollbar-thumb,
    .recent-list::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.2);
      border-radius: 4px;
    }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
      .main-grid {
        grid-template-columns: 1fr;
      }

      .right-col {
        max-height: none;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
    }

    @media (max-width: 640px) {
      .head {
        flex-direction: column;
        gap: 14px;
        align-items: flex-start;
      }

      .right-col {
        grid-template-columns: 1fr;
      }

      .quick-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class VoiceBookingComponent {
  private http = inject(HttpClient);

  isListening = false;
  currentTranscript = '';
  typedMessage = '';
  messages: ChatMessage[] = [];
  parsedIntent: ParsedIntent | null = null;
  recentCommands: VoiceCommand[] = [];
  msgIdCounter = 0;
  cmdIdCounter = 0;

  quickCommands: QuickCommand[] = [
    { label: 'Book tomorrow 3pm', icon: '&#128197;', command: 'Book appointment tomorrow at 3pm' },
    { label: 'Cancel booking', icon: '&#10060;', command: 'Cancel my booking' },
    { label: 'Check availability', icon: '&#128269;', command: 'Check availability for tomorrow' },
    { label: 'Send reminder', icon: '&#128276;', command: 'Send appointment reminder' },
  ];

  channels: ChannelStatus[] = [
    { name: 'WhatsApp Bot', icon: '&#128172;', status: 'online', activeConversations: 12 },
    { name: 'Phone IVR', icon: '&#128222;', status: 'online', activeConversations: 3 },
    { name: 'Voice Assistant', icon: '&#127908;', status: 'busy', activeConversations: 1 },
    { name: 'Web Widget', icon: '&#127760;', status: 'online', activeConversations: 8 },
  ];

  performanceStats: PerformanceStat[] = [
    { label: 'Total Commands', value: 1284, change: 12.5, icon: '&#128172;' },
    { label: 'Success Rate', value: '94.2%', change: 2.1, icon: '&#9989;' },
    { label: 'Avg Response', value: '0.8s', change: -15.3, icon: '&#9201;' },
    { label: 'Bookings Made', value: 347, change: 8.7, icon: '&#128197;' },
  ];

  toggleListening(): void {
    this.isListening = !this.isListening;
    if (this.isListening) {
      this.simulateListening();
    }
  }

  simulateListening(): void {
    if (!this.isListening) return;
    const phrases = [
      'Book a haircut for tomorrow at 3pm',
      'Check availability for Saturday',
      'Cancel my 2pm appointment',
      'What services do you offer?',
    ];
    this.currentTranscript = '';
    let idx = 0;
    const interval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(interval);
        if (this.currentTranscript.trim()) {
          this.processVoiceInput(this.currentTranscript);
        }
        return;
      }
      this.currentTranscript = phrases[idx % phrases.length].substring(0, Math.min(this.currentTranscript.length + 1, phrases[idx % phrases.length].length));
      if (this.currentTranscript === phrases[idx % phrases.length]) {
        idx++;
        setTimeout(() => {
          if (this.isListening) {
            this.isListening = false;
            this.processVoiceInput(this.currentTranscript);
          }
        }, 600);
      }
    }, 60);
  }

  processVoiceInput(text: string): void {
    this.addMessage('user', text);
    const intent = this.parseIntent(text);
    this.parsedIntent = intent;
    this.addRecentCommand(text, intent.intent, 'success');

    const aiResponse = this.generateResponse(intent);
    setTimeout(() => {
      this.addMessage('ai', aiResponse);
    }, 500);
  }

  sendTypedMessage(): void {
    const text = this.typedMessage.trim();
    if (!text) return;
    this.typedMessage = '';
    this.processVoiceInput(text);
  }

  runQuickCommand(qc: QuickCommand): void {
    this.processVoiceInput(qc.command);
  }

  parseIntent(text: string): ParsedIntent {
    const lower = text.toLowerCase();
    let intent = 'unknown';
    const slots: Record<string, string> = {};
    let confidence = 0.75;

    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
      intent = 'book_appointment';
      confidence = 0.92;
      if (lower.includes('tomorrow')) slots['date'] = 'Tomorrow';
      if (lower.includes('today')) slots['date'] = 'Today';
      const timeMatch = lower.match(/(\d{1,2})(am|pm|:\d{2})?/);
      if (timeMatch) slots['time'] = timeMatch[0];
      if (lower.includes('haircut')) slots['service'] = 'Haircut';
      if (lower.includes('facial')) slots['service'] = 'Facial';
      if (lower.includes('massage')) slots['service'] = 'Massage';
      if (lower.includes('color') || lower.includes('colour')) slots['service'] = 'Hair Color';
    } else if (lower.includes('cancel')) {
      intent = 'cancel_booking';
      confidence = 0.89;
      if (lower.includes('2pm') || lower.includes('2 pm')) slots['time'] = '2:00 PM';
      if (lower.includes('tomorrow')) slots['date'] = 'Tomorrow';
    } else if (lower.includes('avail') || lower.includes('free') || lower.includes('open')) {
      intent = 'check_availability';
      confidence = 0.85;
      if (lower.includes('tomorrow')) slots['date'] = 'Tomorrow';
      if (lower.includes('saturday')) slots['date'] = 'Saturday';
      if (lower.includes('monday')) slots['date'] = 'Monday';
    } else if (lower.includes('remind')) {
      intent = 'send_reminder';
      confidence = 0.88;
    } else if (lower.includes('service') || lower.includes('offer')) {
      intent = 'list_services';
      confidence = 0.82;
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('rate')) {
      intent = 'check_price';
      confidence = 0.80;
    }

    return { intent, slots, confidence };
  }

  generateResponse(intent: ParsedIntent): string {
    switch (intent.intent) {
      case 'book_appointment': {
        const svc = intent.slots['service'] || 'Haircut';
        const dt = intent.slots['date'] || 'today';
        const tm = intent.slots['time'] || 'the next available slot';
        return `Perfect! I've found an opening for ${svc} on ${dt} at ${tm}. I'll hold this slot for 5 minutes. Would you like me to confirm this booking?`;
      }
      case 'cancel_booking':
        return `I found your booking${intent.slots['time'] ? ' at ' + intent.slots['time'] : ''}${intent.slots['date'] ? ' on ' + intent.slots['date'] : ''}. It has been cancelled. A confirmation will be sent to your phone. Would you like to rebook?`;
      case 'check_availability': {
        const date = intent.slots['date'] || 'today';
        return `Here's the availability for ${date}: We have openings at 10:00 AM, 1:30 PM, 3:00 PM, and 5:45 PM. The 3:00 PM slot is most popular. Would you like to book one?`;
      }
      case 'send_reminder':
        return `Reminder sent successfully to all clients with upcoming appointments. 14 notifications dispatched via WhatsApp and SMS.`;
      case 'list_services':
        return `We offer: Haircut, Hair Color, Styling, Facials, Body Massage, Manicure, Pedicure, and Bridal Packages. Would you like details or pricing for any service?`;
      case 'check_price':
        return `Our current prices: Haircut from $25, Hair Color from $65, Facial from $40, Massage from $55. Shall I provide a detailed breakdown?`;
      default:
        return `I understood your request with ${(intent.confidence * 100).toFixed(0)}% confidence. Could you rephrase that? I can help with bookings, cancellations, availability, and service inquiries.`;
    }
  }

  addMessage(sender: 'user' | 'ai', text: string): void {
    this.messages.push({
      id: ++this.msgIdCounter,
      sender,
      text,
      timestamp: new Date(),
    });
  }

  addRecentCommand(text: string, intent: string, status: 'success' | 'pending' | 'failed'): void {
    this.recentCommands.unshift({
      id: ++this.cmdIdCounter,
      text,
      intent,
      timestamp: new Date(),
      status,
    });
    if (this.recentCommands.length > 20) {
      this.recentCommands.pop();
    }
  }

  clearConversation(): void {
    this.messages = [];
    this.parsedIntent = null;
    this.currentTranscript = '';
    this.isListening = false;
  }
}
