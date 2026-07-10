import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, RouterOutlet } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { RouteTab } from '../../shared/components/route-tabs/route-tabs.component';
import { Breadcrumb } from '../../shared/theme/module-theme.config';

@Component({
  selector: 'app-staff-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, EnterpriseFeaturePageComponent],
  template: `
    <app-enterprise-feature-page
      themeKey="staff"
      [title]="title"
      [subtitle]="subtitle"
      icon="🧑‍💼"
      [breadcrumbs]="breadcrumbs"
      backLink="/app/staff"
      [tabs]="tabs"
      [basePath]="basePath">
    </app-enterprise-feature-page>
    <router-outlet></router-outlet>
  `,
})
export class StaffDetailComponent {
  private route = inject(ActivatedRoute);
  staffId = this.route.snapshot.paramMap.get('id') || '';

  get title(): string {
    return 'Staff #' + this.staffId;
  }

  get subtitle(): string {
    return 'Staff profile, schedule, performance, payroll and history.';
  }

  get basePath(): string {
    return '/app/staff/' + this.staffId;
  }

  breadcrumbs: Breadcrumb[] = [{ label: 'Staff', link: '/app/staff' }];

  tabs: RouteTab[] = [
    { path: 'overview', label: 'Overview', icon: '📋' },
    { path: 'profile', label: 'Profile', icon: '👤' },
    { path: 'calendar', label: 'Calendar', icon: '📅' },
    { path: 'appointments', label: 'Appointments', icon: '🗓️' },
    { path: 'availability', label: 'Availability', icon: '🟢' },
    { path: 'working-hours', label: 'Working Hours', icon: '🕒' },
    { path: 'attendance', label: 'Attendance', icon: '📍' },
    { path: 'leaves', label: 'Leaves', icon: '🏖️' },
    { path: 'services', label: 'Services', icon: '💇' },
    { path: 'skills', label: 'Skills', icon: '🎯' },
    { path: 'performance', label: 'Performance', icon: '📈' },
    { path: 'targets', label: 'Targets', icon: '🎯' },
    { path: 'commission', label: 'Commission', icon: '💸' },
    { path: 'payroll', label: 'Payroll', icon: '🧮' },
    { path: 'tips', label: 'Tips', icon: '💡' },
    { path: 'documents', label: 'Documents', icon: '📄' },
    { path: 'training', label: 'Training', icon: '🎓' },
    { path: 'history', label: 'History', icon: '🕘' },
    { path: 'ai', label: 'AI', icon: '✨' },
    { path: 'settings', label: 'Settings', icon: '🔧' },
  ];
}
