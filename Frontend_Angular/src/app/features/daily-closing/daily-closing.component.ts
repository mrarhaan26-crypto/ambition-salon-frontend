import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DailyClosingService } from './daily-closing.service';
import { DailyClosing, ClosingSummary } from './daily-closing.models';

@Component({
  selector: 'app-daily-closing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>Daily Closing</h1><p>End-of-day register reconciliation.</p></div><button class="primary" (click)="openForm()">+ Open Day</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis" *ngIf="summary">
          <div class="kpi-card"><span class="kpi-lbl">Open Days</span><span class="kpi-val warn">{{ summary.openDays }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Closed Days</span><span class="kpi-val good">{{ summary.closedDays }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Total Revenue</span><span class="kpi-val">{{ summary.totalRevenue | currency }}</span></div>
          <div class="kpi-card"><span class="kpi-lbl">Cash Difference</span><span class="kpi-val" [class.negative]="summary.totalCashDiff < 0">{{ summary.totalCashDiff | currency }}</span></div>
        </div>

        <div class="toolbar">
          <select [(ngModel)]="statusFilter" (change)="load()"><option value="">All</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select>
          <input [(ngModel)]="dateFrom" type="date" (change)="load()">
          <input [(ngModel)]="dateTo" type="date" (change)="load()">
        </div>

        <div class="empty" *ngIf="items.length===0"><p>No closing records found.</p></div>
        <div class="closing-list" *ngIf="items.length>0">
          <div class="closing-card" *ngFor="let c of items" [class.closed]="c.status==='CLOSED'">
            <div class="closing-head">
              <strong>{{ c.date | date:'MMM dd, yyyy' }}</strong>
              <span class="status-badge" [class.open]="c.status==='OPEN'" [class.closed]="c.status==='CLOSED'">{{ c.status }}</span>
            </div>
            <div class="closing-meta">Opened by {{ c.openedBy }} <span *ngIf="c.closedBy">| Closed by {{ c.closedBy }}</span></div>
            <div class="closing-fin" *ngIf="c.status==='CLOSED'">
              <span>Expected: {{ c.expectedCash | currency }}</span>
              <span>Actual: {{ c.actualCash | currency }}</span>
              <span class="diff" [class.negative]="(c.cashDifference??0) < 0">Diff: {{ c.cashDifference | currency }}</span>
              <span>Card: {{ c.cardTotal | currency }}</span>
              <span>Total: <strong>{{ c.totalRevenue | currency }}</strong></span>
            </div>
            <div class="closing-fin" *ngIf="c.status==='OPEN'">
              <span>Expected Cash: {{ c.expectedCash | currency }}</span>
              <span>Card: {{ c.cardTotal | currency }}</span>
              <span>Total: <strong>{{ c.totalRevenue | currency }}</strong></span>
            </div>
            <small *ngIf="c.notes">{{ c.notes }}</small>
            <div class="closing-actions" *ngIf="c.status==='OPEN'">
              <button (click)="openCloseDay(c)">Close Day</button>
            </div>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>Open New Day</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Date</label><input [(ngModel)]="form.date" type="date"></div>
          <div class="form-group"><label>Opened By</label><input [(ngModel)]="form.openedBy" placeholder="Staff name"></div>
          <div class="form-group"><label>Opening Cash ($)</label><input [(ngModel)]="form.expectedCash" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Notes</label><textarea [(ngModel)]="form.notes" placeholder="Optional notes"></textarea></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Opening...' : 'Open Day' }}</button></div>
        </div>
      </div>
    </div>

    <div class="drawer-overlay" *ngIf="showCloseForm" (click)="showCloseForm=false">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>Close Day: {{ closingDay?.date | date:'MMM dd, yyyy' }}</h2><button class="close-btn" (click)="showCloseForm=false">&times;</button></div>
        <div class="drawer-body">
          <div class="closing-summary">
            <div>Expected Cash: <strong>{{ closingDay?.expectedCash | currency }}</strong></div>
            <div>Card Total: <strong>{{ closingDay?.cardTotal | currency }}</strong></div>
          </div>
            <div class="form-group"><label>Actual Cash ($)</label><input [(ngModel)]="closeDayForm.actualCash" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Notes</label><textarea [(ngModel)]="closeDayForm.notes" placeholder="Closing notes"></textarea></div>
          <div class="msg" *ngIf="closeMsg">{{ closeMsg }}</div>
          <div class="drawer-actions"><button (click)="showCloseForm=false">Cancel</button><button class="btn-primary" (click)="doCloseDay()" [disabled]="closeBusy">{{ closeBusy ? 'Closing...' : 'Close Day' }}</button></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;display:grid;gap:4px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-lbl{font-size:13px;color:#6b7280;font-weight:600}.kpi-val{font-size:28px;font-weight:800}
    .kpi-val.warn{color:#d97706}.kpi-val.good{color:#16a34a}.kpi-val.negative{color:#991b1b}
    .toolbar{display:flex;gap:10px;margin-bottom:4px}
    .toolbar select,.toolbar input[type=date]{padding:12px 16px;border:1px solid #e5e7eb;border-radius:14px}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .closing-list{display:grid;gap:8px}
    .closing-card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;display:grid;gap:8px}
    .closing-card.closed{opacity:.8}
    .closing-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .closing-head strong{flex:1;font-size:16px}
    .status-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px}
    .status-badge.open{background:#fffbeb;color:#d97706}
    .status-badge.closed{background:#f0fdf4;color:#16a34a}
    .closing-meta{font-size:12px;color:#6b7280}
    .closing-fin{display:flex;flex-wrap:wrap;gap:12px;font-size:13px}
    .closing-fin .diff{font-weight:700}.closing-fin .diff.negative{color:#991b1b}
    .closing-card small{font-size:12px;color:#6b7280}
    .closing-actions button{border:0;border-radius:10px;padding:8px 16px;font-weight:700;cursor:pointer;background:#fffbeb;color:#d97706;font-size:12px}
    @media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-panel{background:white;width:min(460px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-group textarea{min-height:60px;resize:vertical}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-primary{background:#0b0b0b;color:white}
    .msg{padding:12px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;text-align:center}
    .closing-summary{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;padding:16px;border-radius:14px;font-size:14px}
    @media(max-width:900px){.drawer-panel{width:100%}}
  `]
})
export class DailyClosingComponent {
  private api = inject(DailyClosingService);
  items: DailyClosing[] = []; summary: ClosingSummary | null = null;
  loading = true; error = '';
  statusFilter = ''; dateFrom = ''; dateTo = '';
  showForm = false; form: any = { date: '', openedBy: '', expectedCash: 0, notes: '' }; formMsg = ''; formBusy = false;
  showCloseForm = false; closingDay: DailyClosing | null = null;
   closeDayForm: any = { actualCash: 0, notes: '' }; closeMsg = ''; closeBusy = false;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getAll({ status: this.statusFilter || undefined, from: this.dateFrom || undefined, to: this.dateTo || undefined }).subscribe({
      next: d => { this.items = d; this.loading = false; },
      error: () => { this.error = 'Closing data unavailable.'; this.loading = false; },
    });
    this.api.getSummary().subscribe({ next: d => this.summary = d });
  }
  openForm() { this.form = { date: '', openedBy: '', expectedCash: 0, notes: '' }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  save() {
    this.formBusy = true; this.formMsg = '';
    this.api.create(this.form).subscribe({ next: () => { this.closeForm(); this.formBusy = false; this.load(); }, error: () => { this.formMsg = 'Failed to open day.'; this.formBusy = false; } });
  }
  openCloseDay(c: DailyClosing) { this.closingDay = c; this.closeDayForm = { actualCash: c.expectedCash, notes: '' }; this.closeMsg = ''; this.showCloseForm = true; }
  doCloseDay() {
    if (!this.closingDay) return;
    this.closeBusy = true; this.closeMsg = '';
    this.api.closeDay(this.closingDay.id, this.closeDayForm).subscribe({ next: () => { this.showCloseForm = false; this.closeBusy = false; this.closingDay = null; this.load(); }, error: () => { this.closeMsg = 'Failed to close day.'; this.closeBusy = false; } });
  }
}
