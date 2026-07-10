import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, RouterOutlet } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { RouteTab } from '../../shared/components/route-tabs/route-tabs.component';
import { Breadcrumb } from '../../shared/theme/module-theme.config';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, EnterpriseFeaturePageComponent],
  template: `
    <app-enterprise-feature-page
      themeKey="bookings"
      [title]="title"
      [subtitle]="subtitle"
      icon="🗓️"
      [breadcrumbs]="breadcrumbs"
      backLink="/app/bookings"
      [tabs]="tabs"
      [basePath]="basePath">
    </app-enterprise-feature-page>
    <router-outlet></router-outlet>
  `,
})
export class BookingDetailComponent {
  private route = inject(ActivatedRoute);
  bookingId = this.route.snapshot.paramMap.get('id') || '';

  get title(): string {
    return 'Booking #' + this.bookingId;
  }

  get subtitle(): string {
    return 'Full booking workspace — overview, client, services, payments and history.';
  }

  get basePath(): string {
    return '/app/bookings/' + this.bookingId;
  }

  breadcrumbs: Breadcrumb[] = [{ label: 'Bookings', link: '/app/bookings' }];

  tabs: RouteTab[] = [
    { path: 'overview', label: 'Overview', icon: '📋' },
    { path: 'client', label: 'Client', icon: '👤' },
    { path: 'services', label: 'Services', icon: '💇' },
    { path: 'staff', label: 'Staff', icon: '🧑‍💼' },
    { path: 'resources', label: 'Resources', icon: '🧰' },
    { path: 'schedule', label: 'Schedule', icon: '🕒' },
    { path: 'payments', label: 'Payments', icon: '💰' },
    { path: 'invoice', label: 'Invoice', icon: '🧾' },
    { path: 'notes', label: 'Notes', icon: '📝' },
    { path: 'photos', label: 'Photos', icon: '🖼️' },
    { path: 'files', label: 'Files', icon: '📁' },
    { path: 'forms', label: 'Forms', icon: '📋' },
    { path: 'reminders', label: 'Reminders', icon: '🔔' },
    { path: 'history', label: 'History', icon: '🕘' },
    { path: 'conflicts', label: 'Conflicts', icon: '⚠️' },
    { path: 'ai', label: 'AI', icon: '✨' },
    { path: 'settings', label: 'Settings', icon: '⚙️' },
  ];
}
