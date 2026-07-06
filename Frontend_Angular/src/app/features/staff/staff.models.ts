export interface Staff {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  specialization: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}
