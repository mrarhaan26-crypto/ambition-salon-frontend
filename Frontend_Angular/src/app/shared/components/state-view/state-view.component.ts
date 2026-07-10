import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export type StateType =
  | 'not-found'
  | 'invalid-id'
  | 'error'
  | 'loading'
  | 'permission'
  | 'not-integrated'
  | 'empty';

interface StatePreset {
  icon: string;
  title: string;
}

@Component({
  selector: 'app-state-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="state-view" [attr.data-type]="type" role="status">
      <div class="state-icon" aria-hidden="true">{{ icon }}</div>
      <h2 class="state-title">{{ title }}</h2>
      <p class="state-message" *ngIf="message">{{ message }}</p>
      <div class="state-actions" *ngIf="actionLink">
        <a class="state-action" [routerLink]="actionLink">{{ actionLabel || 'Go back' }}</a>
      </div>
    </div>
  `,
  styles: [`
    .state-view{text-align:center;padding:48px 24px;background:var(--surface-card,#fff);
      border:1px solid var(--border-subtle,#e5e7eb);border-radius:18px;
      box-shadow:var(--shadow-card,0 6px 20px rgba(15,23,42,.06));max-width:560px;margin:0 auto}
    .state-icon{font-size:46px;margin-bottom:14px}
    .state-title{margin:0 0 8px;font-size:20px;font-weight:800;color:var(--text-strong,#111827)}
    .state-message{margin:0 0 18px;color:var(--text-soft,#64748b);font-size:14px;line-height:1.6}
    .state-actions{display:flex;justify-content:center}
    .state-action{display:inline-flex;align-items:center;padding:10px 20px;border-radius:12px;
      background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:13px;
      text-decoration:none;transition:transform .15s,box-shadow .15s}
    .state-action:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(99,102,241,.3)}
  `]
})
export class StateViewComponent {
  @Input() type: StateType = 'empty';
  @Input() title = '';
  @Input() message = '';
  @Input() icon = '';
  @Input() actionLink = '';
  @Input() actionLabel = '';

  private presets: Record<StateType, StatePreset> = {
    'not-found': { icon: '🔍', title: 'Not Found' },
    'invalid-id': { icon: '⚠️', title: 'Invalid Reference' },
    'error': { icon: '⛔', title: 'Something went wrong' },
    'loading': { icon: '⏳', title: 'Loading…' },
    'permission': { icon: '🔒', title: 'Access Denied' },
    'not-integrated': { icon: '🧩', title: 'Integration Ready' },
    'empty': { icon: '📭', title: 'Nothing here yet' },
  };

  get resolvedIcon(): string {
    return this.icon || this.presets[this.type]?.icon || '📭';
  }

  get resolvedTitle(): string {
    return this.title || this.presets[this.type]?.title || 'Empty';
  }
}
