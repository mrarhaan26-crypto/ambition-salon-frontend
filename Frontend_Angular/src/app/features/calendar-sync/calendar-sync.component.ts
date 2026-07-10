import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface CalendarProvider {
  id: string;
  name: string;
  icon: string;
  brandColor: string;
  connected: boolean;
  lastSync: string | null;
  syncCount: number;
  status: 'idle' | 'syncing' | 'error' | 'success';
}

interface SyncDirection {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface ConnectedCalendar {
  id: string;
  name: string;
  provider: string;
  providerIcon: string;
  color: string;
  lastSynced: string;
  eventCount: number;
  enabled: boolean;
}

interface SyncLog {
  id: string;
  timestamp: string;
  provider: string;
  providerIcon: string;
  direction: string;
  eventTitle: string;
  status: 'success' | 'conflict' | 'failed' | 'pending';
  details: string;
}

interface SyncKPI {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
}

@Component({
  selector: 'app-calendar-sync',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="calendar-sync-page">
      <div class="page-header">
        <div class="header-content">
          <div class="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Calendar Sync</h1>
            <p class="page-subtitle">Sync your appointments across Google Calendar, Outlook, and Apple Calendar</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-sync-all" (click)="syncAllProviders()" [disabled]="isSyncingAll">
            <svg *ngIf="!isSyncingAll" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
            </svg>
            <svg *ngIf="isSyncingAll" class="spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
            </svg>
            {{ isSyncingAll ? 'Syncing...' : 'Sync All' }}
          </button>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card" *ngFor="let kpi of kpis">
          <div class="kpi-icon" [innerHTML]="kpi.icon"></div>
          <div class="kpi-content">
            <span class="kpi-value">{{ kpi.value }}</span>
            <span class="kpi-label">{{ kpi.label }}</span>
          </div>
          <div class="kpi-change" [ngClass]="'change-' + kpi.changeType">
            {{ kpi.change }}
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Calendar Providers</h2>
          <p class="section-subtitle">Connect your calendar accounts to enable sync</p>
        </div>
        <div class="providers-grid">
          <div class="provider-card" *ngFor="let provider of providers"
               [style.--brand-color]="provider.brandColor"
               [class.connected]="provider.connected"
               [class.syncing]="provider.status === 'syncing'">
            <div class="provider-header">
              <div class="provider-icon-wrap" [innerHTML]="provider.icon"></div>
              <div class="provider-info">
                <h3 class="provider-name">{{ provider.name }}</h3>
                <span class="provider-status" [ngClass]="'status-' + provider.status">
                  <span class="status-dot"></span>
                  {{ getStatusLabel(provider.status) }}
                </span>
              </div>
            </div>
            <div class="provider-body">
              <div class="sync-meta" *ngIf="provider.connected">
                <div class="meta-row">
                  <span class="meta-label">Last Sync</span>
                  <span class="meta-value">{{ provider.lastSync || 'Never' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Events Synced</span>
                  <span class="meta-value">{{ provider.syncCount }}</span>
                </div>
              </div>
              <div class="provider-actions">
                <button *ngIf="!provider.connected" class="btn-connect" (click)="connectProvider(provider)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  Connect
                </button>
                <button *ngIf="provider.connected" class="btn-sync-single" (click)="syncProvider(provider)" [disabled]="provider.status === 'syncing'">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
                  </svg>
                  Sync
                </button>
                <button *ngIf="provider.connected" class="btn-disconnect" (click)="disconnectProvider(provider)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
            <div class="provider-glow" *ngIf="provider.connected"></div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Sync Direction</h2>
          <p class="section-subtitle">Choose how events flow between calendars</p>
        </div>
        <div class="direction-options">
          <div class="direction-card" *ngFor="let dir of syncDirections"
               [class.active]="selectedDirection === dir.id"
               (click)="selectedDirection = dir.id">
            <div class="direction-icon" [innerHTML]="dir.icon"></div>
            <div class="direction-info">
              <span class="direction-label">{{ dir.label }}</span>
              <span class="direction-desc">{{ dir.description }}</span>
            </div>
            <div class="direction-radio">
              <div class="radio-dot"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="two-column">
        <div class="section-card column-calendars">
          <div class="section-header">
            <h2 class="section-title">Connected Calendars</h2>
            <span class="badge">{{ connectedCalendars.length }} Active</span>
          </div>
          <div class="calendars-list">
            <div class="calendar-item" *ngFor="let cal of connectedCalendars" [class.disabled]="!cal.enabled">
              <div class="calendar-color" [style.background]="cal.color"></div>
              <div class="calendar-info">
                <span class="calendar-name">{{ cal.name }}</span>
                <span class="calendar-meta">
                  <span class="provider-badge">{{ cal.provider }}</span>
                  {{ cal.eventCount }} events · Last synced {{ cal.lastSynced }}
                </span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" [(ngModel)]="cal.enabled" (change)="toggleCalendar(cal)">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="section-card column-log">
          <div class="section-header">
            <h2 class="section-title">Sync Log</h2>
            <button class="btn-clear-log" (click)="clearLog()">Clear</button>
          </div>
          <div class="log-table-wrap">
            <table class="log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Direction</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of syncLogs">
                  <td class="log-time">{{ log.timestamp }}</td>
                  <td>
                    <div class="log-event">
                      <span class="log-provider-icon">{{ log.providerIcon }}</span>
                      <span>{{ log.eventTitle }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="direction-badge">{{ log.direction }}</span>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="'badge-' + log.status">{{ log.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="log-empty" *ngIf="syncLogs.length === 0">
              <p>No sync activity yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #0a0e1a;
      color: #e2e8f0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .calendar-sync-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 40px 60px;
    }

    /* ── Header ── */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding: 28px 36px;
      background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.10) 50%, rgba(59,130,246,0.12) 100%);
      border: 1px solid rgba(139,92,246,0.2);
      border-radius: 20px;
      backdrop-filter: blur(20px);
      position: relative;
      overflow: hidden;
    }

    .page-header::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.08) 0%, transparent 60%);
      pointer-events: none;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 18px;
      position: relative;
      z-index: 1;
    }

