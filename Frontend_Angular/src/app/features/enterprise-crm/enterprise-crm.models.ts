export interface CrmClient {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  loyaltyPoints: number;
  walletBalance: number;
  totalVisits: number;
  totalSpend: number;
  lastVisitAt?: string | null;
  createdAt: string;
  avatarUrl?: string | null;
  tags?: string[];
  leadSource?: string | null;
  marketingConsent: boolean;
  riskScore?: number | null;
  segment?: string | null;
  isVip: boolean;
  isBlacklisted: boolean;
  referralCode?: string | null;
  referredBy?: string | null;
}

export interface MedicalNote {
  id: string;
  clientId: string;
  condition?: string | null;
  notes?: string | null;
  recordedAt: string;
  recordedBy?: string | null;
}

export interface Allergy {
  id: string;
  clientId: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction?: string | null;
  recordedAt: string;
}

export interface SkinType {
  id: string;
  clientId: string;
  skinType: string;
  concerns?: string | null;
  notes?: string | null;
  assessedAt: string;
  assessedBy?: string | null;
}

export interface HairType {
  id: string;
  clientId: string;
  hairType: string;
  texture?: string | null;
  porosity?: string | null;
  concerns?: string | null;
  notes?: string | null;
  assessedAt: string;
  assessedBy?: string | null;
}

export interface CustomerImage {
  id: string;
  clientId: string;
  imageUrl: string;
  caption?: string | null;
  category?: string | null;
  uploadedAt: string;
}

export interface VisitTimelineEntry {
  id: string;
  clientId: string;
  type: 'booking' | 'sale' | 'note' | 'form' | 'wallet' | 'loyalty' | 'task' | 'communication';
  title: string;
  description?: string | null;
  date: string;
  metadata?: Record<string, unknown> | null;
}

export interface FamilyMember {
  id: string;
  clientId: string;
  fullName: string;
  relationship: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
}

export interface CommunicationRecord {
  id: string;
  clientId: string;
  type: 'whatsapp' | 'email' | 'sms' | 'call';
  direction: 'outbound' | 'inbound';
  subject?: string | null;
  message?: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  sentAt: string;
  readAt?: string | null;
  templateId?: string | null;
  attachmentUrl?: string | null;
}

export interface ReferralRecord {
  id: string;
  referrerClientId: string;
  referrerName: string;
  referredClientId?: string | null;
  referredName?: string | null;
  referredPhone?: string | null;
  code: string;
  status: 'pending' | 'converted' | 'rewarded' | 'expired';
  rewardType?: string | null;
  rewardValue?: number | null;
  createdAt: string;
  convertedAt?: string | null;
  notes?: string | null;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  criteria?: Record<string, unknown> | null;
  clientCount: number;
  avgSpend: number;
  isActive: boolean;
  createdAt: string;
}

export interface FollowUpTask {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface AiSuggestion {
  id: string;
  clientId: string;
  type: 'upsell' | 'retention' | 'reengagement' | 'birthday' | 'anniversary' | 'churn_risk' | 'personalization';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  isDismissed: boolean;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  clientId: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category?: string | null;
  notes?: string | null;
  uploadedAt: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
  totalRows: number;
}

export interface ExportPayload {
  clientIds?: string[];
  includeFields: string[];
  format: 'csv' | 'excel' | 'pdf';
  includeImages: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface CrmDashboardSummary {
  totalClients: number;
  newClientsThisMonth: number;
  activeClients: number;
  churnedClients: number;
  vipClients: number;
  blacklistedClients: number;
  highRiskClients: number;
  birthdaysThisMonth: number;
  anniversaryThisMonth: number;
  unreadFollowUps: number;
  pendingReferrals: number;
  averageRiskScore: number;
  segmentsCount: number;
}

export interface CrmPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
