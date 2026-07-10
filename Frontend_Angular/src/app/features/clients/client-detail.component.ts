import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, RouterOutlet } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { RouteTab } from '../../shared/components/route-tabs/route-tabs.component';
import { Breadcrumb } from '../../shared/theme/module-theme.config';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, EnterpriseFeaturePageComponent],
  template: `
    <app-enterprise-feature-page
      themeKey="clients"
      [title]="title"
      [subtitle]="subtitle"
      icon="👤"
      [breadcrumbs]="breadcrumbs"
      backLink="/app/clients"
      [tabs]="tabs"
      [basePath]="basePath">
    </app-enterprise-feature-page>
    <router-outlet></router-outlet>
  `,
})
export class ClientDetailComponent {
  private route = inject(ActivatedRoute);
  clientId = this.route.snapshot.paramMap.get('id') || '';

  get title(): string {
    return 'Client #' + this.clientId;
  }

  get subtitle(): string {
    return '360° client profile, appointments, payments, loyalty and history.';
  }

  get basePath(): string {
    return '/app/clients/' + this.clientId;
  }

  breadcrumbs: Breadcrumb[] = [{ label: 'Clients', link: '/app/clients' }];

  tabs: RouteTab[] = [
    { path: 'overview', label: 'Overview', icon: '📋' },
    { path: 'profile', label: 'Profile', icon: '👤' },
    { path: 'appointments', label: 'Appointments', icon: '📅' },
    { path: 'services', label: 'Services', icon: '💇' },
    { path: 'products', label: 'Products', icon: '🛍️' },
    { path: 'payments', label: 'Payments', icon: '💰' },
    { path: 'invoices', label: 'Invoices', icon: '🧾' },
    { path: 'memberships', label: 'Memberships', icon: '🪪' },
    { path: 'packages', label: 'Packages', icon: '📦' },
    { path: 'loyalty', label: 'Loyalty', icon: '⭐' },
    { path: 'wallet', label: 'Wallet', icon: '👛' },
    { path: 'photos', label: 'Photos', icon: '🖼️' },
    { path: 'files', label: 'Files', icon: '📁' },
    { path: 'forms', label: 'Forms', icon: '📋' },
    { path: 'preferences', label: 'Preferences', icon: '⚙️' },
    { path: 'allergies', label: 'Allergies', icon: '⚠️' },
    { path: 'feedback', label: 'Feedback', icon: '💬' },
    { path: 'communications', label: 'Communications', icon: '✉️' },
    { path: 'history', label: 'History', icon: '🕘' },
    { path: 'ai', label: 'AI', icon: '✨' },
    { path: 'settings', label: 'Settings', icon: '🔧' },
  ];
}
