import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { getModuleTheme, ModuleKey, Trend } from '../../theme/module-theme.config';

@Component({
  selector: 'app-enterprise-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="esc" [class.clickable]="clickable" [attr.data-theme]="theme.key"
      [style.--module-gradient]="theme.gradient" [style.--module-accent]="theme.accent" [style.--module-badge]="theme.badge"
      (click)="onClick()">
      <div class="esc-glow"></div>
      <div class="esc-top">
        <span class="esc-icon" *ngIf="icon || theme.icon">{{ icon || theme.icon }}</span>
        <span class="esc-trend" *ngIf="trend" [class.up]="trend.dir === 'up'" [class.down]="trend.dir === 'down'" [class.neutral]="trend.dir === 'neutral'">
          {{ trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '■' }} {{ trend.pct }}%
        </span>
      </div>
      <div class="esc-value">{{ value }}</div>
      <div class="esc-label">{{ label }}</div>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .esc{position:relative;overflow:hidden;border-radius:18px;padding:18px 20px;background:#fff;
      border:1px solid rgba(15,23,42,.08);box-shadow:0 6px 20px rgba(15,23,42,.06);transition:transform .18s,box-shadow .18s}
    .esc.clickable{cursor:pointer}
    .esc.clickable:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(15,23,42,.12)}
    .esc-glow{position:absolute;top:-40px;right:-40px;width:140px;height:140px;border-radius:50%;
      background:var(--module-gradient);opacity:.12;pointer-events:none}
    .esc > *{position:relative;z-index:1}
    .esc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
    .esc-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;
      font-size:20px;background:var(--module-gradient);box-shadow:0 6px 16px rgba(15,23,42,.16)}
    .esc-trend{font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px}
    .esc-trend.up{color:#16a34a;background:rgba(22,163,74,.12)}
    .esc-trend.down{color:#dc2626;background:rgba(220,38,38,.12)}
    .esc-trend.neutral{color:#64748b;background:rgba(100,116,139,.12)}
    .esc-value{font-size:26px;font-weight:800;color:#0f172a;line-height:1.1}
    .esc-label{font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-top:4px}
  `]
})
export class EnterpriseStatCardComponent {
  @Input() themeKey: ModuleKey | string = 'dashboard';
  @Input() label = '';
  @Input() value = '';
  @Input() icon = '';
  @Input() trend?: Trend;
  @Input() clickable = false;

  @Output() clicked = new EventEmitter<void>();

  get theme() {
    return getModuleTheme(this.themeKey as string);
  }

  onClick() {
    if (this.clickable) this.clicked.emit();
  }
}
