import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ReportQuery, RevenueReport, ProfitReport, StaffReport,
  BranchReport, ServiceReport, PackageReport, MembershipReport,
  WalletReport, InventoryReport, CustomerReport, GrowthReport,
  HeatmapData, ForecastData, ExportOptions, EmailReportConfig,
  AiInsight,
} from './enterprise-reports.models';

@Injectable({ providedIn: 'root' })
export class EnterpriseReportsService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/enterprise-reports';

  getRevenue(query?: ReportQuery): Observable<RevenueReport> {
    return this.http.get<RevenueReport>(`${this.base}/revenue`, { params: query as any });
  }

  getProfit(query?: ReportQuery): Observable<ProfitReport> {
    return this.http.get<ProfitReport>(`${this.base}/profit`, { params: query as any });
  }

  getStaff(query?: ReportQuery): Observable<StaffReport> {
    return this.http.get<StaffReport>(`${this.base}/staff`, { params: query as any });
  }

  getBranch(query?: ReportQuery): Observable<BranchReport> {
    return this.http.get<BranchReport>(`${this.base}/branch`, { params: query as any });
  }

  getService(query?: ReportQuery): Observable<ServiceReport> {
    return this.http.get<ServiceReport>(`${this.base}/service`, { params: query as any });
  }

  getPackage(query?: ReportQuery): Observable<PackageReport> {
    return this.http.get<PackageReport>(`${this.base}/package`, { params: query as any });
  }

  getMembership(query?: ReportQuery): Observable<MembershipReport> {
    return this.http.get<MembershipReport>(`${this.base}/membership`, { params: query as any });
  }

  getWallet(query?: ReportQuery): Observable<WalletReport> {
    return this.http.get<WalletReport>(`${this.base}/wallet`, { params: query as any });
  }

  getInventory(query?: ReportQuery): Observable<InventoryReport> {
    return this.http.get<InventoryReport>(`${this.base}/inventory`, { params: query as any });
  }

  getCustomer(query?: ReportQuery): Observable<CustomerReport> {
    return this.http.get<CustomerReport>(`${this.base}/customer`, { params: query as any });
  }

  getGrowth(query?: ReportQuery): Observable<GrowthReport> {
    return this.http.get<GrowthReport>(`${this.base}/growth`, { params: query as any });
  }

  getHeatmap(query?: ReportQuery): Observable<HeatmapData> {
    return this.http.get<HeatmapData>(`${this.base}/heatmap`, { params: query as any });
  }

  getForecast(query?: ReportQuery): Observable<ForecastData> {
    return this.http.get<ForecastData>(`${this.base}/forecast`, { params: query as any });
  }

  getAiInsights(query?: ReportQuery): Observable<AiInsight[]> {
    return this.http.get<AiInsight[]>(`${this.base}/ai-insights`, { params: query as any });
  }

  exportReport(options: ExportOptions): Observable<Blob> {
    return this.http.post(`${this.base}/export`, options, { responseType: 'blob' });
  }

  sendEmail(config: EmailReportConfig): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/email`, config);
  }

  getScheduledReports(): Observable<ScheduleReportItem[]> {
    return this.http.get<ScheduleReportItem[]>(`${this.base}/schedules`);
  }

  createSchedule(config: EmailReportConfig): Observable<{ success: boolean; id: string }> {
    return this.http.post<{ success: boolean; id: string }>(`${this.base}/schedules`, config);
  }

  deleteSchedule(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/schedules/${id}`);
  }
}

export interface ScheduleReportItem {
  id: string;
  name: string;
  frequency: string;
  recipients: string[];
  format: string;
  sections: string[];
  nextRun: string;
  active: boolean;
}
