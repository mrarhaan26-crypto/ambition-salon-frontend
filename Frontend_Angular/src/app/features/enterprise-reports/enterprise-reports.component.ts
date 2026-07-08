import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnterpriseReportsService } from './enterprise-reports.service';
import {
  ReportQuery, KpiCard, RevenueReport, ProfitReport, StaffReport,
  BranchReport, ServiceReport, PackageReport, MembershipReport,
  WalletReport, InventoryReport, CustomerReport, GrowthReport,
  HeatmapData, ForecastData, AiInsight, ExportOptions, EmailReportConfig,
} from './enterprise-reports.models';

type TabId =
  | 'overview' | 'revenue' | 'profit' | 'staff' | 'branch'
  | 'service' | 'package' | 'membership' | 'wallet' | 'inventory'
  | 'customer' | 'growth' | 'heatmap' | 'forecast' | 'export';

@Component({
  selector: 'app-enterprise-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="er-page">
      <div class="er-head">
        <div>
          <h1>Enterprise Reports</h1>
          <p>Comprehensive business intelligence with 14 report categories, AI insights, and exports.</p>
        </div>
        <div class="er-toolbar">
          <div class="er-dates">
            <input type="date" [(ngModel)]="dateFrom">
            <input type="date" [(ngModel)]="dateTo">
            <select [(ngModel)]="groupBy">
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </select>
            <button class="er-btn" (click)="loadAll()">Apply</button>
          </div>
          <button class="er-btn er-btn-primary" (click)="activeTab='export'">Export</button>
        </div>
      </div>

      <div class="er-tabs">
        <button *ngFor="let t of tabs" class="er-tab" [class.active]="activeTab===t.id" (click)="switchTab(t.id)">
          <span class="er-tab-icon">{{ t.icon }}</span>
          {{ t.label }}
        </button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading enterprise reports...</span></div>
      <div class="error" *ngIf="error"><strong>Error</strong><p>{{ error }}</p><button class="er-btn" (click)="loadAll()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">

        <!-- === OVERVIEW === -->
        <div class="er-section" *ngIf="activeTab==='overview'">
          <div class="er-kpis" *ngIf="kpis.length">
            <div class="er-kpi" *ngFor="let k of kpis" [style.--kpi-color]="k.color||'#0b0b0b'">
              <span class="er-kpi-label">{{ k.label }}</span>
              <strong class="er-kpi-value">{{ formatKpi(k) }}</strong>
              <span class="er-kpi-change" *ngIf="k.change!==undefined" [class.up]="k.trend==='up'" [class.down]="k.trend==='down'">
                {{ k.trend === 'up' ? '\u25B2' : '\u25BC' }} {{ k.change }}{{ k.isPercentage ? '%' : '' }}
                <span class="er-kpi-chglbl" *ngIf="k.changeLabel">{{ k.changeLabel }}</span>
              </span>
            </div>
          </div>

          <div class="er-panel" *ngIf="aiInsights.length">
            <h2><span class="ai-badge">AI</span> AI Insights & Recommendations</h2>
            <div class="er-insights">
              <div class="er-insight" *ngFor="let ins of aiInsights" [class]="'er-insight-'+ins.severity">
                <div class="er-insight-head">
                  <span class="er-insight-badge">{{ ins.type }}</span>
                  <span class="er-insight-title">{{ ins.title }}</span>
                </div>
                <p>{{ ins.description }}</p>
                <div class="er-insight-meta" *ngIf="ins.confidence">
                  <span>Confidence: {{ ins.confidence }}%</span>
                  <span *ngIf="ins.date">{{ ins.date }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="er-grid-4">
            <div class="er-panel" *ngIf="revenue">
              <h2>Revenue</h2>
              <div class="er-big-num">{{ revenue.summary.totalRevenue | currency }}</div>
              <div class="er-stat-row"><span>Sales</span><b>{{ revenue.summary.totalSales }}</b></div>
              <div class="er-stat-row"><span>Avg/Sale</span><b>{{ revenue.summary.averagePerSale | currency }}</b></div>
              <svg class="er-spark" viewBox="0 0 100 24" *ngIf="revenue.daily.length">
                <polyline fill="none" stroke="#0b0b0b" stroke-width="2"
                  [attr.points]="sparkline(revenue.daily,'revenue',100,24)"/>
              </svg>
            </div>
            <div class="er-panel" *ngIf="profit">
              <h2>Profit</h2>
              <div class="er-big-num">{{ profit.summary.netProfit | currency }}</div>
              <div class="er-stat-row"><span>Margin</span><b>{{ profit.summary.profitMargin }}%</b></div>
              <div class="er-stat-row"><span>Revenue</span><b>{{ profit.summary.totalRevenue | currency }}</b></div>
              <div class="er-mini-bar">
                <div class="er-mini-fill" [style.width.%]="profit.summary.profitMargin"></div>
              </div>
            </div>
            <div class="er-panel" *ngIf="staffReport">
              <h2>Staff</h2>
              <div class="er-big-num">{{ staffReport.summary.totalStaff }}</div>
              <div class="er-stat-row"><span>Active</span><b>{{ staffReport.summary.activeStaff }}</b></div>
              <div class="er-stat-row"><span>Revenue</span><b>{{ staffReport.summary.totalRevenue | currency }}</b></div>
            </div>
            <div class="er-panel" *ngIf="customer">
              <h2>Customers</h2>
              <div class="er-big-num">{{ customer.summary.totalClients }}</div>
              <div class="er-stat-row"><span>New</span><b class="green">+{{ customer.summary.newClients }}</b></div>
              <div class="er-stat-row"><span>LTV</span><b>{{ customer.summary.lifetimeValue | currency }}</b></div>
            </div>
          </div>
        </div>

        <!-- === REVENUE === -->
        <div class="er-section" *ngIf="activeTab==='revenue' && revenue">
          <div class="er-kpis">
            <div class="er-kpi"><span>Total Revenue</span><strong>{{ revenue.summary.totalRevenue | currency }}</strong></div>
            <div class="er-kpi"><span>Total Profit</span><strong>{{ revenue.summary.totalProfit | currency }}</strong></div>
            <div class="er-kpi"><span>Profit Margin</span><strong>{{ revenue.summary.profitMargin }}%</strong></div>
            <div class="er-kpi"><span>Avg Per Sale</span><strong>{{ revenue.summary.averagePerSale | currency }}</strong></div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>Daily Revenue Trend</h2>
              <svg class="er-chart" [attr.viewBox]="'0 0 '+(revenue.daily.length*60+40)+' 200'" *ngIf="revenue.daily.length">
                <rect *ngFor="let d of revenue.daily; let i=index" [attr.x]="i*60+20" y="0" width="40"
                  [attr.height]="barH(d.revenue,revenue.daily,'revenue',180)" fill="#0b0b0b" rx="4"
                  (mouseenter)="showTooltip($event,i*60+40,180-barH(d.revenue,revenue.daily,'revenue',180)-10,formatCurrency(d.revenue))"
                  (mouseleave)="tooltip.show=false"/>
                <text *ngFor="let d of revenue.daily; let i=index" [attr.x]="i*60+40" y="196" text-anchor="middle"
                  font-size="9" fill="#6b7280">{{ d.date | date:'MM/dd' }}</text>
              </svg>
            </div>
            <div class="er-panel">
              <h2>By Status</h2>
              <div class="er-legend-strip" *ngFor="let s of revenue.byStatus">
                <span>{{ s.status }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="pct(s.amount,revenue.summary.totalRevenue)"></div></div>
                <b>{{ s.amount | currency }}</b>
              </div>
            </div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>By Service</h2>
              <div class="er-legend-strip" *ngFor="let s of revenue.byService">
                <span>{{ s.serviceName }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="s.percentage"></div></div>
                <b>{{ s.revenue | currency }}</b>
              </div>
            </div>
            <div class="er-panel">
              <h2>By Payment Method</h2>
              <div class="er-legend-strip" *ngFor="let p of revenue.byPaymentMethod">
                <span>{{ p.method }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="pct(p.amount,revenue.summary.totalRevenue)"></div></div>
                <b>{{ p.amount | currency }}</b>
              </div>
            </div>
          </div>
        </div>

        <!-- === PROFIT === -->
        <div class="er-section" *ngIf="activeTab==='profit' && profit">
          <div class="er-kpis">
            <div class="er-kpi"><span>Gross Profit</span><strong>{{ profit.summary.grossProfit | currency }}</strong></div>
            <div class="er-kpi"><span>Net Profit</span><strong>{{ profit.summary.netProfit | currency }}</strong></div>
            <div class="er-kpi"><span>Profit Margin</span><strong>{{ profit.summary.profitMargin }}%</strong></div>
            <div class="er-kpi"><span>Operating Margin</span><strong>{{ profit.summary.operatingMargin }}%</strong></div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>Monthly P&L</h2>
              <table class="er-table">
                <thead><tr><th>Month</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin</th></tr></thead>
                <tbody>
                  <tr *ngFor="let m of profit.monthly">
                    <td>{{ m.month }}</td><td>{{ m.revenue | currency }}</td><td>{{ m.cost | currency }}</td>
                    <td [class.green]="m.profit>0" [class.red]="m.profit<0">{{ m.profit | currency }}</td>
                    <td>{{ m.margin }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="er-panel">
              <h2>Expenses Breakdown</h2>
              <div class="er-legend-strip" *ngFor="let e of profit.expenses">
                <span>{{ e.category }}</span>
                <div class="er-bar-track"><div class="er-bar-fill red-fill" [style.width.%]="e.percentage"></div></div>
                <b>{{ e.amount | currency }}</b>
              </div>
            </div>
          </div>
        </div>

        <!-- === STAFF === -->
        <div class="er-section" *ngIf="activeTab==='staff' && staffReport">
          <div class="er-kpis">
            <div class="er-kpi"><span>Total Staff</span><strong>{{ staffReport.summary.totalStaff }}</strong></div>
            <div class="er-kpi"><span>Active</span><strong>{{ staffReport.summary.activeStaff }}</strong></div>
            <div class="er-kpi"><span>Total Revenue</span><strong>{{ staffReport.summary.totalRevenue | currency }}</strong></div>
            <div class="er-kpi"><span>Avg Rating</span><strong>{{ staffReport.summary.avgRating }}/5</strong></div>
          </div>
          <div class="er-panel">
            <h2>Staff Performance</h2>
            <div class="er-scroll"><table class="er-table">
              <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Bookings</th><th>Completed</th><th>Revenue</th><th>Rating</th><th>Conversion</th></tr></thead>
              <tbody>
                <tr *ngFor="let s of staffReport.staff">
                  <td><strong>{{ s.fullName }}</strong></td>
                  <td>{{ s.role }}</td>
                  <td><span class="er-badge" [class.active]="s.isActive">{{ s.isActive ? 'Active' : 'Inactive' }}</span></td>
                  <td>{{ s.totalBookings }}</td>
                  <td>{{ s.completedBookings }}</td>
                  <td>{{ s.revenue | currency }}</td>
                  <td>{{ s.avgRating }}</td>
                  <td>{{ s.conversionRate }}%</td>
                </tr>
              </tbody>
            </table></div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>Top Performers</h2>
              <div class="er-performer" *ngFor="let s of staffReport.topPerformers; let i=index">
                <span class="er-rank">#{{ i+1 }}</span>
                <div><strong>{{ s.fullName }}</strong><span>{{ s.role }}</span></div>
                <b>{{ s.revenue | currency }}</b>
              </div>
            </div>
            <div class="er-panel">
              <h2>Utilization</h2>
              <div class="er-legend-strip" *ngFor="let u of staffReport.utilization">
                <span>{{ u.staffName }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="u.utilizationRate"></div></div>
                <b>{{ u.utilizationRate }}%</b>
              </div>
            </div>
          </div>
        </div>

        <!-- === BRANCH === -->
        <div class="er-section" *ngIf="activeTab==='branch' && branch">
          <div class="er-kpis">
            <div class="er-kpi"><span>Total Branches</span><strong>{{ branch.summary.totalBranches }}</strong></div>
            <div class="er-kpi"><span>Revenue</span><strong>{{ branch.summary.totalRevenue | currency }}</strong></div>
            <div class="er-kpi"><span>Bookings</span><strong>{{ branch.summary.totalBookings }}</strong></div>
            <div class="er-kpi"><span>Clients</span><strong>{{ branch.summary.totalClients }}</strong></div>
          </div>
          <div class="er-panel">
            <h2>Branch Comparison</h2>
            <div class="er-scroll"><table class="er-table">
              <thead><tr><th>Branch</th><th>Revenue</th><th>Bookings</th><th>Clients</th><th>Avg Booking</th><th>Utilization</th><th>Growth</th></tr></thead>
              <tbody>
                <tr *ngFor="let b of branch.branches">
                  <td><strong>{{ b.branchName }}</strong></td>
                  <td>{{ b.revenue | currency }}</td><td>{{ b.bookings }}</td><td>{{ b.clients }}</td>
                  <td>{{ b.avgBookingValue | currency }}</td>
                  <td>{{ b.utilizationRate }}%</td>
                  <td [class.green]="b.growth>0" [class.red]="b.growth<0">{{ b.growth > 0 ? '+' : '' }}{{ b.growth }}%</td>
                </tr>
              </tbody>
            </table></div>
          </div>
        </div>

        <!-- === SERVICE === -->
        <div class="er-section" *ngIf="activeTab==='service' && service">
          <div class="er-kpis">
            <div class="er-kpi"><span>Total Services</span><strong>{{ service.summary.totalServices }}</strong></div>
            <div class="er-kpi"><span>Revenue</span><strong>{{ service.summary.totalRevenue | currency }}</strong></div>
            <div class="er-kpi"><span>Bookings</span><strong>{{ service.summary.totalBookings }}</strong></div>
            <div class="er-kpi"><span>Avg Price</span><strong>{{ service.summary.avgPrice | currency }}</strong></div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>Service Breakdown</h2>
              <div class="er-legend-strip" *ngFor="let s of service.services">
                <span>{{ s.serviceName }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="s.percentage"></div></div>
                <b>{{ s.revenue | currency }}</b>
              </div>
            </div>
            <div class="er-panel">
              <h2>By Category</h2>
              <div class="er-legend-strip" *ngFor="let c of service.byCategory">
                <span>{{ c.category }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="c.percentage"></div></div>
                <b>{{ c.revenue | currency }}</b>
              </div>
            </div>
          </div>
        </div>

        <!-- === PACKAGE === -->
        <div class="er-section" *ngIf="activeTab==='package' && packageReport">
          <div class="er-kpis">
            <div class="er-kpi"><span>Total Packages</span><strong>{{ packageReport.summary.totalPackages }}</strong></div>
            <div class="er-kpi"><span>Active</span><strong>{{ packageReport.summary.activePackages }}</strong></div>
            <div class="er-kpi"><span>Sold</span><strong>{{ packageReport.summary.totalSold }}</strong></div>
            <div class="er-kpi"><span>Revenue</span><strong>{{ packageReport.summary.totalRevenue | currency }}</strong></div>
          </div>
          <div class="er-panel">
            <h2>Package Performance</h2>
            <div class="er-scroll"><table class="er-table">
              <thead><tr><th>Package</th><th>Price</th><th>Sold</th><th>Redeemed</th><th>Revenue</th><th>Redemption</th></tr></thead>
              <tbody>
                <tr *ngFor="let p of packageReport.packages">
                  <td><strong>{{ p.packageName }}</strong></td>
                  <td>{{ p.price | currency }}</td><td>{{ p.soldCount }}</td><td>{{ p.redeemedCount }}</td>
                  <td>{{ p.revenue | currency }}</td>
                  <td>{{ p.redemptionRate }}%</td>
                </tr>
              </tbody>
            </table></div>
          </div>
        </div>

        <!-- === MEMBERSHIP === -->
        <div class="er-section" *ngIf="activeTab==='membership' && membership">
          <div class="er-kpis">
            <div class="er-kpi"><span>Total Members</span><strong>{{ membership.summary.totalMembers }}</strong></div>
            <div class="er-kpi"><span>Active</span><strong>{{ membership.summary.activeMembers }}</strong></div>
            <div class="er-kpi"><span>Revenue</span><strong>{{ membership.summary.totalRevenue | currency }}</strong></div>
            <div class="er-kpi"><span>Churn Rate</span><strong>{{ membership.summary.churnRate }}%</strong></div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>By Tier</h2>
              <div class="er-legend-strip" *ngFor="let t of membership.byTier">
                <span>{{ t.tier }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="t.percentage"></div></div>
                <b>{{ t.count }}</b>
              </div>
            </div>
            <div class="er-panel">
              <h2>Perk Usage</h2>
              <div class="er-perk" *ngFor="let p of membership.perks">
                <span>{{ p.perk }}</span>
                <b>{{ p.usageCount }} uses</b>
                <span class="er-perk-users">{{ p.membersUsed }} members</span>
              </div>
            </div>
          </div>
        </div>

        <!-- === WALLET === -->
        <div class="er-section" *ngIf="activeTab==='wallet' && wallet">
          <div class="er-kpis">
            <div class="er-kpi"><span>Total Balance</span><strong>{{ wallet.summary.totalBalance | currency }}</strong></div>
            <div class="er-kpi"><span>Total Loaded</span><strong>{{ wallet.summary.totalLoaded | currency }}</strong></div>
            <div class="er-kpi"><span>Total Spent</span><strong>{{ wallet.summary.totalSpent | currency }}</strong></div>
            <div class="er-kpi"><span>Avg Balance</span><strong>{{ wallet.summary.avgBalance | currency }}</strong></div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>Transaction Breakdown</h2>
              <div class="er-legend-strip" *ngFor="let t of wallet.transactions">
                <span>{{ t.type }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="t.percentage"></div></div>
                <b>{{ t.amount | currency }}</b>
              </div>
            </div>
            <div class="er-panel">
              <h2>Net Flow (7 days)</h2>
              <svg class="er-chart" viewBox="0 0 420 160" *ngIf="wallet.daily.length">
                <rect *ngFor="let d of wallet.daily; let i=index" [attr.x]="i*60" y="0" width="25"
                  [attr.height]="barH(d.loaded,wallet.daily,'loaded',150)" fill="#16a34a" rx="3"/>
                <rect *ngFor="let d of wallet.daily; let i=index" [attr.x]="i*60+28" y="0" width="25"
                  [attr.height]="barH(d.spent,wallet.daily,'spent',150)" fill="#dc2626" rx="3"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- === INVENTORY === -->
        <div class="er-section" *ngIf="activeTab==='inventory' && inventory">
          <div class="er-kpis">
            <div class="er-kpi"><span>Total Products</span><strong>{{ inventory.summary.totalProducts }}</strong></div>
            <div class="er-kpi"><span>Total Value</span><strong>{{ inventory.summary.totalValue | currency }}</strong></div>
            <div class="er-kpi"><span>Low Stock</span><strong class="red">{{ inventory.summary.lowStockCount }}</strong></div>
            <div class="er-kpi"><span>Categories</span><strong>{{ inventory.summary.categoriesCount }}</strong></div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>By Category</h2>
              <div class="er-legend-strip" *ngFor="let c of inventory.byCategory">
                <span>{{ c.category }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="pct(c.value,inventory.summary.totalValue)"></div></div>
                <b>{{ c.value | currency }}</b>
              </div>
            </div>
            <div class="er-panel">
              <h2>Low Stock Items</h2>
              <div class="er-low-item" *ngFor="let item of inventory.lowStock">
                <strong>{{ item.name }}</strong>
                <span>Qty: {{ item.quantity }} {{ item.unit }} (min: {{ item.minStockLevel }})</span>
              </div>
              <div class="er-empty" *ngIf="!inventory.lowStock.length">No low stock items</div>
            </div>
          </div>
        </div>

        <!-- === CUSTOMER === -->
        <div class="er-section" *ngIf="activeTab==='customer' && customer">
          <div class="er-kpis">
            <div class="er-kpi"><span>Total Clients</span><strong>{{ customer.summary.totalClients }}</strong></div>
            <div class="er-kpi"><span>New</span><strong class="green">+{{ customer.summary.newClients }}</strong></div>
            <div class="er-kpi"><span>Retention</span><strong>{{ customer.summary.retentionRate }}%</strong></div>
            <div class="er-kpi"><span>LTV</span><strong>{{ customer.summary.lifetimeValue | currency }}</strong></div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>Segments</h2>
              <div class="er-legend-strip" *ngFor="let seg of customer.segments">
                <span>{{ seg.segment }}</span>
                <div class="er-bar-track"><div class="er-bar-fill" [style.width.%]="seg.percentage"></div></div>
                <b>{{ seg.count }}</b>
              </div>
            </div>
            <div class="er-panel">
              <h2>Top Clients</h2>
              <div class="er-scroll"><table class="er-table">
                <thead><tr><th>Name</th><th>Visits</th><th>Total Spent</th><th>Favorite</th></tr></thead>
                <tbody>
                  <tr *ngFor="let c of customer.topClients">
                    <td>{{ c.fullName }}</td><td>{{ c.visits }}</td>
                    <td>{{ c.totalSpent | currency }}</td><td>{{ c.favoriteService }}</td>
                  </tr>
                </tbody>
              </table></div>
            </div>
          </div>
        </div>

        <!-- === GROWTH === -->
        <div class="er-section" *ngIf="activeTab==='growth' && growth">
          <div class="er-kpis">
            <div class="er-kpi"><span>Revenue Growth</span><strong [class.green]="growth.summary.revenueGrowth>0">{{ growth.summary.revenueGrowth }}%</strong></div>
            <div class="er-kpi"><span>Booking Growth</span><strong [class.green]="growth.summary.bookingGrowth>0">{{ growth.summary.bookingGrowth }}%</strong></div>
            <div class="er-kpi"><span>Client Growth</span><strong [class.green]="growth.summary.clientGrowth>0">{{ growth.summary.clientGrowth }}%</strong></div>
            <div class="er-kpi"><span>Profit Growth</span><strong [class.green]="growth.summary.profitGrowth>0">{{ growth.summary.profitGrowth }}%</strong></div>
          </div>
          <div class="er-panel">
            <h2>Growth Metrics</h2>
            <div class="er-growth-grid">
              <div class="er-growth-item" *ngFor="let m of growth.metrics">
                <span class="er-growth-label">{{ m.metric }}</span>
                <span class="er-growth-current">{{ m.current }}</span>
                <span class="er-growth-change" [class.up]="m.isPositive" [class.down]="!m.isPositive">
                  {{ m.change > 0 ? '+' : '' }}{{ m.change }}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- === HEATMAP === -->
        <div class="er-section" *ngIf="activeTab==='heatmap' && heatmap">
          <div class="er-heatmap-head">
            <h2>Booking Heatmap</h2>
            <div class="er-heat-summary">
              <span>Peak: <b>{{ heatmap.summary.peakDay }} @ {{ heatmap.summary.peakHour }}</b></span>
              <span>Avg/Slot: <b>{{ heatmap.summary.averagePerSlot }}</b></span>
            </div>
          </div>
          <div class="er-heatmap-wrap">
            <div class="er-heat-row er-heat-label">
              <span></span>
              <span *ngFor="let h of heatmap.hours">{{ h }}</span>
            </div>
            <div class="er-heat-row" *ngFor="let day of heatmap.days; let di=index">
              <span class="er-heat-day">{{ day }}</span>
              <div class="er-heat-cell" *ngFor="let h of heatmap.hours; let hi=index"
                [style.background]="heatColor(getHeatValue(di,hi))"
                [title]="getHeatValue(di,hi)+' bookings'">
                <span *ngIf="getHeatValue(di,hi) > 0">{{ getHeatValue(di,hi) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- === FORECAST === -->
        <div class="er-section" *ngIf="activeTab==='forecast' && forecast">
          <div class="er-kpis">
            <div class="er-kpi"><span>Predicted Revenue</span><strong>{{ forecast.summary.predictedRevenue | currency }}</strong></div>
            <div class="er-kpi"><span>Predicted Bookings</span><strong>{{ forecast.summary.predictedBookings }}</strong></div>
            <div class="er-kpi"><span>Confidence</span><strong>{{ forecast.summary.confidence }}%</strong></div>
            <div class="er-kpi"><span>Growth Est.</span><strong [class.green]="forecast.summary.growthEstimate>0">{{ forecast.summary.growthEstimate }}%</strong></div>
          </div>
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>Forecast Trend</h2>
              <svg class="er-chart" viewBox="0 0 500 200" *ngIf="forecast.monthly.length">
                <ng-container *ngFor="let m of forecast.monthly; let i=index">
                  <rect [attr.x]="i*70+10" y="0" width="50"
                    [attr.height]="barH(m.predicted,forecast.monthly,'predicted',180)" fill="#0b0b0b" rx="4" opacity="0.3"/>
                  <rect [attr.x]="i*70+10" y="0" width="50"
                    [attr.height]="m.actual!==undefined ? barH(m.actual,forecast.monthly,'actual',180) : 0"
                    fill="#2563eb" rx="4" opacity="0.8"/>
                </ng-container>
                <text *ngFor="let m of forecast.monthly; let i=index" [attr.x]="i*70+35" y="196"
                  text-anchor="middle" font-size="9" fill="#6b7280">{{ m.month }}</text>
              </svg>
              <div class="er-chart-legend"><span class="dot dark"></span>Predicted <span class="dot blue"></span>Actual</div>
            </div>
            <div class="er-panel">
              <h2>Service Predictions</h2>
              <div class="er-legend-strip" *ngFor="let s of forecast.byService">
                <span>{{ s.serviceName }}</span>
                <span class="er-trend" [class.up]="s.trend==='up'" [class.down]="s.trend==='down'">
                  {{ s.trend === 'up' ? '\u25B2' : s.trend === 'down' ? '\u25BC' : '\u25C6' }}
                </span>
                <b>{{ s.predictedRevenue | currency }}</b>
                <span class="er-conf">{{ s.confidence }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- === EXPORT === -->
        <div class="er-section" *ngIf="activeTab==='export'">
          <div class="er-grid-2">
            <div class="er-panel">
              <h2>Export Report</h2>
              <div class="er-form">
                <label>Format</label>
                <select [(ngModel)]="exportFormat">
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
                <label>Sections</label>
                <div class="er-check-grid">
                  <label *ngFor="let sec of exportSections" class="er-check">
                    <input type="checkbox" [(ngModel)]="sec.selected">
                    {{ sec.label }}
                  </label>
                </div>
                <label><input type="checkbox" [(ngModel)]="includeCharts"> Include Charts</label>
                <button class="er-btn er-btn-primary" (click)="doExport()" [disabled]="exporting">
                  {{ exporting ? 'Exporting...' : 'Download ' + exportFormat.toUpperCase() }}
                </button>
              </div>
            </div>
            <div class="er-panel">
              <h2>Email Report</h2>
              <div class="er-form">
                <label>Recipients (comma separated)</label>
                <input type="text" [(ngModel)]="emailRecipients" placeholder="email1@example.com, email2@example.com">
                <label>Subject</label>
                <input type="text" [(ngModel)]="emailSubject" placeholder="Monthly Business Report">
                <label>Message</label>
                <textarea [(ngModel)]="emailMessage" rows="3" placeholder="Optional message..."></textarea>
                <label>Format</label>
                <select [(ngModel)]="emailFormat">
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
                <button class="er-btn er-btn-primary" (click)="sendEmailReport()" [disabled]="emailSending">
                  {{ emailSending ? 'Sending...' : 'Send Report' }}
                </button>
                <div class="er-success" *ngIf="emailSent">{{ emailSent }}</div>
              </div>
            </div>
          </div>

          <div class="er-panel">
            <h2>Schedule Reports</h2>
            <div class="er-form er-form-inline">
              <label>Frequency</label>
              <select [(ngModel)]="scheduleFreq">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
              <label>Time</label>
              <input type="time" [(ngModel)]="scheduleTime">
              <button class="er-btn er-btn-primary" (click)="createSchedule()" [disabled]="scheduling">
                {{ scheduling ? 'Creating...' : 'Create Schedule' }}
              </button>
            </div>
            <div class="er-scroll" *ngIf="schedules.length">
              <table class="er-table">
                <thead><tr><th>Frequency</th><th>Recipients</th><th>Format</th><th>Next Run</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  <tr *ngFor="let s of schedules">
                    <td>{{ s.frequency }}</td><td>{{ s.recipients.join(', ') }}</td>
                    <td>{{ s.format }}</td><td>{{ s.nextRun | date }}</td>
                    <td><span class="er-badge" [class.active]="s.active">{{ s.active ? 'Active' : 'Paused' }}</span></td>
                    <td><button class="er-btn-sm" (click)="deleteSchedule(s.id)">Delete</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </ng-container>

      <!-- Tooltip overlay -->
      <div class="er-tooltip" *ngIf="tooltip.show"
        [style.left.px]="tooltip.x" [style.top.px]="tooltip.y">
        {{ tooltip.text }}
      </div>
    </section>
  `,
  styles: [`
    .er-page{display:grid;gap:20px;position:relative}
    .er-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    .er-head h1{font-size:34px;margin:0}
    .er-head p{color:#6b7280;margin:6px 0 0}
    .er-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .er-dates{display:flex;gap:6px;align-items:center}
    .er-dates input,.er-dates select{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px}
    .er-btn{border:0;border-radius:10px;padding:8px 14px;background:#0b0b0b;color:white;font-weight:600;cursor:pointer;font-size:13px}
    .er-btn-primary{background:#2563eb!important}
    .er-btn:disabled{opacity:.5;cursor:default}
    .er-tabs{display:flex;gap:4px;overflow-x:auto;padding:4px 0;flex-wrap:nowrap}
    .er-tab{white-space:nowrap;padding:8px 14px;border:1px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;font-size:12px;font-weight:600;color:#374151;transition:.15s}
    .er-tab.active{background:#0b0b0b;color:white;border-color:#0b0b0b}
    .er-tab-icon{margin-right:4px}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d;margin:8px 0}
    .er-section{display:grid;gap:20px}
    .er-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
    .er-kpi{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:16px;box-shadow:0 8px 25px rgba(15,23,42,.06)}
    .er-kpi-label{display:block;color:#6b7280;font-size:12px;margin-bottom:6px}
    .er-kpi-value{font-size:24px;color:var(--kpi-color)}
    .er-kpi-change{display:block;font-size:12px;margin-top:4px;font-weight:600}
    .er-kpi-change.up{color:#16a34a}
    .er-kpi-change.down{color:#dc2626}
    .er-kpi-chglbl{color:#6b7280;font-weight:400;margin-left:4px}
    .er-panel{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;box-shadow:0 8px 25px rgba(15,23,42,.06)}
    .er-panel h2{font-size:18px;margin:0 0 16px;display:flex;align-items:center;gap:8px}
    .er-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .er-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
    .er-big-num{font-size:32px;font-weight:700;margin-bottom:12px}
    .er-stat-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
    .er-stat-row span{color:#6b7280}
    .er-mini-bar{height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin-top:8px}
    .er-mini-fill{height:100%;background:#0b0b0b;border-radius:3px}
    .er-spark{width:100%;height:24px;margin-top:8px}
    .er-table{width:100%;border-collapse:collapse;font-size:13px}
    .er-table th,.er-table td{padding:8px 10px;text-align:left;border-bottom:1px solid #f1f5f9}
    .er-table th{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
    .er-scroll{overflow-x:auto}
    .er-chart{width:100%;height:auto;min-height:140px}
    .er-legend-strip{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px}
    .er-legend-strip span{flex:1;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .er-bar-track{flex:2;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden}
    .er-bar-fill{height:100%;background:#0b0b0b;border-radius:4px;transition:width .3s}
    .red-fill{background:#dc2626}
    .er-badge{font-size:11px;padding:2px 8px;border-radius:12px;background:#f3f4f6;font-weight:600}
    .er-badge.active{background:#f0fdf4;color:#16a34a}
    .er-rank{font-size:16px;font-weight:800;color:#6b7280;min-width:28px}
    .er-performer{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9}
    .er-performer div{flex:1}
    .er-performer div strong{display:block;font-size:14px}
    .er-performer div span{font-size:12px;color:#6b7280}
    .green{color:#16a34a}.red{color:#dc2626}
    .ai-badge{background:#7c3aed;color:white;font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700;letter-spacing:.04em}
    .er-insights{display:grid;gap:10px}
    .er-insight{border:1px solid;border-radius:14px;padding:14px}
    .er-insight-info{border-color:#dbeafe;background:#f9fafb}
    .er-insight-warning{border-color:#fef3c7;background:#fffbeb}
    .er-insight-critical{border-color:#fecaca;background:#fef2f2}
    .er-insight-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .er-insight-badge{font-size:10px;font-weight:700;text-transform:uppercase;padding:1px 8px;border-radius:6px;background:#e5e7eb;color:#374151}
    .er-insight-title{font-weight:600;font-size:14px}
    .er-insight p{font-size:13px;color:#4b5563;margin:4px 0 0}
    .er-insight-meta{display:flex;gap:16px;margin-top:8px;font-size:11px;color:#6b7280}
    .er-perk{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
    .er-perk span{flex:1}.er-perk-users{color:#6b7280;font-size:11px}
    .er-growth-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
    .er-growth-item{display:flex;flex-direction:column;padding:14px;background:#f8fafc;border-radius:12px}
    .er-growth-label{font-size:12px;color:#6b7280;margin-bottom:4px}
    .er-growth-current{font-size:20px;font-weight:700}
    .er-growth-change{font-size:13px;font-weight:600}
    .er-growth-change.up{color:#16a34a}.er-growth-change.down{color:#dc2626}
    .er-heatmap-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
    .er-heatmap-head h2{margin:0}
    .er-heat-summary{display:flex;gap:16px;font-size:12px;color:#6b7280}
    .er-heatmap-wrap{overflow-x:auto;font-size:12px}
    .er-heat-row{display:flex;gap:2px;margin-bottom:2px;align-items:center}
    .er-heat-label{font-size:10px;color:#6b7280;margin-bottom:6px}
    .er-heat-row .er-heat-day{width:50px;font-weight:600;font-size:11px;flex-shrink:0}
    .er-heat-label span{width:36px;text-align:center;flex-shrink:0}
    .er-heat-cell{width:36px;height:36px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:white;flex-shrink:0}
    .er-chart-legend{display:flex;gap:16px;margin-top:8px;font-size:12px;color:#6b7280}
    .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle}
    .dot.dark{background:#0b0b0b}.dot.blue{background:#2563eb}
    .er-trend{font-size:14px;font-weight:700}.er-trend.up{color:#16a34a}.er-trend.down{color:#dc2626}
    .er-conf{font-size:11px;color:#6b7280}
    .er-low-item{display:flex;justify-content:space-between;padding:8px 10px;background:#fef2f2;border-radius:8px;margin-bottom:6px;font-size:13px}
    .er-form{display:grid;gap:10px}
    .er-form label{font-size:13px;font-weight:600;color:#374151}
    .er-form input,.er-form select,.er-form textarea{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px}
    .er-form-inline{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}
    .er-form-inline label{margin-bottom:0}
    .er-check-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
    .er-check{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:400!important;cursor:pointer}
    .er-success{background:#f0fdf4;color:#16a34a;padding:8px 12px;border-radius:8px;font-size:13px}
    .er-btn-sm{border:1px solid #e5e7eb;border-radius:6px;padding:4px 10px;background:white;cursor:pointer;font-size:11px;color:#dc2626}
    .er-empty{padding:20px;text-align:center;color:#6b7280;font-size:13px}
    .er-tooltip{position:absolute;background:#0b0b0b;color:white;padding:4px 10px;border-radius:6px;font-size:12px;pointer-events:none;z-index:100;white-space:nowrap}
    .er-heat-cell span{text-shadow:0 0 2px rgba(0,0,0,.5)}
    @media(max-width:1200px){.er-grid-4{grid-template-columns:repeat(2,1fr)}.er-grid-2{grid-template-columns:1fr}}
    @media(max-width:900px){.er-kpis{grid-template-columns:1fr 1fr}.er-grid-4{grid-template-columns:1fr}.er-head{flex-direction:column;align-items:stretch}}
    @media(max-width:600px){.er-kpis{grid-template-columns:1fr}.er-tabs{flex-wrap:nowrap;overflow-x:auto}}
  `]
})
export class EnterpriseReportsComponent {
  private api = inject(EnterpriseReportsService);

  loading = true;
  error = '';
  dateFrom = '';
  dateTo = '';
  groupBy: string = 'month';
  activeTab: TabId = 'overview';
  tooltip: { show: boolean; x: number; y: number; text: string } = { show: false, x: 0, y: 0, text: '' };

  kpis: KpiCard[] = [];
  revenue: RevenueReport | null = null;
  profit: ProfitReport | null = null;
  staffReport: StaffReport | null = null;
  branch: BranchReport | null = null;
  service: ServiceReport | null = null;
  packageReport: PackageReport | null = null;
  membership: MembershipReport | null = null;
  wallet: WalletReport | null = null;
  inventory: InventoryReport | null = null;
  customer: CustomerReport | null = null;
  growth: GrowthReport | null = null;
  heatmap: HeatmapData | null = null;
  forecast: ForecastData | null = null;
  aiInsights: AiInsight[] = [];

  exporting = false;
  exportFormat: string = 'pdf';
  includeCharts = true;
  exportSections = [
    { id: 'revenue', label: 'Revenue', selected: true },
    { id: 'profit', label: 'Profit', selected: true },
    { id: 'staff', label: 'Staff', selected: true },
    { id: 'branch', label: 'Branch', selected: false },
    { id: 'service', label: 'Service', selected: false },
    { id: 'package', label: 'Package', selected: false },
    { id: 'membership', label: 'Membership', selected: false },
    { id: 'wallet', label: 'Wallet', selected: false },
    { id: 'inventory', label: 'Inventory', selected: false },
    { id: 'customer', label: 'Customer', selected: false },
    { id: 'growth', label: 'Growth', selected: false },
    { id: 'heatmap', label: 'Heatmap', selected: false },
    { id: 'forecast', label: 'Forecast', selected: false },
  ];

  emailRecipients = '';
  emailSubject = 'Business Report';
  emailMessage = '';
  emailFormat = 'pdf';
  emailSending = false;
  emailSent = '';

  scheduleFreq = 'weekly';
  scheduleTime = '08:00';
  scheduling = false;
  schedules: any[] = [];

  tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: '\u2302' },
    { id: 'revenue' as TabId, label: 'Revenue', icon: '$' },
    { id: 'profit' as TabId, label: 'Profit', icon: '%' },
    { id: 'staff' as TabId, label: 'Staff', icon: '\u2605' },
    { id: 'branch' as TabId, label: 'Branch', icon: '\u2302' },
    { id: 'service' as TabId, label: 'Service', icon: '\u2692' },
    { id: 'package' as TabId, label: 'Package', icon: '\u2606' },
    { id: 'membership' as TabId, label: 'Membership', icon: '\u2665' },
    { id: 'wallet' as TabId, label: 'Wallet', icon: '\u2630' },
    { id: 'inventory' as TabId, label: 'Inventory', icon: '\u2693' },
    { id: 'customer' as TabId, label: 'Customer', icon: '\u263A' },
    { id: 'growth' as TabId, label: 'Growth', icon: '\u2191' },
    { id: 'heatmap' as TabId, label: 'Heatmap', icon: '\u25A3' },
    { id: 'forecast' as TabId, label: 'Forecast', icon: '\u25B3' },
    { id: 'export' as TabId, label: 'Export', icon: '\u21E5' },
  ];

  ngOnInit() {
    const d = new Date();
    this.dateTo = d.toISOString().slice(0, 10);
    d.setMonth(d.getMonth() - 1);
    this.dateFrom = d.toISOString().slice(0, 10);
    this.loadAll();
  }

  switchTab(id: TabId) {
    this.activeTab = id;
    if (id === 'overview' && !this.kpis.length) this.loadAll();
    if (id === 'export' && !this.schedules.length) this.loadSchedules();
  }

  loadAll() {
    this.loading = true;
    this.error = '';
    const q = this.buildQuery();

    this.api.getRevenue(q).subscribe({ next: d => this.revenue = d, error: () => {} });
    this.api.getProfit(q).subscribe({ next: d => this.profit = d, error: () => {} });
    this.api.getStaff(q).subscribe({ next: d => this.staffReport = d, error: () => {} });
    this.api.getBranch(q).subscribe({ next: d => this.branch = d, error: () => {} });
    this.api.getService(q).subscribe({ next: d => this.service = d, error: () => {} });
    this.api.getPackage(q).subscribe({ next: d => this.packageReport = d, error: () => {} });
    this.api.getMembership(q).subscribe({ next: d => this.membership = d, error: () => {} });
    this.api.getWallet(q).subscribe({ next: d => this.wallet = d, error: () => {} });
    this.api.getInventory(q).subscribe({ next: d => this.inventory = d, error: () => {} });
    this.api.getCustomer(q).subscribe({ next: d => this.customer = d, error: () => {} });
    this.api.getGrowth(q).subscribe({ next: d => this.growth = d, error: () => {} });
    this.api.getHeatmap(q).subscribe({ next: d => this.heatmap = d, error: () => {} });
    this.api.getForecast(q).subscribe({ next: d => this.forecast = d, error: () => {} });
    this.api.getAiInsights(q).subscribe({
      next: d => { this.aiInsights = d; this.buildKpis(); this.loading = false; },
      error: () => { this.error = 'Enterprise report data unavailable.'; this.loading = false; },
    });
  }

  private buildQuery(): ReportQuery {
    const q: ReportQuery = {};
    if (this.dateFrom) q.from = this.dateFrom;
    if (this.dateTo) q.to = this.dateTo;
    if (this.groupBy) q.groupBy = this.groupBy as any;
    return q;
  }

  private buildKpis() {
    this.kpis = [];
    if (this.revenue) {
      this.kpis.push({ label: 'Total Revenue', value: this.revenue.summary.totalRevenue, isCurrency: true, trend: 'up' });
      this.kpis.push({ label: 'Avg Per Sale', value: this.revenue.summary.averagePerSale, isCurrency: true });
    }
    if (this.profit) {
      this.kpis.push({ label: 'Net Profit', value: this.profit.summary.netProfit, isCurrency: true, color: '#16a34a' });
      this.kpis.push({ label: 'Profit Margin', value: this.profit.summary.profitMargin, isPercentage: true, suffix: '%', color: '#2563eb' });
    }
    if (this.staffReport) {
      this.kpis.push({ label: 'Staff', value: this.staffReport.summary.totalStaff });
      this.kpis.push({ label: 'Staff Revenue', value: this.staffReport.summary.totalRevenue, isCurrency: true });
    }
    if (this.customer) {
      this.kpis.push({ label: 'Total Clients', value: this.customer.summary.totalClients });
      this.kpis.push({ label: 'New Clients', value: this.customer.summary.newClients, trend: 'up', color: '#16a34a' });
    }
    if (this.growth) {
      this.kpis.push({ label: 'Revenue Growth', value: this.growth.summary.revenueGrowth, isPercentage: true, suffix: '%', trend: this.growth.summary.revenueGrowth > 0 ? 'up' : 'down' });
    }
    if (this.inventory) {
      this.kpis.push({ label: 'Low Stock', value: this.inventory.summary.lowStockCount, color: '#dc2626' });
    }
  }

  showTooltip(event: MouseEvent, x: number, y: number, text: string) {
    this.tooltip = { show: true, x, y, text };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  }

  formatKpi(k: KpiCard): string {
    if (k.isCurrency) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(k.value);
    if (k.isPercentage || k.suffix === '%') return k.value + '%';
    return k.value.toLocaleString();
  }

  barH(value: number, data: any[], key: string, maxH: number): number {
    const max = Math.max(...data.map((d: any) => d[key]), 1);
    return (value / max) * maxH;
  }

  sparkline(data: any[], key: string, w: number, h: number): string {
    const max = Math.max(...data.map(d => d[key]), 1);
    return data.map((d, i) => `${(i / (data.length - 1 || 1)) * w},${h - (d[key] / max) * h}`).join(' ');
  }

  pct(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  getHeatValue(di: number, hi: number): number {
    if (!this.heatmap) return 0;
    const cell = this.heatmap.data.find(c => c.day === di && c.hour === hi);
    return cell ? cell.value : 0;
  }

  heatColor(value: number): string {
    if (!this.heatmap || this.heatmap.maxValue === 0) return '#f1f5f9';
    const intensity = value / this.heatmap.maxValue;
    if (intensity === 0) return '#f1f5f9';
    if (intensity < 0.25) return '#fef3c7';
    if (intensity < 0.5) return '#f59e0b';
    if (intensity < 0.75) return '#d97706';
    return '#92400e';
  }

  doExport() {
    this.exporting = true;
    const opts: ExportOptions = {
      format: this.exportFormat as any,
      sections: this.exportSections.filter(s => s.selected).map(s => s.id),
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      includeCharts: this.includeCharts,
    };
    this.api.exportReport(opts).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enterprise-report.${this.exportFormat}`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exporting = false;
      },
      error: () => this.exporting = false,
    });
  }

  sendEmailReport() {
    if (!this.emailRecipients.trim()) return;
    this.emailSending = true;
    this.emailSent = '';
    const config: EmailReportConfig = {
      recipients: this.emailRecipients.split(',').map(s => s.trim()),
      subject: this.emailSubject,
      message: this.emailMessage,
      sections: this.exportSections.filter(s => s.selected).map(s => s.id),
      format: this.emailFormat as any,
    };
    this.api.sendEmail(config).subscribe({
      next: (res) => {
        this.emailSent = res.message;
        this.emailSending = false;
      },
      error: () => { this.emailSending = false; this.emailSent = 'Failed to send email.'; },
    });
  }

  loadSchedules() {
    this.api.getScheduledReports().subscribe({
      next: d => this.schedules = d,
      error: () => {},
    });
  }

  createSchedule() {
    this.scheduling = true;
    const config: EmailReportConfig = {
      recipients: this.emailRecipients.split(',').map(s => s.trim()).filter(Boolean),
      subject: this.emailSubject || 'Scheduled Report',
      message: this.emailMessage,
      sections: this.exportSections.filter(s => s.selected).map(s => s.id),
      format: this.emailFormat as any,
      schedule: { frequency: this.scheduleFreq as any, time: this.scheduleTime, active: true },
    };
    this.api.createSchedule(config).subscribe({
      next: () => { this.scheduling = false; this.loadSchedules(); },
      error: () => this.scheduling = false,
    });
  }

  deleteSchedule(id: string) {
    this.api.deleteSchedule(id).subscribe({
      next: () => this.loadSchedules(),
    });
  }
}
