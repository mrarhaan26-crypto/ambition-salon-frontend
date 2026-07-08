import { Injectable } from '@angular/core';

export type BookingStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'WAITING' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';

export const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  PENDING: ['CONFIRMED', 'WAITING', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['CHECKED_IN', 'WAITING', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  WAITING: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['PENDING', 'CONFIRMED'],
  NO_SHOW: ['PENDING', 'CONFIRMED'],
  RESCHEDULED: ['CONFIRMED', 'CANCELLED'],
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  WAITING: 'Waiting',
  CHECKED_IN: 'Checked In',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
  RESCHEDULED: 'Rescheduled',
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  DRAFT: '#94A3B8',
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  WAITING: '#F97316',
  CHECKED_IN: '#8B5CF6',
  IN_PROGRESS: '#4F46E5',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
  NO_SHOW: '#6B7280',
  RESCHEDULED: '#EC4899',
};

@Injectable({ providedIn: 'root' })
export class BookingStatusService {

  canTransition(from: BookingStatus, to: BookingStatus): boolean {
    const allowed = STATUS_TRANSITIONS[from];
    return allowed?.includes(to) ?? false;
  }

  getAvailableTransitions(status: BookingStatus): BookingStatus[] {
    return STATUS_TRANSITIONS[status] || [];
  }

  getLabel(status: BookingStatus): string {
    return STATUS_LABELS[status] || status;
  }

  getColor(status: BookingStatus): string {
    return STATUS_COLORS[status] || '#94A3B8';
  }

  isActive(status: BookingStatus): boolean {
    return ['CONFIRMED', 'WAITING', 'CHECKED_IN', 'IN_PROGRESS'].includes(status);
  }

  isCancelledOrNoShow(status: BookingStatus): boolean {
    return ['CANCELLED', 'NO_SHOW'].includes(status);
  }

  canRestore(status: BookingStatus): boolean {
    return ['CANCELLED', 'NO_SHOW'].includes(status);
  }

  canCancel(status: BookingStatus): boolean {
    return !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status);
  }

  canReschedule(status: BookingStatus): boolean {
    return ['PENDING', 'CONFIRMED', 'WAITING', 'CHECKED_IN'].includes(status);
  }

  canCheckIn(status: BookingStatus): boolean {
    return ['CONFIRMED', 'WAITING'].includes(status);
  }

  canStart(status: BookingStatus): boolean {
    return status === 'CHECKED_IN';
  }

  canComplete(status: BookingStatus): boolean {
    return status === 'IN_PROGRESS';
  }
}
