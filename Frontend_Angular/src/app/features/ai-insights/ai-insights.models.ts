export interface AiInsightsResponse {
  generatedAt: string;
  filters: { branchId: string | null; from: string | null; to: string | null };
  summary: {
    healthScore: number;
    healthLabel: string;
    activeRisks: number;
    opportunities: number;
  };
  insights: AiInsightItem[];
}

export interface AiInsightItem {
  category: string;
  label?: string;
  value?: number;
  details?: any;
  priority?: number;
  factors?: string[];
  id?: string;
  type?: string;
  severity?: string;
  title?: string;
  message?: string;
  suggestedAction?: string;
}

export interface BusinessHealth {
  score: number;
  label: string;
  insights: BusinessHealthInsight[];
}

export interface BusinessHealthInsight {
  category: string;
  label: string;
  value: number;
  details: {
    score: number;
    label: string;
    bookingGrowth: number;
    revenueGrowth: number;
    returnRate: number;
    cancellationRate: number;
    noShowRate: number;
    totalBookings: number;
    revenue: number;
  };
  priority: number;
  factors: string[];
}

export interface RiskAlert {
  id: string;
  category: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  value: number;
  priority: number;
  suggestedAction: string;
}

export interface Opportunity {
  id: string;
  category: string;
  type: string;
  title: string;
  message: string;
  value: number;
  priority: number;
  details: any;
}
