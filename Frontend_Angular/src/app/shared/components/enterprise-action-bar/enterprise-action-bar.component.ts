import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EnterpriseAction, getModuleTheme, ModuleKey } from '../../theme/module-theme.config';

@Component({
  selector: 'app-enterprise-action-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="eab" [class.wrap]="wrap" [attr.data-align]="align" [attr.data-theme]="theme.key"
      [style.--module-accent]="theme.accent" [style.--module-gradient]="theme.gradient">
      <ng-content></ng-content>
      <button *ngFor="let a of actions" class="eab-btn" [class]="'v-' + (a.variant || 'secondary')"
        [class.disabled]="a.disabled" [disabled]="a.disabled" (click)="emit(a)">
        <span class="eab-icon" *ngIf="a.icon">{{ a.icon }}</span>{{ a.label }}
      </button>
    </div>
  `,
  styles: [`
    .eab{display:flex;gap:10px;align-items:center;flex-wrap:nowrap}
    .eab.wrap{flex-wrap:wrap}
    .eab[data-align="end"]{justify-content:flex-end}
    .eab[data-align="center"]{justify-content:center}
    .eab-btn{border:0;border-radius:12px;padding:10px 16px;font-weight:800;cursor:pointer;font-size:13px;
      display:inline-flex;align-items:center;gap:8px;transition:transform .15s,box-shadow .15s,background .15s;white-space:nowrap}
    .eab-icon{font-size:15px}
    .eab-btn.v-primary{background:var(--module-gradient);color:#fff;box-shadow:0 6px 16px rgba(15,23,42,.16)}
    .eab-btn.v-primary:hover{transform:translateY(-1px)}
    .eab-btn.v-secondary{background:rgba(15,23,42,.04);color:var(--module-accent);border:1px solid rgba(15,23,42,.08)}
    .eab-btn.v-secondary:hover{background:rgba(15,23,42,.07)}
    .eab-btn.v-ghost{background:transparent;color:#475569;border:1px solid rgba(15,23,42,.12)}
    .eab-btn.v-ghost:hover{background:rgba(15,23,42,.04)}
    .eab-btn.v-danger{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
    .eab-btn.v-danger:hover{background:#fecaca}
    .eab-btn.disabled,.eab-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
    @media(max-width:760px){.eab{flex-wrap:wrap}.eab-btn{flex:1;justify-content:center}}
  `]
})
export class EnterpriseActionBarComponent {
  @Input() themeKey: ModuleKey | string = 'dashboard';
  @Input() actions: EnterpriseAction[] = [];
  @Input() align: 'start' | 'end' | 'center' = 'start';
  @Input() wrap = false;

  @Output() action = new EventEmitter<EnterpriseAction>();

  get theme() {
    return getModuleTheme(this.themeKey as string);
  }

  emit(a: EnterpriseAction) {
    if (a.disabled) return;
    this.action.emit(a);
  }
}
