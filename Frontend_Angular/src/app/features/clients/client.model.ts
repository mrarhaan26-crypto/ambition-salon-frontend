export interface Client {
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
}

export interface PaginatedClientsResponse {
  items: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClientFormSubmission {
  id: string;
  clientId: string;
  formId: string;
  answers?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  form: { id: string; name: string; description?: string | null; isActive: boolean };
}

export interface ClientBookingSummary {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  staff?: { fullName: string } | null;
  services?: { name: string }[];
  totalAmount?: number;
}

export function getClientAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function isBirthdayThisMonth(dob: string | null | undefined): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  const today = new Date();
  return birth.getMonth() === today.getMonth();
}
