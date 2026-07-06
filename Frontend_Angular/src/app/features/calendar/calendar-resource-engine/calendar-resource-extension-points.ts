export interface AiResourceAssignmentService {
  suggestResourceForAppointment(staffId: string, serviceId: string, startTime: string, endTime: string): Promise<{
    resourceId: string;
    resourceName: string;
    matchScore: number;
    reason: string;
  }[]>;
}

export interface AutoAllocationService {
  autoAssignResource(staffId: string, startTime: string, endTime: string, preferredType?: string): Promise<{
    resourceId: string;
    success: boolean;
  }>;
  autoReleaseUnused(appointmentId: string): Promise<number>;
}

export interface ResourcePredictionService {
  predictDemand(resourceType: string, date: string): Promise<{
    predictedUsage: number;
    confidence: number;
    peakHours: number[];
  }>;
  predictShortage(date: string): Promise<{
    resourceIds: string[];
    riskLevel: 'low' | 'medium' | 'high';
    suggestedDuration: number;
  }[]>;
}

export interface MaintenancePredictionService {
  predictNextMaintenance(resourceId: string): Promise<{
    predictedDate: string;
    maintenanceType: string;
    confidence: number;
    reason: string;
  }>;
  getMaintenanceSchedule(resourceId: string): Promise<{
    schedule: { type: string; dueDate: string; priority: 'low' | 'medium' | 'high' }[];
  }>;
}

export interface RevenueOptimizationService {
  calculateRevenuePerResource(resourceId: string, periodStart: string, periodEnd: string): Promise<{
    totalRevenue: number;
    revenuePerHour: number;
    utilizationCorrelation: number;
    topServices: { serviceName: string; revenue: number; count: number }[];
  }>;
}

export interface CapacityPlanningService {
  getCapacityReport(branchId: string, date: string): Promise<{
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    peakDemand: number;
    recommendedResources: { type: string; count: number; priority: 'low' | 'medium' | 'high' }[];
  }>;
}

export const RESOURCE_EXTENSION_POINTS = {
  aiAssignment: null as AiResourceAssignmentService | null,
  autoAllocation: null as AutoAllocationService | null,
  resourcePrediction: null as ResourcePredictionService | null,
  maintenancePrediction: null as MaintenancePredictionService | null,
  revenueOptimization: null as RevenueOptimizationService | null,
  capacityPlanning: null as CapacityPlanningService | null,
};
