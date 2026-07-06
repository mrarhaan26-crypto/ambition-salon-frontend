export interface SelfCheckInService {
  verifyIdentity(clientId: string, token: string): Promise<boolean>;
  processSelfCheckIn(clientId: string, appointmentId?: string): Promise<{ success: boolean; token?: string; error?: string }>;
}

export interface KioskService {
  getKioskStatus(): Promise<{ online: boolean; totalCheckIns: number }>;
  processKioskCheckIn(clientName: string, phoneNumber: string): Promise<{ success: boolean; token: string; position: number }>;
}

export interface WhatsAppQueueService {
  sendQueueNotification(phoneNumber: string, message: string): Promise<{ success: boolean }>;
  sendPositionUpdate(phoneNumber: string, position: number, estimatedWait: number): Promise<void>;
  sendReadyNotification(phoneNumber: string, staffName: string): Promise<void>;
}

export interface SmsQueueService {
  sendSms(phoneNumber: string, message: string): Promise<{ success: boolean }>;
  sendPositionUpdate(phoneNumber: string, position: number): Promise<void>;
  sendReadyNotification(phoneNumber: string, counterNumber: number): Promise<void>;
}

export interface DigitalDisplayService {
  updateDisplay(entries: Array<{ token: string; clientName: string; status: string; assignedStaff?: string }>): Promise<void>;
  showCalling(token: string, counterNumber: number): Promise<void>;
  getDisplayConfig(): Promise<{ columns: number; refreshRate: number; showWaitingTime: boolean }>;
}

export interface VoiceCallingService {
  callClient(token: string, clientName: string): Promise<void>;
  recallClient(token: string, clientName: string): Promise<void>;
  getCallHistory(): Promise<Array<{ token: string; calledAt: string; status: string }>>;
}

export interface AiQueueOptimizationService {
  predictWaitTime(queueLength: number, staffAvailable: number, serviceMix: string[]): Promise<{ estimatedWait: number; confidence: number }>;
  suggestStaffAssignment(entryId: string, availableStaff: string[]): Promise<{ staffId: string; score: number; reason: string }[]>;
  optimizeOrder(entries: Array<{ id: string; priority: number; waitingMinutes: number; serviceDuration: number }>): Promise<{ orderedIds: string[]; reason: string }>;
  predictNoShow(entryId: string): Promise<{ risk: 'low' | 'medium' | 'high'; probability: number }>;
}

export const QUEUE_EXTENSION_POINTS = {
  selfCheckIn: null as SelfCheckInService | null,
  kiosk: null as KioskService | null,
  whatsApp: null as WhatsAppQueueService | null,
  sms: null as SmsQueueService | null,
  digitalDisplay: null as DigitalDisplayService | null,
  voiceCalling: null as VoiceCallingService | null,
  aiOptimization: null as AiQueueOptimizationService | null,
};
