import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme/theme.service';
import { EnterpriseDrawerComponent } from '../../features/drawer/enterprise-drawer.component';
import { EnterpriseDrawerService, DrawerType } from './enterprise-drawer.service';
import { CommandPaletteComponent } from '../../features/command-palette/command-palette.component';
import { SearchOverlayComponent } from '../../features/search-overlay/search-overlay.component';
import { CommandPaletteService } from '../../features/command-palette/command-palette.service';
import { SearchOverlayService } from '../../features/search-overlay/search-overlay.service';

interface NavItem {
  key: string;
  label: string;
  icon: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    EnterpriseDrawerComponent,
    CommandPaletteComponent,
    SearchOverlayComponent,
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.css',
})
export class AppLayoutComponent {
  private auth = inject(AuthService);
  protected theme = inject(ThemeService);
  protected drawerSvc = inject(EnterpriseDrawerService);
  protected commandPalette = inject(CommandPaletteService);
  protected searchOverlay = inject(SearchOverlayService);
  private router = inject(Router);

  sidebarOpen = false;
  collapsed = false;
  profileOpen = false;
  unreadCount = 0;

  user = this.auth.getUser();

  moduleIcon = '📊';
  moduleName = 'Dashboard';
  breadcrumb = 'Home';

  navGroups: NavGroup[] = [
    {
      group: 'Command Center',
      items: [
        { key: 'dashboard-analytics', label: 'Dashboard', icon: '📊' },
        { key: 'owner-command-center', label: 'Owner Command Center', icon: '🎯' },
        { key: 'ai-command-center', label: 'AI Command Center', icon: '🤖' },
        { key: 'ai-dashboard', label: 'AI Dashboard', icon: '✨' },
        { key: 'home', label: 'Home', icon: '🏠' },
      ],
    },
    {
      group: 'Operations',
      items: [
        { key: 'calendar', label: 'Calendar', icon: '📅' },
        { key: 'bookings', label: 'Bookings', icon: '🗓️' },
        { key: 'services', label: 'Services', icon: '💇' },
        { key: 'resources', label: 'Resources', icon: '🧰' },
        { key: 'resource-map', label: 'Resource Map', icon: '🗺️' },
        { key: 'shifts', label: 'Shifts', icon: '🔁' },
        { key: 'attendance', label: 'Attendance', icon: '🕒' },
        { key: 'tasks', label: 'Tasks', icon: '✅' },
      ],
    },
    {
      group: 'Customers',
      items: [
        { key: 'clients', label: 'Clients', icon: '👥' },
        { key: 'client-timeline', label: 'Client Timeline', icon: '🧵' },
        { key: 'customer-portal', label: 'Customer Portal', icon: '🌐' },
        { key: 'online-profile', label: 'Online Profile', icon: '👤' },
        { key: 'crm-intelligence', label: 'CRM Intelligence', icon: '🧠' },
        { key: 'loyalty', label: 'Loyalty', icon: '⭐' },
        { key: 'memberships', label: 'Memberships', icon: '🪪' },
        { key: 'packages', label: 'Packages', icon: '📦' },
        { key: 'wallet', label: 'Wallet', icon: '👛' },
        { key: 'gift-cards', label: 'Gift Cards', icon: '🎁' },
      ],
    },
    {
      group: 'Staff',
      items: [
        { key: 'staff', label: 'Staff', icon: '🧑‍💼' },
        { key: 'staff-workspace', label: 'Staff Workspace', icon: '🖥️' },
        { key: 'commissions', label: 'Commissions', icon: '💸' },
      ],
    },
    {
      group: 'Sales',
      items: [
        { key: 'pos', label: 'POS', icon: '💳' },
        { key: 'payments', label: 'Payments', icon: '💰' },
        { key: 'invoices', label: 'Invoices', icon: '🧾' },
      ],
    },
    {
      group: 'Inventory',
      items: [
        { key: 'inventory', label: 'Inventory', icon: '📦' },
        { key: 'adjustments', label: 'Adjustments', icon: '⚖️' },
        { key: 'branches', label: 'Branches', icon: '🏢' },
      ],
    },
    {
      group: 'Finance',
      items: [
        { key: 'finance', label: 'Finance', icon: '📈' },
        { key: 'billing-rules', label: 'Billing Rules', icon: '🧮' },
      ],
    },
    {
      group: 'Marketing',
      items: [
        { key: 'marketing', label: 'Marketing', icon: '📣' },
        { key: 'message-center', label: 'Message Center', icon: '✉️' },
        { key: 'notification-templates', label: 'Notification Templates', icon: '📨' },
        { key: 'automations', label: 'Automations', icon: '⚙️' },
        { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
        { key: 'reputation', label: 'Reputation', icon: '⭐' },
        { key: 'surveys', label: 'Surveys', icon: '📝' },
        { key: 'forms', label: 'Forms', icon: '📋' },
      ],
    },
    {
      group: 'AI',
      items: [
        { key: 'ai-insights', label: 'AI Insights', icon: '💡' },
        { key: 'ai-command-center', label: 'AI Command Center', icon: '🤖' },
        { key: 'ai-dashboard', label: 'AI Dashboard', icon: '✨' },
        { key: 'voice-booking', label: 'Voice Booking', icon: '🎙️' },
        { key: 'calendar-sync', label: 'Calendar Sync', icon: '🔄' },
      ],
    },
    {
      group: 'Reports',
      items: [
        { key: 'reports', label: 'Reports', icon: '📊' },
        { key: 'advanced-reports', label: 'Advanced Reports', icon: '📈' },
        { key: 'audit-logs', label: 'Audit Logs', icon: '📜' },
        { key: 'data-export', label: 'Data Export', icon: '📤' },
      ],
    },
    {
      group: 'Settings',
      items: [
        { key: 'settings', label: 'Settings', icon: '⚙️' },
        { key: 'notifications', label: 'Notifications', icon: '🔔' },
        { key: 'global-search', label: 'Global Search', icon: '🔍' },
        { key: 'delivery-settings', label: 'Delivery Settings', icon: '🚚' },
      ],
    },
  ];

  get isDark(): boolean {
    return this.theme.mode === 'dark';
  }

  constructor() {
    const saved = localStorage.getItem('ambition-collapsed');
    if (saved === '1') this.collapsed = true;
    this.syncModule(this.router.url);
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(e => this.syncModule((e as NavigationEnd).urlAfterRedirects));
  }

  private syncModule(url: string): void {
    const seg = (url.split('?')[0].split('#')[0].match(/\/app\/([^/]+)/) || [])[1] || 'home';
    const flat: NavItem[] = this.navGroups.flatMap(g => g.items);
    const match = flat.find(i => i.key === seg);
    if (match) {
      this.moduleIcon = match.icon;
      this.moduleName = match.label;
      this.breadcrumb = 'Home';
    } else {
      this.moduleIcon = '📊';
      this.moduleName = 'Dashboard';
      this.breadcrumb = 'Home';
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    localStorage.setItem('ambition-collapsed', this.collapsed ? '1' : '0');
  }

  toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
  }

  closeProfile(): void {
    this.profileOpen = false;
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  openDrawer(type: DrawerType, title: string): void {
    this.drawerSvc.open({ type, title });
  }

  openQuickCreate(): void {
    this.drawerSvc.open({ type: 'quick-create', title: 'Quick Create' });
  }

  openAiAssistant(): void {
    this.drawerSvc.open({ type: 'ai-assistant', title: 'AI Assistant' });
  }

  openCommandPalette(): void {
    this.commandPalette.open();
  }

  openSearch(): void {
    this.searchOverlay.open();
  }

  logout(): void {
    this.auth.logout();
  }
}
