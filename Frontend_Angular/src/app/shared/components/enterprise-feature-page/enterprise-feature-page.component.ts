import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EnterprisePageHeaderComponent } from '../enterprise-page-header/enterprise-page-header.component';
import { RouteTabsComponent, RouteTab } from '../route-tabs/route-tabs.component';
import { StateViewComponent, StateType } from '../state-view/state-view.component';
import { Breadcrumb, EnterpriseAction, ModuleKey } from '../../theme/module-theme.config';

@Component({
  selector: 'app-enterprise-feature-page',
  standalone: true,
  imports: [CommonModule, RouterModule, EnterprisePageHeaderComponent, RouteTabsComponent, StateViewComponent],
  template: `
    <app-enterprise-page-header
      [themeKey]="themeKey"
      [title]="title"
      [subtitle]="subtitle"
      [icon]="icon"
      [breadcrumbs]="breadcrumbs"
      [primaryAction]="primaryAction"
      [secondaryActions]="secondaryActions"
      [statsChips]="statsChips"
      (action)="action.emit($event)">
    </app-enterprise-page-header>

    <app-route-tabs *ngIf="tabs && tabs.length" [tabs]="tabs" [basePath]="basePath"></app-route-tabs>

    <div class="efp-back" *ngIf="backLink">
      <a class="efp-back-link" [routerLink]="backLink">&#8592; Back</a>
    </div>

    <section class="efp-body" [class.with-panel]="showPanel">
      <div class="efp-main">
        <app-state-view *ngIf="loading" type="loading" [message]="loadingMessage"></app-state-view>
        <app-state-view *ngIf="error" type="error" [title]="errorTitle" [message]="errorMessage" [actionLink]="backLink || ''" [actionLabel]="errorActionLabel"></app-state-view>
        <app-state-view *ngIf="empty" type="empty" [title]="emptyTitle" [message]="emptyMessage"></app-state-view>
        <ng-content *ngIf="!loading && !error && !empty"></ng-content>
      </div>
      <aside class="efp-panel" *ngIf="showPanel">
        <ng-content select="[right-panel]"></ng-content>
      </aside>
    </section>
  `,
  styles: [`
    .efp-back{margin:0 0 14px}
    .efp-back-link{display:inline-flex;align-items:center;font-size:13px;font-weight:600;color:var(--text-soft,#64748b);
      text-decoration:none;padding:6px 12px;border-radius:10px;border:1px solid var(--border-subtle,#e5e7eb);transition:background .15s}
    .efp-back-link:hover{background:var(--surface-app,#f1f5f9)}
    .efp-body{display:flex;flex-direction:column;gap:20px}
    .efp-body.with-panel{display:grid;grid-template-columns:1fr;gap:20px}
    @media(min-width:1100px){.efp-body.with-panel{grid-template-columns:1fr 340px;align-items:start}}
    .efp-panel{position:sticky;top:88px}
    @media(max-width:768px){.efp-panel{position:static}}
  `]
})
export class EnterpriseFeaturePageComponent {
  @Input() themeKey: ModuleKey | string = 'dashboard';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() backLink = '';
  @Input() tabs: RouteTab[] = [];
  @Input() basePath = '';
  @Input() primaryAction?: EnterpriseAction;
  @Input() secondaryActions: EnterpriseAction[] = [];
  @Input() statsChips: import('../../theme/module-theme.config').StatChip[] = [];

  @Input() loading = false;
  @Input() loadingMessage = 'Loading content…';
  @Input() error = false;
  @Input() errorTitle = 'Unable to load';
  @Input() errorMessage = 'Please try again or go back.';
  @Input() errorActionLabel = 'Go back';
  @Input() empty = false;
  @Input() emptyTitle = 'Nothing here yet';
  @Input() emptyMessage = '';

  @Input() showPanel = false;

  @Output() action = new EventEmitter<EnterpriseAction>();
}
