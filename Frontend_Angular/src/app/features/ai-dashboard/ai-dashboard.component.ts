import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { interval, Subject, takeUntil, forkJoin, of, catchError } from 'rxjs';

@Component({
  selector: 'app-ai-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="ai-dashboard">
      <!-- HEADER -->
      <header class="dash-header">
        <div class="header-glow"></div>
        <div class="header-content">
          <div class="header-left">
            <div class="ai-icon-wrap">
              <div class="ai-icon-pulse"></div>
              <svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h1>AI Command Center</h1>
              <p class="subtitle">Salon Intelligence & Optimization Engine</p>
            </div>
          </div>
          <div class="header-right">
            <div class="status-indicator">
              <span class="status-dot pulse"></span>
              <span>System Online</span>
            </div>
            <div class="header-meta">
              <span>{{ currentTime | date:'HH:mm:ss' }}</span>
              <span>{{ currentTime | date:'dd MMM yyyy' }}</span>
            </div>
            <button class="refresh-btn" (click)="refreshAll()" [disabled]="loading">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.spinning]="loading">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <!-- LOADING -->
      <div class="loading-overlay" *ngIf="loading && !hasData">
        <div class="loading-ring">
          <div class="ring-segment"></div>
          <div class="ring-segment"></div>
          <div class="ring-segment"></div>
        </div>
        <p class="loading-text">Initializing AI Systems...</p>
        <div class="loading-bar">
          <div class="loading-fill"></div>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="dash-content" *ngIf="!loading || hasData">

        <!-- KPI ROW -->
        <div class="kpi-row">
          <div class="kpi-card revenue-today">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div class="kpi-data">
              <span class="kpi-label">Revenue Today</span>
              <strong class="kpi-value neon-green">\${{ kpis.revenueToday | number:'1.0-0' }}</strong>
              <span class="kpi-change positive">+{{ kpis.revenueGrowth }}% vs yesterday</span>
            </div>
          </div>
          <div class="kpi-card predicted-revenue">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div class="kpi-data">
              <span class="kpi-label">Predicted Revenue</span>
              <strong class="kpi-value neon-blue">\${{ kpis.predictedRevenue | number:'1.0-0' }}</strong>
              <span class="kpi-change">{{ kpis.confidence }}% confidence</span>
            </div>
          </div>
          <div class="kpi-card occupancy-rate">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div class="kpi-data">
              <span class="kpi-label">Occupancy Rate</span>
              <strong class="kpi-value neon-purple">{{ kpis.occupancyRate }}%</strong>
              <span class="kpi-change">Target: {{ kpis.occupancyTarget }}%</span>
            </div>
          </div>
          <div class="kpi-card no-show-risk">
            <div class="kpi-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="kpi-data">
              <span class="kpi-label">No-Show Risk</span>
              <strong class="kpi-value neon-red">{{ kpis.noShowRisk }}%</strong>
              <span class="kpi-change negative">{{ kpis.highRiskCount }} high-risk bookings</span>
            </div>
          </div>
        </div>

        <!-- SECTION: HEATMAP + STAFF -->
        <div class="grid-2col">

          <!-- CHAIR UTILIZATION HEATMAP -->
          <div class="panel glass-panel">
            <div class="panel-header">
              <h2>Chair Utilization Heatmap</h2>
              <span class="panel-badge">Live</span>
            </div>
            <div class="heatmap-container">
              <div class="heatmap-labels">
                <div class="heatmap-corner"></div>
                <div class="heatmap-hour" *ngFor="let h of heatmapHours">{{ h }}</div>
              </div>
              <div class="heatmap-row" *ngFor="let chair of heatmapData">
                <div class="heatmap-chair-label">{{ chair.name }}</div>
                <div class="heatmap-cell"
                     *ngFor="let cell of chair.cells"
                     [style.background]="cell.color"
                     [title]="chair.name + ' @ ' + cell.hour + ': ' + cell.utilization + '%'">
                  <span class="cell-tooltip">{{ cell.utilization }}%</span>
                </div>
              </div>
              <div class="heatmap-legend">
                <span class="legend-label">Low</span>
                <div class="legend-gradient"></div>
                <span class="legend-label">High</span>
              </div>
            </div>
          </div>

          <!-- STAFF OPTIMIZATION CARDS -->
          <div class="panel glass-panel">
            <div class="panel-header">
              <h2>Staff Optimization</h2>
              <span class="panel-badge ai-badge">AI Powered</span>
            </div>
            <div class="staff-grid">
              <div class="staff-card" *ngFor="let staff of staffData" [class]="'staff-' + staff.status">
                <div class="staff-avatar" [style.border-color]="staff.color">
                  <span>{{ staff.name.charAt(0) }}</span>
                </div>
                <div class="staff-info">
                  <strong>{{ staff.name }}</strong>
                  <span class="staff-role">{{ staff.role }}</span>
                </div>
                <div class="staff-util-ring">
                  <svg viewBox="0 0 36 36">
                    <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    <path class="ring-fill" [style.stroke]="staff.color"
                          [style.stroke-dasharray]="staff.utilization + ', 100'"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  </svg>
                  <span class="ring-text">{{ staff.utilization }}%</span>
                </div>
                <div class="staff-recommendation">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                  {{ staff.recommendation }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION: REVENUE + PREDICTIONS -->
        <div class="grid-2col">

          <!-- REVENUE OPTIMIZATION -->
          <div class="panel glass-panel">
            <div class="panel-header">
              <h2>Revenue Optimization</h2>
              <span class="panel-badge premium-badge">Premium</span>
            </div>
            <div class="revenue-sections">
              <div class="revenue-sub">
                <h3>Peak Hours Analysis</h3>
                <div class="peak-hours">
                  <div class="peak-hour-bar" *ngFor="let peak of peakHours">
                    <div class="peak-bar-fill" [style.height.%]="peak.demand" [style.background]="peak.color"></div>
                    <span class="peak-label">{{ peak.hour }}</span>
                    <span class="peak-demand">{{ peak.demand }}%</span>
                  </div>
                </div>
              </div>
              <div class="revenue-sub">
                <h3>Dynamic Pricing Suggestions</h3>
                <div class="pricing-list">
                  <div class="pricing-item" *ngFor="let price of dynamicPricing">
                    <div class="pricing-service">{{ price.service }}</div>
                    <div class="pricing-details">
                      <span class="pricing-time">{{ price.timeSlot }}</span>
                      <span class="pricing-adjustment" [class]="price.adjustment > 0 ? 'increase' : 'decrease'">
                        {{ price.adjustment > 0 ? '+' : '' }}{{ price.adjustment }}%
                      </span>
                      <span class="pricing-impact">\${{ price.impact }} est. impact</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- BOOKING PREDICTIONS -->
          <div class="panel glass-panel">
            <div class="panel-header">
              <h2>Booking Predictions</h2>
              <span class="panel-badge">7-Day Forecast</span>
            </div>
            <div class="chart-area">
              <div class="chart-bars">
                <div class="chart-bar-group" *ngFor="let day of bookingPredictions">
                  <div class="chart-bar-container">
                    <div class="chart-bar predicted" [style.height.%]="day.predicted">
                      <span class="bar-tooltip">{{ day.predicted }}%</span>
                    </div>
                    <div class="chart-bar actual" *ngIf="day.actual" [style.height.%]="day.actual">
                      <span class="bar-tooltip">{{ day.actual }}%</span>
                    </div>
                  </div>
                  <span class="chart-label">{{ day.day }}</span>
                  <span class="chart-date">{{ day.date }}</span>
                </div>
              </div>
              <div class="chart-legend">
                <span class="legend-item"><span class="legend-dot predicted"></span>Predicted</span>
                <span class="legend-item"><span class="legend-dot actual"></span>Actual</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION: NO-SHOW + WAITLIST -->
        <div class="grid-2col">

          <!-- NO-SHOW RISK ALERTS -->
          <div class="panel glass-panel">
            <div class="panel-header">
              <h2>No-Show Risk Alerts</h2>
              <span class="panel-badge danger-badge">{{ noShowAlerts.length }} Active</span>
            </div>
            <div class="alert-list">
              <div class="alert-item" *ngFor="let alert of noShowAlerts" [class]="'risk-' + alert.riskLevel">
                <div class="alert-risk-indicator">
                  <div class="risk-gauge">
                    <svg viewBox="0 0 36 36">
                      <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                      <path class="ring-fill" [style.stroke]="alert.riskColor"
                            [style.stroke-dasharray]="alert.riskScore + ', 100'"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    </svg>
                    <span class="risk-score">{{ alert.riskScore }}%</span>
                  </div>
                </div>
                <div class="alert-content">
                  <strong>{{ alert.clientName }}</strong>
                  <span class="alert-service">{{ alert.service }} &middot; {{ alert.time }}</span>
                  <div class="alert-factors">
                    <span class="factor" *ngFor="let f of alert.factors">{{ f }}</span>
                  </div>
                </div>
                <div class="alert-actions">
                  <button class="action-btn send-reminder" (click)="sendReminder(alert)">Send Reminder</button>
                  <button class="action-btn mark-no-show" (click)="markNoShow(alert)">Mark No-Show</button>
                </div>
              </div>
              <div class="empty-state" *ngIf="noShowAlerts.length === 0">
                <p>No high-risk bookings detected at this time.</p>
              </div>
            </div>
          </div>

          <!-- AUTO WAITLIST FILL -->
          <div class="panel glass-panel">
            <div class="panel-header">
              <h2>Smart Waitlist Auto-Fill</h2>
              <span class="panel-badge auto-badge">Auto</span>
            </div>
            <div class="waitlist-section">
              <div class="waitlist-slots">
                <div class="waitlist-slot" *ngFor="let slot of waitlistSlots">
                  <div class="slot-header">
                    <span class="slot-time">{{ slot.time }}</span>
                    <span class="slot-status" [class]="'status-' + slot.status">{{ slot.status }}</span>
                  </div>
                  <div class="slot-client" *ngIf="slot.cancelledClient">
                    <span class="cancelled-label">Cancelled:</span> {{ slot.cancelledClient }}
                  </div>
                  <div class="slot-fill" *ngIf="slot.filledClient">
                    <div class="fill-indicator">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <polyline points="17 11 19 13 23 9"/>
                      </svg>
                      <span>Auto-filled: <strong>{{ slot.filledClient }}</strong></span>
                    </div>
                    <span class="match-score">Match Score: {{ slot.matchScore }}%</span>
                  </div>
                  <div class="slot-pending" *ngIf="slot.status === 'pending'">
                    <span>Scanning waitlist for best match...</span>
                    <div class="scan-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="waitlist-stats">
                <div class="wl-stat">
                  <strong>{{ waitlistStats.totalWaiting }}</strong>
                  <span>Waiting</span>
                </div>
                <div class="wl-stat">
                  <strong>{{ waitlistStats.autoFilled }}</strong>
                  <span>Auto-Filled Today</span>
                </div>
                <div class="wl-stat">
                  <strong>{{ waitlistStats.revenueSaved }}</strong>
                  <span>Revenue Saved</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION: PROMOTIONS + ROUTE OPTIMIZER -->
        <div class="grid-2col">

          <!-- SMART PROMOTIONS -->
          <div class="panel glass-panel">
            <div class="panel-header">
              <h2>Smart Promotions</h2>
              <span class="panel-badge ai-badge">AI Targeted</span>
            </div>
            <div class="promo-list">
              <div class="promo-card" *ngFor="let promo of promotions" [class.active-promo]="promo.isActive">
                <div class="promo-header-row">
                  <span class="promo-type-badge" [class]="'type-' + promo.type">{{ promo.type }}</span>
                  <span class="promo-status" *ngIf="promo.isActive">Active</span>
                </div>
                <strong class="promo-title">{{ promo.title }}</strong>
                <p class="promo-desc">{{ promo.description }}</p>
                <div class="promo-metrics">
                  <div class="promo-metric">
                    <span>Target Segment</span>
                    <strong>{{ promo.segment }}</strong>
                  </div>
                  <div class="promo-metric">
                    <span>Expected Lift</span>
                    <strong class="neon-green">+{{ promo.expectedLift }}%</strong>
                  </div>
                  <div class="promo-metric">
                    <span>ROI</span>
                    <strong>{{ promo.roi }}x</strong>
                  </div>
                </div>
                <div class="promo-actions">
                  <button class="promo-btn activate" *ngIf="!promo.isActive" (click)="activatePromo(promo)">Activate</button>
                  <button class="promo-btn pause" *ngIf="promo.isActive" (click)="pausePromo(promo)">Pause</button>
                  <button class="promo-btn edit">Edit</button>
                </div>
              </div>
            </div>
          </div>

          <!-- SERVICE ROUTE OPTIMIZER -->
          <div class="panel glass-panel">
            <div class="panel-header">
              <h2>Service Route Optimizer</h2>
              <span class="panel-badge premium-badge">Optimized</span>
            </div>
            <div class="route-optimizer">
              <div class="route-timeline">
                <div class="route-node" *ngFor="let step of serviceRoute; let i = index; let last = last">
                  <div class="node-connector" *ngIf="!last">
                    <div class="connector-line"></div>
                    <span class="connector-time">{{ step.transitionTime }}min</span>
                  </div>
                  <div class="node-dot" [style.background]="step.color">
                    <span>{{ i + 1 }}</span>
                  </div>
                  <div class="node-card">
                    <strong>{{ step.service }}</strong>
                    <span class="node-staff">Staff: {{ step.staff }}</span>
                    <span class="node-duration">{{ step.duration }}min</span>
                    <span class="node-revenue">\${{ step.revenue }}</span>
                    <div class="node-optimization" *ngIf="step.optimization">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                      </svg>
                      {{ step.optimization }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="route-summary">
                <div class="route-stat">
                  <span>Total Duration</span>
                  <strong>{{ routeStats.totalDuration }}min</strong>
                </div>
                <div class="route-stat">
                  <span>Revenue</span>
                  <strong class="neon-green">\${{ routeStats.totalRevenue }}</strong>
                </div>
                <div class="route-stat">
                  <span>Efficiency Gain</span>
                  <strong class="neon-blue">+{{ routeStats.efficiencyGain }}%</strong>
                </div>
                <div class="route-stat">
                  <span>Time Saved</span>
                  <strong class="neon-purple">{{ routeStats.timeSaved }}min</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  `,
  styles: [`
    /* ===== BASE RESET & VARIABLES ===== */
    :host {
      --neon-green: #00ff88;
      --neon-blue: #00d4ff;
      --neon-purple: #b44dff;
      --neon-red: #ff4466;
      --neon-yellow: #ffcc00;
      --neon-pink: #ff6eb4;
      --dark-bg: #0a0e17;
      --dark-card: rgba(15, 20, 35, 0.85);
      --dark-card-hover: rgba(20, 28, 50, 0.95);
      --glass-border: rgba(255, 255, 255, 0.06);
      --glass-shine: rgba(255, 255, 255, 0.03);
      --text-primary: #e8ecf4;
      --text-secondary: #7a8ba8;
      --text-muted: #4a5568;
      --danger-glow: rgba(255, 68, 102, 0.3);
      --success-glow: rgba(0, 255, 136, 0.3);
      display: block;
    }

    /* ===== SCROLLBAR ===== */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--dark-bg); }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

    /* ===== AI DASHBOARD CONTAINER ===== */
    .ai-dashboard {
      min-height: 100vh;
      background: var(--dark-bg);
      background-image:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 212, 255, 0.08), transparent),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(180, 77, 255, 0.06), transparent),
        radial-gradient(ellipse 40% 30% at 10% 50%, rgba(0, 255, 136, 0.04), transparent);
      padding: 24px;
      color: var(--text-primary);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* ===== HEADER ===== */
    .dash-header {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: 28px;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(180, 77, 255, 0.08), rgba(0, 255, 136, 0.05));
      border: 1px solid var(--glass-border);
    }

    .header-glow {
      position: absolute;
      top: -50%;
      left: -10%;
      width: 120%;
      height: 200%;
      background: radial-gradient(ellipse at 30% 20%, rgba(0, 212, 255, 0.12), transparent 60%),
                  radial-gradient(ellipse at 70% 80%, rgba(180, 77, 255, 0.1), transparent 60%);
      pointer-events: none;
      animation: headerGlow 8s ease-in-out infinite alternate;
    }

    @keyframes headerGlow {
      0% { opacity: 0.6; transform: translateX(-5%); }
      100% { opacity: 1; transform: translateX(5%); }
    }

    .header-content {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 28px 36px;
      z-index: 1;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .ai-icon-wrap {
      position: relative;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ai-icon-pulse {
      position: absolute;
      inset: -4px;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
      opacity: 0.3;
      animation: iconPulse 3s ease-in-out infinite;
    }

    @keyframes iconPulse {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.12); opacity: 0.5; }
    }

    .ai-icon {
      position: relative;
      width: 32px;
      height: 32px;
      color: var(--neon-blue);
      filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.5));
    }

    .dash-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, #fff, var(--neon-blue));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 500;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--neon-green);
      font-weight: 600;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--neon-green);
      box-shadow: 0 0 10px var(--neon-green), 0 0 20px rgba(0, 255, 136, 0.3);
    }

    .status-dot.pulse {
      animation: dotPulse 2s ease-in-out infinite;
    }

    @keyframes dotPulse {
      0%, 100% { box-shadow: 0 0 10px var(--neon-green), 0 0 20px rgba(0, 255, 136, 0.3); }
      50% { box-shadow: 0 0 16px var(--neon-green), 0 0 32px rgba(0, 255, 136, 0.5); }
    }

    .header-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      backdrop-filter: blur(8px);
    }

    .refresh-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .refresh-btn:disabled { opacity: 0.4; cursor: default; }

    .refresh-btn svg { width: 16px; height: 16px; }
    .refresh-btn svg.spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ===== LOADING OVERLAY ===== */
    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 120px 0;
      gap: 24px;
    }

    .loading-ring {
      position: relative;
      width: 64px;
      height: 64px;
    }

    .ring-segment {
      position: absolute;
      inset: 0;
      border: 3px solid transparent;
      border-top-color: var(--neon-blue);
      border-radius: 50%;
      animation: ringSpin 1.4s linear infinite;
    }

    .ring-segment:nth-child(2) {
      inset: 6px;
      border-top-color: var(--neon-purple);
      animation-delay: -0.5s;
      animation-direction: reverse;
    }

    .ring-segment:nth-child(3) {
      inset: 12px;
      border-top-color: var(--neon-green);
      animation-delay: -1s;
    }

    @keyframes ringSpin { to { transform: rotate(360deg); } }

    .loading-text {
      color: var(--text-secondary);
      font-size: 15px;
      font-weight: 600;
      animation: textFade 2s ease-in-out infinite;
    }

    @keyframes textFade {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    .loading-bar {
      width: 200px;
      height: 3px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 2px;
      overflow: hidden;
    }

    .loading-fill {
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, var(--neon-blue), var(--neon-purple), var(--neon-green));
      animation: loadingBar 2s ease-in-out infinite;
      transform-origin: left;
    }

    @keyframes loadingBar {
      0% { transform: scaleX(0) translateX(-20%); }
      50% { transform: scaleX(0.6) translateX(20%); }
      100% { transform: scaleX(0) translateX(120%); }
    }

    /* ===== KPI ROW ===== */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-bottom: 24px;
    }

    .kpi-card {
      position: relative;
      background: var(--dark-card);
      border: 1px solid var(--glass-border);
      border-radius: 18px;
      padding: 22px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(16px);
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      border-radius: 18px 18px 0 0;
    }

    .kpi-card.revenue-today::before { background: linear-gradient(90deg, var(--neon-green), transparent); }
    .kpi-card.predicted-revenue::before { background: linear-gradient(90deg, var(--neon-blue), transparent); }
    .kpi-card.occupancy-rate::before { background: linear-gradient(90deg, var(--neon-purple), transparent); }
    .kpi-card.no-show-risk::before { background: linear-gradient(90deg, var(--neon-red), transparent); }

    .kpi-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }

    .kpi-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .revenue-today .kpi-icon { background: rgba(0, 255, 136, 0.1); color: var(--neon-green); }
    .predicted-revenue .kpi-icon { background: rgba(0, 212, 255, 0.1); color: var(--neon-blue); }
    .occupancy-rate .kpi-icon { background: rgba(180, 77, 255, 0.1); color: var(--neon-purple); }
    .no-show-risk .kpi-icon { background: rgba(255, 68, 102, 0.1); color: var(--neon-red); }

    .kpi-icon.warning { animation: warningPulse 2s ease-in-out infinite; }
    @keyframes warningPulse {
      0%, 100% { background: rgba(255, 68, 102, 0.1); }
      50% { background: rgba(255, 68, 102, 0.2); }
    }

    .kpi-icon svg { width: 22px; height: 22px; }

    .kpi-data { display: flex; flex-direction: column; gap: 4px; }

    .kpi-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .kpi-value {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .kpi-change { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
    .kpi-change.positive { color: var(--neon-green); }
    .kpi-change.negative { color: var(--neon-red); }

    .neon-green { color: var(--neon-green); text-shadow: 0 0 20px rgba(0, 255, 136, 0.3); }
    .neon-blue { color: var(--neon-blue); text-shadow: 0 0 20px rgba(0, 212, 255, 0.3); }
    .neon-purple { color: var(--neon-purple); text-shadow: 0 0 20px rgba(180, 77, 255, 0.3); }
    .neon-red { color: var(--neon-red); text-shadow: 0 0 20px rgba(255, 68, 102, 0.3); }

    /* ===== PANEL BASE ===== */
    .glass-panel {
      background: var(--dark-card);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(16px);
      transition: all 0.4s;
    }

    .glass-panel::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
    }

    .glass-panel:hover {
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .panel-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: rgba(0, 212, 255, 0.1);
      color: var(--neon-blue);
      border: 1px solid rgba(0, 212, 255, 0.2);
    }

    .ai-badge { background: rgba(180, 77, 255, 0.1); color: var(--neon-purple); border-color: rgba(180, 77, 255, 0.2); }
    .premium-badge { background: rgba(255, 204, 0, 0.1); color: var(--neon-yellow); border-color: rgba(255, 204, 0, 0.2); }
    .danger-badge { background: rgba(255, 68, 102, 0.1); color: var(--neon-red); border-color: rgba(255, 68, 102, 0.2); animation: dangerPulse 2s ease-in-out infinite; }
    .auto-badge { background: rgba(0, 255, 136, 0.1); color: var(--neon-green); border-color: rgba(0, 255, 136, 0.2); }

    @keyframes dangerPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255, 68, 102, 0); }
      50% { box-shadow: 0 0 12px 2px rgba(255, 68, 102, 0.2); }
    }

    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    /* ===== HEATMAP ===== */
    .heatmap-container { overflow-x: auto; }

    .heatmap-labels {
      display: grid;
      grid-template-columns: 80px repeat(14, 1fr);
      gap: 3px;
      margin-bottom: 3px;
    }

    .heatmap-corner { /* empty */ }

    .heatmap-hour {
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      padding: 4px 0;
    }

    .heatmap-row {
      display: grid;
      grid-template-columns: 80px repeat(14, 1fr);
      gap: 3px;
      margin-bottom: 3px;
    }

    .heatmap-chair-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      padding-right: 8px;
    }

    .heatmap-cell {
      aspect-ratio: 1.6;
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
      min-height: 28px;
    }

    .heatmap-cell:hover {
      transform: scale(1.15);
      z-index: 10;
      box-shadow: 0 0 16px rgba(0, 0, 0, 0.5);
    }

    .cell-tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 20;
    }

    .heatmap-cell:hover .cell-tooltip { display: block; }

    .heatmap-legend {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 12px;
    }

    .legend-label { font-size: 11px; color: var(--text-muted); font-weight: 600; }

    .legend-gradient {
      width: 160px;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(90deg, #1a3a2a, #166534, #65a30d, #eab308, #f97316, #ef4444);
    }

    /* ===== STAFF CARDS ===== */
    .staff-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }

    .staff-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      transition: all 0.3s;
    }

    .staff-card:hover {
      background: rgba(255, 255, 255, 0.04);
      transform: translateY(-2px);
    }

    .staff-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: 2px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
      flex-shrink: 0;
    }

    .staff-info { flex: 1; min-width: 0; }
    .staff-info strong { display: block; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .staff-role { font-size: 11px; color: var(--text-muted); font-weight: 500; }

    .staff-util-ring {
      position: relative;
      width: 52px;
      height: 52px;
    }

    .staff-util-ring svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .ring-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.05);
      stroke-width: 3;
    }

    .ring-fill {
      fill: none;
      stroke-width: 3;
      stroke-linecap: round;
      transition: stroke-dasharray 1s ease;
    }

    .ring-text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
    }

    .staff-recommendation {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.02);
      padding: 8px 10px;
      border-radius: 8px;
      border-top: 1px solid var(--glass-border);
    }

    .staff-recommendation svg { color: var(--neon-yellow); flex-shrink: 0; }
    .staff-overbooked { border-color: rgba(255, 68, 102, 0.2); }
    .staff-optimal { border-color: rgba(0, 255, 136, 0.2); }
    .staff-underutilized { border-color: rgba(0, 212, 255, 0.2); }

    /* ===== REVENUE OPTIMIZATION ===== */
    .revenue-sections { display: grid; gap: 20px; }

    .revenue-sub h3 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .peak-hours {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 120px;
      padding: 0 4px;
    }

    .peak-hour-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      height: 100%;
      justify-content: flex-end;
    }

    .peak-bar-fill {
      width: 100%;
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .peak-bar-fill:hover { filter: brightness(1.3); }

    .peak-label { font-size: 10px; color: var(--text-muted); font-weight: 600; }
    .peak-demand { font-size: 9px; color: var(--text-secondary); font-weight: 700; }

    .pricing-list { display: grid; gap: 8px; }

    .pricing-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 10px;
      border: 1px solid var(--glass-border);
      transition: all 0.3s;
    }

    .pricing-item:hover { background: rgba(255, 255, 255, 0.04); }

    .pricing-service { font-size: 13px; font-weight: 600; }

    .pricing-details {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
    }

    .pricing-time { color: var(--text-muted); }
    .pricing-adjustment { font-weight: 800; }
    .pricing-adjustment.increase { color: var(--neon-green); }
    .pricing-adjustment.decrease { color: var(--neon-blue); }
    .pricing-impact { color: var(--text-secondary); font-weight: 500; }

    /* ===== CHART AREA ===== */
    .chart-area { display: flex; flex-direction: column; gap: 16px; }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 180px;
      padding: 0 8px;
    }

    .chart-bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      height: 100%;
    }

    .chart-bar-container {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 3px;
      width: 100%;
    }

    .chart-bar {
      flex: 1;
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .chart-bar.predicted {
      background: linear-gradient(180deg, var(--neon-blue), rgba(0, 212, 255, 0.3));
      box-shadow: 0 0 12px rgba(0, 212, 255, 0.2);
    }

    .chart-bar.actual {
      background: linear-gradient(180deg, var(--neon-purple), rgba(180, 77, 255, 0.3));
      box-shadow: 0 0 12px rgba(180, 77, 255, 0.2);
    }

    .chart-bar:hover { filter: brightness(1.3); }

    .bar-tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
      z-index: 10;
    }

    .chart-bar:hover .bar-tooltip { display: block; }

    .chart-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .chart-date { font-size: 10px; color: var(--text-muted); }

    .chart-legend {
      display: flex;
      gap: 16px;
      justify-content: center;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }

    .legend-dot.predicted { background: var(--neon-blue); }
    .legend-dot.actual { background: var(--neon-purple); }

    /* ===== NO-SHOW ALERTS ===== */
    .alert-list { display: grid; gap: 10px; }

    .alert-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 14px;
      border: 1px solid var(--glass-border);
      transition: all 0.3s;
    }

    .alert-item:hover { background: rgba(255, 255, 255, 0.04); }

    .alert-item.risk-high { border-left: 3px solid var(--neon-red); }
    .alert-item.risk-medium { border-left: 3px solid var(--neon-yellow); }
    .alert-item.risk-low { border-left: 3px solid var(--neon-blue); }

    .risk-gauge {
      position: relative;
      width: 44px;
      height: 44px;
    }

    .risk-gauge svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .risk-score {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
    }

    .alert-content { flex: 1; min-width: 0; }
    .alert-content strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .alert-service { font-size: 12px; color: var(--text-muted); }

    .alert-factors { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }

    .factor {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      border: 1px solid var(--glass-border);
    }

    .alert-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }

    .action-btn {
      padding: 6px 12px;
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      background: transparent;
      color: var(--text-secondary);
    }

    .send-reminder:hover {
      background: rgba(0, 212, 255, 0.1);
      border-color: rgba(0, 212, 255, 0.3);
      color: var(--neon-blue);
    }

    .mark-no-show:hover {
      background: rgba(255, 68, 102, 0.1);
      border-color: rgba(255, 68, 102, 0.3);
      color: var(--neon-red);
    }

    /* ===== WAITLIST ===== */
    .waitlist-section { display: grid; gap: 16px; }

    .waitlist-slots { display: grid; gap: 10px; }

    .waitlist-slot {
      padding: 14px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      border: 1px solid var(--glass-border);
    }

    .slot-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .slot-time { font-size: 13px; font-weight: 700; }

    .slot-status {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .status-filled { background: rgba(0, 255, 136, 0.1); color: var(--neon-green); }
    .status-pending { background: rgba(255, 204, 0, 0.1); color: var(--neon-yellow); animation: pendingPulse 1.5s infinite; }
    .status-no-action { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); }

    @keyframes pendingPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .slot-client { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
    .cancelled-label { color: var(--neon-red); font-weight: 600; }

    .slot-fill {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
    }

    .fill-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--neon-green);
    }

    .fill-indicator strong { color: var(--text-primary); }

    .match-score { font-size: 11px; font-weight: 700; color: var(--neon-blue); }

    .slot-pending {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 6px;
      font-size: 12px;
      color: var(--neon-yellow);
    }

    .scan-dots { display: flex; gap: 4px; }
    .scan-dots span {
      width: 4px; height: 4px; border-radius: 50%;
      background: var(--neon-yellow);
      animation: scanDot 1.4s infinite;
    }
    .scan-dots span:nth-child(2) { animation-delay: 0.2s; }
    .scan-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes scanDot {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1.2); }
    }

    .waitlist-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .wl-stat {
      text-align: center;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 10px;
      border: 1px solid var(--glass-border);
    }

    .wl-stat strong { display: block; font-size: 20px; font-weight: 800; color: var(--neon-blue); }
    .wl-stat span { font-size: 11px; color: var(--text-muted); font-weight: 500; }

    /* ===== PROMOTIONS ===== */
    .promo-list { display: grid; gap: 14px; }

    .promo-card {
      padding: 18px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 14px;
      border: 1px solid var(--glass-border);
      transition: all 0.3s;
    }

    .promo-card:hover { background: rgba(255, 255, 255, 0.04); transform: translateY(-1px); }

    .active-promo {
      border-color: rgba(0, 255, 136, 0.2);
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.05);
    }

    .promo-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .promo-type-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .type-email { background: rgba(0, 212, 255, 0.1); color: var(--neon-blue); }
    .type-sms { background: rgba(180, 77, 255, 0.1); color: var(--neon-purple); }
    .type-whatsapp { background: rgba(0, 255, 136, 0.1); color: var(--neon-green); }
    .type-inapp { background: rgba(255, 204, 0, 0.1); color: var(--neon-yellow); }

    .promo-status {
      font-size: 10px;
      font-weight: 700;
      color: var(--neon-green);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .promo-status::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--neon-green);
      animation: dotPulse 2s infinite;
    }

    .promo-title { display: block; font-size: 15px; margin-bottom: 4px; }
    .promo-desc { margin: 0 0 12px; font-size: 12px; color: var(--text-secondary); line-height: 1.5; }

    .promo-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .promo-metric { text-align: center; }
    .promo-metric span { display: block; font-size: 10px; color: var(--text-muted); margin-bottom: 2px; }
    .promo-metric strong { font-size: 16px; font-weight: 800; }

    .promo-actions { display: flex; gap: 8px; }

    .promo-btn {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      background: transparent;
      color: var(--text-secondary);
    }

    .promo-btn.activate:hover {
      background: rgba(0, 255, 136, 0.1);
      border-color: rgba(0, 255, 136, 0.3);
      color: var(--neon-green);
    }

    .promo-btn.pause:hover {
      background: rgba(255, 204, 0, 0.1);
      border-color: rgba(255, 204, 0, 0.3);
      color: var(--neon-yellow);
    }

    .promo-btn.edit:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    /* ===== SERVICE ROUTE OPTIMIZER ===== */
    .route-optimizer { display: grid; gap: 20px; }

    .route-timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .route-node {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      position: relative;
    }

    .node-connector {
      position: absolute;
      left: 15px;
      top: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .connector-line {
      width: 2px;
      height: 20px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
    }

    .connector-time {
      font-size: 9px;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--dark-bg);
      padding: 1px 4px;
      border-radius: 4px;
    }

    .node-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      color: var(--dark-bg);
      flex-shrink: 0;
      z-index: 1;
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
    }

    .node-card {
      flex: 1;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      transition: all 0.3s;
    }

    .node-card:hover { background: rgba(255, 255, 255, 0.04); }

    .node-card strong { font-size: 14px; flex: 1; min-width: 120px; }
    .node-staff { font-size: 11px; color: var(--text-muted); }
    .node-duration { font-size: 11px; color: var(--text-secondary); font-weight: 600; }
    .node-revenue { font-size: 13px; font-weight: 800; color: var(--neon-green); }

    .node-optimization {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--neon-blue);
      padding-top: 6px;
      border-top: 1px solid var(--glass-border);
    }

    .route-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .route-stat {
      text-align: center;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 10px;
      border: 1px solid var(--glass-border);
    }

    .route-stat span { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; font-weight: 500; }
    .route-stat strong { font-size: 18px; font-weight: 800; }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
    }

    .empty-state p { margin: 0; font-size: 14px; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 1200px) {
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
      .staff-grid { grid-template-columns: 1fr; }
      .route-summary { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 900px) {
      .grid-2col { grid-template-columns: 1fr; }
      .header-content { flex-direction: column; gap: 16px; align-items: flex-start; }
      .header-right { width: 100%; justify-content: space-between; }
      .promo-metrics { grid-template-columns: 1fr; }
      .waitlist-stats { grid-template-columns: 1fr; }
    }

    @media (max-width: 600px) {
      .ai-dashboard { padding: 12px; }
      .kpi-row { grid-template-columns: 1fr; }
      .kpi-value { font-size: 22px; }
      .dash-header h1 { font-size: 22px; }
      .header-content { padding: 16px; }
      .glass-panel { padding: 16px; border-radius: 14px; }
      .chart-bars { height: 120px; }
      .peak-hours { height: 80px; }
      .route-summary { grid-template-columns: 1fr 1fr; }
    }

    /* ===== AMBIENT ANIMATIONS ===== */
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }

    .kpi-card { animation: float 6s ease-in-out infinite; }
    .kpi-card:nth-child(2) { animation-delay: 0.5s; }
    .kpi-card:nth-child(3) { animation-delay: 1s; }
    .kpi-card:nth-child(4) { animation-delay: 1.5s; }

    @keyframes borderGlow {
      0%, 100% { border-color: rgba(255, 255, 255, 0.06); }
      50% { border-color: rgba(0, 212, 255, 0.12); }
    }

    .glass-panel { animation: borderGlow 8s ease-in-out infinite; }
    .glass-panel:nth-child(2) { animation-delay: 2s; }
  `]
})
export class AiDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();

  loading = true;
  hasData = false;
  currentTime = new Date();

  kpis = {
    revenueToday: 0,
    revenueGrowth: 0,
    predictedRevenue: 0,
    confidence: 0,
    occupancyRate: 0,
    occupancyTarget: 85,
    noShowRisk: 0,
    highRiskCount: 0
  };

  heatmapHours = ['9AM', '10', '11', '12PM', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10PM'];
  heatmapData: { name: string; cells: { hour: string; utilization: number; color: string }[] }[] = [];

  staffData: { name: string; role: string; utilization: number; status: string; color: string; recommendation: string }[] = [];

  peakHours: { hour: string; demand: number; color: string }[] = [];

  dynamicPricing: { service: string; timeSlot: string; adjustment: number; impact: number }[] = [];

  bookingPredictions: { day: string; date: string; predicted: number; actual?: number }[] = [];

  noShowAlerts: { clientName: string; service: string; time: string; riskScore: number; riskLevel: string; riskColor: string; factors: string[] }[] = [];

  waitlistSlots: { time: string; status: string; cancelledClient?: string; filledClient?: string; matchScore?: number }[] = [];

  waitlistStats = { totalWaiting: 0, autoFilled: 0, revenueSaved: '' };

  promotions: { title: string; description: string; type: string; segment: string; expectedLift: number; roi: number; isActive: boolean }[] = [];

  serviceRoute: { service: string; staff: string; duration: number; revenue: number; color: string; transitionTime: number; optimization?: string }[] = [];

  routeStats = { totalDuration: 0, totalRevenue: 0, efficiencyGain: 0, timeSaved: 0 };

  ngOnInit(): void {
    this.startClock();
    this.generateMockData();
    this.loading = false;
    this.hasData = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startClock(): void {
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentTime = new Date();
    });
  }

  refreshAll(): void {
    this.loading = true;
    setTimeout(() => {
      this.generateMockData();
      this.loading = false;
    }, 1200);
  }

  private generateMockData(): void {
    this.kpis = {
      revenueToday: 24750,
      revenueGrowth: 12,
      predictedRevenue: 31200,
      confidence: 87,
      occupancyRate: 78,
      occupancyTarget: 85,
      noShowRisk: 14,
      highRiskCount: 5
    };

    this.generateHeatmap();
    this.generateStaffData();
    this.generatePeakHours();
    this.generateDynamicPricing();
    this.generateBookingPredictions();
    this.generateNoShowAlerts();
    this.generateWaitlistSlots();
    this.generatePromotions();
    this.generateServiceRoute();
  }

  private generateHeatmap(): void {
    const chairs = ['Chair 1', 'Chair 2', 'Chair 3', 'Chair 4', 'Chair 5', 'Chair 6'];
    this.heatmapData = chairs.map(name => ({
      name,
      cells: this.heatmapHours.map(hour => {
        const utilization = Math.floor(Math.random() * 100);
        return { hour, utilization, color: this.getHeatmapColor(utilization) };
      })
    }));
  }

  private getHeatmapColor(value: number): string {
    if (value >= 80) return 'rgba(239, 68, 68, 0.7)';
    if (value >= 60) return 'rgba(249, 115, 22, 0.6)';
    if (value >= 40) return 'rgba(234, 179, 8, 0.5)';
    if (value >= 20) return 'rgba(101, 163, 13, 0.5)';
    return 'rgba(22, 101, 52, 0.4)';
  }

  private generateStaffData(): void {
    const staff = [
      { name: 'Priya Sharma', role: 'Senior Stylist', utilization: 92, color: '#00ff88' },
      { name: 'Rahul Verma', role: 'Color Specialist', utilization: 78, color: '#00d4ff' },
      { name: 'Anjali Patel', role: 'Hair Stylist', utilization: 65, color: '#b44dff' },
      { name: 'Vikram Singh', role: 'Barber', utilization: 88, color: '#ff6eb4' },
      { name: 'Meera Nair', role: 'Nail Technician', utilization: 45, color: '#ffcc00' },
      { name: 'Arjun Reddy', role: 'Spa Therapist', utilization: 71, color: '#00ff88' }
    ];

    this.staffData = staff.map(s => ({
      ...s,
      status: s.utilization >= 85 ? 'overbooked' : s.utilization >= 60 ? 'optimal' : 'underutilized',
      recommendation: s.utilization >= 85
        ? 'Consider redistributing clients to available staff'
        : s.utilization >= 60
          ? 'Currently at optimal utilization level'
          : 'Can accept more bookings - promote availability'
    }));
  }

  private generatePeakHours(): void {
    const hours = ['9AM', '10', '11', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM'];
    this.peakHours = hours.map(hour => {
      const demand = Math.floor(30 + Math.random() * 70);
      return {
        hour,
        demand,
        color: demand >= 80 ? 'var(--neon-red)' : demand >= 60 ? 'var(--neon-yellow)' : demand >= 40 ? 'var(--neon-blue)' : 'var(--neon-green)'
      };
    });
  }

  private generateDynamicPricing(): void {
    this.dynamicPricing = [
      { service: 'Hair Coloring', timeSlot: '2PM - 4PM', adjustment: 10, impact: 1200 },
      { service: 'Facial Treatment', timeSlot: '11AM - 1PM', adjustment: 0, impact: 0 },
      { service: 'Hair Styling', timeSlot: '6PM - 8PM', adjustment: 15, impact: 850 },
      { service: 'Manicure', timeSlot: '3PM - 5PM', adjustment: -5, impact: 320 },
      { service: 'Deep Tissue Massage', timeSlot: '9AM - 11AM', adjustment: 8, impact: 640 }
    ];
  }

  private generateBookingPredictions(): void {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dates = ['07/07', '07/08', '07/09', '07/10', '07/11', '07/12', '07/13'];
    this.bookingPredictions = days.map((day, i) => ({
      day,
      date: dates[i],
      predicted: Math.floor(40 + Math.random() * 55),
      actual: i < 3 ? Math.floor(35 + Math.random() * 60) : undefined
    }));
  }

  private generateNoShowAlerts(): void {
    this.noShowAlerts = [
      {
        clientName: 'Sneha Gupta',
        service: 'Hair Coloring + Styling',
        time: 'Today 3:00 PM',
        riskScore: 87,
        riskLevel: 'high',
        riskColor: 'var(--neon-red)',
        factors: ['Missed last 2 appointments', 'No confirmation response', 'History: 40% no-show']
      },
      {
        clientName: 'Rohit Mehta',
        service: 'Beard Trim + Haircut',
        time: 'Today 4:30 PM',
        riskScore: 72,
        riskLevel: 'high',
        riskColor: 'var(--neon-red)',
        factors: ['Late cancellation pattern', 'Booked via walk-in']
      },
      {
        clientName: 'Kavya Iyer',
        service: 'Bridal Package',
        time: 'Tomorrow 10:00 AM',
        riskScore: 45,
        riskLevel: 'medium',
        riskColor: 'var(--neon-yellow)',
        factors: ['First-time client', 'High-value booking']
      },
      {
        clientName: 'Arjun Das',
        service: 'Spa Treatment',
        time: 'Tomorrow 2:00 PM',
        riskScore: 28,
        riskLevel: 'low',
        riskColor: 'var(--neon-blue)',
        factors: ['Usually punctual', 'Confirmed via WhatsApp']
      }
    ];
  }

  private generateWaitlistSlots(): void {
    this.waitlistSlots = [
      { time: '2:00 PM - Chair 3', status: 'filled', cancelledClient: 'Priyanka Joshi', filledClient: 'Neha Kapoor', matchScore: 94 },
      { time: '3:30 PM - Chair 1', status: 'filled', cancelledClient: 'Amit Sharma', filledClient: 'Riya Sen', matchScore: 88 },
      { time: '5:00 PM - Chair 5', status: 'pending' },
      { time: '6:15 PM - Chair 2', status: 'no-action' }
    ];

    this.waitlistStats = {
      totalWaiting: 12,
      autoFilled: 3,
      revenueSaved: '₹4,200'
    };
  }

  private generatePromotions(): void {
    this.promotions = [
      {
        title: 'Rainy Season Blow-Dry Special',
        description: 'Target lapsed clients who haven\'t booked in 30+ days with a 20% off blow-dry service. AI identified 47 high-potential targets.',
        type: 'whatsapp',
        segment: 'Lapsed 30+ days',
        expectedLift: 32,
        roi: 4.8,
        isActive: true
      },
      {
        title: 'Bridal Season Upsell Campaign',
        description: 'Cross-sell premium hair accessories and skin prep packages to clients with upcoming bridal bookings.',
        type: 'email',
        segment: 'Bridal Bookings',
        expectedLift: 45,
        roi: 6.2,
        isActive: false
      },
      {
        title: 'Midweek Revenue Boost',
        description: 'Flash sale on Tuesdays and Wednesdays targeting price-sensitive segments with 15% off on select services.',
        type: 'sms',
        segment: 'Price Sensitive',
        expectedLift: 18,
        roi: 3.1,
        isActive: true
      }
    ];
  }

  private generateServiceRoute(): void {
    this.serviceRoute = [
      { service: 'Consultation & Analysis', staff: 'Priya Sharma', duration: 15, revenue: 0, color: 'var(--neon-blue)', transitionTime: 0, optimization: 'Pre-loaded client preferences from CRM' },
      { service: 'Hair Washing & Prep', staff: 'Assistant', duration: 10, revenue: 0, color: 'var(--neon-purple)', transitionTime: 2 },
      { service: 'Hair Coloring', staff: 'Priya Sharma', duration: 45, revenue: 2800, color: 'var(--neon-green)', transitionTime: 5, optimization: 'Color mix pre-prepared based on history' },
      { service: 'Hair Styling & Blow Dry', staff: 'Priya Sharma', duration: 30, revenue: 1200, color: 'var(--neon-yellow)', transitionTime: 3 },
      { service: 'Final Touch & Photo', staff: 'Priya Sharma', duration: 10, revenue: 0, color: 'var(--neon-pink)', transitionTime: 0, optimization: 'Auto-trigger satisfaction survey after photo' }
    ];

    this.routeStats = {
      totalDuration: 110,
      totalRevenue: 4000,
      efficiencyGain: 23,
      timeSaved: 18
    };
  }

  sendReminder(alert: any): void {
    alert('Reminder sent to ' + alert.clientName + ' via WhatsApp.');
  }

  markNoShow(alert: any): void {
    alert(alert.clientName + ' marked as No-Show. Waitlist auto-fill initiated.');
  }

  activatePromo(promo: any): void {
    promo.isActive = true;
  }

  pausePromo(promo: any): void {
    promo.isActive = false;
  }
}
