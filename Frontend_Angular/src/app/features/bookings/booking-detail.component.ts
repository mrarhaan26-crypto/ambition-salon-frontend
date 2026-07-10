import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, RouterOutlet } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { RouteTab } from '../../shared/components/route-tabs/route-tabs.component';
import { Breadcrumb } from '../../shared/theme/module-theme.config';
import { BookingDetailStateService } from './booking-detail-state.service';

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
      [basePath]="basePath"
      [loading]="state.loading()"
      [error]="!!state.error()"
      [errorTitle]="'Failed to load booking'"
      [errorMessage]="state.error() || ''"
      [errorActionLabel]="'Go back to bookings'">
    </app-enterprise-feature-page>
    <router-outlet *ngIf="!state.loading() && !state.error()"></router-outlet>
  `,
})
export class BookingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stateService = inject(BookingDetailStateService);
  state = this.stateService;
  bookingId = this.route.snapshot.paramMap.get('id') || '';

  get title(): string {
    const b = this.state.booking();
    if (!b) return 'Booking #' + this.bookingId;
    return b.client?.fullName || 'Booking #' + this.bookingId;
  }

  get subtitle(): string {
    const b = this.state.booking();
    if (!b) return 'Full booking workspace.';
    const sd = b.startTime ? new Date(b.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
    return `${b.status} · ${sd} · ${b.services?.length || 0} service(s) · ${b.branch?.name || ''}`;
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

  ngOnInit(): void {
    if (this.bookingId) {
      this.stateService.load(this.bookingId);
    }
  }
}
