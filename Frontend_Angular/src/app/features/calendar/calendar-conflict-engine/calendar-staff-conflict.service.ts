import { Injectable } from '@angular/core';
import type { ConflictReport, ConflictItem, ValidationContext, StaffSchedule, StaffScheduleBlock } from './calendar-conflict.models';
import { addConflict, createEmptyConflictReport } from './calendar-conflict.models';
import { BUSINESS_HOURS_DEFAULT } from './calendar-conflict.models';

@Injectable({ providedIn: 'root' })
export class StaffConflictService {
  private schedules = new Map<string, StaffSchedule>();
  private appointments: Map<string, { startTime: string; endTime: string; id: string }[]> = new Map();

  setSchedule(staffId: string, schedule: StaffSchedule): void {
    this.schedules.set(staffId, schedule);
  }

  setAppointments(staffId: string, appointments: { startTime: string; endTime: string; id: string }[]): void {
    this.appointments.set(staffId, appointments);
  }

  setAllAppointments(indexed: Map<string, { startTime: string; endTime: string; id: string }[]>): void {
    this.appointments = indexed;
  }

  clearCache(): void {
    this.schedules.clear();
    this.appointments.clear();
  }

  validate(ctx: ValidationContext): ConflictReport {
    const report = createEmptyConflictReport();
    if (!ctx.staffId) return report;

    this.checkStaffOverlap(ctx, report);
    this.checkStaffDuplicate(ctx, report);
    this.checkStaffBusy(ctx, report);
    this.checkWorkingHours(ctx, report);
    this.checkBreakOverlap(ctx, report);
    this.checkLeaveOverlap(ctx, report);
    this.checkHolidayOverlap(ctx, report);
    this.checkTrainingBlock(ctx, report);
    this.checkMeetingBlock(ctx, report);
    this.checkEmergencyBlock(ctx, report);

    return report;
  }

  checkStaffOverlap(ctx: ValidationContext, report: ConflictReport): void {
    const booked = this.appointments.get(ctx.staffId) || [];
    for (const apt of booked) {
      if (ctx.appointmentId && apt.id === ctx.appointmentId) continue;
      if (this.intervalsOverlap(ctx.startTime, ctx.endTime, apt.startTime, apt.endTime)) {
        addConflict(report, {
          type: 'staff_overlap',
          severity: 'error',
          category: 'staff',
          message: `Staff is already booked during this time`,
          details: `Overlaps with appointment at ${this.formatTime(apt.startTime)} - ${this.formatTime(apt.endTime)}`,
          conflictingAppointmentId: apt.id,
          conflictingStaffId: ctx.staffId,
          canOverride: true,
          overrideRole: 'manager',
        });
      }
    }
  }

  checkStaffDuplicate(ctx: ValidationContext, report: ConflictReport): void {
    if (!ctx.appointmentId) return;
    const booked = this.appointments.get(ctx.staffId) || [];
    for (const apt of booked) {
      if (apt.id === ctx.appointmentId) continue;
      if (apt.startTime === ctx.startTime && apt.endTime === ctx.endTime) {
        addConflict(report, {
          type: 'staff_duplicate',
          severity: 'warning',
          category: 'staff',
          message: `Duplicate time slot detected`,
          details: `Another appointment exists at the exact same time`,
          conflictingAppointmentId: apt.id,
          conflictingStaffId: ctx.staffId,
          canOverride: true,
          overrideRole: 'manager',
        });
      }
    }
  }

  checkStaffBusy(ctx: ValidationContext, report: ConflictReport): void {
    const block = this.getScheduleBlockForTime(ctx.staffId, ctx.startTime);
    if (block && (block.type === 'TRAINING' || block.type === 'MEETING' || block.type === 'EMERGENCY')) {
      addConflict(report, {
        type: 'staff_busy',
        severity: 'error',
        category: 'staff',
        message: `Staff is unavailable during this time`,
        details: block.label ? `Staff has: ${block.label}` : `Staff is marked as ${block.type}`,
        conflictingStaffId: ctx.staffId,
        canOverride: true,
        overrideRole: 'owner',
      });
    }
  }

