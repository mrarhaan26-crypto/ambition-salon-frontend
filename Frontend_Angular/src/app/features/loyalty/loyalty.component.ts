import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoyaltyService } from './loyalty.service';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Loyalty</h1>
          <p>Loyalty points and rewards management.</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading loyalty data...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load.</strong><p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpis">
          <div class="kpi-card"><span>Total Clients</span><strong>{{ summary?.totalClients || 0 }}</strong></div>
          <div class="kpi-card"><span>Clients with Points</span><strong>{{ summary?.clientsWithPoints || 0 }}</strong></div>
          <div class="kpi-card"><span>Total Points Issued</span><strong>{{ summary?.totalPoints || 0 }}</strong></div>
        </div>

        <div class="panel">
          <h2>Adjust Client Points</h2>
          <div class="adjust-form">
            <input [(ngModel)]="adjustForm.clientId" placeholder="Client ID">
            <input [(ngModel)]="adjustForm.points" type="number" placeholder="Points (+/-)">
            <input [(ngModel)]="adjustForm.description" placeholder="Reason">
            <button (click)="doAdjust()">Adjust Points</button>
          </div>
          <div class="msg" *ngIf="adjustMsg">{{ adjustMsg }}</div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:24px}
    h2{font-size:20px;margin:0 0 16px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .adjust-form{display:flex;gap:12px;flex-wrap:wrap}
    .adjust-form input{flex:1;min-width:140px;padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .adjust-form button{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .msg{padding:12px;background:#f0fdf4;border-radius:12px;color:#16a34a;font-weight:700;margin-top:12px}
  `]
})
export class LoyaltyComponent {
  private api = inject(LoyaltyService);
  summary: any = null;
  loading = true;
  error = '';
  adjustForm: any = { clientId: '', points: 0, description: '' };
  adjustMsg = '';

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    this.api.getSummary().subscribe({ next: (d) => { this.summary = d; this.loading = false; }, error: () => { this.error = 'Loyalty data unavailable.'; this.loading = false; } });
  }

  doAdjust() {
    this.adjustMsg = '';
    this.api.adjust(this.adjustForm).subscribe({
      next: () => { this.adjustMsg = 'Points adjusted successfully!'; this.loadAll(); setTimeout(() => this.adjustMsg = '', 3000); },
      error: () => { this.adjustMsg = 'Failed to adjust points.'; },
    });
  }
}
