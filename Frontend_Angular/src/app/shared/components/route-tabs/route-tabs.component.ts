import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface RouteTab {
  path: string;
  label: string;
  icon?: string;
  badge?: string | number;
  disabled?: boolean;
}

@Component({
  selector: 'app-route-tabs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="route-tabs" role="tablist" aria-label="Page sections" [attr.aria-orientation]="orientation">
      <a class="route-tab"
         *ngFor="let tab of tabs"
         [class.disabled]="tab.disabled"
         [attr.aria-disabled]="tab.disabled ? 'true' : null"
         [attr.tabindex]="tab.disabled ? -1 : 0"
         [attr.aria-current]="tab.disabled ? null : 'false'"
         [routerLink]="tab.disabled ? null : (basePath + '/' + tab.path)"
         routerLinkActive="active"
         [routerLinkActiveOptions]="{ exact: true }">
        <span class="rt-icon" *ngIf="tab.icon" aria-hidden="true">{{ tab.icon }}</span>
        <span class="rt-label">{{ tab.label }}</span>
        <span class="rt-badge" *ngIf="tab.badge !== undefined && tab.badge !== null">{{ tab.badge }}</span>
      </a>
    </nav>
  `,
  styles: [`
    .route-tabs{display:flex;gap:2px;border-bottom:1px solid var(--border-subtle,#e5e7eb);
      overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-bottom:20px}
    .route-tabs::-webkit-scrollbar{display:none}
    .route-tab{position:relative;display:inline-flex;align-items:center;gap:7px;padding:11px 16px;
      font-size:13.5px;font-weight:600;color:var(--text-soft,#64748b);text-decoration:none;white-space:nowrap;
      border-bottom:2px solid transparent;transition:color .15s,border-color .15s,background .15s;flex-shrink:0}
    .route-tab:hover{color:var(--text-strong,#111827);background:rgba(99,102,241,.05)}
    .route-tab.active{color:#4f46e5;border-bottom-color:#4f46e5}
    .route-tab.disabled{opacity:.45;cursor:not-allowed}
    .rt-icon{font-size:15px;line-height:1}
    .rt-badge{font-size:10px;font-weight:800;padding:1px 7px;border-radius:999px;background:#4f46e5;color:#fff;line-height:1.4}
    @media(min-width:769px){.route-tab{padding:12px 18px;font-size:14px}}
  `]
})
export class RouteTabsComponent {
  @Input() tabs: RouteTab[] = [];
  @Input() basePath = '';
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
}
