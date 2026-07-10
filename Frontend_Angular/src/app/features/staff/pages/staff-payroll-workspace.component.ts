import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';

@Component({
  selector: 'app-staff-payroll-workspace',
  standalone: true,
  imports: [CommonModule, RouterModule, EnterpriseFeaturePageComponent, StateViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-enterprise-feature-page
      themeKey="staff"
      title="Payroll Workspace"
      subtitle="Manage pay periods, staff payroll, and approvals"
      icon="🧮"
      [breadcrumbs]="[{ label: 'Staff', link: '/app/staff' }]"
      backLink="/app/staff">
    </app-enterprise-feature-page>

    <app-state-view type="not-integrated" title="Payroll Workspace" message="Payroll generation, approval workflow, payslip access, and export features will be available once the Payroll backend module is implemented."></app-state-view>
  `,
  styles: [`
    :host{display:block;padding:0 4px}
  `]
})
export class StaffPayrollWorkspaceComponent {}
