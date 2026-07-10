import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, RouterOutlet } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { RouteTab } from '../../shared/components/route-tabs/route-tabs.component';
import { Breadcrumb } from '../../shared/theme/module-theme.config';
import { StaffDetailStateService } from './staff-detail-state.service';

@Component({
  selector: 'app-staff-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, EnterpriseFeaturePageComponent],
  template: `
    <app-enterprise-feature-page
      themeKey="staff"
      [title]="title()"
      [subtitle]="subtitle()"
      icon="🧑‍💼"
      [breadcrumbs]="breadcrumbs"
      backLink="/app/staff"
      [tabs]="tabs"
      [basePath]="basePath">
    </app-enterprise-feature-page>
    <router-outlet></router-outlet>
  `,
})
export class StaffDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private state = inject(StaffDetailStateService);
  staffId = this.route.snapshot.paramMap.get('id') || '';

  readonly title = computed(() => {
    const name = this.state.staffName();
    return name !== 'Unknown Staff' ? name : 'Staff #' + this.staffId;
  });

  readonly subtitle = computed(() => {
    const s = this.state.staff();
    if (!s) return 'Staff profile, schedule, performance, payroll and history.';
    const parts: string[] = [];
    if (s.specialization) parts.push(s.specialization);
    if (s.branchName) parts.push(s.branchName);
    if (s.role) parts.push(s.role);
    return parts.join(' · ') || 'Staff profile and management.';
  });

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

  ngOnInit(): void {
    if (this.staffId) {
      this.state.load(this.staffId);
    }
  }
}
