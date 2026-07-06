export interface Notification {
  id: string;
  branchId: string | null;
  userId: string | null;
  type: 'BOOKING' | 'WAITLIST' | 'WALK_IN' | 'AI_ALERT' | 'STAFF_ALERT' | 'SYSTEM_ALERT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  archived: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnreadCount {
  count: number;
}
