import { Injectable } from '@angular/core';
import type { ConflictReport, ConflictItem, ValidationContext, ClientRestriction } from './calendar-conflict.models';
import { addConflict, createEmptyConflictReport } from './calendar-conflict.models';

@Injectable({ providedIn: 'root' })
export class ClientConflictService {
  private clientAppointments = new Map<string, { startTime: string; endTime: string; id: string }[]>();
  private clientRestrictions = new Map<string, ClientRestriction>();

  setClientAppointments(clientId: string, appointments: { startTime: string; endTime: string; id: string }[]): void {
    this.clientAppointments.set(clientId, appointments);
  }

  setAllClientAppointments(indexed: Map<string, { startTime: string; endTime: string; id: string }[]>): void {
    this.clientAppointments = indexed;
  }

  setClientRestriction(clientId: string, restriction: ClientRestriction): void {
    this.clientRestrictions.set(clientId, restriction);
  }

  clearCache(): void {
    this.clientAppointments.clear();
    this.clientRestrictions.clear();
  }

  validate(ctx: ValidationContext): ConflictReport {
    const report = createEmptyConflictReport();
    if (!ctx.clientId) return report;

    this.checkClientOverlap(ctx, report);
    this.checkClientDuplicate(ctx, report);
    this.checkClientServiceOverlap(ctx, report);
    this.checkVipPriority(ctx, report);
    this.checkMembershipRestriction(ctx, report);
    this.checkPackageRestriction(ctx, report);

    return report;
  }

  checkClientOverlap(ctx: ValidationContext, report: ConflictReport): void {
    const booked = this.clientAppointments.get(ctx.clientId) || [];
    for (const apt of booked) {
      if (ctx.appointmentId && apt.id === ctx.appointmentId) continue;
      if (this.intervalsOverlap(ctx.startTime, ctx.endTime, apt.startTime, apt.endTime)) {
        addConflict(report, {
          type: 'client_overlap',
          severity: 'error',
          category: 'client',
          message: `Client already has an appointment during this time`,
          details: `Overlaps with: ${this.formatTime(apt.startTime)} - ${this.formatTime(apt.endTime)}`,
          conflictingAppointmentId: apt.id,
          conflictingClientId: ctx.clientId,
          canOverride: true,
          overrideRole: 'manager',
        });
      }
    }
  }

  checkClientDuplicate(ctx: ValidationContext, report: ConflictReport): void {
    if (!ctx.appointmentId) return;
    const booked = this.clientAppointments.get(ctx.clientId) || [];
    for (const apt of booked) {
      if (apt.id === ctx.appointmentId) continue;
      if (apt.startTime === ctx.startTime || apt.endTime === ctx.endTime) {
        addConflict(report, {
          type: 'client_duplicate',
          severity: 'warning',
          category: 'client',
          message: `Client has another appointment at this time`,
          details: `Duplicate time slot detected`,
          conflictingAppointmentId: apt.id,
          conflictingClientId: ctx.clientId,
          canOverride: true,
          overrideRole: 'manager',
        });
      }
    }
  }

  checkClientServiceOverlap(ctx: ValidationContext, report: ConflictReport): void {
    if (!ctx.services || ctx.services.length === 0) return;
    const booked = this.clientAppointments.get(ctx.clientId) || [];
    const newServiceNames = ctx.services.map(s => s.name.toLowerCase());
    for (const apt of booked) {
      if (ctx.appointmentId && apt.id === ctx.appointmentId) continue;
      if (!this.intervalsOverlap(ctx.startTime, ctx.endTime, apt.startTime, apt.endTime)) continue;
      if (this.hasServiceOverlap(apt, newServiceNames)) {
        addConflict(report, {
          type: 'client_service_overlap',
          severity: 'warning',
          category: 'client',
          message: `Client has overlapping services`,
          details: `Client already booked for a related service at this time`,
          conflictingAppointmentId: apt.id,
          conflictingClientId: ctx.clientId,
          canOverride: true,
          overrideRole: 'manager',
        });
      }
    }
  }