  checkWorkingHours(ctx: ValidationContext, report: ConflictReport): void {
    const startDate = new Date(ctx.startTime);
    const endDate = new Date(ctx.endTime);
    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const endHour = endDate.getHours() + endDate.getMinutes() / 60;

    if (startHour < BUSINESS_HOURS_DEFAULT.start || endHour > BUSINESS_HOURS_DEFAULT.end) {
      addConflict(report, {
        type: 'staff_working_hours',
        severity: 'warning',
        category: 'staff',
        message: `Outside business hours (${BUSINESS_HOURS_DEFAULT.start}:00 - ${BUSINESS_HOURS_DEFAULT.end}:00)`,
        details: `Scheduled time falls outside standard business hours`,
        conflictingStaffId: ctx.staffId,
        canOverride: true,
        overrideRole: 'manager',
      });
    }
  }

  checkBreakOverlap(ctx: ValidationContext, report: ConflictReport): void {
    const block = this.getScheduleBlockForTime(ctx.staffId, ctx.startTime);
    if (block && (block.type === 'BREAK' || block.type === 'LUNCH')) {
      addConflict(report, {
        type: block.type === 'LUNCH' ? 'staff_lunch' : 'staff_break',
        severity: 'error',
        category: 'staff',
        message: block.type === 'LUNCH' ? `Staff is on lunch break` : `Staff is on break`,
        details: `Break time: ${this.formatTime(block.startTime)} - ${this.formatTime(block.endTime)}`,
        conflictingStaffId: ctx.staffId,
        canOverride: true,
        overrideRole: 'manager',
      });
    }
  }

  checkLeaveOverlap(ctx: ValidationContext, report: ConflictReport): void {
    const block = this.getScheduleBlockForTime(ctx.staffId, ctx.startTime);
    if (block && block.type === 'LEAVE') {
      addConflict(report, {
        type: 'staff_leave',
        severity: 'error',
        category: 'staff',
        message: `Staff is on leave`,
        details: `Leave period: ${this.formatDate(block.startTime)} - ${this.formatDate(block.endTime)}`,
        conflictingStaffId: ctx.staffId,
        canOverride: true,
        overrideRole: 'owner',
      });
    }
  }

  checkHolidayOverlap(ctx: ValidationContext, report: ConflictReport): void {
    const block = this.getScheduleBlockForTime(ctx.staffId, ctx.startTime);
    if (block && block.type === 'HOLIDAY') {
      addConflict(report, {
        type: 'staff_holiday',
        severity: 'error',
        category: 'staff',
        message: `Staff is on holiday`,
        details: `Holiday period: ${this.formatDate(block.startTime)} - ${this.formatDate(block.endTime)}`,
        conflictingStaffId: ctx.staffId,
        canOverride: true,
        overrideRole: 'owner',
      });
    }
  }

  checkTrainingBlock(ctx: ValidationContext, report: ConflictReport): void {
    const block = this.getScheduleBlockForTime(ctx.staffId, ctx.startTime);
    if (block && block.type === 'TRAINING') {
      addConflict(report, {
        type: 'staff_training',
        severity: 'error',
        category: 'staff',
        message: `Staff is in training`,
        details: `Training: ${block.label || 'Scheduled training session'}`,
        conflictingStaffId: ctx.staffId,
        canOverride: true,
        overrideRole: 'manager',
      });
    }
  }

  checkMeetingBlock(ctx: ValidationContext, report: ConflictReport): void {
    const block = this.getScheduleBlockForTime(ctx.staffId, ctx.startTime);
    if (block && block.type === 'MEETING') {
      addConflict(report, {
        type: 'staff_meeting',
        severity: 'warning',
        category: 'staff',
        message: `Staff has a meeting`,
        details: `Meeting: ${block.label || 'Scheduled meeting'}`,
        conflictingStaffId: ctx.staffId,
        canOverride: true,
        overrideRole: 'manager',
      });
    }
  }

  checkEmergencyBlock(ctx: ValidationContext, report: ConflictReport): void {
    const block = this.getScheduleBlockForTime(ctx.staffId, ctx.startTime);
    if (block && block.type === 'EMERGENCY') {
      addConflict(report, {
        type: 'staff_emergency',
        severity: 'error',
        category: 'staff',
        message: `Staff has an emergency block`,
        details: `Emergency: ${block.label || 'Staff is unavailable due to emergency'}`,
        conflictingStaffId: ctx.staffId,
        canOverride: true,
        overrideRole: 'owner',
      });
    }
  }

  getScheduleBlockForTime(staffId: string, time: string): StaffScheduleBlock | null {
    const schedule = this.schedules.get(staffId);
    if (!schedule) return null;
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

  private intervalsOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
    const a = new Date(s1).getTime();
    const b = new Date(e1).getTime();
    const c = new Date(s2).getTime();
    const d = new Date(e2).getTime();
    return a < d && c < b;
  }

  private formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  private formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  }
}
