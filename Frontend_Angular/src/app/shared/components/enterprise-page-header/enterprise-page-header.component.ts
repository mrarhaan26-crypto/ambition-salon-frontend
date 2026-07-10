import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Breadcrumb, EnterpriseAction, getModuleTheme, ModuleKey, StatChip } from '../../theme/module-theme.config';

@Component({
  selector: 'app-enterprise-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="eph" [attr.data-theme]="theme.key" [style.--module-gradient]="theme.gradient" [style.--module-accent]="theme.accent" [style.--module-badge]="theme.badge">
      <div class="eph-bg"></div>

      <nav class="eph-breadcrumbs" *ngIf="breadcrumbs && breadcrumbs.length">
        <ng-container *ngFor="let crumb of breadcrumbs; let last = last">
          <a *ngIf="crumb.link; else plainCrumb" [routerLink]="crumb.link" class="eph-crumb">{{ crumb.label }}</a>
          <ng-template #plainCrumb><span class="eph-crumb" [class.current]="last">{{ crumb.label }}</span></ng-template>
          <span class="eph-sep" *ngIf="!last">/</span>
        </ng-container>
      </nav>

      <div class="eph-main">
        <div class="eph-icon" *ngIf="icon || theme.icon">{{ icon || theme.icon }}</div>
        <div class="eph-titles">
          <h1 class="eph-title">{{ title }}</h1>
          <p class="eph-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
          <div class="eph-chips" *ngIf="statsChips && statsChips.length">
            <span class="eph-chip" *ngFor="let chip of statsChips">
              <span class="eph-chip-icon" *ngIf="chip.icon">{{ chip.icon }}</span>
              <strong>{{ chip.value }}</strong>
              <span class="eph-chip-label">{{ chip.label }}</span>
            </span>
          </div>
        </div>

        <div class="eph-actions">
          <ng-content select="[header-actions]"></ng-content>
          <button *ngFor="let a of secondaryActions" class="eph-btn eph-btn-secondary" [class.disabled]="a.disabled"
            [disabled]="a.disabled" (click)="emit(a)">
            <span class="eph-btn-icon" *ngIf="a.icon">{{ a.icon }}</span>{{ a.label }}
          </button>
          <button *ngIf="primaryAction" class="eph-btn eph-btn-primary" [class.disabled]="primaryAction.disabled"
            [disabled]="primaryAction.disabled" (click)="emit(primaryAction)">
            <span class="eph-btn-icon" *ngIf="primaryAction.icon">{{ primaryAction.icon }}</span>{{ primaryAction.label }}
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .eph{position:relative;overflow:hidden;border-radius:20px;padding:22px 26px;color:#fff;
      background:linear-gradient(135deg,rgba(15,23,42,.04),rgba(15,23,42,.01));border:1px solid rgba(15,23,42,.06);
      box-shadow:0 10px 30px rgba(15,23,42,.06)}
    .eph-bg{position:absolute;inset:0;background:var(--module-gradient);opacity:.14;pointer-events:none}
    .eph > *{position:relative;z-index:1}
    .eph-breadcrumbs{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;margin-bottom:12px;flex-wrap:wrap}
    .eph-crumb{color:var(--module-accent);text-decoration:none;opacity:.85}
    .eph-crumb.current{opacity:1;font-weight:800}
    .eph-crumb:hover{opacity:1}
    .eph-sep{opacity:.4}
    .eph-main{display:flex;align-items:flex-start;gap:18px;flex-wrap:wrap}
    .eph-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;
      font-size:26px;background:var(--module-gradient);box-shadow:0 8px 20px rgba(15,23,42,.18);flex-shrink:0}
    .eph-titles{flex:1;min-width:220px}
    .eph-title{margin:0;font-size:28px;line-height:1.15;font-weight:800;
      background:var(--module-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .eph-subtitle{margin:4px 0 0;font-size:14px;color:#475569;font-weight:500}
    .eph-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .eph-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.7);border:1px solid rgba(15,23,42,.06);
      border-radius:999px;padding:4px 12px;font-size:12px;color:#334155;box-shadow:0 2px 8px rgba(15,23,42,.05)}
    .eph-chip strong{color:var(--module-accent);font-size:13px}
    .eph-chip-icon{font-size:13px}
    .eph-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-left:auto}
    .eph-btn{border:0;border-radius:12px;padding:11px 18px;font-weight:800;cursor:pointer;font-size:13px;
      display:inline-flex;align-items:center;gap:8px;transition:transform .15s,box-shadow .15s,background .15s}
    .eph-btn-icon{font-size:15px}
    .eph-btn-primary{background:var(--module-gradient);color:#fff;box-shadow:0 8px 20px rgba(15,23,42,.18)}
    .eph-btn-primary:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(15,23,42,.24)}
    .eph-btn-secondary{background:rgba(255,255,255,.85);color:var(--module-accent);border:1px solid rgba(15,23,42,.08)}
    .eph-btn-secondary:hover{background:#fff;transform:translateY(-1px)}
    .eph-btn.disabled,.eph-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
    @media(max-width:760px){.eph-main{flex-direction:column}.eph-actions{margin-left:0;width:100%}.eph-btn{flex:1;justify-content:center}}
  `]
})
export class EnterprisePageHeaderComponent {
  @Input() themeKey: ModuleKey | string = 'dashboard';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() primaryAction?: EnterpriseAction;
  @Input() secondaryActions: EnterpriseAction[] = [];
  @Input() statsChips: StatChip[] = [];

  @Output() action = new EventEmitter<EnterpriseAction>();

  get theme() {
    return getModuleTheme(this.themeKey as string);
  }

  emit(a: EnterpriseAction) {
    if (a.disabled) return;
    this.action.emit(a);
  }
}
