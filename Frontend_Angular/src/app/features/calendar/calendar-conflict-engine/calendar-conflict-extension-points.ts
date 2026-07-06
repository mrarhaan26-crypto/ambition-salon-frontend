import type { ConflictReport, ValidationContext } from './calendar-conflict.models';

export interface AiConflictPrediction {
  predictConflictRisk(appointmentId: string, proposedStart: string, proposedEnd: string): Promise<{
    riskScore: number;
    predictedConflicts: string[];
    confidence: number;
  }>;
}

export interface RevenueImpactService {
  calculateRevenueImpact(appointmentId: string, newStart: string, newEnd: string): Promise<{
    originalRevenue: number;
    projectedRevenue: number;
    difference: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
}

export interface StaffSuggestionService {
  suggestAlternativeStaff(staffId: string, startTime: string, endTime: string, serviceIds: string[]): Promise<{
    suggestions: Array<{
      staffId: string;
      staffName: string;
      matchScore: number;
      reason: string;
    }>;
  }>;
}

export interface AlternativeSlotService {
  findAlternativeSlots(context: ValidationContext, maxResults?: number): Promise<{
    slots: Array<{
      startTime: string;
      endTime: string;
      staffId: string;
      score: number;
    }>;
  }>;
}

export interface SmartRescheduleService {
  findBestReschedule(appointmentId: string, preferredDates: string[]): Promise<{
    suggestions: Array<{
      startTime: string;
      staffId: string;
      reason: string;
      optimizationScore: number;
    }>;
  }>;
}

export interface PredictiveAvailabilityService {
  getPredictedAvailability(staffId: string, date: string): Promise<{
    slots: Array<{
      startTime: string;
      endTime: string;
      probability: number;
    }>;
  }>;
}

export interface BatchValidationService {
  validateBatch(contexts: ValidationContext[]): Promise<Map<string, ConflictReport>>;
}

export const CONFLICT_EXTENSION_POINTS = {
  aiPrediction: null as AiConflictPrediction | null,
  revenueImpact: null as RevenueImpactService | null,
  staffSuggestion: null as StaffSuggestionService | null,
  alternativeSlot: null as AlternativeSlotService | null,
  smartReschedule: null as SmartRescheduleService | null,
  predictiveAvailability: null as PredictiveAvailabilityService | null,
  batchValidation: null as BatchValidationService | null,
};
