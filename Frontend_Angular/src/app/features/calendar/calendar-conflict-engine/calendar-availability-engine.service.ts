import { Injectable } from '@angular/core';
import type { StaffSchedule, StaffScheduleBlock } from './calendar-conflict.models';

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'BUSY'
  | 'BREAK'
  | 'LUNCH'
  | 'LEAVE'
  | 'HOLIDAY'
  | 'TRAINING'
  | 'MEETING'
  | 'EMERGENCY'
  | 'OFF_DUTY'
  | 'FULLY_BOOKED'
  | 'WORKING'
  | 'UNAVAILABLE';

export interface StaffAvailabilityResult {
  staffId: string;
  status: AvailabilityStatus;
  label: string;
  available: boolean;
  nextAvailableTime?: string;
  currentActivity?: string;
  busyUntil?: string;
  breakUntil?: string;
}

export interface AvailabilityQuery {
  staffIds: string[];
  time: string;
  durationMinutes?: number;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityEngineService {
  private schedules = new Map<string, StaffSchedule>();
  private appointmentCounts = new Map<string, number>();
  private readonly MAX_BOOKINGS_PER_DAY = 8;

  setSchedule(staffId: string, schedule: StaffSchedule): void {
    this.schedules.set(staffId, schedule);
  }

  setAppointmentCount(staffId: string, count: number): void {
    this.appointmentCounts.set(staffId, count);
  }

  clearCache(): void {
    this.schedules.clear();
    this.appointmentCounts.clear();
  }

  checkAvailability(staffId: string, time: string): StaffAvailabilityResult {
    const schedule = this.schedules.get(staffId);
    if (!schedule) {
      return {
        staffId,
        status: 'UNAVAILABLE',
        label: 'Unavailable',
        available: false,
        currentActivity: 'No schedule found',
      };
    }

    const block = this.getBlockForTime(schedule, time);
    if (!block) {
      return {
        staffId,
        status: 'UNAVAILABLE',
        label: 'Unavailable',
        available: false,
        currentActivity: 'Outside scheduled hours',
      };
    }

    const baseResult: StaffAvailabilityResult = {
      staffId,
      status: block.type as AvailabilityStatus,
      label: this.getStatusLabel(block.type),
      available: false,
    };

    switch (block.type) {
      case 'WORKING':
        return this.checkWorkingAvailability(staffId, time, block, baseResult);
      case 'BREAK':
        return { ...baseResult, currentActivity: 'On break', breakUntil: block.endTime };
      case 'LUNCH':
        return { ...baseResult, currentActivity: 'On lunch break', breakUntil: block.endTime };
      case 'LEAVE':
        return { ...baseResult, currentActivity: 'On leave' };
      case 'HOLIDAY':
        return { ...baseResult, currentActivity: 'On holiday' };
      case 'TRAINING':
        return { ...baseResult, currentActivity: block.label || 'In training' };
      case 'MEETING':
        return { ...baseResult, currentActivity: block.label || 'In meeting', busyUntil: block.endTime };
      case 'EMERGENCY':
        return { ...baseResult, currentActivity: block.label || 'Emergency' };
      case 'OFF_DUTY':
        return { ...baseResult, currentActivity: 'Off duty' };
      default:
        return { ...baseResult, available: false };
    }
  }

  checkAvailabilityBatch(query: AvailabilityQuery): StaffAvailabilityResult[] {
    return query.staffIds.map(id => this.checkAvailability(id, query.time));
  }

  getAvailableStaff(staffIds: string[], time: string, durationMinutes?: number): StaffAvailabilityResult[] {
    return staffIds
      .map(id => this.checkAvailability(id, time))
      .filter(r => {
        if (!r.available) return false;
        if (durationMinutes && r.busyUntil) {
          const busyUntilMs = new Date(r.busyUntil).getTime();
          const requestedEndMs = new Date(time).getTime() + durationMinutes * 60000;
          if (requestedEndMs > busyUntilMs) return false;
        }
        return true;
      });
  }

  getStatusForTime(staffId: string, time: string): AvailabilityStatus {
    const result = this.checkAvailability(staffId, time);
    return result.status;
  }

  isAvailable(staffId: string, time: string): boolean {
    return this.checkAvailability(staffId, time).available;
  }

  private checkWorkingAvailability(staffId: string, _time: string, _block: StaffScheduleBlock, base: StaffAvailabilityResult): StaffAvailabilityResult {
    const count = this.appointmentCounts.get(staffId) || 0;
    if (count >= this.MAX_BOOKINGS_PER_DAY) {
      return {
        ...base,
        status: 'FULLY_BOOKED',
        label: 'Fully Booked',
        available: false,
        currentActivity: `Already has ${count} appointments today`,
      };
    }
    return {
      ...base,
      available: true,
      status: 'AVAILABLE',
      label: 'Available',
      currentActivity: 'Available for booking',
    };
  }

  private getBlockForTime(schedule: StaffSchedule, time: string): StaffScheduleBlock | null {
    const timeMs = new Date(time).getTime();
    for (const block of schedule.blocks) {
      const startMs = new Date(block.startTime).getTime();
      const endMs = new Date(block.endTime).getTime();
      if (timeMs >= startMs && timeMs < endMs) {
        return block;
      }
    }
    return null;
  }

  private getStatusLabel(type: string): string {
    const labels: Record<string, string> = {
      WORKING: 'Working',
      BREAK: 'Break',
      LUNCH: 'Lunch',
      LEAVE: 'Leave',
      HOLIDAY: 'Holiday',
      TRAINING: 'Training',
      MEETING: 'Meeting',
      EMERGENCY: 'Emergency',
      OFF_DUTY: 'Off Duty',
      UNAVAILABLE: 'Unavailable',
      AVAILABLE: 'Available',
      BUSY: 'Busy',
      FULLY_BOOKED: 'Fully Booked',
    };
    return labels[type] || type;
  }
}
