import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BranchesService } from './branches.service';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Branches</h1>
          <p>Multi-branch operations overview.</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading && !overview"><div class="spinner"></div><span>Loading branches...</span></div>

      <div class="error" *ngIf="error">
        <strong>Failed to load branches.</strong><p>{{ error }}</p>
        <button (click)="loadBranches()">Retry</button>
      </div>

      <ng-container *ngIf="!selectedBranch">

        <div class="empty" *ngIf="!loading && !error && !branches?.length">
          <p>No branches found.</p>
        </div>

        <div class="branch-grid">
          <div class="branch-card" *ngFor="let b of branches" (click)="selectBranch(b)">
            <strong class="branch-name">{{ b.name }}</strong>
            <span class="branch-city">{{ b.city }}</span>
            <span class="branch-phone">{{ b.phone }}</span>
          </div>
        </div>

      </ng-container>

      <ng-container *ngIf="selectedBranch">
        <div class="back-bar">
          <button class="back-btn" (click)="selectedBranch = null; overview = null">&larr; Back to Branches</button>
          <h2>{{ selectedBranch.name }}</h2>
        </div>

        <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading branch details...</span></div>

        <ng-container *ngIf="!loading">
          <div class="kpis" *ngIf="overview">
            <div class="kpi-card"><span>Total Bookings</span><strong>{{ overview.totalBookings }}</strong></div>
            <div class="kpi-card"><span>Staff</span><strong>{{ overview.totalStaff }}</strong></div>
            <div class="kpi-card"><span>Services</span><strong>{{ overview.totalServices }}</strong></div>
          </div>

          <div class="detail-grid">
            <div class="panel" *ngIf="staff?.length">
              <h3>Staff</h3>
              <div class="list-item" *ngFor="let s of staff">
                <strong>{{ s.fullName }}</strong><span>{{ s.role }}</span>
              </div>
            </div>

            <div class="panel" *ngIf="services?.length">
              <h3>Services</h3>
              <div class="list-item" *ngFor="let s of services">
                <strong>{{ s.name }}</strong><span>{{ s.price | currency }}</span>
              </div>
            </div>

            <div class="panel" *ngIf="bookings?.length">
              <h3>Recent Bookings</h3>
              <div class="list-item" *ngFor="let b of bookings">
                <strong>{{ b.clientName }}</strong><span>{{ b.date | date:'mediumDate' }}</span>
              </div>
            </div>

            <div class="panel" *ngIf="inventory?.length">
              <h3>Inventory</h3>
              <div class="list-item" *ngFor="let i of inventory">
                <strong>{{ i.name }}</strong><span>Qty: {{ i.quantity }}</span>
              </div>
            </div>
          </div>

          <div class="empty detail-empty" *ngIf="!overview && !staff?.length && !services?.length && !bookings?.length && !inventory?.length">
            <p>No details available for this branch.</p>
          </div>
        </ng-container>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:24px;text-align:center;color:#6b7280}
    .detail-empty{padding:48px 24px}
    .branch-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .branch-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06);cursor:pointer;display:grid;gap:6px;transition:box-shadow .2s}
    .branch-card:hover{box-shadow:0 20px 50px rgba(15,23,42,.12)}
    .branch-name{font-size:18px}
    .branch-city{color:#6b7280;font-size:14px}
    .branch-phone{color:#374151;font-size:14px}
    .back-bar{display:flex;align-items:center;gap:16px}
    .back-bar h2{margin:0}
    .back-btn{border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;background:white;font-weight:700;cursor:pointer}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .kpi-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .kpi-card span{display:block;color:#6b7280;font-size:13px;margin-bottom:8px}
    .kpi-card strong{font-size:28px}
    h2{font-size:20px;margin:0}
    h3{font-size:17px;margin:0 0 14px}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}
    .list-item{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f8fafc;font-size:14px}
    .list-item:last-child{border:0}
    .list-item span{color:#6b7280}
    @media(max-width:1200px){.branch-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:900px){.branch-grid,.detail-grid,.kpis{grid-template-columns:1fr}.head{flex-direction:column;align-items:stretch}}
  `]
})
export class BranchesComponent {
  private api = inject(BranchesService);

  loading = true;
  error = '';
  branches: any = null;
  selectedBranch: any = null;
  overview: any = null;
  staff: any = null;
  services: any = null;
  bookings: any = null;
  inventory: any = null;

  ngOnInit() { this.loadBranches(); }

  loadBranches() {
    this.loading = true; this.error = '';
    this.api.getAll().subscribe({
      next: (d) => { this.branches = d; this.loading = false; },
      error: () => { this.error = 'Branches unavailable.'; this.loading = false; },
    });
  }

  selectBranch(branch: any) {
    this.selectedBranch = branch;
    this.loading = true;
    this.overview = null; this.staff = null; this.services = null; this.bookings = null; this.inventory = null;
    const id = branch.id;
    this.api.getOverview(id).subscribe({ next: (d) => this.overview = d, error: () => {} });
    this.api.getStaff(id).subscribe({ next: (d) => this.staff = d, error: () => {} });
    this.api.getServices(id).subscribe({ next: (d) => this.services = d, error: () => {} });
    this.api.getBookings(id).subscribe({ next: (d) => this.bookings = d, error: () => {} });
    this.api.getInventory(id).subscribe({
      next: (d) => { this.inventory = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
