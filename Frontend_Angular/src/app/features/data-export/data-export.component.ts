import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataExportService } from './data-export.service';

@Component({
  selector: 'app-data-export',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>Data Export</h1>
          <p>Export business data for backup or analysis.</p>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading export data...</span>
      </div>

      <!-- Error -->
      <div class="error" *ngIf="error">
        <strong>Failed to load export data.</strong>
        <p>{{ error }}</p>
        <button (click)="loadAll()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">

        <!-- Module Selection -->
        <div class="panel">
          <h2>Select Module to Export</h2>
          <div class="module-grid">
            <button *ngFor="let m of modules"
              class="module-btn"
              [class.active]="selectedModule === m"
              (click)="selectModule(m)">
              {{ m }}
            </button>
          </div>
          <button class="export-btn" [disabled]="!selectedModule || exporting" (click)="runExport()">
            {{ exporting ? 'Exporting...' : 'Start Export' }}
          </button>
        </div>

        <!-- Success Feedback -->
        <div class="success" *ngIf="successMsg">
          <strong>Export completed!</strong>
          <p>{{ successMsg }}</p>
        </div>

        <!-- History Table -->
        <div class="panel" *ngIf="history.length > 0">
          <h2>Export History</h2>
          <div class="tab-scroll">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let h of history">
                  <td><strong>{{ h.module }}</strong></td>
                  <td>
                    <span class="status-badge" [class.pending]="h.status === 'PENDING'"
                      [class.completed]="h.status === 'COMPLETED'"
                      [class.failed]="h.status === 'FAILED'">
                      {{ h.status }}
                    </span>
                  </td>
                  <td>{{ h.createdAt | date:'MMM dd, yyyy h:mm a' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty History -->
        <div class="empty" *ngIf="history.length === 0">
          <strong>No exports yet.</strong>
          <p>Select a module above and start your first export.</p>
        </div>

      </ng-container>
    </section>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .panel{background:white;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.06)}
    .panel h2{margin:0 0 18px;font-size:20px}
    .module-grid{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px}
    .module-btn{padding:12px 20px;border:2px solid #e5e7eb;border-radius:14px;background:white;font-weight:700;cursor:pointer;transition:all .15s;text-transform:capitalize}
    .module-btn:hover{border-color:#0b0b0b}
    .module-btn.active{border-color:#0b0b0b;background:#0b0b0b;color:white}
    .export-btn{border:0;border-radius:14px;padding:14px 24px;background:#0b0b0b;color:white;font-weight:800;font-size:16px;cursor:pointer}
    .export-btn:disabled{opacity:.4;cursor:not-allowed}
    .success{background:#f0fdf4;border:1px solid #86efac;border-radius:24px;padding:20px;text-align:center}
    .success strong{color:#16a34a;display:block;margin-bottom:4px}
    .success p{color:#15803d;margin:0}
    .tab-scroll{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th,td{padding:12px 14px;text-align:left;border-bottom:1px solid #f1f5f9}
    th{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
    .status-badge{font-size:11px;padding:3px 12px;border-radius:20px;font-weight:700;text-transform:uppercase}
    .status-badge.pending{background:#fef3c7;color:#d97706}
    .status-badge.completed{background:#f0fdf4;color:#16a34a}
    .status-badge.failed{background:#fef2f2;color:#dc2626}
    .empty{text-align:center;padding:48px;color:#6b7280}
    .empty strong{display:block;font-size:18px;margin-bottom:6px}
    @media(max-width:900px){.module-grid{flex-direction:column}.module-btn{text-align:center}}
  `]
})
export class DataExportComponent {
  private api = inject(DataExportService);

  loading = true;
  error = '';
  exporting = false;
  successMsg = '';
  selectedModule = '';
  modules: string[] = ['clients', 'bookings', 'payments', 'invoices', 'inventory', 'services'];
  history: any[] = [];

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.error = '';
    this.api.getHistory().subscribe({
      next: (res) => {
        this.history = res.data || res.history || res || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Export data unavailable.';
        this.loading = false;
      }
    });
  }

  selectModule(module: string) {
    this.selectedModule = this.selectedModule === module ? '' : module;
    this.successMsg = '';
  }

  runExport() {
    if (!this.selectedModule) return;
    this.exporting = true;
    this.successMsg = '';
    this.api.runExport(this.selectedModule).subscribe({
      next: (res) => {
        this.exporting = false;
        this.successMsg = res.message || `${this.selectedModule} exported successfully.`;
        this.loadAll();
        this.selectedModule = '';
      },
      error: (err) => {
        this.exporting = false;
        this.error = err.message || 'Export failed.';
      }
    });
  }
}
