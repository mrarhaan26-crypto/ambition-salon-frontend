import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface QuickCreateOption {
  key: string;
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-quick-create-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="qc-overlay" *ngIf="visible" (click)="close.emit()"></div>
    <div class="qc-drawer" *ngIf="visible" [class.qc-open]="visible" role="dialog" aria-label="Quick create">
      <div class="qc-header">
        <h3>Quick Create</h3>
        <button class="qc-close" (click)="close.emit()" aria-label="Close">&times;</button>
      </div>
      <div class="qc-body">
        <input class="qc-search" [(ngModel)]="query" placeholder="Filter actions..." aria-label="Filter quick create actions" />
        <div class="qc-grid">
          <button class="qc-item" *ngFor="let opt of filtered" (click)="go(opt)">
            <span class="qc-icon">{{ opt.icon }}</span>
            <span class="qc-label">{{ opt.label }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .qc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:1150;animation:qc-fade .2s}
    .qc-drawer{position:fixed;top:0;right:0;bottom:0;width:420px;max-width:100vw;background:var(--surface-card,#fff);z-index:1160;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.12);transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1)}
    .qc-drawer.qc-open{transform:translateX(0)}
    .qc-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-subtle,#e5e7eb);flex-shrink:0}
    .qc-header h3{margin:0;font-size:16px;font-weight:700}
    .qc-close{background:none;border:0;font-size:24px;color:#6b7280;cursor:pointer;line-height:1;padding:4px}
    .qc-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px}
    .qc-search{height:44px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:12px;padding:0 14px;font:inherit;outline:none}
    .qc-search:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2)}
    .qc-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .qc-item{display:flex;align-items:center;gap:10px;padding:14px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;background:var(--surface-elevated,#fff);cursor:pointer;text-align:left;font:inherit;font-weight:600;color:var(--text-strong,#111);transition:all .15s}
    .qc-item:hover{border-color:#6366f1;transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.08)}
    .qc-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);font-size:18px;flex-shrink:0}
    .qc-label{font-size:13px}
    @media(max-width:768px){.qc-drawer{width:100vw}.qc-grid{grid-template-columns:1fr}}
    @keyframes qc-fade{from{opacity:0}to{opacity:1}}
  `]
})
export class QuickCreateDrawerComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();

  query = '';

  options: QuickCreateOption[] = [
    { key: 'booking', label: 'New Booking', icon: '🗓️', route: '/app/calendar' },
    { key: 'client', label: 'New Client', icon: '👤', route: '/app/clients/new' },
    { key: 'staff', label: 'New Staff', icon: '🧑‍💼', route: '/app/staff/new' },
    { key: 'pos', label: 'New Sale', icon: '💳', route: '/app/pos/new' },
    { key: 'inventory', label: 'New Product', icon: '📦', route: '/app/inventory/new' },
    { key: 'campaign', label: 'New Campaign', icon: '📣', route: '/app/marketing/campaigns/new' },
    { key: 'invoice', label: 'New Invoice', icon: '🧾', route: '/app/invoices' },
    { key: 'service', label: 'New Service', icon: '💇', route: '/app/services' },
  ];

  get filtered(): QuickCreateOption[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter(o => o.label.toLowerCase().includes(q));
  }

  constructor(private router: Router) {}

  go(opt: QuickCreateOption): void {
    this.close.emit();
    this.router.navigateByUrl(opt.route);
  }
}
