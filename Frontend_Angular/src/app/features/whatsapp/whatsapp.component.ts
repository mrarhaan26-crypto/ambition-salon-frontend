import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface WhatsAppTemplate {
  id: number;
  name: string;
  category: string;
  message: string;
  variables: string[];
  lastUsed: string;
  usageCount: number;
}

interface WhatsAppMessage {
  id: number;
  recipientName: string;
  recipientPhone: string;
  template: string;
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

interface QuickAction {
  icon: string;
  label: string;
  description: string;
  color: string;
  template: string;
}

interface WhatsAppStats {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Header -->
    <div class="whatsapp-page">
      <header class="premium-header">
        <div class="header-content">
          <div class="header-icon">
            <svg viewBox="0 0 24 24" fill="white" width="48" height="48">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div class="header-text">
            <h1>WhatsApp Business</h1>
            <p>Automated messaging for your salon. Send booking confirmations, reminders, and more.</p>
          </div>
          <div class="header-actions">
            <button class="btn-header" (click)="openTemplateCreator()">
              <span class="btn-icon">+</span>
              New Template
            </button>
          </div>
        </div>
        <div class="header-wave">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="var(--bg-primary)"/>
          </svg>
        </div>
      </header>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card stat-sent">
          <div class="stat-icon">📤</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.sent }}</span>
            <span class="stat-label">Messages Sent</span>
          </div>
          <div class="stat-trend up">+12%</div>
        </div>
        <div class="stat-card stat-delivered">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.delivered }}</span>
            <span class="stat-label">Delivered</span>
          </div>
          <div class="stat-trend up">+8%</div>
        </div>
        <div class="stat-card stat-read">
          <div class="stat-icon">👁️</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.read }}</span>
            <span class="stat-label">Read</span>
          </div>
          <div class="stat-trend up">+15%</div>
        </div>
        <div class="stat-card stat-failed">
          <div class="stat-icon">❌</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.failed }}</span>
            <span class="stat-label">Failed</span>
          </div>
          <div class="stat-trend down">-3%</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <section class="section">
        <div class="section-header">
          <h2>Quick Actions</h2>
          <p>Send automated messages with one click</p>
        </div>
        <div class="quick-actions-grid">
          <div
            *ngFor="let action of quickActions"
            class="quick-action-card"
            [style.--action-color]="action.color"
            (click)="selectQuickAction(action)"
          >
            <div class="action-icon">{{ action.icon }}</div>
            <div class="action-info">
              <h3>{{ action.label }}</h3>
              <p>{{ action.description }}</p>
            </div>
            <div class="action-arrow">→</div>
          </div>
        </div>
      </section>

      <!-- Two Column Layout -->
      <div class="two-columns">
        <!-- Templates Column -->
        <section class="section templates-section">
          <div class="section-header">
            <h2>Message Templates</h2>
            <button class="btn-sm" (click)="openTemplateCreator()">+ Add New</button>
          </div>
          <div class="templates-list">
            <div *ngFor="let template of templates" class="template-card">
              <div class="template-header">
                <span class="template-category" [ngClass]="'cat-' + template.category.toLowerCase()">
                  {{ template.category }}
                </span>
                <span class="template-usage">{{ template.usageCount }} uses</span>
              </div>
              <h4 class="template-name">{{ template.name }}</h4>
              <p class="template-message">{{ template.message | slice:0:100 }}...</p>
              <div class="template-footer">
                <span class="template-date">Last used: {{ template.lastUsed }}</span>
                <div class="template-actions">
                  <button class="btn-icon-sm" title="Edit" (click)="editTemplate(template)">✏️</button>
                  <button class="btn-icon-sm" title="Delete" (click)="deleteTemplate(template.id)">🗑️</button>
                  <button class="btn-icon-sm btn-send" title="Send" (click)="sendTemplate(template)">📤</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Recent Messages Column -->
        <section class="section messages-section">
          <div class="section-header">
            <h2>Recent Messages</h2>
            <button class="btn-sm btn-outline" (click)="refreshMessages()">↻ Refresh</button>
          </div>
          <div class="messages-list">
            <div *ngFor="let msg of recentMessages" class="message-card">
              <div class="message-avatar">
                {{ msg.recipientName.charAt(0) }}
              </div>
              <div class="message-content">
                <div class="message-top">
                  <span class="message-name">{{ msg.recipientName }}</span>
                  <span class="message-time">{{ msg.timestamp }}</span>
                </div>
                <p class="message-text">{{ msg.message | slice:0:60 }}...</p>
                <span class="message-template-label">{{ msg.template }}</span>
              </div>
              <div class="message-status" [ngClass]="'status-' + msg.status">
                <span *ngIf="msg.status === 'sent'">📤</span>
                <span *ngIf="msg.status === 'delivered'">✅</span>
                <span *ngIf="msg.status === 'read'">👁️</span>
                <span *ngIf="msg.status === 'failed'">❌</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Phone Preview Panel -->
      <section class="section preview-section">
        <div class="section-header">
          <h2>Message Preview</h2>
          <p>See how your message looks on a phone</p>
        </div>
        <div class="preview-container">
          <div class="phone-mockup">
            <div class="phone-notch"></div>
            <div class="phone-screen">
              <div class="phone-header">
                <div class="phone-back">←</div>
                <div class="phone-contact">
                  <div class="phone-contact-avatar">S</div>
                  <div class="phone-contact-info">
                    <span class="phone-contact-name">Salon</span>
                    <span class="phone-contact-status">online</span>
                  </div>
                </div>
                <div class="phone-more">⋮</div>
              </div>
              <div class="phone-messages">
                <div class="phone-date">Today</div>
                <div class="phone-bubble incoming">
                  <p>{{ previewMessage || 'Hi! Your appointment is confirmed for tomorrow at 10:00 AM. See you there! 💇‍♀️' }}</p>
                  <span class="bubble-time">10:30 AM</span>
                </div>
                <div class="phone-bubble outgoing">
                  <p>Thank you! I'll be there. 😊</p>
                  <span class="bubble-time">10:32 AM ✓✓</span>
                </div>
              </div>
              <div class="phone-input">
                <span class="phone-emoji">😊</span>
                <span class="phone-input-field">Type a message</span>
                <span class="phone-send">🎤</span>
              </div>
            </div>
            <div class="phone-button"></div>
          </div>
          <div class="preview-controls">
            <h3>Edit Preview</h3>
            <textarea
              [(ngModel)]="previewMessage"
              placeholder="Type a message to preview..."
              rows="4"
            ></textarea>
            <div class="preview-variables">
              <span class="variable-tag" (click)="insertVariable('{{clientName}}')">{{clientName}}</span>
              <span class="variable-tag" (click)="insertVariable('{{date}}')">{{date}}</span>
              <span class="variable-tag" (click)="insertVariable('{{time}}')">{{time}}</span>
              <span class="variable-tag" (click)="insertVariable('{{service}}')">{{service}}</span>
              <span class="variable-tag" (click)="insertVariable('{{amount}}')">{{amount}}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Template Creator Dialog -->
      <div class="dialog-overlay" *ngIf="showTemplateDialog" (click)="closeTemplateCreator()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h2>{{ editingTemplate ? 'Edit Template' : 'Create New Template' }}</h2>
            <button class="dialog-close" (click)="closeTemplateCreator()">×</button>
          </div>
          <div class="dialog-body">
            <div class="form-group">
              <label>Template Name</label>
              <input
                type="text"
                [(ngModel)]="newTemplate.name"
                placeholder="e.g., Booking Confirmation"
              />
            </div>
            <div class="form-group">
              <label>Category</label>
              <select [(ngModel)]="newTemplate.category">
                <option value="Booking">Booking</option>
                <option value="Reminder">Reminder</option>
                <option value="OTP">OTP</option>
                <option value="Invoice">Invoice</option>
                <option value="Promotional">Promotional</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </div>
            <div class="form-group">
              <label>Message Template</label>
              <textarea
                [(ngModel)]="newTemplate.message"
                placeholder="Write your message template. Use {{variable}} for dynamic content."
                rows="6"
              ></textarea>
              <div class="variable-insert-row">
                <span class="variable-tag" (click)="insertTemplateVariable('{{clientName}}')">+Client Name</span>
                <span class="variable-tag" (click)="insertTemplateVariable('{{phone}}')">+Phone</span>
                <span class="variable-tag" (click)="insertTemplateVariable('{{date}}')">+Date</span>
                <span class="variable-tag" (click)="insertTemplateVariable('{{time}}')">+Time</span>
                <span class="variable-tag" (click)="insertTemplateVariable('{{service}}')">+Service</span>
                <span class="variable-tag" (click)="insertTemplateVariable('{{amount}}')">+Amount</span>
                <span class="variable-tag" (click)="insertTemplateVariable('{{stylist}}')">+Stylist</span>
              </div>
            </div>
            <div class="form-group">
              <label>Variables Detected</label>
              <div class="detected-variables">
                <span *ngFor="let v of detectedVariables" class="detected-var">{{ v }}</span>
                <span *ngIf="detectedVariables.length === 0" class="no-vars">No variables detected</span>
              </div>
            </div>
          </div>
          <div class="dialog-footer">
            <button class="btn-cancel" (click)="closeTemplateCreator()">Cancel</button>
            <button class="btn-save" (click)="saveTemplate()">
              {{ editingTemplate ? 'Update Template' : 'Create Template' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Send Message Dialog -->
      <div class="dialog-overlay" *ngIf="showSendDialog" (click)="closeSendDialog()">
        <div class="dialog send-dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h2>Send Message</h2>
            <button class="dialog-close" (click)="closeSendDialog()">×</button>
          </div>
          <div class="dialog-body">
            <div class="send-template-preview">
              <span class="send-template-name">{{ selectedTemplate?.name }}</span>
              <p class="send-template-msg">{{ selectedTemplate?.message }}</p>
            </div>
            <div class="form-group">
              <label>Recipient Phone</label>
              <input
                type="tel"
                [(ngModel)]="sendPhone"
                placeholder="+91 98765 43210"
              />
            </div>
            <div class="form-group">
              <label>Recipient Name</label>
              <input
                type="text"
                [(ngModel)]="sendName"
                placeholder="Client name"
              />
            </div>
            <div class="form-group" *ngIf="selectedTemplate?.variables?.length">
              <label>Fill Variables</label>
              <div *ngFor="let v of selectedTemplate?.variables" class="variable-input-row">
                <span class="variable-label">{{ v }}</span>
                <input
                  type="text"
                  [placeholder]="v"
                  (input)="updateVariableValue(v, $any($event.target).value)"
                />
              </div>
            </div>
          </div>
          <div class="dialog-footer">
            <button class="btn-cancel" (click)="closeSendDialog()">Cancel</button>
            <button class="btn-send-wa" (click)="sendMessage()">
              <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Send via WhatsApp
            </button>
          </div>
        </div>
      </div>

      <!-- Toast Notification -->
      <div class="toast" [class.show]="showToast" [ngClass]="'toast-' + toastType">
        {{ toastMessage }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      --bg-primary: #0a0f1a;
      --bg-secondary: #111827;
      --bg-card: #1a2236;
      --bg-card-hover: #1f2a42;
      --bg-glass: rgba(26, 34, 54, 0.7);
      --border-color: rgba(255, 255, 255, 0.06);
      --border-glow: rgba(37, 211, 102, 0.3);
      --text-primary: #ffffff;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --wa-green: #25D366;
      --wa-green-dark: #1da851;
      --wa-green-glow: rgba(37, 211, 102, 0.4);
      --wa-green-light: #dcf8c6;
      --accent-blue: #3b82f6;
      --accent-purple: #8b5cf6;
      --accent-orange: #f59e0b;
      --accent-red: #ef4444;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-xl: 24px;
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
      --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
      --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
      --shadow-glow: 0 0 20px var(--wa-green-glow);
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .whatsapp-page {
      min-height: 100vh;
      background: var(--bg-primary);
      color: var(--text-primary);
      padding-bottom: 60px;
    }

    /* ===== HEADER ===== */
    .premium-header {
      position: relative;
      background: linear-gradient(135deg, #075e54 0%, #128c7e 40%, #25d366 100%);
      padding: 48px 40px 80px;
      overflow: hidden;
    }

    .premium-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      border-radius: 50%;
      animation: headerPulse 6s ease-in-out infinite;
    }

    .premium-header::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -10%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(37,211,102,0.3) 0%, transparent 70%);
      border-radius: 50%;
      animation: headerPulse 8s ease-in-out infinite reverse;
    }

    @keyframes headerPulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }

    .header-content {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header-icon {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
      animation: iconFloat 3s ease-in-out infinite;
    }

    @keyframes iconFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    .header-text h1 {
      font-size: 32px;
      font-weight: 800;
      margin: 0 0 8px;
      letter-spacing: -0.5px;
    }

    .header-text p {
      font-size: 16px;
      opacity: 0.9;
      margin: 0;
      max-width: 500px;
    }

    .header-actions {
      margin-left: auto;
    }

    .btn-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: var(--radius-md);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }

    .btn-header:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .btn-icon {
      font-size: 20px;
      font-weight: 700;
    }

    .header-wave {
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      z-index: 1;
    }

    .header-wave svg {
      display: block;
      width: 100%;
      height: auto;
    }

    /* ===== STATS ===== */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      max-width: 1400px;
      margin: -40px auto 32px;
      padding: 0 40px;
      position: relative;
      z-index: 3;
    }

    .stat-card {
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.3s ease;
      cursor: default;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      border-color: var(--border-glow);
      box-shadow: var(--shadow-glow);
    }

    .stat-icon {
      font-size: 32px;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      flex-shrink: 0;
    }

    .stat-sent .stat-icon { background: rgba(59, 130, 246, 0.15); }
    .stat-delivered .stat-icon { background: rgba(37, 211, 102, 0.15); }
    .stat-read .stat-icon { background: rgba(139, 92, 246, 0.15); }
    .stat-failed .stat-icon { background: rgba(239, 68, 68, 0.15); }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .stat-trend {
      margin-left: auto;
      font-size: 13px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
    }

    .stat-trend.up {
      background: rgba(37, 211, 102, 0.15);
      color: var(--wa-green);
    }

    .stat-trend.down {
      background: rgba(239, 68, 68, 0.15);
      color: var(--accent-red);
    }

    /* ===== SECTIONS ===== */
    .section {
      max-width: 1400px;
      margin: 0 auto 32px;
      padding: 0 40px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 22px;
      font-weight: 700;
      margin: 0;
    }

    .section-header p {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 4px 0 0;
    }

    .btn-sm {
      padding: 8px 16px;
      background: var(--wa-green);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-sm:hover {
      background: var(--wa-green-dark);
      transform: translateY(-1px);
    }

    .btn-sm.btn-outline {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
    }

    .btn-sm.btn-outline:hover {
      border-color: var(--wa-green);
      color: var(--wa-green);
    }

    /* ===== QUICK ACTIONS ===== */
    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .quick-action-card {
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .quick-action-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--action-color);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .quick-action-card:hover {
      transform: translateY(-4px);
      border-color: var(--action-color);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .quick-action-card:hover::before {
      opacity: 1;
    }

    .action-icon {
      font-size: 32px;
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-md);
      flex-shrink: 0;
      transition: transform 0.3s ease;
    }

    .quick-action-card:hover .action-icon {
      transform: scale(1.1);
    }

    .action-info h3 {
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 4px;
    }

    .action-info p {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.4;
    }

    .action-arrow {
      margin-left: auto;
      font-size: 18px;
      color: var(--text-muted);
      transition: all 0.3s ease;
    }

    .quick-action-card:hover .action-arrow {
      color: var(--action-color);
      transform: translateX(4px);
    }

    /* ===== TWO COLUMNS ===== */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      max-width: 1400px;
      margin: 0 auto 32px;
      padding: 0 40px;
    }

    /* ===== TEMPLATES ===== */
    .templates-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 500px;
      overflow-y: auto;
    }

    .templates-list::-webkit-scrollbar {
      width: 6px;
    }

    .templates-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .templates-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .template-card {
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 20px;
      transition: all 0.3s ease;
    }

    .template-card:hover {
      border-color: var(--border-glow);
      box-shadow: 0 4px 16px rgba(37, 211, 102, 0.1);
    }

    .template-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .template-category {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .cat-booking { background: rgba(37, 211, 102, 0.15); color: var(--wa-green); }
    .cat-reminder { background: rgba(59, 130, 246, 0.15); color: var(--accent-blue); }
    .cat-otp { background: rgba(139, 92, 246, 0.15); color: var(--accent-purple); }
    .cat-invoice { background: rgba(245, 158, 11, 0.15); color: var(--accent-orange); }
    .cat-promotional { background: rgba(236, 72, 153, 0.15); color: #ec4899; }
    .cat-follow-up { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }

    .template-usage {
      font-size: 12px;
      color: var(--text-muted);
    }

    .template-name {
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 6px;
    }

    .template-message {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0 0 12px;
      line-height: 1.5;
    }

    .template-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .template-date {
      font-size: 12px;
      color: var(--text-muted);
    }

    .template-actions {
      display: flex;
      gap: 6px;
    }

    .btn-icon-sm {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .btn-icon-sm:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--border-color);
    }

    .btn-icon-sm.btn-send:hover {
      background: rgba(37, 211, 102, 0.2);
      border-color: var(--wa-green);
    }

    /* ===== MESSAGES ===== */
    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 500px;
      overflow-y: auto;
    }

    .messages-list::-webkit-scrollbar {
      width: 6px;
    }

    .messages-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .message-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      transition: all 0.2s ease;
    }

    .message-card:hover {
      border-color: var(--border-glow);
    }

    .message-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--wa-green), var(--wa-green-dark));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      color: white;
      flex-shrink: 0;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .message-name {
      font-weight: 600;
      font-size: 14px;
    }

    .message-time {
      font-size: 12px;
      color: var(--text-muted);
    }

    .message-text {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0 0 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .message-template-label {
      font-size: 11px;
      background: rgba(37, 211, 102, 0.1);
      color: var(--wa-green);
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 500;
    }

    .message-status {
      font-size: 18px;
      flex-shrink: 0;
    }

    .message-status.status-failed {
      animation: shake 0.5s ease;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-3px); }
      75% { transform: translateX(3px); }
    }

    /* ===== PREVIEW SECTION ===== */
    .preview-section {
      max-width: 1400px;
      margin: 0 auto 32px;
      padding: 0 40px;
    }

    .preview-container {
      display: flex;
      gap: 40px;
      align-items: flex-start;
      justify-content: center;
    }

    .phone-mockup {
      width: 320px;
      height: 580px;
      background: #1a1a1a;
      border-radius: 40px;
      padding: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), inset 0 0 0 2px rgba(255, 255, 255, 0.1);
      position: relative;
      flex-shrink: 0;
    }

    .phone-notch {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 28px;
      background: #1a1a1a;
      border-radius: 0 0 16px 16px;
      z-index: 10;
    }

    .phone-screen {
      width: 100%;
      height: 100%;
      background: #0b141a;
      border-radius: 32px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .phone-header {
      background: #1f2c34;
      padding: 40px 16px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .phone-back {
      color: white;
      font-size: 20px;
      cursor: pointer;
    }

    .phone-contact {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .phone-contact-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--wa-green), #128c7e);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 14px;
    }

    .phone-contact-info {
      display: flex;
      flex-direction: column;
    }

    .phone-contact-name {
      color: white;
      font-size: 15px;
      font-weight: 600;
    }

    .phone-contact-status {
      color: var(--wa-green);
      font-size: 11px;
    }

    .phone-more {
      color: white;
      font-size: 20px;
    }

    .phone-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }

    .phone-date {
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
      margin-bottom: 12px;
    }

    .phone-bubble {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      position: relative;
    }

    .phone-bubble p {
      margin: 0;
      font-size: 13px;
      line-height: 1.4;
      color: #303030;
    }

    .phone-bubble.incoming {
      background: white;
      border-radius: 8px 8px 8px 0;
      align-self: flex-start;
    }

    .phone-bubble.outgoing {
      background: #d9fdd3;
      border-radius: 8px 8px 0 8px;
      margin-left: auto;
    }

    .bubble-time {
      display: block;
      text-align: right;
      font-size: 10px;
      color: rgba(0, 0, 0, 0.4);
      margin-top: 4px;
    }

    .phone-input {
      background: #1f2c34;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .phone-emoji {
      font-size: 20px;
    }

    .phone-input-field {
      flex: 1;
      background: #2a3942;
      border-radius: 20px;
      padding: 8px 14px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
    }

    .phone-send {
      font-size: 20px;
    }

    .phone-button {
      position: absolute;
      bottom: 6px;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }

    .preview-controls {
      width: 360px;
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
    }

    .preview-controls h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 16px;
    }

    .preview-controls textarea {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 12px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }

    .preview-controls textarea:focus {
      outline: none;
      border-color: var(--wa-green);
    }

    .preview-variables {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .variable-tag {
      padding: 4px 12px;
      background: rgba(37, 211, 102, 0.1);
      border: 1px solid rgba(37, 211, 102, 0.3);
      border-radius: 20px;
      font-size: 12px;
      color: var(--wa-green);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .variable-tag:hover {
      background: rgba(37, 211, 102, 0.2);
      transform: translateY(-1px);
    }

    /* ===== DIALOGS ===== */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      width: 520px;
      max-height: 85vh;
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 28px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .dialog-header h2 {
      font-size: 20px;
      font-weight: 700;
      margin: 0;
    }

    .dialog-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border: none;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .dialog-close:hover {
      background: rgba(239, 68, 68, 0.2);
      color: var(--accent-red);
    }

    .dialog-body {
      padding: 24px 28px;
      overflow-y: auto;
      max-height: 55vh;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 12px 14px;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--wa-green);
    }

    .form-group select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 36px;
    }

    .form-group select option {
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .variable-insert-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .detected-variables {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .detected-var {
      padding: 4px 10px;
      background: rgba(37, 211, 102, 0.15);
      color: var(--wa-green);
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .no-vars {
      font-size: 13px;
      color: var(--text-muted);
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 28px 24px;
      border-top: 1px solid var(--border-color);
    }

    .btn-cancel {
      padding: 10px 20px;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .btn-save {
      padding: 10px 24px;
      background: var(--wa-green);
      border: none;
      border-radius: var(--radius-sm);
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-save:hover {
      background: var(--wa-green-dark);
      transform: translateY(-1px);
    }

    /* ===== SEND DIALOG ===== */
    .send-dialog {
      width: 480px;
    }

    .send-template-preview {
      background: var(--bg-card);
      border-radius: var(--radius-sm);
      padding: 16px;
      margin-bottom: 20px;
    }

    .send-template-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--wa-green);
    }

    .send-template-msg {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 8px 0 0;
      line-height: 1.5;
    }

    .variable-input-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .variable-label {
      font-size: 13px;
      color: var(--text-secondary);
      min-width: 120px;
    }

    .variable-input-row input {
      flex: 1;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 8px 12px;
      font-size: 13px;
    }

    .variable-input-row input:focus {
      outline: none;
      border-color: var(--wa-green);
    }

    .btn-send-wa {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      background: var(--wa-green);
      border: none;
      border-radius: var(--radius-sm);
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-send-wa:hover {
      background: var(--wa-green-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-glow);
    }

    /* ===== TOAST ===== */
    .toast {
      position: fixed;
      bottom: -60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 14px 28px;
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 600;
      z-index: 2000;
      transition: bottom 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      box-shadow: var(--shadow-lg);
    }

    .toast.show {
      bottom: 32px;
    }

    .toast-success {
      background: var(--wa-green);
      color: white;
    }

    .toast-error {
      background: var(--accent-red);
      color: white;
    }

    .toast-info {
      background: var(--accent-blue);
      color: white;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 1200px) {
      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }
      .quick-actions-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .two-columns {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .premium-header {
        padding: 32px 20px 60px;
      }
      .header-content {
        flex-direction: column;
        text-align: center;
      }
      .header-actions {
        margin-left: 0;
      }
      .stats-row,
      .section,
      .two-columns,
      .preview-section {
        padding: 0 16px;
      }
      .stats-row {
        grid-template-columns: 1fr 1fr;
        margin-top: -30px;
      }
      .quick-actions-grid {
        grid-template-columns: 1fr;
      }
      .preview-container {
        flex-direction: column;
        align-items: center;
      }
      .preview-controls {
        width: 100%;
        max-width: 320px;
      }
      .dialog {
        width: calc(100% - 32px);
        margin: 16px;
      }
    }
  `]
})
export class WhatsAppComponent implements OnInit {
  stats: WhatsAppStats = {
    sent: 1284,
    delivered: 1198,
    read: 956,
    failed: 23
  };

  templates: WhatsAppTemplate[] = [
    {
      id: 1,
      name: 'Booking Confirmation',
      category: 'Booking',
      message: 'Dear {{clientName}}, your appointment for {{service}} on {{date}} at {{time}} with {{stylist}} has been confirmed. Amount: {{amount}}. See you at the salon!',
      variables: ['clientName', 'service', 'date', 'time', 'stylist', 'amount'],
      lastUsed: '2 hours ago',
      usageCount: 342
    },
    {
      id: 2,
      name: 'Appointment Reminder',
      category: 'Reminder',
      message: 'Hi {{clientName}}! Reminder: You have a {{service}} appointment tomorrow at {{time}} with {{stylist}}. Reply CONFIRM to confirm or call us to reschedule.',
      variables: ['clientName', 'service', 'time', 'stylist'],
      lastUsed: '5 hours ago',
      usageCount: 218
    },
    {
      id: 3,
      name: 'OTP Verification',
      category: 'OTP',
      message: 'Your Ambition Salon verification code is {{otp}}. Do not share this code with anyone. Valid for 5 minutes.',
      variables: ['otp'],
      lastUsed: '1 day ago',
      usageCount: 89
    },
    {
      id: 4,
      name: 'Invoice Generated',
      category: 'Invoice',
      message: 'Dear {{clientName}}, your invoice #{{invoiceId}} for {{service}} has been generated. Amount: {{amount}}. Payment due within 7 days. Thank you!',
      variables: ['clientName', 'invoiceId', 'service', 'amount'],
      lastUsed: '1 day ago',
      usageCount: 156
    },
    {
      id: 5,
      name: 'Review Request',
      category: 'Follow-up',
      message: 'Hi {{clientName}}! We hope you loved your {{service}} experience. We would appreciate a quick review. Your feedback means the world to us!',
      variables: ['clientName', 'service'],
      lastUsed: '2 days ago',
      usageCount: 98
    },
    {
      id: 6,
      name: 'Birthday Wishes',
      category: 'Promotional',
      message: 'Happy Birthday {{clientName}}! 🎂🎉 Wishing you a wonderful year ahead. As a gift, enjoy 20% off on your next visit. Book now!',
      variables: ['clientName'],
      lastUsed: '3 days ago',
      usageCount: 45
    }
  ];

  recentMessages: WhatsAppMessage[] = [
    {
      id: 1,
      recipientName: 'Priya Sharma',
      recipientPhone: '+91 98765 43210',
      template: 'Booking Confirmation',
      message: 'Dear Priya, your appointment for Hair Spa on 10 Jul at 11:00 AM with Anita has been confirmed.',
      status: 'read',
      timestamp: '10 min ago'
    },
    {
      id: 2,
      recipientName: 'Rahul Patel',
      recipientPhone: '+91 87654 32109',
      template: 'Appointment Reminder',
      message: 'Hi Rahul! Reminder: You have a Hair Cut appointment tomorrow at 2:00 PM with Raj.',
      status: 'delivered',
      timestamp: '25 min ago'
    },
    {
      id: 3,
      recipientName: 'Sneha Gupta',
      recipientPhone: '+91 76543 21098',
      template: 'Invoice Generated',
      message: 'Dear Sneha, your invoice #INV-2024-892 for Facial Treatment has been generated. Amount: ₹1,500.',
      status: 'read',
      timestamp: '1 hour ago'
    },
    {
      id: 4,
      recipientName: 'Amit Kumar',
      recipientPhone: '+91 65432 10987',
      template: 'Review Request',
      message: 'Hi Amit! We hope you loved your Beard Grooming experience. We would appreciate a quick review.',
      status: 'sent',
      timestamp: '2 hours ago'
    },
    {
      id: 5,
      recipientName: 'Deepika Nair',
      recipientPhone: '+91 54321 09876',
      template: 'Birthday Wishes',
      message: 'Happy Birthday Deepika! Wishing you a wonderful year ahead. Enjoy 20% off on your next visit.',
      status: 'delivered',
      timestamp: '3 hours ago'
    },
    {
      id: 6,
      recipientName: 'Vikram Singh',
      recipientPhone: '+91 43210 98765',
      template: 'Booking Confirmation',
      message: 'Dear Vikram, your appointment for Skin Polish on 11 Jul at 3:00 PM with Meena has been confirmed.',
      status: 'failed',
      timestamp: '4 hours ago'
    }
  ];

  quickActions: QuickAction[] = [
    {
      icon: '📅',
      label: 'Booking Confirmation',
      description: 'Confirm new appointments automatically',
      color: '#25D366',
      template: 'booking'
    },
    {
      icon: '⏰',
      label: 'Reminder',
      description: 'Send appointment reminders before visit',
      color: '#3b82f6',
      template: 'reminder'
    },
    {
      icon: '🔐',
      label: 'OTP',
      description: 'Send verification codes securely',
      color: '#8b5cf6',
      template: 'otp'
    },
    {
      icon: '🧾',
      label: 'Invoice',
      description: 'Share invoices and payment details',
      color: '#f59e0b',
      template: 'invoice'
    },
    {
      icon: '⭐',
      label: 'Review Request',
      description: 'Ask clients for feedback after service',
      color: '#ec4899',
      template: 'review'
    },
    {
      icon: '🎂',
      label: 'Birthday',
      description: 'Send birthday wishes with offers',
      color: '#06b6d4',
      template: 'birthday'
    },
    {
      icon: '❌',
      label: 'Cancellation',
      description: 'Notify about cancelled appointments',
      color: '#ef4444',
      template: 'cancellation'
    },
    {
      icon: '🤝',
      label: 'Follow-up',
      description: 'Follow up with clients after visit',
      color: '#10b981',
      template: 'followup'
    }
  ];

  showTemplateDialog = false;
  showSendDialog = false;
  editingTemplate: WhatsAppTemplate | null = null;
  selectedTemplate: WhatsAppTemplate | null = null;
  previewMessage = '';
  sendPhone = '';
  sendName = '';
  variableValues: Record<string, string> = {};

  newTemplate: Partial<WhatsAppTemplate> = {
    name: '',
    category: 'Booking',
    message: ''
  };

  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'success';

  clientName = 'John Doe';
  date = '15 July 2025';
  time = '10:30 AM';
  service = 'Hair Cut';
  amount = '₹500';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {}

  get detectedVariables(): string[] {
    if (!this.newTemplate.message) return [];
    const matches = this.newTemplate.message.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  }

  selectQuickAction(action: QuickAction): void {
    const matchingTemplate = this.templates.find(
      t => t.category.toLowerCase() === action.template ||
           t.name.toLowerCase().includes(action.template)
    );
    if (matchingTemplate) {
      this.sendTemplate(matchingTemplate);
    } else {
      this.showToastMessage('No template found for this action', 'info');
    }
  }

  openTemplateCreator(): void {
    this.editingTemplate = null;
    this.newTemplate = { name: '', category: 'Booking', message: '' };
    this.showTemplateDialog = true;
  }

  editTemplate(template: WhatsAppTemplate): void {
    this.editingTemplate = template;
    this.newTemplate = { ...template };
    this.showTemplateDialog = true;
  }

  closeTemplateCreator(): void {
    this.showTemplateDialog = false;
    this.editingTemplate = null;
  }

  saveTemplate(): void {
    if (!this.newTemplate.name || !this.newTemplate.message) {
      this.showToastMessage('Please fill in all fields', 'error');
      return;
    }

    if (this.editingTemplate) {
      const index = this.templates.findIndex(t => t.id === this.editingTemplate!.id);
      if (index !== -1) {
        this.templates[index] = {
          ...this.templates[index],
          name: this.newTemplate.name!,
          category: this.newTemplate.category!,
          message: this.newTemplate.message!,
          variables: this.detectedVariables
        };
      }
      this.showToastMessage('Template updated successfully', 'success');
    } else {
      const newId = Math.max(...this.templates.map(t => t.id)) + 1;
      this.templates.push({
        id: newId,
        name: this.newTemplate.name!,
        category: this.newTemplate.category!,
        message: this.newTemplate.message!,
        variables: this.detectedVariables,
        lastUsed: 'Never',
        usageCount: 0
      });
      this.showToastMessage('Template created successfully', 'success');
    }

    this.closeTemplateCreator();
  }

  deleteTemplate(id: number): void {
    this.templates = this.templates.filter(t => t.id !== id);
    this.showToastMessage('Template deleted', 'info');
  }

  sendTemplate(template: WhatsAppTemplate): void {
    this.selectedTemplate = template;
    this.sendPhone = '';
    this.sendName = '';
    this.variableValues = {};
    this.showSendDialog = true;
  }

  closeSendDialog(): void {
    this.showSendDialog = false;
    this.selectedTemplate = null;
  }

  updateVariableValue(variable: string, value: string): void {
    this.variableValues[variable] = value;
  }

  sendMessage(): void {
    if (!this.sendPhone || !this.sendName) {
      this.showToastMessage('Please fill in recipient details', 'error');
      return;
    }

    let message = this.selectedTemplate?.message || '';
    Object.keys(this.variableValues).forEach(key => {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), this.variableValues[key]);
    });

    const newMessage: WhatsAppMessage = {
      id: this.recentMessages.length + 1,
      recipientName: this.sendName,
      recipientPhone: this.sendPhone,
      template: this.selectedTemplate?.name || '',
      message: message,
      status: 'sent',
      timestamp: 'Just now'
    };

    this.recentMessages.unshift(newMessage);
    this.stats.sent++;

    if (this.selectedTemplate) {
      const templateIndex = this.templates.findIndex(t => t.id === this.selectedTemplate!.id);
      if (templateIndex !== -1) {
        this.templates[templateIndex].usageCount++;
        this.templates[templateIndex].lastUsed = 'Just now';
      }
    }

    this.closeSendDialog();
    this.showToastMessage('Message sent successfully via WhatsApp', 'success');

    setTimeout(() => {
      const msg = this.recentMessages.find(m => m.id === newMessage.id);
      if (msg) msg.status = 'delivered';
      this.stats.delivered++;
    }, 2000);

    setTimeout(() => {
      const msg = this.recentMessages.find(m => m.id === newMessage.id);
      if (msg) msg.status = 'read';
      this.stats.read++;
    }, 5000);
  }

  insertVariable(variable: string): void {
    this.previewMessage += variable;
  }

  insertTemplateVariable(variable: string): void {
    this.newTemplate.message = (this.newTemplate.message || '') + variable;
  }

  refreshMessages(): void {
    this.showToastMessage('Messages refreshed', 'info');
  }

  showToastMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
