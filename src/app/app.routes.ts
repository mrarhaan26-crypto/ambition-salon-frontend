import { Routes } from '@angular/router';
import { WebsiteLayoutComponent } from './core/layouts/website-layout.component';
import { AppLayoutComponent } from './core/layouts/app-layout.component';
import { HomeComponent } from './website/home/home.component';
import { PageComponent } from './website/page/page.component';
import { LoginComponent } from './core/auth/login.component';
import { RegisterComponent } from './core/auth/register.component';
import { ForgotPasswordComponent } from './core/auth/forgot-password.component';
import { ModuleShellComponent } from './features/module-shell.component';
import { ClientsComponent } from './features/clients/clients.component';
import { AiCommandCenterComponent } from './features/ai-command-center/ai-command-center.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { GlobalSearchComponent } from './features/global-search/global-search.component';
import { AiInsightsComponent } from './features/ai-insights/ai-insights.component';
import { DashboardAnalyticsComponent } from './features/dashboard-analytics/dashboard-analytics.component';
import { StaffComponent } from './features/staff/staff.component';
import { ServicesComponent } from './features/services/services.component';
import { PosComponent } from './features/pos/pos.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { ReportsComponent } from './features/reports/reports.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { BookingsComponent } from './features/bookings/bookings.component';
import { MarketingComponent } from './features/marketing/marketing.component';
import { SettingsComponent } from './features/settings/settings.component';
import { MembershipsComponent } from './features/memberships/memberships.component';
import { PackagesComponent } from './features/packages/packages.component';
import { WalletComponent } from './features/wallet/wallet.component';
import { GiftCardsComponent } from './features/gift-cards/gift-cards.component';
import { LoyaltyComponent } from './features/loyalty/loyalty.component';
import { FormsComponent } from './features/forms/forms.component';
import { ClientTimelineComponent } from './features/client-timeline/client-timeline.component';
import { OnlineProfileComponent } from './features/online-profile/online-profile.component';
import { CustomerPortalComponent } from './features/customer-portal/customer-portal.component';
import { PaymentsComponent } from './features/payments/payments.component';
import { InvoicesComponent } from './features/invoices/invoices.component';
import { BillingRulesComponent } from './features/billing-rules/billing-rules.component';
import { AdjustmentsComponent } from './features/adjustments/adjustments.component';
import { BookOnlineComponent } from './book-online/book-online.component';
import { AutomationsComponent } from './features/automations/automations.component';
import { MessageCenterComponent } from './features/message-center/message-center.component';
import { NotificationTemplatesComponent } from './features/notification-templates/notification-templates.component';
import { TasksComponent } from './features/tasks/tasks.component';
import { AttendanceComponent } from './features/attendance/attendance.component';
import { CommissionsComponent } from './features/commissions/commissions.component';
import { AdvancedReportsComponent } from './features/advanced-reports/advanced-reports.component';
import { BranchesComponent } from './features/branches/branches.component';
import { AuditLogsComponent } from './features/audit-logs/audit-logs.component';
import { DataExportComponent } from './features/data-export/data-export.component';
import { StaffWorkspaceComponent } from './features/staff-workspace/staff-workspace.component';
import { OwnerCommandCenterComponent } from './features/owner-command-center/owner-command-center.component';
import { CrmIntelligenceComponent } from './features/crm-intelligence/crm-intelligence.component';
import { ResourcesComponent } from './features/resources/resources.component';
import { ReputationComponent } from './features/reputation/reputation.component';
import { SurveysComponent } from './features/surveys/surveys.component';
import { DeliverySettingsComponent } from './features/delivery-settings/delivery-settings.component';
import { authGuard } from './core/auth/auth.guard';

const appModuleRoutes: Routes = [
  { path: 'home', component: ModuleShellComponent, data: { title: 'home' } },
  { path: 'clients', component: ClientsComponent },
  { path: 'ai-command-center', component: AiCommandCenterComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'global-search', component: GlobalSearchComponent },
  { path: 'ai-insights', component: AiInsightsComponent },
  { path: 'dashboard-analytics', component: DashboardAnalyticsComponent },
  { path: 'staff', component: StaffComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'pos', component: PosComponent },
  { path: 'inventory', component: InventoryComponent },
  { path: 'reports', component: ReportsComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'bookings', component: BookingsComponent },
  { path: 'marketing', component: MarketingComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'memberships', component: MembershipsComponent },
  { path: 'packages', component: PackagesComponent },
  { path: 'wallet', component: WalletComponent },
  { path: 'gift-cards', component: GiftCardsComponent },
  { path: 'loyalty', component: LoyaltyComponent },
  { path: 'forms', component: FormsComponent },
  { path: 'client-timeline', component: ClientTimelineComponent },
  { path: 'online-profile', component: OnlineProfileComponent },
  { path: 'customer-portal', component: CustomerPortalComponent },
  { path: 'payments', component: PaymentsComponent },
  { path: 'invoices', component: InvoicesComponent },
  { path: 'billing-rules', component: BillingRulesComponent },
  { path: 'adjustments', component: AdjustmentsComponent },
  { path: 'automations', component: AutomationsComponent },
  { path: 'message-center', component: MessageCenterComponent },
  { path: 'notification-templates', component: NotificationTemplatesComponent },
  { path: 'tasks', component: TasksComponent },
  { path: 'attendance', component: AttendanceComponent },
  { path: 'commissions', component: CommissionsComponent },
  { path: 'advanced-reports', component: AdvancedReportsComponent },
  { path: 'branches', component: BranchesComponent },
  { path: 'audit-logs', component: AuditLogsComponent },
  { path: 'data-export', component: DataExportComponent },
  { path: 'staff-workspace', component: StaffWorkspaceComponent },
  { path: 'owner-command-center', component: OwnerCommandCenterComponent },
  { path: 'crm-intelligence', component: CrmIntelligenceComponent },
  { path: 'resources', component: ResourcesComponent },
  { path: 'reputation', component: ReputationComponent },
  { path: 'surveys', component: SurveysComponent },
  { path: 'delivery-settings', component: DeliverySettingsComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];

export const routes: Routes = [
  {
    path: '',
    component: WebsiteLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'features', component: PageComponent, data: { title: 'Features' } },
      { path: 'pricing', component: PageComponent, data: { title: 'Pricing' } },
      { path: 'product-tour', component: PageComponent, data: { title: 'Product Tour' } },
      { path: 'contact', component: PageComponent, data: { title: 'Contact' } },
      { path: 'book-demo', component: PageComponent, data: { title: 'Book Demo' } },
      { path: 'blog', component: PageComponent, data: { title: 'Blog' } }
    ]
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  {
    path: 'app',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: appModuleRoutes
  },
  { path: 'book-online', component: BookOnlineComponent },
  { path: '**', redirectTo: '' }
];
