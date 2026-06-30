import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <button class="mobile-toggle" (click)="sidebarOpen = !sidebarOpen">
        {{ sidebarOpen ? '×' : '☰' }}
      </button>

      <aside class="sidebar" [class.open]="sidebarOpen">
        <div class="brand">AMBITION</div>
        <div class="sidebar-scroll">
          <a *ngFor="let item of items"
             [routerLink]="'/app/'+item.key"
             routerLinkActive="active"
             [routerLinkActiveOptions]="{exact: true}"
             (click)="sidebarOpen = false">
            {{item.label}}
          </a>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <strong>Ambition Workspace</strong>
            <span>{{ user?.fullName || 'Owner' }}</span>
          </div>

          <div class="actions">
            <a routerLink="/" class="btn btn-secondary">Website</a>
            <button class="btn btn-primary" type="button" (click)="logout()">Logout</button>
          </div>
        </header>

        <section class="content">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .app-shell{display:grid;grid-template-columns:260px 1fr;min-height:100vh;background:#f7f7f7}
    .sidebar{background:#0b0b0b;color:white;padding:24px 24px 0;display:flex;flex-direction:column}
    .sidebar-scroll{overflow-y:auto;flex:1;padding-bottom:24px;display:flex;flex-direction:column;gap:2px}
    .sidebar-scroll::-webkit-scrollbar{width:4px}
    .sidebar-scroll::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
    .brand{font-weight:900;letter-spacing:.1em;margin-bottom:20px;flex-shrink:0}
    .sidebar a{padding:10px 14px;border-radius:10px;color:#bbb;text-transform:capitalize;font-size:14px;text-decoration:none;transition:background .15s,color .15s}
    .sidebar a:hover{background:rgba(255,255,255,.09);color:white}
    .sidebar a.active{background:rgba(255,255,255,.12);color:white;font-weight:700}
    .mobile-toggle{display:none}
    .topbar{height:74px;background:white;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:0 24px;flex-shrink:0}
    .topbar span{display:block;color:#6b7280;font-size:13px}
    .actions{display:flex;gap:12px;align-items:center}
    .content{padding:28px;overflow-y:auto}
    @media(max-width:900px){
      .app-shell{grid-template-columns:1fr}
      .sidebar{position:fixed;top:0;left:0;bottom:0;width:260px;z-index:100;transform:translateX(-100%);transition:transform .25s;padding-bottom:0}
      .sidebar.open{transform:translateX(0)}
      .mobile-toggle{display:flex;position:fixed;top:12px;left:12px;z-index:101;background:#0b0b0b;color:white;border:0;border-radius:10px;width:40px;height:40px;align-items:center;justify-content:center;font-size:22px;cursor:pointer}
    }
  `]
})
export class AppLayoutComponent {
  private auth = inject(AuthService);

  sidebarOpen = false;

  user = this.auth.getUser();

  items = [
    { key: 'home', label: 'Home' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'clients', label: 'Clients' },
    { key: 'staff', label: 'Staff' },
    { key: 'staff-workspace', label: 'Staff Workspace' },
    { key: 'services', label: 'Services' },
    { key: 'pos', label: 'POS' },
    { key: 'payments', label: 'Payments' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'billing-rules', label: 'Billing Rules' },
    { key: 'adjustments', label: 'Adjustments' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'message-center', label: 'Message Center' },
    { key: 'notification-templates', label: 'Notification Templates' },
    { key: 'automations', label: 'Automations' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'commissions', label: 'Commissions' },
    { key: 'memberships', label: 'Memberships' },
    { key: 'packages', label: 'Packages' },
    { key: 'wallet', label: 'Wallet' },
    { key: 'gift-cards', label: 'Gift Cards' },
    { key: 'loyalty', label: 'Loyalty' },
    { key: 'forms', label: 'Forms' },
    { key: 'client-timeline', label: 'Client Timeline' },
    { key: 'online-profile', label: 'Online Profile' },
    { key: 'customer-portal', label: 'Customer Portal' },
    { key: 'owner-command-center', label: 'Owner Command Center' },
    { key: 'crm-intelligence', label: 'CRM Intelligence' },
    { key: 'resources', label: 'Resources' },
    { key: 'reputation', label: 'Reputation' },
    { key: 'surveys', label: 'Surveys' },
    { key: 'delivery-settings', label: 'Delivery Settings' },
    { key: 'reports', label: 'Reports' },
    { key: 'advanced-reports', label: 'Advanced Reports' },
    { key: 'branches', label: 'Branches' },
    { key: 'audit-logs', label: 'Audit Logs' },
    { key: 'data-export', label: 'Data Export' },
    { key: 'ai-command-center', label: 'AI Command Center' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'global-search', label: 'Global Search' },
    { key: 'ai-insights', label: 'AI Insights' },
    { key: 'dashboard-analytics', label: 'Dashboard Analytics' },
    { key: 'settings', label: 'Settings' },
  ];

  logout() {
    this.auth.logout();
  }
}
