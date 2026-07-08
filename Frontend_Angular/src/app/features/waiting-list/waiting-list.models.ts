export interface WaitingEntry {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  staffPreference: string;
  partySize: number;
  notes: string;
  status: 'WAITING' | 'CALLED' | 'SERVED' | 'CANCELLED';
  position: number;
  createdAt: string;
  calledAt: string | null;
}
