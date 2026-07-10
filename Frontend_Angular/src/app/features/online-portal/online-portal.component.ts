import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-online-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Premium Gradient Header -->
    <header class="portal-header">
      <div class="header-bg-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
      <div class="header-content">
        <div class="header-badge">PORTAL BUILDER</div>
        <h1>Online Booking Portal</h1>
        <p>Design, customize, and manage your public-facing booking experience.</p>
        <div class="header-actions">
          <button class="btn-gold" (click)="saveAll()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save All Changes
          </button>
          <button class="btn-glass" (click)="previewPortal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview Live
          </button>
        </div>
      </div>
    </header>

    <!-- KPI Stats Row -->
    <section class="stats-row">
      <div class="stat-card" *ngFor="let stat of kpiStats; let i = index" [style.animation-delay]="i * 100 + 'ms'">
        <div class="stat-icon" [style.background]="stat.gradient">
          <span [innerHTML]="stat.icon"></span>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
        <div class="stat-trend" [class.up]="stat.trend > 0" [class.down]="stat.trend < 0">
          {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}%
        </div>
      </div>
    </section>

    <div class="portal-grid">
      <!-- Left Column: Settings -->
      <div class="settings-column">

        <!-- Portal URL Card -->
        <div class="glass-card url-card">
          <div class="card-header">
            <div class="card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            </div>
            <h3>Portal URL</h3>
            <span class="status-badge live">LIVE</span>
          </div>
          <div class="url-display">
            <div class="url-text">
              <span class="url-protocol">https://</span>
              <span class="url-domain">{{ portalUrl }}</span>
            </div>
            <button class="btn-copy" (click)="copyUrl()" [class.copied]="urlCopied">
              <svg *ngIf="!urlCopied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              <svg *ngIf="urlCopied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              {{ urlCopied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <div class="url-meta">
            <span>SSL Secured</span>
            <span>SEO Optimized</span>
            <span>Mobile Responsive</span>
          </div>
        </div>

        <!-- Hero & Branding -->
        <div class="glass-card">
          <div class="card-header">
            <div class="card-icon gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h3>Hero & Branding</h3>
          </div>
          <div class="form-stack">
            <div class="field">
              <label>Hero Title</label>
              <input type="text" [(ngModel)]="settings.heroTitle" placeholder="e.g. Book Your Perfect Look" class="premium-input">
              <span class="field-hint">Displayed prominently at the top of your public portal</span>
            </div>
            <div class="field">
              <label>Hero Subtitle</label>
              <input type="text" [(ngModel)]="settings.heroSubtitle" placeholder="e.g. Luxury salon experience, one click away" class="premium-input">
            </div>
            <div class="field">
              <label>Brand Color</label>
              <div class="color-picker-row">
                <div class="color-swatch" [style.background]="settings.primaryColor" (click)="colorInput.click()"></div>
                <input #colorInput type="color" [(ngModel)]="settings.primaryColor" class="hidden-color">
                <input type="text" [(ngModel)]="settings.primaryColor" class="color-text" placeholder="#B8860B">
              </div>
            </div>
            <div class="field">
              <label>Accent Color</label>
              <div class="color-picker-row">
                <div class="color-swatch" [style.background]="settings.accentColor" (click)="accentInput.click()"></div>
                <input #accentInput type="color" [(ngModel)]="settings.accentColor" class="hidden-color">
                <input type="text" [(ngModel)]="settings.accentColor" class="color-text" placeholder="#1a1a2e">
              </div>
            </div>
            <div class="field">
              <label>Logo Upload</label>
              <div class="upload-zone" (click)="logoInput.click()">
                <input #logoInput type="file" accept="image/*" (change)="onLogoUpload($event)" class="hidden-color">
                <div class="upload-content" *ngIf="!logoPreview">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>Click to upload your logo</span>
                  <span class="upload-hint">PNG, SVG, or JPG (max 2MB)</span>
                </div>
                <div class="upload-preview" *ngIf="logoPreview">
                  <img [src]="logoPreview" alt="Logo preview">
                  <button class="btn-remove-logo" (click)="removeLogo(); $event.stopPropagation()">Remove</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Booking Rules -->
        <div class="glass-card">
          <div class="card-header">
            <div class="card-icon purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h3>Booking Rules</h3>
          </div>
          <div class="rules-grid">
            <div class="rule-item">
              <span class="rule-label">Advance Booking</span>
              <div class="rule-control">
                <input type="number" [(ngModel)]="settings.advanceDays" min="1" max="90" class="rule-input">
                <span class="rule-unit">days</span>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-label">Cancellation Window</span>
              <div class="rule-control">
                <input type="number" [(ngModel)]="settings.cancellationHours" min="1" max="72" class="rule-input">
                <span class="rule-unit">hours</span>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-label">Slot Duration</span>
              <div class="rule-control">
                <select [(ngModel)]="settings.slotMinutes" class="rule-select">
                  <option [value]="15">15 min</option>
                  <option [value]="30">30 min</option>
                  <option [value]="45">45 min</option>
                  <option [value]="60">60 min</option>
                </select>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-label">Max Bookings / Slot</span>
              <div class="rule-control">
                <input type="number" [(ngModel)]="settings.maxPerSlot" min="1" max="20" class="rule-input">
                <span class="rule-unit">clients</span>
              </div>
            </div>
          </div>

          <div class="toggle-section">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-title">Require deposit</span>
                <span class="toggle-desc">Clients must pay upfront to confirm booking</span>
              </div>
              <label class="switch"><input type="checkbox" [(ngModel)]="settings.requireDeposit"><span class="slider"></span></label>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-title">Show staff profiles</span>
                <span class="toggle-desc">Allow clients to choose their preferred stylist</span>
              </div>
              <label class="switch"><input type="checkbox" [(ngModel)]="settings.showStaff"><span class="slider"></span></label>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-title">Show service prices</span>
                <span class="toggle-desc">Display pricing on the public booking page</span>
              </div>
              <label class="switch"><input type="checkbox" [(ngModel)]="settings.showPrices"><span class="slider"></span></label>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-title">Waitlist enabled</span>
                <span class="toggle-desc">Allow clients to join a waitlist when slots are full</span>
              </div>
              <label class="switch"><input type="checkbox" [(ngModel)]="settings.enableWaitlist"><span class="slider"></span></label>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-title">Send confirmation email</span>
                <span class="toggle-desc">Auto-send booking confirmation to client email</span>
              </div>
              <label class="switch"><input type="checkbox" [(ngModel)]="settings.sendEmail"><span class="slider"></span></label>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Preview & Bookings -->
      <div class="preview-column">

        <!-- Live Preview Card -->
        <div class="glass-card preview-card">
          <div class="card-header">
            <div class="card-icon teal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <h3>Live Preview</h3>
          </div>
          <div class="preview-browser">
            <div class="browser-bar">
              <div class="browser-dots">
                <span class="dot red"></span>
                <span class="dot yellow"></span>
                <span class="dot green"></span>
              </div>
              <div class="browser-url">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                {{ portalUrl }}
              </div>
            </div>
            <div class="browser-viewport" [style.background]="'linear-gradient(135deg, ' + settings.primaryColor + '22, ' + settings.accentColor + '22)'">
              <div class="preview-hero-section">
                <div class="preview-logo" *ngIf="logoPreview">
                  <img [src]="logoPreview" alt="Logo">
                </div>
                <div class="preview-logo placeholder-logo" *ngIf="!logoPreview">
                  <span>A</span>
                </div>
                <h2 class="preview-title">{{ settings.heroTitle || 'Book Your Perfect Look' }}</h2>
                <p class="preview-subtitle">{{ settings.heroSubtitle || 'Luxury salon experience, one click away' }}</p>
                <button class="preview-cta" [style.background]="settings.primaryColor">Book Now</button>
              </div>
              <div class="preview-services">
                <div class="preview-service" *ngFor="let s of previewServices">
                  <div class="service-avatar" [style.background]="settings.primaryColor + '33'" [style.color]="settings.primaryColor">{{ s.initial }}</div>
                  <div class="service-info">
                    <span class="service-name">{{ s.name }}</span>
                    <span class="service-duration">{{ s.duration }}</span>
                  </div>
                  <span class="service-price">{{ s.price }}</span>
                </div>
              </div>
              <div class="preview-footer-bar">
                <span>Powered by Ambition Salon</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Bookings -->
        <div class="glass-card">
          <div class="card-header">
            <div class="card-icon green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h3>Active Portal Bookings</h3>
            <span class="count-badge">{{ activeBookings.length }}</span>
          </div>
          <div class="bookings-list" *ngIf="activeBookings.length > 0">
            <div class="booking-row" *ngFor="let b of activeBookings; let i = index" [style.animation-delay]="i * 60 + 'ms'">
              <div class="booking-avatar" [style.background]="bookingColors[i % bookingColors.length]">
                {{ b.clientName.charAt(0) }}
              </div>
              <div class="booking-details">
                <span class="booking-client">{{ b.clientName }}</span>
                <span class="booking-service">{{ b.service }} &middot; {{ b.stylist }}</span>
              </div>
              <div class="booking-time">
                <span class="booking-date">{{ b.date }}</span>
                <span class="booking-slot">{{ b.time }}</span>
              </div>
              <span class="booking-status" [class]="'status-' + b.status.toLowerCase()">{{ b.status }}</span>
            </div>
          </div>
          <div class="empty-bookings" *ngIf="activeBookings.length === 0">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>No active bookings from the portal</span>
          </div>
        </div>

        <!-- Quick Stats Mini -->
        <div class="glass-card mini-stats">
          <div class="mini-stat">
            <span class="mini-value">{{ todayBookings }}</span>
            <span class="mini-label">Today</span>
          </div>
          <div class="mini-divider"></div>
          <div class="mini-stat">
            <span class="mini-value">{{ weekBookings }}</span>
            <span class="mini-label">This Week</span>
          </div>
          <div class="mini-divider"></div>
          <div class="mini-stat">
            <span class="mini-value">{{ conversionRate }}%</span>
            <span class="mini-label">Conversion</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Toast -->
    <div class="toast" *ngIf="showToast" [class.show]="showToast">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      {{ toastMessage }}
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(165deg, #0f0f1a 0%, #1a1a2e 40%, #16213e 100%);
      padding: 0 0 60px 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #e2e8f0;
    }

    /* ── Header ── */
    .portal-header {
      position: relative;
      overflow: hidden;
      padding: 56px 48px 48px;
      background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 50%, #533483 100%);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .header-bg-orbs { position: absolute; inset: 0; pointer-events: none; }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.35;
      animation: orbFloat 8s ease-in-out infinite alternate;
    }
    .orb-1 { width: 400px; height: 400px; background: #b8860b; top: -120px; right: 10%; }
    .orb-2 { width: 300px; height: 300px; background: #e94560; bottom: -100px; left: 5%; animation-delay: 2s; }
    .orb-3 { width: 250px; height: 250px; background: #0f3460; top: 20%; left: 40%; animation-delay: 4s; }
    @keyframes orbFloat {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(30px, -20px) scale(1.15); }
    }
    .header-content { position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; }
    .header-badge {
      display: inline-block;
      padding: 5px 14px;
      background: rgba(184, 134, 11, 0.2);
      border: 1px solid rgba(184, 134, 11, 0.4);
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #daa520;
      margin-bottom: 16px;
    }
    .portal-header h1 {
      font-size: 42px;
      font-weight: 800;
      margin: 0 0 10px;
      background: linear-gradient(135deg, #ffffff 0%, #daa520 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .portal-header p {
      font-size: 17px;
      color: rgba(255,255,255,0.6);
      margin: 0 0 28px;
      max-width: 520px;
    }
    .header-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .btn-gold {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 28px;
      background: linear-gradient(135deg, #b8860b, #daa520);
      color: #0f0f1a;
      border: none; border-radius: 14px;
      font-weight: 700; font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(184, 134, 11, 0.35);
      transition: all 0.3s ease;
    }
    .btn-gold:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(184, 134, 11, 0.5);
    }
    .btn-glass {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 28px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(12px);
      color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 14px;
      font-weight: 600; font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-glass:hover {
      background: rgba(255,255,255,0.14);
      border-color: rgba(255,255,255,0.25);
    }

    /* ── Stats Row ── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      max-width: 1400px;
      margin: -32px auto 32px;
      padding: 0 48px;
      position: relative;
      z-index: 2;
    }
    .stat-card {
      display: flex; align-items: center; gap: 14px;
      padding: 20px 22px;
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 18px;
      animation: fadeSlideUp 0.5s ease both;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .stat-icon {
      width: 46px; height: 46px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .stat-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .stat-value { font-size: 22px; font-weight: 800; color: #fff; }
    .stat-label { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500; }
    .stat-trend {
      font-size: 12px; font-weight: 700;
      padding: 4px 10px; border-radius: 10px;
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.5);
    }
    .stat-trend.up { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .stat-trend.down { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    /* ── Grid Layout ── */
    .portal-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 48px;
    }

    /* ── Glass Cards ── */
    .glass-card {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 22px;
      padding: 28px;
      margin-bottom: 20px;
      transition: border-color 0.3s ease;
    }
    .glass-card:hover {
      border-color: rgba(184, 134, 11, 0.2);
    }
    .card-header {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 22px;
    }
    .card-icon {
      width: 40px; height: 40px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(184, 134, 11, 0.15);
      color: #daa520;
      flex-shrink: 0;
    }
    .card-icon.gold { background: rgba(184, 134, 11, 0.15); color: #daa520; }
    .card-icon.purple { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
    .card-icon.teal { background: rgba(20, 184, 166, 0.15); color: #2dd4bf; }
    .card-icon.green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .card-header h3 {
      font-size: 17px; font-weight: 700; margin: 0; color: #f1f5f9; flex: 1;
    }
    .status-badge {
      font-size: 10px; font-weight: 700; letter-spacing: 1px;
      padding: 4px 12px; border-radius: 20px;
    }
    .status-badge.live {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .count-badge {
      font-size: 12px; font-weight: 700;
      padding: 3px 10px; border-radius: 12px;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.6);
    }

    /* ── URL Card ── */
    .url-display {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      margin-bottom: 14px;
    }
    .url-text { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; }
    .url-protocol { color: rgba(255,255,255,0.35); }
    .url-domain { color: #daa520; font-weight: 600; }
    .btn-copy {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px;
      background: rgba(184, 134, 11, 0.15);
      border: 1px solid rgba(184, 134, 11, 0.3);
      color: #daa520;
      border-radius: 10px;
      font-size: 12px; font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-copy:hover { background: rgba(184, 134, 11, 0.25); }
    .btn-copy.copied {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    .url-meta {
      display: flex; gap: 8px; flex-wrap: wrap;
    }
    .url-meta span {
      font-size: 11px; font-weight: 600;
      padding: 4px 12px; border-radius: 20px;
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.45);
      border: 1px solid rgba(255,255,255,0.06);
    }

    /* ── Form Fields ── */
    .form-stack { display: grid; gap: 18px; }
    .field label {
      display: block;
      font-size: 13px; font-weight: 600;
      color: rgba(255,255,255,0.65);
      margin-bottom: 7px;
    }
    .premium-input {
      width: 100%;
      padding: 13px 16px;
      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: #f1f5f9;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .premium-input:focus {
      border-color: rgba(184, 134, 11, 0.5);
      box-shadow: 0 0 0 3px rgba(184, 134, 11, 0.1);
    }
    .premium-input::placeholder { color: rgba(255,255,255,0.25); }
    .field-hint {
      display: block; margin-top: 5px;
      font-size: 11px; color: rgba(255,255,255,0.3);
    }

    /* ── Color Pickers ── */
    .color-picker-row {
      display: flex; align-items: center; gap: 12px;
    }
    .color-swatch {
      width: 42px; height: 42px;
      border-radius: 12px;
      border: 2px solid rgba(255,255,255,0.15);
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .color-swatch:hover { transform: scale(1.1); }
    .hidden-color { display: none; }
    .color-text {
      flex: 1;
      padding: 11px 14px;
      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      color: #f1f5f9;
      font-size: 13px;
      font-family: 'SF Mono', monospace;
      outline: none;
    }
    .color-text:focus { border-color: rgba(184, 134, 11, 0.4); }

    /* ── Upload Zone ── */
    .upload-zone {
      border: 2px dashed rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.3s ease, background 0.3s ease;
    }
    .upload-zone:hover {
      border-color: rgba(184, 134, 11, 0.4);
      background: rgba(184, 134, 11, 0.04);
    }
    .upload-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .upload-content svg { color: rgba(255,255,255,0.25); }
    .upload-content span { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 500; }
    .upload-hint { font-size: 11px !important; color: rgba(255,255,255,0.25) !important; }
    .upload-preview { position: relative; display: inline-block; }
    .upload-preview img {
      max-height: 80px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .btn-remove-logo {
      position: absolute; top: -8px; right: -8px;
      width: 24px; height: 24px;
      border-radius: 50%;
      background: #ef4444; color: white;
      border: none; font-size: 14px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── Rules Grid ── */
    .rules-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
      margin-bottom: 22px;
    }
    .rule-item {
      padding: 14px 16px;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
    }
    .rule-label {
      display: block;
      font-size: 12px; font-weight: 600;
      color: rgba(255,255,255,0.5);
      margin-bottom: 8px;
    }
    .rule-control { display: flex; align-items: center; gap: 8px; }
    .rule-input, .rule-select {
      flex: 1;
      padding: 10px 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      color: #f1f5f9;
      font-size: 15px; font-weight: 700;
      outline: none;
      font-family: inherit;
    }
    .rule-input:focus, .rule-select:focus {
      border-color: rgba(184, 134, 11, 0.4);
    }
    .rule-unit {
      font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 500;
      min-width: 40px;
    }
    .rule-select { cursor: pointer; }
    .rule-select option { background: #1a1a2e; color: #f1f5f9; }

    /* ── Toggles ── */
    .toggle-section {
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-top: 18px;
    }
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .toggle-row:last-child { border: 0; }
    .toggle-info { display: flex; flex-direction: column; gap: 2px; }
    .toggle-title { font-size: 14px; font-weight: 600; color: #e2e8f0; }
    .toggle-desc { font-size: 11px; color: rgba(255,255,255,0.35); }
    .switch {
      position: relative; display: inline-block;
      width: 48px; height: 26px; flex-shrink: 0;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; cursor: pointer;
      inset: 0;
      background: rgba(255,255,255,0.1);
      border-radius: 26px;
      transition: 0.3s;
    }
    .slider:before {
      content: '';
      position: absolute;
      height: 20px; width: 20px;
      left: 3px; bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }
    .switch input:checked + .slider { background: linear-gradient(135deg, #b8860b, #daa520); }
    .switch input:checked + .slider:before { transform: translateX(22px); }

    /* ── Preview Browser ── */
    .preview-browser {
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .browser-bar {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      background: rgba(0,0,0,0.4);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .browser-dots { display: flex; gap: 6px; }
    .dot {
      width: 10px; height: 10px; border-radius: 50%;
    }
    .dot.red { background: #ef4444; }
    .dot.yellow { background: #eab308; }
    .dot.green { background: #22c55e; }
    .browser-url {
      flex: 1;
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      font-size: 11px; color: rgba(255,255,255,0.4);
      font-family: 'SF Mono', monospace;
    }
    .browser-viewport {
      min-height: 320px;
      display: flex; flex-direction: column;
    }
    .preview-hero-section {
      padding: 36px 24px 24px;
      text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .preview-logo {
      width: 56px; height: 56px;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 4px;
    }
    .preview-logo img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder-logo {
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #b8860b, #daa520);
      color: #0f0f1a;
      font-size: 24px; font-weight: 800;
    }
    .preview-title {
      font-size: 18px; font-weight: 800; margin: 0;
      color: #f1f5f9;
    }
    .preview-subtitle {
      font-size: 12px; margin: 0;
      color: rgba(255,255,255,0.5);
    }
    .preview-cta {
      margin-top: 8px;
      padding: 10px 28px;
      border: none; border-radius: 10px;
      color: #0f0f1a;
      font-weight: 700; font-size: 13px;
      cursor: pointer;
    }
    .preview-services {
      padding: 0 16px 16px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .preview-service {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 10px;
    }
    .service-avatar {
      width: 32px; height: 32px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700;
      flex-shrink: 0;
    }
    .service-info {
      display: flex; flex-direction: column; gap: 1px; flex: 1;
    }
    .service-name { font-size: 12px; font-weight: 600; color: #e2e8f0; }
    .service-duration { font-size: 10px; color: rgba(255,255,255,0.35); }
    .service-price {
      font-size: 13px; font-weight: 700; color: #daa520;
    }
    .preview-footer-bar {
      margin-top: auto;
      padding: 10px;
      text-align: center;
      font-size: 10px;
      color: rgba(255,255,255,0.2);
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    /* ── Active Bookings ── */
    .bookings-list {
      display: flex; flex-direction: column; gap: 4px;
    }
    .booking-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: rgba(0,0,0,0.15);
      border-radius: 12px;
      animation: fadeSlideUp 0.4s ease both;
      transition: background 0.2s ease;
    }
    .booking-row:hover { background: rgba(0,0,0,0.25); }
    .booking-avatar {
      width: 38px; height: 38px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; color: white;
      flex-shrink: 0;
    }
    .booking-details {
      display: flex; flex-direction: column; gap: 2px; flex: 1;
      min-width: 0;
    }
    .booking-client {
      font-size: 13px; font-weight: 600; color: #e2e8f0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .booking-service {
      font-size: 11px; color: rgba(255,255,255,0.4);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .booking-time {
      display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
      flex-shrink: 0;
    }
    .booking-date { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.6); }
    .booking-slot { font-size: 10px; color: rgba(255,255,255,0.3); }
    .booking-status {
      font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
      padding: 4px 10px; border-radius: 8px;
      flex-shrink: 0;
    }
    .status-confirmed { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .status-pending { background: rgba(234, 179, 8, 0.15); color: #fbbf24; }
    .status-cancelled { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .empty-bookings {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 32px; color: rgba(255,255,255,0.25);
    }
    .empty-bookings span { font-size: 13px; }

    /* ── Mini Stats ── */
    .mini-stats {
      display: flex; align-items: center; justify-content: space-around;
      padding: 20px 28px;
    }
    .mini-stat { text-align: center; }
    .mini-value {
      display: block;
      font-size: 26px; font-weight: 800; color: #daa520;
    }
    .mini-label {
      font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 500;
    }
    .mini-divider {
      width: 1px; height: 36px;
      background: rgba(255,255,255,0.08);
    }

    /* ── Toast ── */
    .toast {
      position: fixed; bottom: 32px; right: 32px;
      display: flex; align-items: center; gap: 10px;
      padding: 14px 24px;
      background: rgba(16, 185, 129, 0.95);
      color: white;
      border-radius: 14px;
      font-weight: 600; font-size: 14px;
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
      z-index: 100;
      animation: toastIn 0.4s ease;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
      .portal-grid { grid-template-columns: 1fr; }
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 700px) {
      .portal-header { padding: 36px 20px 32px; }
      .portal-header h1 { font-size: 28px; }
      .stats-row { grid-template-columns: 1fr; padding: 0 20px; margin-top: -20px; }
      .portal-grid { padding: 0 20px; }
      .rules-grid { grid-template-columns: 1fr; }
      .stat-card { padding: 16px; }
    }
  `]
})
export class OnlinePortalComponent implements OnInit {
  private http = inject(HttpClient);

  portalUrl = 'salon.ambition.app/book';
  urlCopied = false;
  showToast = false;
  toastMessage = '';
  logoPreview: string | null = null;

  settings = {
    heroTitle: 'Book Your Perfect Look',
    heroSubtitle: 'Luxury salon experience, one click away',
    primaryColor: '#b8860b',
    accentColor: '#1a1a2e',
    advanceDays: 30,
    cancellationHours: 24,
    slotMinutes: 30,
    maxPerSlot: 4,
    requireDeposit: false,
    showStaff: true,
    showPrices: true,
    enableWaitlist: false,
    sendEmail: true,
  };

  kpiStats = [
    { label: 'Total Bookings', value: '1,284', trend: 12.5, icon: '&#x1F4C5;', gradient: 'linear-gradient(135deg, #b8860b33, #daa52033)' },
    { label: 'This Month', value: '156', trend: 8.3, icon: '&#x1F4C6;', gradient: 'linear-gradient(135deg, #8b5cf633, #a78bfa33)' },
    { label: 'Revenue (Online)', value: '$42.8K', trend: 15.2, icon: '&#x1F4B0;', gradient: 'linear-gradient(135deg, #10b98133, #34d39933)' },
    { label: 'Conversion Rate', value: '68%', trend: -2.1, icon: '&#x1F4C8;', gradient: 'linear-gradient(135deg, #14b8a633, #2dd4bf33)' },
  ];

  previewServices = [
    { name: 'Haircut & Styling', duration: '45 min', price: '$65', initial: 'H' },
    { name: 'Color Treatment', duration: '90 min', price: '$120', initial: 'C' },
    { name: 'Beard Trim', duration: '20 min', price: '$25', initial: 'B' },
    { name: 'Spa Facial', duration: '60 min', price: '$85', initial: 'S' },
  ];

  activeBookings = [
    { clientName: 'Sarah Mitchell', service: 'Haircut & Styling', stylist: 'Priya K.', date: 'Today', time: '2:30 PM', status: 'Confirmed' },
    { clientName: 'James Rodriguez', service: 'Beard Trim', stylist: 'Rahul M.', date: 'Today', time: '3:15 PM', status: 'Pending' },
    { clientName: 'Emily Chen', service: 'Color Treatment', stylist: 'Priya K.', date: 'Tomorrow', time: '10:00 AM', status: 'Confirmed' },
    { clientName: 'Michael Brown', service: 'Haircut & Styling', stylist: 'Anita S.', date: 'Jul 11', time: '11:30 AM', status: 'Confirmed' },
  ];

  bookingColors = [
    'linear-gradient(135deg, #b8860b, #daa520)',
    'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    'linear-gradient(135deg, #14b8a6, #2dd4bf)',
    'linear-gradient(135deg, #e94560, #ff6b6b)',
  ];

  todayBookings = 12;
  weekBookings = 47;
  conversionRate = 68;

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.http.get<any>('/api/online-portal/settings').subscribe({
      next: (data) => {
        if (data) {
          this.settings = { ...this.settings, ...data };
          this.portalUrl = data.portalUrl || this.portalUrl;
        }
      },
      error: () => {},
    });
  }

  copyUrl(): void {
    navigator.clipboard.writeText('https://' + this.portalUrl);
    this.urlCopied = true;
    setTimeout(() => (this.urlCopied = false), 2000);
  }

  onLogoUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.logoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.logoPreview = null;
  }

  saveAll(): void {
    this.http.put('/api/online-portal/settings', this.settings).subscribe({
      next: () => {
        this.toastMessage = 'Portal settings saved successfully!';
        this.showToast = true;
        setTimeout(() => (this.showToast = false), 3000);
      },
      error: () => {
        this.toastMessage = 'Failed to save settings.';
        this.showToast = true;
        setTimeout(() => (this.showToast = false), 3000);
      },
    });
  }

  previewPortal(): void {
    window.open('https://' + this.portalUrl, '_blank');
  }
}
