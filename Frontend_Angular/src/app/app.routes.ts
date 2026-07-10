import { Routes } from '@angular/router';
import { WebsiteLayoutComponent } from './core/layouts/website-layout.component';
import { AppLayoutComponent } from './core/layouts/app-layout.component';
import { authGuard } from './core/auth/auth.guard';

const fp = () => import('./features/feature-page-placeholder.component').then(m => m.FeaturePagePlaceholderComponent);

function section(title: string, description: string, icon: string, parentKey: string) {
  const parentLabel = parentKey.charAt(0).toUpperCase() + parentKey.slice(1);
  return {
    title,
    description,
    icon,
    todo: `Replace with enterprise-page-header and full ${title} implementation.`,
    parentRoute: `/app/${parentKey}`,
    parentLabel,
  };
}

const so = () => import('./features/staff/pages/staff-overview.component').then(m => m.StaffOverviewComponent);
const sp = () => import('./features/staff/pages/staff-profile.component').then(m => m.StaffProfileComponent);
const sc = () => import('./features/staff/pages/staff-calendar.component').then(m => m.StaffCalendarComponent);
const sapt = () => import('./features/staff/pages/staff-appointments.component').then(m => m.StaffAppointmentsComponent);
const savail = () => import('./features/staff/pages/staff-availability.component').then(m => m.StaffAvailabilityComponent);
const swh = () => import('./features/staff/pages/staff-working-hours.component').then(m => m.StaffWorkingHoursComponent);
const satt = () => import('./features/staff/pages/staff-attendance.component').then(m => m.StaffAttendanceComponent);
const sleave = () => import('./features/staff/pages/staff-leaves.component').then(m => m.StaffLeavesComponent);
const ssvc = () => import('./features/staff/pages/staff-services.component').then(m => m.StaffServicesComponent);
const sskill = () => import('./features/staff/pages/staff-skills.component').then(m => m.StaffSkillsComponent);
const sperf = () => import('./features/staff/pages/staff-performance.component').then(m => m.StaffPerformanceComponent);
const starg = () => import('./features/staff/pages/staff-targets.component').then(m => m.StaffTargetsComponent);
const scomm = () => import('./features/staff/pages/staff-commission.component').then(m => m.StaffCommissionComponent);
const spay = () => import('./features/staff/pages/staff-payroll.component').then(m => m.StaffPayrollComponent);
const stip = () => import('./features/staff/pages/staff-tips.component').then(m => m.StaffTipsComponent);
const sdoc = () => import('./features/staff/pages/staff-documents.component').then(m => m.StaffDocumentsComponent);
const straining = () => import('./features/staff/pages/staff-training.component').then(m => m.StaffTrainingComponent);
const shist = () => import('./features/staff/pages/staff-history.component').then(m => m.StaffHistoryComponent);
const sai = () => import('./features/staff/pages/staff-ai.component').then(m => m.StaffAiComponent);
const sset = () => import('./features/staff/pages/staff-settings.component').then(m => m.StaffSettingsComponent);
const sla = () => import('./features/staff/pages/staff-leave-approval.component').then(m => m.StaffLeaveApprovalComponent);
const spw = () => import('./features/staff/pages/staff-payroll-workspace.component').then(m => m.StaffPayrollWorkspaceComponent);

const io = () => import('./features/inventory/pages/inventory-overview.component').then(m => m.InventoryOverviewComponent);
const itx = () => import('./features/inventory/pages/inventory-transactions.component').then(m => m.InventoryTransactionsComponent);
const isl = () => import('./features/inventory/pages/inventory-stock-ledger.component').then(m => m.InventoryStockLedgerComponent);
const ian = () => import('./features/inventory/pages/inventory-analytics.component').then(m => m.InventoryAnalyticsComponent);
const iwh = () => import('./features/inventory/pages/inventory-warehouses.component').then(m => m.InventoryWarehousesComponent);
const isup = () => import('./features/inventory/pages/inventory-suppliers.component').then(m => m.InventorySuppliersComponent);
const ipo = () => import('./features/inventory/pages/inventory-purchase-orders.component').then(m => m.InventoryPurchaseOrdersComponent);
const ibat = () => import('./features/inventory/pages/inventory-batches.component').then(m => m.InventoryBatchesComponent);
const iscnt = () => import('./features/inventory/pages/inventory-stock-counts.component').then(m => m.InventoryStockCountsComponent);
const iset = () => import('./features/inventory/pages/inventory-settings.component').then(m => m.InventorySettingsComponent);
const ihst = () => import('./features/inventory/pages/inventory-history.component').then(m => m.InventoryHistoryComponent);
const iai = () => import('./features/inventory/pages/inventory-ai.component').then(m => m.InventoryAiComponent);

