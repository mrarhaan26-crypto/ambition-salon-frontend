import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { getStatusColor } from '../../theme/module-theme.config';

@Component({
  selector: 'app-enterprise-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="esb" [class.sm]="size === 'sm'" [class.lg]="size === 'lg'" [style.--badge]="color" [style.--badge-soft]="soft">
      <span class="esb-dot" *ngIf="dot"></span>
      <ng-content>{{ displayLabel }}</ng-content>
    </span>
  `,
  styles: [`
    .esb{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;
      padding:4px 12px;border-radius:999px;color:var(--badge);
      background:var(--badge-soft);border:1px solid color-mix(in srgb,var(--badge) 25%,transparent);
      white-space:nowrap;letter-spacing:.02em;text-transform:uppercase}
    .esb.sm{font-size:10px;padding:2px 9px}
    .esb.lg{font-size:13px;padding:6px 14px}
    .esb-dot{width:8px;height:8px;border-radius:50%;background:var(--badge);box-shadow:0 0 0 3px color-mix(in srgb,var(--badge) 22%,transparent)}
  `]
})
export class EnterpriseStatusBadgeComponent {
  @Input() status = '';
  @Input() label = '';
  @Input() color = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() dot = true;

  get displayLabel(): string {
    if (this.label) return this.label;
    if (!this.status) return '';
    return this.status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  get soft(): string {
    const base = this.color || getStatusColor(this.status);
    return this.hexToSoft(base);
  }

  private hexToSoft(hex: string): string {
    const m = hex.replace('#', '');
    if (m.length !== 6) return 'rgba(100,116,139,.12)';
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return `rgba(${r},${g},${b},0.12)`;
  }
}
