export interface Client {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  gender?: string;
  city?: string;
  notes?: string;
  loyaltyPoints: number;
  walletBalance: number;
  totalVisits: number;
  totalSpend: number;
  createdAt: string;
}