const appModuleRoutes: Routes = [
  { path: 'home', loadComponent: () => import('./features/module-shell.component').then(m => m.ModuleShellComponent), data: { title: 'home' } },
  { path: 'clients', loadComponent: () => import('./features/clients/clients.component').then(m => m.ClientsComponent) },
  { path: 'clients/new', loadComponent: () => import('./features/feature-page-placeholder.component').then(m => m.FeaturePagePlaceholderComponent), data: { title: 'New Client', description: 'Add a new client to the salon', icon: '👤', todo: 'Replace with enterprise-page-header and full client creation form.', parentRoute: '/app/clients', parentLabel: 'Clients' } },
   {
    path: 'clients/:id',
    loadComponent: () => import('./features/clients/client-detail.component').then(m => m.ClientDetailComponent),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: () => import('./features/clients/client-overview.component').then(m => m.ClientOverviewComponent) },
      { path: 'profile', loadComponent: () => import('./features/clients/client-profile.component').then(m => m.ClientProfileComponent) },
      { path: 'appointments', loadComponent: () => import('./features/clients/client-appointments.component').then(m => m.ClientAppointmentsComponent) },
      { path: 'services', loadComponent: () => import('./features/clients/client-services.component').then(m => m.ClientServicesComponent) },
      { path: 'products', loadComponent: () => import('./features/clients/client-products.component').then(m => m.ClientProductsComponent) },
      { path: 'payments', loadComponent: () => import('./features/clients/client-payments.component').then(m => m.ClientPaymentsComponent) },
      { path: 'invoices', loadComponent: () => import('./features/clients/client-invoices.component').then(m => m.ClientInvoicesComponent) },
      { path: 'memberships', loadComponent: () => import('./features/clients/client-memberships.component').then(m => m.ClientMembershipsComponent) },
      { path: 'packages', loadComponent: () => import('./features/clients/client-packages.component').then(m => m.ClientPackagesComponent) },
      { path: 'loyalty', loadComponent: () => import('./features/clients/client-loyalty.component').then(m => m.ClientLoyaltyComponent) },
      { path: 'wallet', loadComponent: () => import('./features/clients/client-wallet.component').then(m => m.ClientWalletComponent) },
      { path: 'photos', loadComponent: () => import('./features/clients/client-photos.component').then(m => m.ClientPhotosComponent) },
      { path: 'files', loadComponent: () => import('./features/clients/client-files.component').then(m => m.ClientFilesComponent) },
      { path: 'forms', loadComponent: () => import('./features/clients/client-forms.component').then(m => m.ClientFormsComponent) },
      { path: 'preferences', loadComponent: () => import('./features/clients/client-preferences.component').then(m => m.ClientPreferencesComponent) },
      { path: 'allergies', loadComponent: () => import('./features/clients/client-allergies.component').then(m => m.ClientAllergiesComponent) },
      { path: 'feedback', loadComponent: () => import('./features/clients/client-feedback.component').then(m => m.ClientFeedbackComponent) },
      { path: 'communications', loadComponent: () => import('./features/clients/client-communications.component').then(m => m.ClientCommunicationsComponent) },
      { path: 'history', loadComponent: () => import('./features/clients/client-history.component').then(m => m.ClientHistoryComponent) },
      { path: 'ai', loadComponent: () => import('./features/clients/client-ai.component').then(m => m.ClientAiComponent) },
      { path: 'settings', loadComponent: () => import('./features/clients/client-settings.component').then(m => m.ClientSettingsComponent) },
    ]
  },
  { path: 'ai-command-center', loadComponent: () => import('./features/ai-command-center/ai-command-center.component').then(m => m.AiCommandCenterComponent) },
  { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
  { path: 'global-search', loadComponent: () => import('./features/global-search/global-search.component').then(m => m.GlobalSearchComponent) },
  { path: 'ai-insights', loadComponent: () => import('./features/ai-insights/ai-insights.component').then(m => m.AiInsightsComponent) },
  { path: 'dashboard-analytics', loadComponent: () => import('./features/dashboard-analytics/dashboard-analytics.component').then(m => m.DashboardAnalyticsComponent) },
  { path: 'staff', loadComponent: () => import('./features/staff/staff.component').then(m => m.StaffComponent) },
  { path: 'staff/new', loadComponent: () => import('./features/feature-page-placeholder.component').then(m => m.FeaturePagePlaceholderComponent), data: { title: 'New Staff', description: 'Add a new staff member', icon: '👥', todo: 'Replace with enterprise-page-header and full staff creation form.', parentRoute: '/app/staff', parentLabel: 'Staff' } },
  {
    path: 'staff/:id',
    loadComponent: () => import('./features/staff/staff-detail.component').then(m => m.StaffDetailComponent),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: so },
      { path: 'profile', loadComponent: sp },
      { path: 'calendar', loadComponent: sc },
      { path: 'appointments', loadComponent: sapt },
      { path: 'availability', loadComponent: savail },
      { path: 'working-hours', loadComponent: swh },
      { path: 'attendance', loadComponent: satt },
      { path: 'leaves', loadComponent: sleave },
      { path: 'services', loadComponent: ssvc },
      { path: 'skills', loadComponent: sskill },
      { path: 'performance', loadComponent: sperf },
      { path: 'targets', loadComponent: starg },
      { path: 'commission', loadComponent: scomm },
      { path: 'payroll', loadComponent: spay },
      { path: 'tips', loadComponent: stip },
      { path: 'documents', loadComponent: sdoc },
      { path: 'training', loadComponent: straining },
      { path: 'history', loadComponent: shist },
      { path: 'ai', loadComponent: sai },
      { path: 'settings', loadComponent: sset },
    ]
  },
  { path: 'staff/attendance', redirectTo: 'attendance', pathMatch: 'full' },
  { path: 'staff/shifts', redirectTo: 'shifts', pathMatch: 'full' },
  { path: 'staff/leaves', loadComponent: sla },
  { path: 'staff/payroll', loadComponent: spw },
  { path: 'staff/commissions', redirectTo: 'commissions', pathMatch: 'full' },
  { path: 'services', loadComponent: () => import('./features/services/services.component').then(m => m.ServicesComponent) },
  { path: 'pos', loadComponent: () => import('./features/pos/pos.component').then(m => m.PosComponent) },
  { path: 'pos/new', loadComponent: () => import('./features/feature-page-placeholder.component').then(m => m.FeaturePagePlaceholderComponent), data: { title: 'New POS Sale', description: 'Create a new point of sale transaction', icon: '🛒', todo: 'Replace with enterprise-page-header and full POS sale form.', parentRoute: '/app/pos', parentLabel: 'POS' } },
  { path: 'inventory', loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent) },
  { path: 'inventory/new', loadComponent: () => import('./features/inventory/inventory-form.component').then(m => m.InventoryFormComponent) },
  {
    path: 'inventory/:id',
    loadComponent: () => import('./features/inventory/inventory-detail.component').then(m => m.InventoryDetailComponent),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: io },
      { path: 'transactions', loadComponent: itx },
      { path: 'stock-ledger', loadComponent: isl },
      { path: 'analytics', loadComponent: ian },
      { path: 'warehouses', loadComponent: iwh },
      { path: 'suppliers', loadComponent: isup },
      { path: 'purchase-orders', loadComponent: ipo },
      { path: 'batches', loadComponent: ibat },
      { path: 'stock-counts', loadComponent: iscnt },
      { path: 'settings', loadComponent: iset },
      { path: 'history', loadComponent: ihst },
      { path: 'ai', loadComponent: iai },
    ]
  },
  { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
  { path: 'reports/:type', loadComponent: () => import('./features/feature-page-placeholder.component').then(m => m.FeaturePagePlaceholderComponent), data: { title: 'Report Detail', description: 'View detailed report', icon: '📊', todo: 'Replace with enterprise-page-header and full report view.', parentRoute: '/app/reports', parentLabel: 'Reports' } },
  { path: 'calendar', loadComponent: () => import('./features/calendar/calendar-shell.component').then(m => m.CalendarShellComponent) },
  { path: 'calendar/settings', loadComponent: () => import('./features/calendar/calendar-settings-page.component').then(m => m.CalendarSettingsPageComponent) },
  { path: 'calendar/analytics', loadComponent: () => import('./features/calendar/calendar-analytics-page.component').then(m => m.CalendarAnalyticsPageComponent) },
  { path: 'calendar/conflicts', loadComponent: () => import('./features/calendar/calendar-conflicts-page.component').then(m => m.CalendarConflictsPageComponent) },
  {
    path: 'bookings',
    loadComponent: () => import('./features/bookings/bookings-shell.component').then(m => m.BookingsShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/bookings/bookings.component').then(m => m.BookingsComponent) },
      { path: 'new', loadComponent: () => import('./features/bookings/booking-new.component').then(m => m.BookingNewComponent) },
      {
        path: ':id',
        loadComponent: () => import('./features/bookings/booking-detail.component').then(m => m.BookingDetailComponent),
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          { path: 'overview', loadComponent: () => import('./features/bookings/booking-overview.component').then(m => m.BookingOverviewComponent) },
          { path: 'client', loadComponent: () => import('./features/bookings/booking-client-section.component').then(m => m.BookingClientSectionComponent) },
          { path: 'services', loadComponent: () => import('./features/bookings/booking-services-section.component').then(m => m.BookingServicesSectionComponent) },
          { path: 'staff', loadComponent: () => import('./features/bookings/booking-staff-section.component').then(m => m.BookingStaffSectionComponent) },
          { path: 'resources', loadComponent: () => import('./features/bookings/booking-resources-section.component').then(m => m.BookingResourcesSectionComponent) },
          { path: 'schedule', loadComponent: () => import('./features/bookings/booking-schedule-section.component').then(m => m.BookingScheduleSectionComponent) },
          { path: 'payments', loadComponent: () => import('./features/bookings/booking-payments-section.component').then(m => m.BookingPaymentsSectionComponent) },
          { path: 'invoice', loadComponent: () => import('./features/bookings/booking-invoice-section.component').then(m => m.BookingInvoiceSectionComponent) },
          { path: 'notes', loadComponent: () => import('./features/bookings/booking-notes-section.component').then(m => m.BookingNotesSectionComponent) },
          { path: 'photos', loadComponent: () => import('./features/bookings/booking-photos-section.component').then(m => m.BookingPhotosSectionComponent) },
          { path: 'files', loadComponent: () => import('./features/bookings/booking-files-section.component').then(m => m.BookingFilesSectionComponent) },
          { path: 'forms', loadComponent: () => import('./features/bookings/booking-forms-section.component').then(m => m.BookingFormsSectionComponent) },
          { path: 'reminders', loadComponent: () => import('./features/bookings/booking-reminders-section.component').then(m => m.BookingRemindersSectionComponent) },
          { path: 'history', loadComponent: () => import('./features/bookings/booking-history-section.component').then(m => m.BookingHistorySectionComponent) },
          { path: 'conflicts', loadComponent: () => import('./features/bookings/booking-conflicts-section.component').then(m => m.BookingConflictsSectionComponent) },
          { path: 'ai', loadComponent: () => import('./features/bookings/booking-ai-section.component').then(m => m.BookingAiSectionComponent) },
          { path: 'settings', loadComponent: () => import('./features/bookings/booking-settings-section.component').then(m => m.BookingSettingsSectionComponent) },
        ]
      },
    ]
  },
  { path: 'marketing', loadComponent: () => import('./features/marketing/marketing.component').then(m => m.MarketingComponent) },
  { path: 'marketing/campaigns/new', loadComponent: () => import('./features/feature-page-placeholder.component').then(m => m.FeaturePagePlaceholderComponent), data: { title: 'New Campaign', description: 'Create a new marketing campaign', icon: '📢', todo: 'Replace with enterprise-page-header and full campaign creation form.', parentRoute: '/app/marketing', parentLabel: 'Marketing' } },
  { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'settings/:section', loadComponent: () => import('./features/feature-page-placeholder.component').then(m => m.FeaturePagePlaceholderComponent), data: { title: 'Settings Section', description: 'Manage settings', icon: '⚙️', todo: 'Replace with enterprise-page-header and full settings section view.', parentRoute: '/app/settings', parentLabel: 'Settings' } },
  { path: 'finance', loadComponent: () => import('./features/feature-page-placeholder.component').then(m => m.FeaturePagePlaceholderComponent), data: { title: 'Finance Dashboard', description: 'Overview of salon finances', icon: '💰', todo: 'Replace with enterprise-page-header and full finance dashboard with payments, invoices, billing rules, and adjustments.', parentRoute: '/app', parentLabel: 'Dashboard' } },
  { path: 'finance/payments', redirectTo: '/app/payments', pathMatch: 'full' },
  { path: 'finance/invoices', redirectTo: '/app/invoices', pathMatch: 'full' },
  { path: 'finance/:id', loadComponent: () => import('./features/feature-page-placeholder.component').then(m => m.FeaturePagePlaceholderComponent), data: { title: 'Finance Detail', description: 'View finance details', icon: '💰', todo: 'Replace with enterprise-page-header and full finance detail view.', parentRoute: '/app/finance', parentLabel: 'Finance' } },
  { path: 'memberships', loadComponent: () => import('./features/memberships/memberships.component').then(m => m.MembershipsComponent) },
  { path: 'packages', loadComponent: () => import('./features/packages/packages.component').then(m => m.PackagesComponent) },
  { path: 'wallet', loadComponent: () => import('./features/wallet/wallet.component').then(m => m.WalletComponent) },
  { path: 'gift-cards', loadComponent: () => import('./features/gift-cards/gift-cards.component').then(m => m.GiftCardsComponent) },
  { path: 'loyalty', loadComponent: () => import('./features/loyalty/loyalty.component').then(m => m.LoyaltyComponent) },
  { path: 'forms', loadComponent: () => import('./features/forms/forms.component').then(m => m.FormsComponent) },
  { path: 'client-timeline', loadComponent: () => import('./features/client-timeline/client-timeline.component').then(m => m.ClientTimelineComponent) },
  { path: 'online-profile', loadComponent: () => import('./features/online-profile/online-profile.component').then(m => m.OnlineProfileComponent) },
  { path: 'customer-portal', loadComponent: () => import('./features/customer-portal/customer-portal.component').then(m => m.CustomerPortalComponent) },
  { path: 'payments', loadComponent: () => import('./features/payments/payments.component').then(m => m.PaymentsComponent) },
  { path: 'invoices', loadComponent: () => import('./features/invoices/invoices.component').then(m => m.InvoicesComponent) },
  { path: 'billing-rules', loadComponent: () => import('./features/billing-rules/billing-rules.component').then(m => m.BillingRulesComponent) },
  { path: 'adjustments', loadComponent: () => import('./features/adjustments/adjustments.component').then(m => m.AdjustmentsComponent) },
  { path: 'automations', loadComponent: () => import('./features/automations/automations.component').then(m => m.AutomationsComponent) },
  { path: 'message-center', loadComponent: () => import('./features/message-center/message-center.component').then(m => m.MessageCenterComponent) },
  { path: 'notification-templates', loadComponent: () => import('./features/notification-templates/notification-templates.component').then(m => m.NotificationTemplatesComponent) },
  { path: 'tasks', loadComponent: () => import('./features/tasks/tasks.component').then(m => m.TasksComponent) },
  { path: 'attendance', loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent) },
  { path: 'commissions', loadComponent: () => import('./features/commissions/commissions.component').then(m => m.CommissionsComponent) },
  { path: 'advanced-reports', loadComponent: () => import('./features/advanced-reports/advanced-reports.component').then(m => m.AdvancedReportsComponent) },
  { path: 'branches', loadComponent: () => import('./features/branches/branches.component').then(m => m.BranchesComponent) },
  { path: 'audit-logs', loadComponent: () => import('./features/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent) },
  { path: 'data-export', loadComponent: () => import('./features/data-export/data-export.component').then(m => m.DataExportComponent) },
  { path: 'staff-workspace', loadComponent: () => import('./features/staff-workspace/staff-workspace.component').then(m => m.StaffWorkspaceComponent) },
  { path: 'owner-command-center', loadComponent: () => import('./features/owner-command-center/owner-command-center.component').then(m => m.OwnerCommandCenterComponent) },
  { path: 'crm-intelligence', loadComponent: () => import('./features/crm-intelligence/crm-intelligence.component').then(m => m.CrmIntelligenceComponent) },
  { path: 'resources', loadComponent: () => import('./features/resources/resources.component').then(m => m.ResourcesComponent) },
  { path: 'reputation', loadComponent: () => import('./features/reputation/reputation.component').then(m => m.ReputationComponent) },
  { path: 'surveys', loadComponent: () => import('./features/surveys/surveys.component').then(m => m.SurveysComponent) },
  { path: 'delivery-settings', loadComponent: () => import('./features/delivery-settings/delivery-settings.component').then(m => m.DeliverySettingsComponent) },
  { path: 'shifts', loadComponent: () => import('./features/shifts/shifts.component').then(m => m.ShiftsComponent) },
  { path: 'calendar-sync', loadComponent: () => import('./features/calendar-sync/calendar-sync.component').then(m => m.CalendarSyncComponent) },
  { path: 'whatsapp', loadComponent: () => import('./features/whatsapp/whatsapp.component').then(m => m.WhatsAppComponent) },
  { path: 'ai-dashboard', loadComponent: () => import('./features/ai-dashboard/ai-dashboard.component').then(m => m.AiDashboardComponent) },
  { path: 'resource-map', loadComponent: () => import('./features/resource-map/resource-map.component').then(m => m.ResourceMapComponent) },
  { path: 'voice-booking', loadComponent: () => import('./features/voice-booking/voice-booking.component').then(m => m.VoiceBookingComponent) },
  { path: 'dashboard', redirectTo: 'dashboard-analytics', pathMatch: 'full' },
  { path: 'command-center', redirectTo: 'owner-command-center', pathMatch: 'full' },
  { path: 'multi-branch', redirectTo: 'branches', pathMatch: 'full' },
  { path: 'ai', redirectTo: 'ai-insights', pathMatch: 'full' },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];

export const routes: Routes = [
  {
    path: '',
    component: WebsiteLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./website/home/home.component').then(m => m.HomeComponent) },
      { path: 'features', loadComponent: () => import('./website/page/page.component').then(m => m.PageComponent), data: { title: 'Features' } },
      { path: 'pricing', loadComponent: () => import('./website/page/page.component').then(m => m.PageComponent), data: { title: 'Pricing' } },
      { path: 'product-tour', loadComponent: () => import('./website/page/page.component').then(m => m.PageComponent), data: { title: 'Product Tour' } },
      { path: 'contact', loadComponent: () => import('./website/page/page.component').then(m => m.PageComponent), data: { title: 'Contact' } },
      { path: 'book-demo', loadComponent: () => import('./website/page/page.component').then(m => m.PageComponent), data: { title: 'Book Demo' } },
      { path: 'blog', loadComponent: () => import('./website/page/page.component').then(m => m.PageComponent), data: { title: 'Blog' } }
    ]
  },
  { path: 'login', loadComponent: () => import('./core/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./core/auth/register.component').then(m => m.RegisterComponent) },
  { path: 'forgot-password', loadComponent: () => import('./core/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  {
    path: 'app',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: appModuleRoutes
  },
  { path: 'book-online', loadComponent: () => import('./book-online/book-online.component').then(m => m.BookOnlineComponent) },
  { path: '**', redirectTo: '' }
];