  checkVipPriority(ctx: ValidationContext, report: ConflictReport): void {
    if (!ctx.isVIP) return;
    const booked = this.clientAppointments.get(ctx.clientId) || [];
    for (const apt of booked) {
      if (ctx.appointmentId && apt.id === ctx.appointmentId) continue;
      if (this.intervalsOverlap(ctx.startTime, ctx.endTime, apt.startTime, apt.endTime)) {
        addConflict(report, {
          type: 'client_vip_priority',
          severity: 'info',
          category: 'client',
          message: `VIP client has priority scheduling`,
          details: `Existing appointment may need to be adjusted for VIP priority`,
          conflictingAppointmentId: apt.id,
          conflictingClientId: ctx.clientId,
          canOverride: false,
          overrideRole: undefined,
        });
      }
    }
  }

  checkMembershipRestriction(ctx: ValidationContext, report: ConflictReport): void {
    if (!ctx.membershipTier) return;
    const restriction = this.getRestrictionForClient(ctx.clientId!, 'membership');
    if (!restriction) return;

    if (restriction.maxBookingsPerDay > 0) {
      const todayCount = this.getTodayBookingCount(ctx.clientId!);
      if (todayCount >= restriction.maxBookingsPerDay) {
        addConflict(report, {
          type: 'client_membership',
          severity: 'error',
          category: 'client',
          message: `Membership limit reached for today`,
          details: `Maximum ${restriction.maxBookingsPerDay} bookings per day allowed`,
          conflictingClientId: ctx.clientId,
          canOverride: true,
          overrideRole: 'manager',
        });
      }
    }

    if (restriction.restrictedDays.length > 0) {
      const dayOfWeek = new Date(ctx.startTime).getDay();
      if (restriction.restrictedDays.includes(dayOfWeek)) {
        addConflict(report, {
          type: 'client_membership',
          severity: 'error',
          category: 'client',
          message: `Membership restricts booking on this day`,
          details: `This membership tier does not allow bookings on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]}`,
          conflictingClientId: ctx.clientId,
          canOverride: true,
          overrideRole: 'manager',
        });
      }
    }
  }

  checkPackageRestriction(ctx: ValidationContext, report: ConflictReport): void {
    if (!ctx.packageIds || ctx.packageIds.length === 0) return;
    for (const pkgId of ctx.packageIds) {
      const restriction = this.clientRestrictions.get(pkgId);
      if (!restriction) continue;

      if (restriction.maxBookingsPerWeek > 0) {
        const weekCount = this.getWeekBookingCount(ctx.clientId!);
        if (weekCount >= restriction.maxBookingsPerWeek) {
          addConflict(report, {
            type: 'client_package',
            severity: 'error',
            category: 'client',
            message: `Package booking limit reached for this week`,
            details: `Maximum ${restriction.maxBookingsPerWeek} bookings per week allowed for this package`,
            conflictingClientId: ctx.clientId,
            canOverride: true,
            overrideRole: 'manager',
          });
        }
      }
    }
  }

  private getRestrictionForClient(clientId: string, type: 'membership' | 'package'): ClientRestriction | null {
    for (const [, restriction] of this.clientRestrictions) {
      if (restriction.type === type) return restriction;
    }
    return null;
  }

  private getTodayBookingCount(clientId: string): number {
    const booked = this.clientAppointments.get(clientId) || [];
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayEnd = todayStart + 86400000;
    return booked.filter(a => {
      const s = new Date(a.startTime).getTime();
      return s >= todayStart && s < todayEnd;
    }).length;
  }

  private getWeekBookingCount(clientId: string): number {
    const booked = this.clientAppointments.get(clientId) || [];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    return booked.filter(a => {
      const s = new Date(a.startTime).getTime();
      return s >= weekStart.getTime() && s < weekEnd.getTime();
    }).length;
  }

  private hasServiceOverlap(apt: { startTime: string; endTime: string; id: string }, newServiceNames: string[]): boolean {
    return true;
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
}
