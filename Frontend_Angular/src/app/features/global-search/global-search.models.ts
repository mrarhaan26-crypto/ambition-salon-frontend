export interface GlobalSearchResult {
  query: string;
  filters: { branchId: string | null };
  results: {
    clients: SearchClient[];
    bookings: SearchBooking[];
    staff: SearchStaff[];
    salons: SearchSalon[];
    branches: SearchBranch[];
    waitlist: SearchWaitlist[];
    walkIns: SearchWalkIn[];
  };
  totalCount: number;
}

export interface SearchClient {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  totalVisits: number;
  totalSpend: number;
}

export interface SearchBooking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: number;
  branchId: string;
  client: { id: string; fullName: string } | null;
  staff: { id: string; fullName: string } | null;
}

export interface SearchStaff {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface SearchSalon {
  id: string;
  name: string;
  ownerId: string;
}

export interface SearchBranch {
  id: string;
  name: string;
  city: string | null;
  salonId: string;
}

export interface SearchWaitlist {
  id: string;
  serviceName: string | null;
  status: string;
  requestedDate: string;
  branchId: string;
  client: { id: string; fullName: string } | null;
  staff: { id: string; fullName: string } | null;
}

export interface SearchWalkIn {
  id: string;
  customerName: string | null;
  phone: string | null;
  serviceName: string | null;
  status: string;
  queueNumber: number;
  branchId: string;
  client: { id: string; fullName: string } | null;
}
