import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ShiftsService } from './shifts.service';
import { Shift, ShiftTemplate } from './shifts.models';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
}

interface DayColumn {
  date: Date;
  label: string;
  dayNum: number;
  isToday: boolean;
}

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="shifts-page">

      <!-- ─── PREMIUM HEADER ─── -->
      <header class="premium-header">
        <div class="header-bg"></div>
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">
              <span class="title-icon">📅</span>
              Shift Planning
            </h1>
            <p class="page-subtitle">Schedule, manage and optimize your team's shifts with intelligent planning tools</p>
          </div>
          <div class="header-actions">
            <button class="btn-glass" (click)="showCreateTemplate()">
              <span class="btn-icon">✨</span>
              New Template
            </button>
            <button class="btn-primary-glow" (click)="generateSchedule()">
              <span class="btn-icon">⚡</span>
              Generate Schedule
            </button>
          </div>
        </div>
        <div class="header-wave">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,15 1440,30 L1440,60 L0,60 Z" fill="rgba(255,255,255,0.06)"/>
          </svg>
        </div>
      </header>

      <!-- ─── KPI STRIP ─── -->
      <div class="kpi-strip">
        <div class="kpi-card" style="--accent:#6366f1">
          <div class="kpi-icon-wrap"><span class="kpi-icon">📋</span></div>
          <div class="kpi-info">
            <span class="kpi-value">{{ totalShifts }}</span>
            <span class="kpi-label">Total Shifts</span>
          </div>
          <div class="kpi-glow"></div>
        </div>
        <div class="kpi-card" style="--accent:#10b981">
          <div class="kpi-icon-wrap"><span class="kpi-icon">👥</span></div>
          <div class="kpi-info">
            <span class="kpi-value">{{ activeStaff }}</span>
            <span class="kpi-label">Active Staff</span>
          </div>
          <div class="kpi-glow"></div>
        </div>
        <div class="kpi-card" style="--accent:#8b5cf6">
          <div class="kpi-icon-wrap"><span class="kpi-icon">⏱️</span></div>
          <div class="kpi-info">
            <span class="kpi-value">{{ hoursScheduled }}</span>
            <span class="kpi-label">Hours Scheduled</span>
          </div>
          <div class="kpi-glow"></div>
        </div>
        <div class="kpi-card" style="--accent:#f59e0b">
          <div class="kpi-icon-wrap"><span class="kpi-icon">📊</span></div>
          <div class="kpi-info">
            <span class="kpi-value">{{ coveragePercent }}%</span>
            <span class="kpi-label">Coverage</span>
          </div>
          <div class="kpi-glow"></div>
        </div>
      </div>

      <!-- ─── TOOLBAR ─── -->
      <div class="toolbar-bar">
        <div class="view-switcher">
          <button [class.active]="viewMode==='week'" (click)="viewMode='week'">Week</button>
          <button [class.active]="viewMode==='month'" (click)="viewMode='month'">Month</button>
          <button [class.active]="viewMode==='list'" (click)="viewMode='list'">List</button>
        </div>
        <div class="week-nav">
          <button class="nav-arrow" (click)="navigateWeek(-1)">‹</button>
          <span class="week-label">{{ getWeekRangeLabel() }}</span>
          <button class="nav-arrow" (click)="navigateWeek(1)">›</button>
          <button class="btn-today" (click)="goToday()">Today</button>
        </div>
        <div class="toolbar-right">
          <div class="shift-legend">
            <span class="legend-dot" style="background:#6366f1"></span>Morning
            <span class="legend-dot" style="background:#8b5cf6"></span>Evening
            <span class="legend-dot" style="background:#10b981"></span>Full Day
            <span class="legend-dot" style="background:#f59e0b"></span>Split
            <span class="legend-dot" style="background:#ec4899"></span>Half Day
          </div>
        </div>
      </div>

      <!-- ─── MAIN LAYOUT ─── -->
      <div class="main-layout">

        <!-- WEEK VIEW -->
        <div class="week-view glass-panel" *ngIf="viewMode==='week'">
          <div class="week-header">
            <div class="staff-col-header">Staff</div>
            <div class="day-col-header" *ngFor="let day of weekDays" [class.today]="day.isToday">
              <span class="day-name">{{ day.label }}</span>
              <span class="day-num" [class.today-num]="day.isToday">{{ day.dayNum }}</span>
            </div>
          </div>
          <div class="week-body">
            <div class="staff-row" *ngFor="let staff of staffList; let i = index" [style.animation-delay]="i * 40 + 'ms'">
              <div class="staff-col">
                <div class="staff-avatar" [style.background]="staff.color">
                  {{ staff.name.charAt(0) }}
                </div>
                <div class="staff-info">
                  <span class="staff-name">{{ staff.name }}</span>
                  <span class="staff-role">{{ staff.role }}</span>
                </div>
              </div>
              <div class="day-col" *ngFor="let day of weekDays" [class.today-col]="day.isToday">
                <div class="shift-block"
                     *ngFor="let shift of getStaffShiftsForDay(staff.id, day.date)"
                     [style.background]="getShiftColor(shift)"
                     [class.shift-swap-requested]="shift.status === 'SWAP_REQUESTED'"
                     (click)="openDetail(shift)">
                  <span class="shift-type-label">{{ getShiftTypeLabel(shift) }}</span>
                  <span class="shift-time-label">{{ shift.startTime }}–{{ shift.endTime }}</span>
                  <span class="swap-badge" *ngIf="shift.status === 'SWAP_REQUESTED'">🔄</span>
                </div>
                <div class="empty-slot" *ngIf="getStaffShiftsForDay(staff.id, day.date).length === 0" (click)="openAssignDialog(staff.id, day.date)">
                  <span class="plus-icon">+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- LIST VIEW -->
        <div class="list-view glass-panel" *ngIf="viewMode==='list'">
          <div class="list-header-row">
            <span class="lh-staff">Staff</span>
            <span class="lh-date">Date</span>
            <span class="lh-time">Time</span>
            <span class="lh-type">Type</span>
            <span class="lh-status">Status</span>
            <span class="lh-actions">Actions</span>
          </div>
          <div class="list-row" *ngFor="let shift of filteredShifts; let i = index" [style.animation-delay]="i * 30 + 'ms'">
            <span class="lr-staff">
              <span class="lr-avatar" [style.background]="getStaffColor(shift.staffId)">{{ getStaffInitial(shift.staffName) }}</span>
              {{ shift.staffName }}
            </span>
            <span class="lr-date">{{ shift.date | date:'MMM dd, yyyy' }}</span>
            <span class="lr-time">{{ shift.startTime }} – {{ shift.endTime }}</span>
            <span class="lr-type"><span class="type-pill" [style.background]="getShiftColor(shift)">{{ getShiftTypeLabel(shift) }}</span></span>
            <span class="lr-status"><span class="status-pill" [attr.data-status]="shift.status">{{ shift.status }}</span></span>
            <span class="lr-actions">
              <button class="action-btn" (click)="openDetail(shift)">View</button>
              <button class="action-btn swap-btn" (click)="openSwapDialog(shift)">Swap</button>
            </span>
          </div>
          <div class="empty-state" *ngIf="filteredShifts.length === 0">
            <span class="empty-icon">📭</span>
            <p>No shifts found for this period</p>
          </div>
        </div>

        <!-- MONTH VIEW -->
        <div class="month-view glass-panel" *ngIf="viewMode==='month'">
          <div class="month-grid">
            <div class="month-day-header" *ngFor="let d of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']">{{ d }}</div>
            <div class="month-day" *ngFor="let day of monthDays" [class.other-month]="!day.currentMonth" [class.today]="day.isToday" (click)="day.currentMonth && jumpToDate(day.date)">
              <span class="md-num">{{ day.dayNum }}</span>
              <div class="md-shifts">
                <div class="md-shift" *ngFor="let s of getStaffShiftsForDay('*', day.date).slice(0, 3)" [style.background]="getShiftColor(s)"></div>
                <span class="md-more" *ngIf="getStaffShiftsForDay('*', day.date).length > 3">+{{ getStaffShiftsForDay('*', day.date).length - 3 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- STAFF SIDEBAR -->
        <aside class="staff-sidebar glass-panel">
          <div class="sidebar-header">
            <h3>Team Members</h3>
            <span class="staff-count">{{ staffList.length }}</span>
          </div>
          <div class="sidebar-search">
            <input type="text" [(ngModel)]="staffSearch" placeholder="Search staff..." class="search-input">
          </div>
          <div class="sidebar-list">
            <div class="sidebar-staff" *ngFor="let staff of filteredStaffList; let i = index" [style.animation-delay]="i * 30 + 'ms'" [class.selected]="selectedStaffId === staff.id" (click)="selectStaff(staff.id)">
              <div class="sb-avatar" [style.background]="staff.color">{{ staff.name.charAt(0) }}</div>
              <div class="sb-info">
                <span class="sb-name">{{ staff.name }}</span>
                <span class="sb-role">{{ staff.role }}</span>
              </div>
              <span class="sb-shift-count">{{ getStaffWeeklyCount(staff.id) }}</span>
            </div>
          </div>
          <div class="sidebar-legend">
            <h4>Shift Types</h4>
            <div class="legend-item"><span class="legend-swatch" style="background:#6366f1"></span>Morning (8AM–2PM)</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#8b5cf6"></span>Evening (2PM–8PM)</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#10b981"></span>Full Day (8AM–8PM)</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#f59e0b"></span>Split (Split Hours)</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#ec4899"></span>Half Day (4 Hours)</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#e5e7eb"></span>Off</div>
          </div>
        </aside>
      </div>

      <!-- ─── LOADING / ERROR ─── -->
      <div class="loading-overlay" *ngIf="loading">
        <div class="spinner-large"></div>
        <span>Loading shifts...</span>
      </div>
      <div class="error-banner" *ngIf="error">
        <span class="error-icon">⚠️</span>
        <div><strong>Something went wrong</strong><p>{{ error }}</p></div>
        <button class="btn-retry" (click)="loadShifts()">Retry</button>
      </div>
    </section>

    <!-- ═══════════════ CREATE TEMPLATE DIALOG ═══════════════ -->
    <div class="modal-overlay" *ngIf="showCreateDialog" (click)="showCreateDialog = false">
      <div class="modal-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h2>{{ editingTemplate ? 'Edit Template' : 'Create Shift Template' }}</h2>
            <p>Define a reusable shift schedule pattern</p>
          </div>
          <button class="modal-close" (click)="showCreateDialog = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Template Name</label>
              <input type="text" [(ngModel)]="templateForm.name" placeholder="e.g. Morning Shift" class="form-input">
            </div>
            <div class="form-group">
              <label>Shift Type</label>
              <select [(ngModel)]="templateForm.shiftType" class="form-input">
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
                <option value="FULL_DAY">Full Day</option>
                <option value="SPLIT">Split</option>
                <option value="HALF_DAY">Half Day</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Start Time</label>
              <input type="time" [(ngModel)]="templateForm.startTime" class="form-input">
            </div>
            <div class="form-group">
              <label>End Time</label>
              <input type="time" [(ngModel)]="templateForm.endTime" class="form-input">
            </div>
            <div class="form-group">
              <label>Break (min)</label>
              <input type="number" [(ngModel)]="templateForm.breakDuration" class="form-input" min="0" step="5">
            </div>
          </div>
          <div class="form-group">
            <label>Days of Week</label>
            <div class="days-picker">
              <button *ngFor="let d of dayOptions" class="day-chip" [class.active]="templateForm.daysOfWeek.includes(d.value)" (click)="toggleDay(d.value)">
                {{ d.label }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="templateForm.isActive"> Active Template
            </label>
          </div>
          <div class="form-msg error-msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="form-msg success-msg" *ngIf="formSuccess">{{ formSuccess }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="showCreateDialog = false">Cancel</button>
          <button class="btn-glow" (click)="createTemplate()" [disabled]="formBusy">
            <span *ngIf="formBusy" class="spinner-sm"></span>
            {{ editingTemplate ? 'Update Template' : 'Create Template' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ CREATE ASSIGNMENT DIALOG ═══════════════ -->
    <div class="modal-overlay" *ngIf="showAssignmentDialog" (click)="showAssignmentDialog = false">
      <div class="modal-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h2>Create Shift Assignment</h2>
            <p>Assign a shift to a staff member</p>
          </div>
          <button class="modal-close" (click)="showAssignmentDialog = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Staff Member</label>
              <select [(ngModel)]="assignForm.staffId" class="form-input">
                <option value="">Select staff...</option>
                <option *ngFor="let s of staffList" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date</label>
              <input type="date" [(ngModel)]="assignForm.date" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Start Time</label>
              <input type="time" [(ngModel)]="assignForm.startTime" class="form-input">
            </div>
            <div class="form-group">
              <label>End Time</label>
              <input type="time" [(ngModel)]="assignForm.endTime" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Shift Type</label>
              <select [(ngModel)]="assignForm.shiftType" class="form-input">
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
                <option value="FULL_DAY">Full Day</option>
                <option value="SPLIT">Split</option>
                <option value="HALF_DAY">Half Day</option>
              </select>
            </div>
            <div class="form-group">
              <label>Break (min)</label>
              <input type="number" [(ngModel)]="assignForm.breakDuration" class="form-input" min="0">
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea [(ngModel)]="assignForm.notes" placeholder="Optional notes..." class="form-input textarea-input"></textarea>
          </div>
          <div class="form-msg error-msg" *ngIf="formMsg">{{ formMsg }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="showAssignmentDialog = false">Cancel</button>
          <button class="btn-glow" (click)="createAssignment()" [disabled]="formBusy">
            <span *ngIf="formBusy" class="spinner-sm"></span>
            Assign Shift
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ SHIFT SWAP DIALOG ═══════════════ -->
    <div class="modal-overlay" *ngIf="showSwapDialog" (click)="showSwapDialog = false">
      <div class="modal-panel" (click)="$event.stopPropagation()">
        <div class="modal-header swap-header">
          <div>
            <h2>🔄 Request Shift Swap</h2>
            <p>Exchange shifts between two staff members</p>
          </div>
          <button class="modal-close" (click)="showSwapDialog = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="swap-visual">
            <div class="swap-card">
              <span class="swap-label">Current</span>
              <strong>{{ swapForm.fromStaffName }}</strong>
              <span class="swap-date">{{ swapForm.fromDate | date:'MMM dd, yyyy' }}</span>
              <span class="swap-time">{{ swapForm.fromStart }} – {{ swapForm.fromEnd }}</span>
            </div>
            <div class="swap-arrow">⇄</div>
            <div class="swap-card">
              <span class="swap-label">Swap With</span>
              <select [(ngModel)]="swapForm.toStaffId" class="form-input">
                <option value="">Select staff...</option>
                <option *ngFor="let s of staffList" [value]="s.id">{{ s.name }}</option>
              </select>
              <select [(ngModel)]="swapForm.toShiftId" class="form-input" *ngIf="swapForm.toStaffId">
                <option value="">Select shift...</option>
                <option *ngFor="let s of getStaffShiftsForSwap(swapForm.toStaffId)" [value]="s.id">
                  {{ s.date | date:'MMM dd' }} {{ s.startTime }}–{{ s.endTime }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Reason for Swap</label>
            <textarea [(ngModel)]="swapForm.reason" placeholder="Explain why this swap is needed..." class="form-input textarea-input"></textarea>
          </div>
          <div class="form-msg error-msg" *ngIf="formMsg">{{ formMsg }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="showSwapDialog = false">Cancel</button>
          <button class="btn-glow swap-glow" (click)="requestSwap()" [disabled]="formBusy">
            <span *ngIf="formBusy" class="spinner-sm"></span>
            Request Swap
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ SHIFT DETAIL DRAWER ═══════════════ -->
    <div class="drawer-overlay" *ngIf="showDetailDrawer" (click)="showDetailDrawer = false">
      <div class="detail-drawer" (click)="$event.stopPropagation()">
        <div class="drawer-head">
          <div class="drawer-title-row">
            <div>
              <h2>Shift Details</h2>
              <p>{{ selectedShift?.staffName }}</p>
            </div>
            <button class="modal-close" (click)="showDetailDrawer = false">✕</button>
          </div>
          <div class="detail-status" [attr.data-status]="selectedShift?.status">
            {{ selectedShift?.status }}
          </div>
        </div>
        <div class="drawer-body" *ngIf="selectedShift">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Date</span>
              <span class="detail-value">{{ selectedShift.date | date:'EEEE, MMMM d, yyyy' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Time</span>
              <span class="detail-value">{{ selectedShift.startTime }} – {{ selectedShift.endTime }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Duration</span>
              <span class="detail-value">{{ calculateDuration(selectedShift.startTime, selectedShift.endTime) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Break</span>
              <span class="detail-value">{{ selectedShift.breakDuration }} min</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Recurring</span>
              <span class="detail-value">{{ selectedShift.isRecurring ? (selectedShift.recurringPattern || 'Yes') : 'No' }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedShift.notes">
              <span class="detail-label">Notes</span>
              <span class="detail-value">{{ selectedShift.notes }}</span>
            </div>
          </div>
          <div class="detail-shift-block" [style.background]="getShiftColor(selectedShift)">
            <span class="ds-type">{{ getShiftTypeLabel(selectedShift) }}</span>
            <span class="ds-time">{{ selectedShift.startTime }} – {{ selectedShift.endTime }}</span>
          </div>
          <div class="detail-actions">
            <button class="btn-outline-detail" (click)="showDetailDrawer = false; openSwapDialog(selectedShift)">
              🔄 Request Swap
            </button>
            <button class="btn-danger-detail" (click)="markAbsent(selectedShift)">
              ✕ Mark Absent
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════════════
       PREMIUM ENTERPRISE SHIFT PLANNING STYLES
       ═══════════════════════════════════════════════════════ */

    /* ─── KEYFRAME ANIMATIONS ─── */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.15); }
      50% { box-shadow: 0 0 35px rgba(99,102,241,0.3); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.92) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes drawerSlideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes ripple {
      to { transform: scale(4); opacity: 0; }
    }

    /* ─── BASE ─── */
    *, *::before, *::after { box-sizing: border-box; }
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(165deg, #f0f2f8 0%, #e8eaf0 40%, #f5f3f0 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      padding-bottom: 60px;
    }

    /* ─── PREMIUM HEADER ─── */
    .premium-header {
      position: relative;
      padding: 48px 48px 56px;
      overflow: hidden;
      margin: 0 24px 0;
      border-radius: 24px;
      margin-top: 24px;
    }
    .header-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
      background-size: 200% 200%;
      animation: gradientShift 8s ease infinite;
      z-index: 0;
    }
    .header-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .header-content {
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 36px;
      font-weight: 900;
      color: white;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .title-icon {
      font-size: 32px;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
    }
    .page-subtitle {
      color: rgba(255,255,255,0.85);
      font-size: 15px;
      margin: 8px 0 0;
      font-weight: 500;
      max-width: 460px;
    }
    .header-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-glass {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 14px;
      padding: 12px 22px;
      color: white;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-glass:hover {
      background: rgba(255,255,255,0.28);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    .btn-primary-glow {
      background: white;
      border: none;
      border-radius: 14px;
      padding: 12px 22px;
      color: #6366f1;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      animation: pulse-glow 3s ease infinite;
    }
    .btn-primary-glow:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    }
    .btn-icon { font-size: 16px; }
    .header-wave {
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      z-index: 1;
    }
    .header-wave svg { display: block; width: 100%; height: 30px; }

    /* ─── KPI STRIP ─── */
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding: 0 24px;
      margin-top: -28px;
      position: relative;
      z-index: 10;
      animation: fadeInUp 0.6s ease both;
    }
    .kpi-card {
      background: rgba(255,255,255,0.75);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.6);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04);
    }
    .kpi-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
    }
    .kpi-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, transparent), color-mix(in srgb, var(--accent) 8%, transparent));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kpi-icon { font-size: 24px; }
    .kpi-info { display: flex; flex-direction: column; gap: 2px; }
    .kpi-value { font-size: 30px; font-weight: 900; line-height: 1; color: #1e293b; }
    .kpi-label { font-size: 13px; color: #64748b; font-weight: 600; }
    .kpi-glow {
      position: absolute;
      top: -30px;
      right: -30px;
      width: 100px;
      height: 100px;
      background: radial-gradient(circle, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    /* ─── TOOLBAR ─── */
    .toolbar-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      flex-wrap: wrap;
    }
    .view-switcher {
      display: flex;
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 14px;
      padding: 4px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .view-switcher button {
      border: none;
      background: transparent;
      padding: 10px 20px;
      border-radius: 11px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      color: #64748b;
      transition: all 0.25s ease;
    }
    .view-switcher button.active {
      background: #6366f1;
      color: white;
      box-shadow: 0 4px 16px rgba(99,102,241,0.35);
    }
    .view-switcher button:hover:not(.active) {
      background: rgba(99,102,241,0.08);
      color: #4f46e5;
    }
    .week-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 14px;
      padding: 6px 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .nav-arrow {
      width: 34px;
      height: 34px;
      border: none;
      background: transparent;
      border-radius: 10px;
      font-size: 20px;
      font-weight: 700;
      cursor: pointer;
      color: #475569;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nav-arrow:hover { background: #f1f5f9; color: #1e293b; }
    .week-label {
      font-weight: 700;
      font-size: 14px;
      color: #334155;
      padding: 0 12px;
      white-space: nowrap;
    }
    .btn-today {
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 10px;
      padding: 7px 14px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      color: #6366f1;
      transition: all 0.2s ease;
    }
    .btn-today:hover { background: #6366f1; color: white; border-color: #6366f1; }
    .toolbar-right { margin-left: auto; }
    .shift-legend {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      flex-wrap: wrap;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      margin-left: 6px;
      flex-shrink: 0;
    }

    /* ─── GLASS PANEL ─── */
    .glass-panel {
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.6);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
      overflow: hidden;
    }

    /* ─── MAIN LAYOUT ─── */
    .main-layout {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 20px;
      padding: 0 24px;
      animation: fadeInUp 0.7s ease both;
      animation-delay: 0.15s;
    }

    /* ─── WEEK VIEW ─── */
    .week-view { overflow-x: auto; }
    .week-header {
      display: grid;
      grid-template-columns: 200px repeat(7, 1fr);
      border-bottom: 2px solid rgba(226,232,240,0.6);
      position: sticky;
      top: 0;
      z-index: 5;
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(12px);
    }
    .staff-col-header {
      padding: 16px 20px;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .day-col-header {
      padding: 14px 8px;
      text-align: center;
      border-left: 1px solid rgba(226,232,240,0.4);
      transition: background 0.2s ease;
    }
    .day-col-header.today {
      background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05));
    }
    .day-name {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }
    .day-num {
      display: inline-flex;
      width: 32px;
      height: 32px;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 800;
      color: #334155;
      margin-top: 4px;
    }
    .today-num {
      background: #6366f1;
      color: white !important;
      box-shadow: 0 4px 12px rgba(99,102,241,0.35);
    }
    .week-body { padding: 0; }
    .staff-row {
      display: grid;
      grid-template-columns: 200px repeat(7, 1fr);
      border-bottom: 1px solid rgba(226,232,240,0.3);
      animation: fadeInUp 0.4s ease both;
      transition: background 0.2s ease;
    }
    .staff-row:hover { background: rgba(99,102,241,0.02); }
    .staff-row:last-child { border-bottom: none; }
    .staff-col {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-right: 1px solid rgba(226,232,240,0.3);
    }
    .staff-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 15px;
      color: white;
      flex-shrink: 0;
      box-shadow: 0 3px 10px rgba(0,0,0,0.12);
    }
    .staff-info { display: flex; flex-direction: column; min-width: 0; }
    .staff-name { font-weight: 700; font-size: 13px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .staff-role { font-size: 11px; color: #94a3b8; }
    .day-col {
      padding: 8px 4px;
      border-left: 1px solid rgba(226,232,240,0.3);
      min-height: 64px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: background 0.2s ease;
    }
    .day-col.today-col { background: rgba(99,102,241,0.02); }
    .shift-block {
      border-radius: 8px;
      padding: 6px 8px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      min-height: 36px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
    }
    .shift-block:hover {
      transform: scale(1.06);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      z-index: 2;
    }
    .shift-block:active { transform: scale(0.98); }
    .shift-type-label {
      font-size: 9px;
      font-weight: 800;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .shift-time-label {
      font-size: 9px;
      color: rgba(255,255,255,0.85);
      font-weight: 600;
    }
    .shift-swap-requested {
      animation: pulse-glow 2s ease infinite;
      outline: 2px solid #f59e0b;
      outline-offset: 1px;
    }
    .swap-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      font-size: 10px;
      background: #f59e0b;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(245,158,11,0.4);
    }
    .empty-slot {
      height: 100%;
      min-height: 48px;
      border: 2px dashed rgba(226,232,240,0.5);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.25s ease;
    }
    .empty-slot:hover {
      border-color: #6366f1;
      background: rgba(99,102,241,0.04);
    }
    .plus-icon {
      font-size: 18px;
      color: #cbd5e1;
      font-weight: 300;
      transition: color 0.2s ease;
    }
    .empty-slot:hover .plus-icon { color: #6366f1; }

    /* ─── LIST VIEW ─── */
    .list-view { padding: 0; }
    .list-header-row {
      display: grid;
      grid-template-columns: 200px 140px 140px 100px 120px 120px;
      padding: 14px 24px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      background: rgba(248,250,252,0.7);
      border-bottom: 2px solid rgba(226,232,240,0.5);
    }
    .list-row {
      display: grid;
      grid-template-columns: 200px 140px 140px 100px 120px 120px;
      padding: 14px 24px;
      align-items: center;
      border-bottom: 1px solid rgba(226,232,240,0.3);
      transition: background 0.2s ease;
      animation: fadeInUp 0.35s ease both;
    }
    .list-row:hover { background: rgba(99,102,241,0.03); }
    .list-row:last-child { border-bottom: none; }
    .lr-staff {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 13px;
    }
    .lr-avatar {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .lr-date { font-size: 13px; color: #475569; }
    .lr-time { font-size: 13px; color: #475569; font-weight: 600; }
    .type-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .status-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .status-pill[data-status="SCHEDULED"] { background: #ede9fe; color: #6366f1; }
    .status-pill[data-status="IN_PROGRESS"] { background: #fef3c7; color: #d97706; }
    .status-pill[data-status="COMPLETED"] { background: #d1fae5; color: #059669; }
    .status-pill[data-status="ABSENT"] { background: #fee2e2; color: #dc2626; }
    .status-pill[data-status="SWAP_REQUESTED"] { background: #fef3c7; color: #d97706; }
    .lr-actions { display: flex; gap: 6px; }
    .action-btn {
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      color: #475569;
      transition: all 0.2s ease;
    }
    .action-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
    .swap-btn:hover { background: #fffbeb; border-color: #f59e0b; color: #d97706; }
    .empty-state {
      padding: 60px;
      text-align: center;
      color: #94a3b8;
    }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .empty-state p { font-size: 15px; font-weight: 600; }

    /* ─── MONTH VIEW ─── */
    .month-view { padding: 20px; }
    .month-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }
    .month-day-header {
      text-align: center;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #94a3b8;
      padding: 10px 0;
      letter-spacing: 0.05em;
    }
    .month-day {
      min-height: 80px;
      padding: 8px;
      border-radius: 12px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .month-day:hover { background: rgba(99,102,241,0.04); border-color: rgba(99,102,241,0.15); }
    .month-day.other-month { opacity: 0.35; }
    .month-day.today { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.25); }
    .md-num {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      display: block;
      margin-bottom: 4px;
    }
    .month-day.today .md-num {
      background: #6366f1;
      color: white;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 12px;
    }
    .md-shifts { display: flex; gap: 2px; flex-wrap: wrap; }
    .md-shift { width: 100%; height: 6px; border-radius: 3px; }
    .md-more { font-size: 9px; color: #94a3b8; font-weight: 700; }

    /* ─── STAFF SIDEBAR ─── */
    .staff-sidebar {
      padding: 0;
      position: sticky;
      top: 24px;
      max-height: calc(100vh - 48px);
      display: flex;
      flex-direction: column;
    }
    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 20px 0;
    }
    .sidebar-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: #1e293b;
    }
    .staff-count {
      background: #6366f1;
      color: white;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 20px;
    }
    .sidebar-search { padding: 16px 20px 8px; }
    .search-input {
      width: 100%;
      padding: 11px 14px;
      border: 1px solid rgba(226,232,240,0.7);
      border-radius: 12px;
      font-size: 13px;
      background: rgba(248,250,252,0.6);
      transition: all 0.2s ease;
      outline: none;
    }
    .search-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
      background: white;
    }
    .sidebar-list {
      overflow-y: auto;
      flex: 1;
      padding: 8px 12px;
    }
    .sidebar-staff {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      animation: slideInLeft 0.35s ease both;
    }
    .sidebar-staff:hover { background: rgba(99,102,241,0.05); }
    .sidebar-staff.selected { background: rgba(99,102,241,0.1); }
    .sb-avatar {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 14px;
      flex-shrink: 0;
    }
    .sb-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .sb-name { font-weight: 700; font-size: 13px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sb-role { font-size: 11px; color: #94a3b8; }
    .sb-shift-count {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 8px;
      flex-shrink: 0;
    }
    .sidebar-legend {
      padding: 16px 20px;
      border-top: 1px solid rgba(226,232,240,0.4);
    }
    .sidebar-legend h4 {
      margin: 0 0 10px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #475569;
      font-weight: 600;
      padding: 4px 0;
    }
    .legend-swatch {
      width: 12px;
      height: 12px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    /* ─── LOADING / ERROR ─── */
    .loading-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding: 80px;
      color: #94a3b8;
      font-size: 15px;
      font-weight: 600;
    }
    .spinner-large {
      width: 36px;
      height: 36px;
      border: 4px solid rgba(99,102,241,0.15);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 0 24px;
      padding: 20px 24px;
      background: rgba(254,226,226,0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(254,202,202,0.6);
      border-radius: 16px;
      color: #991b1b;
    }
    .error-icon { font-size: 24px; }
    .error-banner strong { font-size: 14px; display: block; }
    .error-banner p { margin: 2px 0 0; font-size: 13px; color: #b91c1c; }
    .btn-retry {
      margin-left: auto;
      background: #991b1b;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .btn-retry:hover { background: #7f1d1d; }

    /* ─── MODAL OVERLAY ─── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.5);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 24px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-panel {
      background: white;
      width: 100%;
      max-width: 620px;
      border-radius: 24px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1);
      animation: modalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 28px 28px 0;
    }
    .modal-header h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: #1e293b;
    }
    .modal-header p {
      margin: 4px 0 0;
      font-size: 14px;
      color: #94a3b8;
    }
    .modal-close {
      width: 36px;
      height: 36px;
      border: none;
      background: #f1f5f9;
      border-radius: 10px;
      font-size: 16px;
      cursor: pointer;
      color: #64748b;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .modal-close:hover { background: #e2e8f0; color: #1e293b; }
    .modal-body {
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 28px 24px;
    }
    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .form-input {
      padding: 12px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
      background: #f8fafc;
      transition: all 0.2s ease;
      outline: none;
      font-family: inherit;
    }
    .form-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
      background: white;
    }
    .textarea-input { min-height: 70px; resize: vertical; }
    .days-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .day-chip {
      border: 1.5px solid #e2e8f0;
      background: white;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      color: #64748b;
      transition: all 0.2s ease;
    }
    .day-chip.active {
      background: #6366f1;
      color: white;
      border-color: #6366f1;
      box-shadow: 0 3px 10px rgba(99,102,241,0.3);
    }
    .day-chip:hover:not(.active) { border-color: #6366f1; color: #6366f1; }
    .btn-cancel {
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 12px;
      padding: 12px 20px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      color: #475569;
      transition: all 0.2s ease;
    }
    .btn-cancel:hover { background: #f8fafc; }
    .btn-glow {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 24px;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(99,102,241,0.35);
    }
    .btn-glow:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 28px rgba(99,102,241,0.45);
    }
    .btn-glow:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .form-msg {
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
    }
    .error-msg { background: rgba(254,226,226,0.7); color: #991b1b; }
    .success-msg { background: rgba(209,250,229,0.7); color: #059669; }

    /* ─── SWAP DIALOG ─── */
    .swap-header h2 { color: #d97706 !important; }
    .swap-visual {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(254,243,199,0.3);
      border: 1px solid rgba(245,158,11,0.2);
      border-radius: 16px;
    }
    .swap-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px;
      background: white;
      border-radius: 12px;
      border: 1px solid rgba(245,158,11,0.2);
    }
    .swap-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #d97706;
    }
    .swap-card strong { font-size: 14px; }
    .swap-date { font-size: 12px; color: #94a3b8; }
    .swap-time { font-size: 13px; font-weight: 700; color: #475569; }
    .swap-arrow {
      font-size: 28px;
      color: #d97706;
      font-weight: 800;
      flex-shrink: 0;
      animation: float 2s ease-in-out infinite;
    }
    .swap-glow {
      background: linear-gradient(135deg, #f59e0b, #d97706) !important;
      box-shadow: 0 4px 16px rgba(245,158,11,0.35) !important;
    }

    /* ─── DETAIL DRAWER ─── */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.5);
      backdrop-filter: blur(8px);
      display: flex;
      justify-content: flex-end;
      z-index: 1000;
    }
    .detail-drawer {
      background: white;
      width: min(480px, 100%);
      max-height: 100vh;
      overflow-y: auto;
      animation: drawerSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: -12px 0 60px rgba(0,0,0,0.15);
    }
    .drawer-head {
      padding: 28px;
      border-bottom: 1px solid #f1f5f9;
    }
    .drawer-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .drawer-title-row h2 { margin: 0; font-size: 22px; font-weight: 800; }
    .drawer-title-row p { margin: 4px 0 0; color: #94a3b8; font-size: 14px; }
    .detail-status {
      display: inline-block;
      margin-top: 14px;
      padding: 5px 14px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .detail-status[data-status="SCHEDULED"] { background: #ede9fe; color: #6366f1; }
    .detail-status[data-status="IN_PROGRESS"] { background: #fef3c7; color: #d97706; }
    .detail-status[data-status="COMPLETED"] { background: #d1fae5; color: #059669; }
    .detail-status[data-status="ABSENT"] { background: #fee2e2; color: #dc2626; }
    .detail-status[data-status="SWAP_REQUESTED"] { background: #fef3c7; color: #d97706; }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      padding: 24px 28px;
    }
    .detail-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .detail-value {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }
    .detail-shift-block {
      margin: 0 28px 20px;
      padding: 20px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .ds-type {
      font-size: 13px;
      font-weight: 800;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    .ds-time {
      font-size: 18px;
      font-weight: 800;
      color: white;
      text-shadow: 0 1px 4px rgba(0,0,0,0.15);
    }
    .detail-actions {
      display: flex;
      gap: 10px;
      padding: 0 28px 28px;
    }
    .btn-outline-detail {
      flex: 1;
      border: 1.5px solid #e2e8f0;
      background: white;
      border-radius: 12px;
      padding: 12px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      color: #475569;
      transition: all 0.2s ease;
    }
    .btn-outline-detail:hover { background: #f8fafc; border-color: #d97706; color: #d97706; }
    .btn-danger-detail {
      flex: 1;
      border: none;
      background: rgba(254,226,226,0.7);
      border-radius: 12px;
      padding: 12px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      color: #dc2626;
      transition: all 0.2s ease;
    }
    .btn-danger-detail:hover { background: rgba(254,202,202,0.9); }

    /* ─── RESPONSIVE ─── */
    @media (max-width: 1200px) {
      .main-layout { grid-template-columns: 1fr 260px; }
      .week-header, .staff-row { grid-template-columns: 160px repeat(7, 1fr); }
    }
    @media (max-width: 768px) {
      .premium-header { margin: 16px; padding: 32px 24px 40px; border-radius: 20px; }
      .page-title { font-size: 28px; }
      .header-content { flex-direction: column; }
      .kpi-strip { grid-template-columns: repeat(2, 1fr); padding: 0 16px; margin-top: -20px; }
      .main-layout { grid-template-columns: 1fr; padding: 0 16px; }
      .staff-sidebar { position: static; max-height: none; }
      .toolbar-bar { padding: 16px; }
      .week-header, .staff-row { grid-template-columns: 140px repeat(7, minmax(80px, 1fr)); }
      .week-view { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .list-header-row, .list-row { grid-template-columns: 160px 100px 100px 80px 100px 100px; font-size: 11px; }
      .modal-panel { border-radius: 20px; }
    }
    @media (max-width: 480px) {
      .premium-header { margin: 12px; padding: 24px 16px 36px; border-radius: 16px; }
      .page-title { font-size: 24px; }
      .kpi-strip { grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 12px; }
      .kpi-card { padding: 16px; border-radius: 16px; }
      .kpi-value { font-size: 24px; }
      .main-layout { padding: 0 12px; }
      .toolbar-bar { flex-direction: column; align-items: stretch; gap: 10px; }
      .toolbar-right { margin-left: 0; }
      .list-header-row, .list-row { grid-template-columns: 140px 90px 90px 80px 90px; }
      .lr-actions { display: none; }
      .modal-body { padding: 20px; }
      .modal-footer { padding: 12px 20px 20px; }
      .detail-drawer { width: 100%; }
    }
  `]
})
export class ShiftsComponent {
  private api = inject(ShiftsService);
  private http = inject(HttpClient);

  loading = true;
  error = '';
  viewMode: 'week' | 'month' | 'list' = 'week';
  selectedWeek = new Date();
  selectedStaffId = '';
  staffSearch = '';

  staffList: StaffMember[] = [];
  shiftTemplates: ShiftTemplate[] = [];
  shiftAssignments: Shift[] = [];
  weekDays: DayColumn[] = [];
  monthDays: { date: Date; dayNum: number; currentMonth: boolean; isToday: boolean }[] = [];

  showCreateDialog = false;
  showAssignmentDialog = false;
  showSwapDialog = false;
  showDetailDrawer = false;
  editingTemplate = false;

  formBusy = false;
  formMsg = '';
  formSuccess = '';

  templateForm: any = {
    name: '', startTime: '', endTime: '', breakDuration: 30,
    daysOfWeek: [1, 2, 3, 4, 5], isActive: true, shiftType: 'MORNING'
  };

  assignForm: any = {
    staffId: '', date: '', startTime: '', endTime: '',
    shiftType: 'MORNING', breakDuration: 30, notes: ''
  };

  swapForm: any = {
    fromStaffId: '', fromStaffName: '', fromDate: '', fromStart: '', fromEnd: '',
    fromShiftId: '', toStaffId: '', toShiftId: '', reason: ''
  };

  selectedShift: Shift | null = null;

  dayOptions = [
    { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];

  private staffColors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#14b8a6'];

  ngOnInit() {
    this.loadShifts();
    this.loadTemplates();
    this.buildWeek();
    this.buildMonth();
    this.loadStaffList();
  }

  /* ─── DATA LOADING ─── */
  loadShifts() {
    this.loading = true;
    this.error = '';
    const from = this.formatDate(this.getWeekStart());
    const to = this.formatDate(this.getWeekEnd());
    this.api.getAll({ from, to }).subscribe({
      next: (d) => { this.shiftAssignments = d; this.loading = false; },
      error: () => { this.error = 'Unable to load shifts. Please try again.'; this.loading = false; }
    });
  }

  loadTemplates() {
    this.api.getTemplates().subscribe({
      next: (d) => { this.shiftTemplates = d; },
      error: () => {}
    });
  }

  loadStaffList() {
    this.http.get<any[]>('/api/staff').subscribe({
      next: (d) => {
        this.staffList = (d || []).map((s: any, i: number) => ({
          id: s.id || s.staffId || String(i),
          name: s.name || s.staffName || `Staff ${i + 1}`,
          role: s.role || s.position || 'Stylist',
          avatar: s.avatar || '',
          color: this.staffColors[i % this.staffColors.length]
        }));
      },
      error: () => {
        const names = ['Priya Sharma', 'Ravi Kumar', 'Anjali Mehta', 'Vikram Singh', 'Neha Gupta', 'Amit Patel', 'Sonia Roy', 'Raj Verma'];
        this.staffList = names.map((n, i) => ({
          id: String(i + 1), name: n,
          role: ['Senior Stylist', 'Hair Artist', 'Color Specialist', 'Stylist', 'Junior Stylist', 'Manager', 'Receptionist', 'Trainee'][i] || 'Stylist',
          avatar: '', color: this.staffColors[i % this.staffColors.length]
        }));
      }
    });
  }

  /* ─── WEEK / MONTH BUILDING ─── */
  getWeekStart(): Date {
    const d = new Date(this.selectedWeek);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  getWeekEnd(): Date {
    const d = this.getWeekStart();
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  buildWeek() {
    const start = this.getWeekStart();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return {
        date: d,
        label: labels[i],
        dayNum: d.getDate(),
        isToday: d.getTime() === today.getTime()
      };
    });
  }

  buildMonth() {
    const year = this.selectedWeek.getFullYear();
    const month = this.selectedWeek.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cells: { date: Date; dayNum: number; currentMonth: boolean; isToday: boolean }[] = [];
    const prevMonth = new Date(year, month, 0);
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonth.getDate() - i);
      cells.push({ date: d, dayNum: d.getDate(), currentMonth: false, isToday: d.getTime() === today.getTime() });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      cells.push({ date: d, dayNum: i, currentMonth: true, isToday: d.getTime() === today.getTime() });
    }
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      cells.push({ date: d, dayNum: d.getDate(), currentMonth: false, isToday: d.getTime() === today.getTime() });
    }
    this.monthDays = cells;
  }

  /* ─── NAVIGATION ─── */
  navigateWeek(direction: number) {
    this.selectedWeek.setDate(this.selectedWeek.getDate() + direction * 7);
    this.selectedWeek = new Date(this.selectedWeek);
    this.buildWeek();
    this.buildMonth();
    this.loadShifts();
  }

  goToday() {
    this.selectedWeek = new Date();
    this.buildWeek();
    this.buildMonth();
    this.loadShifts();
  }

  jumpToDate(date: Date) {
    this.selectedWeek = new Date(date);
    this.viewMode = 'week';
    this.buildWeek();
    this.loadShifts();
  }

  /* ─── QUERIES ─── */
  getStaffShiftsForDay(staffId: string, date: Date): Shift[] {
    const dateStr = this.formatDate(date);
    return this.shiftAssignments.filter(s => {
      const matchDate = s.date?.slice(0, 10) === dateStr;
      return staffId === '*' ? matchDate : (s.staffId === staffId && matchDate);
    });
  }

  getStaffWeeklyCount(staffId: string): number {
    return this.shiftAssignments.filter(s => s.staffId === staffId).length;
  }

  getStaffInitial(name: string): string { return name ? name.charAt(0) : '?'; }
  getStaffColor(staffId: string): string {
    const idx = this.staffList.findIndex(s => s.id === staffId);
    return this.staffColors[idx >= 0 ? idx % this.staffColors.length : 0];
  }

  /* ─── COMPUTED KPIs ─── */
  get totalShifts(): number { return this.shiftAssignments.length; }
  get activeStaff(): number {
    const ids = new Set(this.shiftAssignments.map(s => s.staffId));
    return ids.size;
  }
  get hoursScheduled(): number {
    let total = 0;
    for (const s of this.shiftAssignments) {
      const [sh, sm] = (s.startTime || '0:0').split(':').map(Number);
      const [eh, em] = (s.endTime || '0:0').split(':').map(Number);
      total += (eh * 60 + em - sh * 60 - sm - (s.breakDuration || 0)) / 60;
    }
    return Math.round(total);
  }
  get coveragePercent(): number {
    const days = 7;
    const needed = this.staffList.length * days;
    return needed > 0 ? Math.round((this.shiftAssignments.length / needed) * 100) : 0;
  }
  get filteredShifts(): Shift[] { return this.shiftAssignments; }

  get filteredStaffList(): StaffMember[] {
    if (!this.staffSearch.trim()) return this.staffList;
    const q = this.staffSearch.toLowerCase();
    return this.staffList.filter(s => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  }

  /* ─── SHIFT COLORS ─── */
  getShiftColor(shift: Shift): string {
    const colors: Record<string, string> = {
      MORNING: '#6366f1',
      EVENING: '#8b5cf6',
      FULL_DAY: '#10b981',
      SPLIT: '#f59e0b',
      OFF: '#e5e7eb',
      HALF_DAY: '#ec4899',
      SCHEDULED: '#6366f1',
      IN_PROGRESS: '#f59e0b',
      COMPLETED: '#10b981',
      ABSENT: '#ef4444'
    };
    return colors[shift.status] || '#6366f1';
  }

  getShiftTypeLabel(shift: Shift): string {
    if (!shift.startTime || !shift.endTime) return shift.status || 'SHIFT';
    const [sh] = (shift.startTime || '0:0').split(':').map(Number);
    const [eh] = (shift.endTime || '0:0').split(':').map(Number);
    const hours = eh - sh;
    if (hours >= 11) return 'FULL_DAY';
    if (hours <= 5 && sh >= 12) return 'EVENING';
    if (hours <= 5) return 'HALF_DAY';
    if (hours <= 7 && sh < 12) return 'MORNING';
    return 'SPLIT';
  }

  /* ─── WEEK RANGE LABEL ─── */
  getWeekRangeLabel(): string {
    const start = this.getWeekStart();
    const end = this.getWeekEnd();
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  }

  formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  calculateDuration(start: string, end: string): string {
    const [sh, sm] = (start || '0:0').split(':').map(Number);
    const [eh, em] = (end || '0:0').split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return '0h';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  /* ─── DIALOGS ─── */
  showCreateTemplate() {
    this.editingTemplate = false;
    this.formMsg = '';
    this.formSuccess = '';
    this.templateForm = {
      name: '', startTime: '09:00', endTime: '18:00', breakDuration: 30,
      daysOfWeek: [1, 2, 3, 4, 5], isActive: true, shiftType: 'MORNING'
    };
    this.showCreateDialog = true;
  }

  openAssignDialog(staffId: string, date: Date) {
    this.formMsg = '';
    this.assignForm = {
      staffId, date: this.formatDate(date),
      startTime: '09:00', endTime: '18:00',
      shiftType: 'MORNING', breakDuration: 30, notes: ''
    };
    this.showAssignmentDialog = true;
  }

  openSwapDialog(shift: Shift) {
    this.formMsg = '';
    this.swapForm = {
      fromStaffId: shift.staffId, fromStaffName: shift.staffName,
      fromDate: shift.date, fromStart: shift.startTime, fromEnd: shift.endTime,
      fromShiftId: shift.id, toStaffId: '', toShiftId: '', reason: ''
    };
    this.showSwapDialog = true;
  }

  openDetail(shift: Shift) {
    this.selectedShift = shift;
    this.showDetailDrawer = true;
  }

  getStaffShiftsForSwap(staffId: string): Shift[] {
    return this.shiftAssignments.filter(s => s.staffId === staffId && s.status !== 'ABSENT');
  }

  toggleDay(day: number) {
    const idx = this.templateForm.daysOfWeek.indexOf(day);
    if (idx >= 0) {
      this.templateForm.daysOfWeek.splice(idx, 1);
    } else {
      this.templateForm.daysOfWeek.push(day);
    }
  }

  selectStaff(staffId: string) {
    this.selectedStaffId = this.selectedStaffId === staffId ? '' : staffId;
  }

  /* ─── ACTIONS ─── */
  createTemplate() {
    if (!this.templateForm.name || !this.templateForm.startTime || !this.templateForm.endTime) {
      this.formMsg = 'Please fill in all required fields.';
      return;
    }
    this.formBusy = true;
    this.formMsg = '';
    this.formSuccess = '';
    this.api.createTemplate({
      name: this.templateForm.name,
      startTime: this.templateForm.startTime,
      endTime: this.templateForm.endTime,
      breakDuration: this.templateForm.breakDuration,
      daysOfWeek: this.templateForm.daysOfWeek,
      isActive: this.templateForm.isActive
    }).subscribe({
      next: () => {
        this.formBusy = false;
        this.formSuccess = 'Template created successfully!';
        setTimeout(() => { this.showCreateDialog = false; this.loadTemplates(); }, 1200);
      },
      error: () => {
        this.formMsg = 'Failed to create template. Please try again.';
        this.formBusy = false;
      }
    });
  }

  createAssignment() {
    if (!this.assignForm.staffId || !this.assignForm.date || !this.assignForm.startTime || !this.assignForm.endTime) {
      this.formMsg = 'Please fill in all required fields.';
      return;
    }
    this.formBusy = true;
    this.formMsg = '';
    this.api.create({
      staffId: this.assignForm.staffId,
      date: this.assignForm.date,
      startTime: this.assignForm.startTime,
      endTime: this.assignForm.endTime,
      breakDuration: this.assignForm.breakDuration,
      notes: this.assignForm.notes
    }).subscribe({
      next: () => {
        this.formBusy = false;
        this.showAssignmentDialog = false;
        this.loadShifts();
      },
      error: () => {
        this.formMsg = 'Failed to create assignment.';
        this.formBusy = false;
      }
    });
  }

  requestSwap() {
    if (!this.swapForm.toStaffId || !this.swapForm.reason) {
      this.formMsg = 'Please select a staff member and provide a reason.';
      return;
    }
    this.formBusy = true;
    this.formMsg = '';
    this.api.update(this.swapForm.fromShiftId, {
      status: 'SWAP_REQUESTED' as any,
      notes: `Swap requested with ${this.swapForm.toStaffId}: ${this.swapForm.reason}`
    } as any).subscribe({
      next: () => {
        this.formBusy = false;
        this.showSwapDialog = false;
        this.loadShifts();
      },
      error: () => {
        this.formMsg = 'Failed to submit swap request.';
        this.formBusy = false;
      }
    });
  }

  approveSwap() {
    if (!this.selectedShift) return;
    this.api.update(this.selectedShift.id, {
      status: 'SCHEDULED' as any,
      notes: 'Swap approved'
    } as any).subscribe({
      next: () => { this.showDetailDrawer = false; this.loadShifts(); }
    });
  }

  markAbsent(shift: Shift) {
    this.api.update(shift.id, { status: 'ABSENT' } as any).subscribe({
      next: () => { this.showDetailDrawer = false; this.loadShifts(); }
    });
  }

  generateSchedule() {
    this.formBusy = true;
    const from = this.formatDate(this.getWeekStart());
    const to = this.formatDate(this.getWeekEnd());
    this.http.post('/api/shifts/generate', { from, to }).subscribe({
      next: () => {
        this.formBusy = false;
        this.loadShifts();
      },
      error: () => {
        this.formBusy = false;
        this.error = 'Schedule generation not available yet.';
      }
    });
  }
}