    .header-icon {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border-radius: 14px;
      color: white;
      box-shadow: 0 8px 24px rgba(139,92,246,0.3);
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #f8fafc, #c4b5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
    }

    .page-subtitle {
      font-size: 14px;
      color: #94a3b8;
      margin: 4px 0 0;
    }

    .header-actions {
      position: relative;
      z-index: 1;
    }

    .btn-sync-all {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 4px 16px rgba(99,102,241,0.3);
    }

    .btn-sync-all:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(99,102,241,0.45);
    }

    .btn-sync-all:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── KPI Row ── */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 28px;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 22px 24px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      backdrop-filter: blur(12px);
      transition: all 0.3s ease;
    }

    .kpi-card:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(139,92,246,0.2);
      transform: translateY(-2px);
    }

    .kpi-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.10));
      border-radius: 12px;
      color: #8b5cf6;
      flex-shrink: 0;
    }

    .kpi-content {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      color: #f1f5f9;
    }

    .kpi-label {
      font-size: 13px;
      color: #64748b;
      margin-top: 2px;
    }

    .kpi-change {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 8px;
      white-space: nowrap;
    }

    .change-positive {
      color: #34d399;
      background: rgba(52,211,153,0.1);
    }

    .change-negative {
      color: #f87171;
      background: rgba(248,113,113,0.1);
    }

    .change-neutral {
      color: #94a3b8;
      background: rgba(148,163,184,0.1);
    }

    /* ── Section Cards ── */
    .section-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 28px 32px;
      margin-bottom: 24px;
      backdrop-filter: blur(12px);
      position: relative;
      overflow: hidden;
    }

    .section-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .section-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 4px 0 0;
    }

    .badge {
      font-size: 12px;
      font-weight: 600;
      padding: 5px 12px;
      background: rgba(52,211,153,0.12);
      color: #34d399;
      border-radius: 8px;
    }

    /* ── Provider Cards ── */
    .providers-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .provider-card {
      position: relative;
      padding: 24px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
      overflow: hidden;
    }

    .provider-card:hover {
      border-color: color-mix(in srgb, var(--brand-color) 40%, transparent);
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
    }

    .provider-card.connected {
      border-color: color-mix(in srgb, var(--brand-color) 30%, transparent);
      background: color-mix(in srgb, var(--brand-color) 4%, transparent);
    }

    .provider-card.syncing {
      animation: pulse-border 1.5s ease-in-out infinite;
    }

    @keyframes pulse-border {
      0%, 100% { border-color: color-mix(in srgb, var(--brand-color) 20%, transparent); }
      50% { border-color: color-mix(in srgb, var(--brand-color) 60%, transparent); }
    }

    .provider-glow {
      position: absolute;
      bottom: -40px;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 80px;
      background: radial-gradient(ellipse, color-mix(in srgb, var(--brand-color) 20%, transparent), transparent);
      filter: blur(20px);
      pointer-events: none;
    }

    .provider-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
    }

    .provider-icon-wrap {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--brand-color) 12%, transparent);
      border-radius: 12px;
      color: var(--brand-color);
      flex-shrink: 0;
    }

    .provider-info {
      flex: 1;
    }

    .provider-name {
      font-size: 16px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .provider-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      margin-top: 3px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .status-idle .status-dot { background: #475569; }
    .status-idle { color: #64748b; }

    .status-syncing .status-dot { background: #fbbf24; animation: blink 1s infinite; }
    .status-syncing { color: #fbbf24; }

    .status-success .status-dot { background: #34d399; }
    .status-success { color: #34d399; }

    .status-error .status-dot { background: #f87171; }
    .status-error { color: #f87171; }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .provider-body {
      min-height: 80px;
    }

    .sync-meta {
      margin-bottom: 16px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }

    .meta-label {
      font-size: 12px;
      color: #64748b;
    }

    .meta-value {
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
    }

    .provider-actions {
      display: flex;
      gap: 8px;
    }

    .btn-connect, .btn-sync-single, .btn-disconnect {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 14px;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-connect {
      background: color-mix(in srgb, var(--brand-color) 15%, transparent);
      color: var(--brand-color);
      border: 1px solid color-mix(in srgb, var(--brand-color) 25%, transparent);
    }

    .btn-connect:hover {
      background: color-mix(in srgb, var(--brand-color) 25%, transparent);
      transform: translateY(-1px);
    }

    .btn-sync-single {
      background: rgba(52,211,153,0.12);
      color: #34d399;
      border: 1px solid rgba(52,211,153,0.2);
    }

    .btn-sync-single:hover:not(:disabled) {
      background: rgba(52,211,153,0.2);
    }

    .btn-sync-single:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-disconnect {
      background: rgba(248,113,113,0.08);
      color: #f87171;
      border: 1px solid rgba(248,113,113,0.15);
    }

    .btn-disconnect:hover {
      background: rgba(248,113,113,0.15);
    }

    /* ── Sync Direction ── */
    .direction-options {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .direction-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 20px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .direction-card:hover {
      background: rgba(255,255,255,0.04);
      border-color: rgba(139,92,246,0.2);
    }

    .direction-card.active {
      background: rgba(139,92,246,0.08);
      border-color: rgba(139,92,246,0.4);
      box-shadow: 0 0 20px rgba(139,92,246,0.1);
    }

    .direction-icon {
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(139,92,246,0.1);
      border-radius: 10px;
      color: #8b5cf6;
      flex-shrink: 0;
    }

    .direction-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .direction-label {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
    }

    .direction-desc {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    .direction-radio {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .direction-card.active .direction-radio {
      border-color: #8b5cf6;
    }

    .radio-dot {
      width: 0;
      height: 0;
      border-radius: 50%;
      background: #8b5cf6;
      transition: all 0.3s ease;
    }

    .direction-card.active .radio-dot {
      width: 10px;
      height: 10px;
    }

    /* ── Two Column Layout ── */
    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .column-calendars, .column-log {
      margin-bottom: 0;
    }

    /* ── Calendars List ── */
    .calendars-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .calendar-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 10px;
      transition: all 0.2s ease;
    }

    .calendar-item:hover {
      background: rgba(255,255,255,0.03);
    }

    .calendar-item.disabled {
      opacity: 0.45;
    }

    .calendar-color {
      width: 12px;
      height: 12px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .calendar-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .calendar-name {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
    }

    .calendar-meta {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .provider-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      background: rgba(139,92,246,0.12);
      color: #a78bfa;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Toggle Switch ── */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 42px;
      height: 24px;
      flex-shrink: 0;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: rgba(255,255,255,0.08);
      border-radius: 24px;
      transition: 0.3s;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: #475569;
      border-radius: 50%;
      transition: 0.3s;
    }

    .toggle-switch input:checked + .toggle-slider {
      background: rgba(139,92,246,0.3);
    }

    .toggle-switch input:checked + .toggle-slider::before {
      transform: translateX(18px);
      background: #8b5cf6;
    }

    /* ── Sync Log ── */
    .btn-clear-log {
      padding: 6px 14px;
      background: rgba(255,255,255,0.04);
      color: #94a3b8;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-clear-log:hover {
      background: rgba(255,255,255,0.08);
      color: #e2e8f0;
    }

    .log-table-wrap {
      overflow-x: auto;
    }

    .log-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .log-table th {
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .log-table td {
      padding: 11px 12px;
      color: #cbd5e1;
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }

    .log-table tr:hover td {
      background: rgba(255,255,255,0.02);
    }

    .log-time {
      color: #64748b;
      font-size: 12px;
      white-space: nowrap;
    }

    .log-event {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .log-provider-icon {
      font-size: 14px;
    }

    .direction-badge {
      font-size: 11px;
      padding: 3px 8px;
      background: rgba(139,92,246,0.1);
      color: #a78bfa;
      border-radius: 6px;
      font-weight: 500;
    }

    .status-badge {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 600;
      text-transform: capitalize;
    }

    .badge-success {
      background: rgba(52,211,153,0.12);
      color: #34d399;
    }

    .badge-conflict {
      background: rgba(251,191,36,0.12);
      color: #fbbf24;
    }

    .badge-failed {
      background: rgba(248,113,113,0.12);
      color: #f87171;
    }

    .badge-pending {
      background: rgba(148,163,184,0.12);
      color: #94a3b8;
    }

    .log-empty {
      text-align: center;
      padding: 40px 20px;
      color: #475569;
      font-size: 13px;
    }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
      .two-column {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 900px) {
      .calendar-sync-page {
        padding: 20px 16px 40px;
      }
      .page-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
        padding: 20px;
      }
      .kpi-row {
        grid-template-columns: 1fr;
      }
      .providers-grid {
        grid-template-columns: 1fr;
      }
      .direction-options {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CalendarSyncComponent implements OnInit {
  isSyncingAll = false;
  selectedDirection = 'bidirectional';

  providers: CalendarProvider[] = [
    {
      id: 'google',
      name: 'Google Calendar',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      brandColor: '#4285f4',
      connected: true,
      lastSync: '2 min ago',
      syncCount: 342,
      status: 'success'
    },
    {
      id: 'outlook',
      name: 'Outlook Calendar',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>`,
      brandColor: '#0078d4',
      connected: true,
      lastSync: '15 min ago',
      syncCount: 189,
      status: 'success'
    },
    {
      id: 'apple',
      name: 'Apple Calendar',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 18v-6l4 2"/></svg>`,
      brandColor: '#333333',
      connected: false,
      lastSync: null,
      syncCount: 0,
      status: 'idle'
    }
  ];

  syncDirections: SyncDirection[] = [
    {
      id: 'push',
      label: 'Push',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
      description: 'Send salon events to external calendars'
    },
    {
      id: 'pull',
      label: 'Pull',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>`,
      description: 'Import external events into salon calendar'
    },
    {
      id: 'bidirectional',
      label: 'Bidirectional',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
      description: 'Keep all calendars fully synchronized'
    }
  ];

  connectedCalendars: ConnectedCalendar[] = [
    { id: '1', name: 'Work Schedule', provider: 'Google', providerIcon: 'G', color: '#4285f4', lastSynced: '2 min ago', eventCount: 156, enabled: true },
    { id: '2', name: 'Personal', provider: 'Google', providerIcon: 'G', color: '#34d399', lastSynced: '2 min ago', eventCount: 42, enabled: true },
    { id: '3', name: 'Team Calendar', provider: 'Outlook', providerIcon: 'O', color: '#0078d4', lastSynced: '15 min ago', eventCount: 87, enabled: true },
    { id: '4', name: 'Vacation Days', provider: 'Outlook', providerIcon: 'O', color: '#f59e0b', lastSynced: '15 min ago', eventCount: 8, enabled: false }
  ];

  syncLogs: SyncLog[] = [
    { id: '1', timestamp: '10:32 AM', provider: 'Google', providerIcon: 'G', direction: 'Push', eventTitle: 'Hair Styling - Sarah M.', status: 'success', details: '' },
    { id: '2', timestamp: '10:30 AM', provider: 'Outlook', providerIcon: 'O', direction: 'Pull', eventTitle: 'Team Meeting 3PM', status: 'success', details: '' },
    { id: '3', timestamp: '10:28 AM', provider: 'Google', providerIcon: 'G', direction: 'Push', eventTitle: 'Manicure - Emily R.', status: 'conflict', details: 'Time conflict with existing event' },
    { id: '4', timestamp: '10:25 AM', provider: 'Outlook', providerIcon: 'O', direction: 'Bidirectional', eventTitle: 'Lunch Break', status: 'success', details: '' },
    { id: '5', timestamp: '10:20 AM', provider: 'Google', providerIcon: 'G', direction: 'Push', eventTitle: 'Facial Treatment - John D.', status: 'failed', details: 'Connection timeout' },
    { id: '6', timestamp: '10:15 AM', provider: 'Outlook', providerIcon: 'O', direction: 'Pull', eventTitle: 'Client Review 4PM', status: 'pending', details: '' }
  ];

  kpis: SyncKPI[] = [
    {
      label: 'Synced Events',
      value: '531',
      change: '+12% this week',
      changeType: 'positive',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`
    },
    {
      label: 'Last Sync',
      value: '2 min ago',
      change: 'All providers OK',
      changeType: 'positive',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`
    },
    {
      label: 'Conflicts Resolved',
      value: '23',
      change: '2 pending review',
      changeType: 'negative',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {}

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      idle: 'Not Connected',
      syncing: 'Syncing...',
      error: 'Error',
      success: 'Connected'
    };
    return labels[status] || status;
  }

  connectProvider(provider: CalendarProvider): void {
    provider.status = 'syncing';
    setTimeout(() => {
      provider.connected = true;
      provider.status = 'success';
      provider.lastSync = 'Just now';
      provider.syncCount = 0;
    }, 2000);
  }

  disconnectProvider(provider: CalendarProvider): void {
    provider.connected = false;
    provider.status = 'idle';
    provider.lastSync = null;
    provider.syncCount = 0;
  }

  syncProvider(provider: CalendarProvider): void {
    provider.status = 'syncing';
    setTimeout(() => {
      provider.status = 'success';
      provider.lastSync = 'Just now';
      provider.syncCount += Math.floor(Math.random() * 10) + 1;
    }, 3000);
  }

  syncAllProviders(): void {
    this.isSyncingAll = true;
    this.providers.forEach(p => {
      if (p.connected) p.status = 'syncing';
    });
    setTimeout(() => {
      this.providers.forEach(p => {
        if (p.connected) {
          p.status = 'success';
          p.lastSync = 'Just now';
          p.syncCount += Math.floor(Math.random() * 20) + 5;
        }
      });
      this.isSyncingAll = false;
    }, 3500);
  }

  toggleCalendar(cal: ConnectedCalendar): void {
    console.log('Toggled calendar:', cal.name, cal.enabled);
  }

  clearLog(): void {
    this.syncLogs = [];
  }
}
