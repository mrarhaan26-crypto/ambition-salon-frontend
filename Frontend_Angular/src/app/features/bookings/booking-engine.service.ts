import { Injectable } from '@angular/core';
import type {
  BookingDrawerDraft, BookingDrawerCustomer, BookingDrawerService,
  BookingDrawerProduct, BookingDrawerPackage, BookingDrawerSchedule,
  BookingConflictInfo, BookingFreeSlot, BookingDrawerSummary,
  BookingStep, AlternativeStaff,
} from './booking-drawer.models';
import { EMPTY_DRAFT } from './booking-drawer.models';

const DRAFT_STORAGE_KEY = 'ambition_booking_draft';

export interface ExistingBooking {
  id: string;
  staffId: string;
  startTime: string;
  endTime: string;
  resourceId?: string | null;
  chairId?: string | null;
  roomId?: string | null;
  equipmentId?: string | null;
  cabinId?: string | null;
  clientId?: string;
  status?: string;
}

export interface StaffSchedule {
  staffId: string;
  date: string;
  workingStart: string;
  workingEnd: string;
  breaks: Array<{ start: string; end: string }>;
  isOnLeave: boolean;
}

export interface ResourceSchedule {
  resourceId: string;
  resourceType: 'chair' | 'room' | 'equipment' | 'cabin';
  date: string;
  bookings: Array<{ start: string; end: string }>;
  isClosed: boolean;
}

@Injectable({ providedIn: 'root' })
export class BookingEngineService {

  computeTotalDuration(services: BookingDrawerService[]): number {
    return services.reduce((sum, s) => sum + s.durationMin, 0);
  }

  computeSubtotal(services: BookingDrawerService[]): number {
    return services.reduce((sum, s) => sum + s.price, 0);
  }

  computeDiscountTotal(services: BookingDrawerService[]): number {
    return services.reduce((sum, s) => {
      if (s.discountType === 'percent') return sum + Math.round(s.price * s.discount / 100);
      return sum + s.discount;
    }, 0);
  }

  computeTaxTotal(services: BookingDrawerService[]): number {
    return services.reduce((sum, s) => sum + Math.round(s.price * s.taxRate / 100), 0);
  }

  computeProductsTotal(products: BookingDrawerProduct[]): number {
    return products.reduce((sum, p) => sum + p.totalPrice, 0);
  }

  computePackagesTotal(packages: BookingDrawerPackage[]): number {
    return packages.reduce((sum, p) => sum + p.totalPrice, 0);
  }

  computeSummary(
    services: BookingDrawerService[],
    products: BookingDrawerProduct[],
    packages: BookingDrawerPackage[],
    customer: BookingDrawerCustomer,
    membershipDiscount = 0,
    couponDiscount = 0,
    manualDiscount = 0,
    advancePaid = 0,
    walletUsed = 0,
    giftCardAmount = 0,
    depositAmount = 0,
  ): BookingDrawerSummary {
    const subtotal = this.computeSubtotal(services);
    const discountTotal = this.computeDiscountTotal(services);
    const taxTotal = this.computeTaxTotal(services);
    const commissionTotal = services.reduce((sum, s) => {
      if (s.commissionType === 'percent') return sum + Math.round(s.price * s.commission / 100);
      return sum + s.commission;
    }, 0);
    const productsTotal = this.computeProductsTotal(products);
    const packagesTotal = this.computePackagesTotal(packages);
    const totalDiscounts = discountTotal + membershipDiscount + couponDiscount + manualDiscount;
    const grandTotal = subtotal - totalDiscounts + taxTotal + productsTotal + packagesTotal - walletUsed - giftCardAmount;
    const paidAhead = advancePaid + depositAmount;
    return {
      customerLabel: customer.fullName || 'Not selected',
      serviceCount: services.length,
      totalDuration: this.computeTotalDuration(services),
      subtotal,
      discountTotal,
      taxTotal,
      commissionTotal,
      productsTotal,
      packagesTotal,
      membershipDiscount,
      couponDiscount,
      giftCardAmount,
      manualDiscount,
      depositAmount,
      advancePaid,
      walletUsed,
      grandTotal: Math.max(0, grandTotal),
      balanceDue: Math.max(0, grandTotal - paidAhead),
    };
  }

  canGoNext(step: BookingStep, draft: BookingDrawerDraft): boolean {
    switch (step) {
      case 1: return this.validateStep1(draft.customer).length === 0;
      case 2: return draft.services.length > 0 && draft.services.every(s => !!s.staffId);
      case 3: return !!draft.schedule.date && !!draft.schedule.startTime;
      default: return false;
    }
  }

  canShowSaveActions(step: BookingStep, draft: BookingDrawerDraft): boolean {
    return step === 4 || (!!draft.customer.id && draft.services.length > 0 && !!draft.schedule.date);
  }

  canGoPrev(step: BookingStep): boolean {
    return step > 1;
  }

  validateStep1(customer: BookingDrawerCustomer): string[] {
    const errors: string[] = [];
    if (!customer.fullName.trim()) errors.push('Customer name is required');
    if (!customer.mobile.trim()) errors.push('Mobile number is required');
    else if (!/^[+]?[\d\s()-]{7,15}$/.test(customer.mobile)) errors.push('Invalid mobile number format');
    return errors;
  }

  validateStep2(services: BookingDrawerService[]): string[] {
    const errors: string[] = [];
    if (services.length === 0) errors.push('At least one service is required');
    const staffIds = new Set(services.map(s => s.staffId).filter(Boolean));
    if (staffIds.size > 1) errors.push('All services must be assigned to the same staff member');
    return errors;
  }

  validateStep3(schedule: BookingDrawerSchedule, totalDuration: number): string[] {
    const errors: string[] = [];
    if (!schedule.date) errors.push('Date is required');
    if (!schedule.startTime) errors.push('Start time is required');
    if (schedule.startTime && totalDuration > 0 && schedule.endTime) {
      const start = this.parseTime(schedule.startTime);
      const end = this.parseTime(schedule.endTime);
      if (start >= end) errors.push('End time must be after start time');
    }
    return errors;
  }

  validateStep4(): string[] {
    return [];
  }

  detectConflicts(
    draft: BookingDrawerDraft,
    existingBookings: ExistingBooking[],
  ): BookingConflictInfo[] {
    const conflicts: BookingConflictInfo[] = [];
    if (!draft.schedule.date || !draft.schedule.startTime || !draft.schedule.endTime) return conflicts;
    const newStart = new Date(`${draft.schedule.date}T${draft.schedule.startTime}`);
    const newEnd = new Date(`${draft.schedule.date}T${draft.schedule.endTime}`);
    for (const booking of existingBookings) {
      const bStart = new Date(booking.startTime);
      const bEnd = new Date(booking.endTime);
      const overlaps = newStart < bEnd && newEnd > bStart;
      if (!overlaps) continue;
      if (booking.staffId === draft.schedule.staffId && draft.schedule.staffId) {
        conflicts.push({
          type: 'staff',
          severity: 'error',
          message: `Staff ${draft.schedule.staffName} already has a booking ${bStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-${bEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          staffName: draft.schedule.staffName,
          startTime: booking.startTime,
          endTime: booking.endTime,
        });
      }
      if (draft.schedule.chairId && booking.chairId === draft.schedule.chairId) {
        conflicts.push({
          type: 'chair',
          severity: 'error',
          message: `Chair ${draft.schedule.chairName} is already booked during this time`,
          staffName: draft.schedule.chairName,
          startTime: booking.startTime,
          endTime: booking.endTime,
        });
      }
      if (draft.schedule.roomId && booking.roomId === draft.schedule.roomId) {
        conflicts.push({
          type: 'room',
          severity: 'error',
          message: `Room ${draft.schedule.roomName} is already booked during this time`,
          staffName: draft.schedule.roomName,
          startTime: booking.startTime,
          endTime: booking.endTime,
        });
      }
    }
    return conflicts;
  }

  suggestFreeSlots(
    date: string,
    staffId: string,
    duration: number,
    existingBookings: ExistingBooking[],
    businessStart = 8,
    businessEnd = 20,
  ): BookingFreeSlot[] {
    const slots: BookingFreeSlot[] = [];
    if (!date || !staffId || duration <= 0) return slots;
    const dayStart = new Date(`${date}T${businessStart.toString().padStart(2, '0')}:00:00`);
    const dayEnd = new Date(`${date}T${businessEnd.toString().padStart(2, '0')}:00:00`);
    const existing = existingBookings
      .filter(b => b.staffId === staffId)
      .map(b => ({ start: new Date(b.startTime), end: new Date(b.endTime) }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    let cursor = new Date(dayStart);
    for (const booking of existing) {
      if (cursor >= dayEnd) break;
      const slotEnd = new Date(Math.min(cursor.getTime() + duration * 60000, dayEnd.getTime()));
      if (slotEnd <= booking.start && this.getMinutesBetween(cursor, slotEnd) >= duration) {
        slots.push({
          startTime: this.formatIsoTime(cursor),
          endTime: this.formatIsoTime(slotEnd),
          staffId,
          staffName: '',
          chairId: '',
          chairName: '',
          roomId: '',
          roomName: '',
        });
      }
      cursor = new Date(Math.max(cursor.getTime(), booking.end.getTime()));
    }
    if (cursor < dayEnd) {
      const slotEnd = new Date(Math.min(cursor.getTime() + duration * 60000, dayEnd.getTime()));
      if (this.getMinutesBetween(cursor, slotEnd) >= duration) {
        slots.push({
          startTime: this.formatIsoTime(cursor),
          endTime: this.formatIsoTime(slotEnd),
          staffId,
          staffName: '',
          chairId: '',
          chairName: '',
          roomId: '',
          roomName: '',
        });
      }
    }
    return slots;
  }

  findAlternativeStaff(
    date: string,
    startTime: string,
    endTime: string,
    allStaff: Array<{ id: string; fullName: string; specialization?: string | null; role?: string }>,
    existingBookings: ExistingBooking[],
    preferredStaffId?: string,
  ): AlternativeStaff[] {
    if (!date || !startTime || !endTime || allStaff.length === 0) return [];
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);
    return allStaff.map(staff => {
      const staffBookings = existingBookings.filter(b => b.staffId === staff.id);
      const hasConflict = staffBookings.some(b => {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return newStart < bEnd && newEnd > bStart;
      });
      const isPreferred = staff.id === preferredStaffId;
      return {
        staffId: staff.id,
        staffName: staff.fullName,
        role: staff.role || '',
        specialization: staff.specialization || '',
        available: !hasConflict,
        conflictReason: hasConflict ? 'Has a booking during this time' : undefined,
      };
    }).sort((a, b) => {
      if (a.staffId === preferredStaffId) return -1;
      if (b.staffId === preferredStaffId) return 1;
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return 0;
    });
  }

  getNearestFreeSlotBefore(
    date: string,
    staffId: string,
    targetTime: string,
    duration: number,
    existingBookings: ExistingBooking[],
    businessStart = 8,
  ): BookingFreeSlot | null {
    if (!date || !staffId || !targetTime || duration <= 0) return null;
    const target = this.parseTime(targetTime);
    const dayStart = new Date(`${date}T${businessStart.toString().padStart(2, '0')}:00:00`);
    const existing = existingBookings
      .filter(b => b.staffId === staffId)
      .map(b => ({ start: new Date(b.startTime), end: new Date(b.endTime) }))
      .sort((a, b) => b.start.getTime() - a.start.getTime());
    let cursor = new Date(`${date}T${targetTime}`);
    for (const booking of existing) {
      const gap = this.getMinutesBetween(booking.end, cursor);
      if (gap >= duration) {
        const slotStart = new Date(cursor.getTime() - duration * 60000);
        if (slotStart >= booking.end && slotStart >= dayStart) {
          return {
            startTime: this.formatIsoTime(slotStart),
            endTime: this.formatIsoTime(cursor),
            staffId,
            staffName: '',
            chairId: '',
            chairName: '',
            roomId: '',
            roomName: '',
          };
        }
      }
      if (booking.end <= cursor) {
        cursor = new Date(Math.min(cursor.getTime(), booking.start.getTime()));
      }
    }
    if (this.getMinutesBetween(dayStart, cursor) >= duration) {
      const slotStart = new Date(cursor.getTime() - duration * 60000);
      if (slotStart >= dayStart) {
        return {
          startTime: this.formatIsoTime(slotStart),
          endTime: this.formatIsoTime(cursor),
          staffId,
          staffName: '',
          chairId: '',
          chairName: '',
          roomId: '',
          roomName: '',
        };
      }
    }
    return null;
  }

  getNearestFreeSlotAfter(
    date: string,
    staffId: string,
    targetTime: string,
    duration: number,
    existingBookings: ExistingBooking[],
    businessEnd = 20,
  ): BookingFreeSlot | null {
    if (!date || !staffId || !targetTime || duration <= 0) return null;
    const dayEnd = new Date(`${date}T${businessEnd.toString().padStart(2, '0')}:00:00`);
    const existing = existingBookings
      .filter(b => b.staffId === staffId)
      .map(b => ({ start: new Date(b.startTime), end: new Date(b.endTime) }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    let cursor = new Date(`${date}T${targetTime}`);
    for (const booking of existing) {
      if (cursor >= dayEnd) break;
      if (cursor < booking.start) {
        const gap = this.getMinutesBetween(cursor, booking.start);
        if (gap >= duration) {
          const slotEnd = new Date(cursor.getTime() + duration * 60000);
          if (slotEnd <= booking.start) {
            return {
              startTime: this.formatIsoTime(cursor),
              endTime: this.formatIsoTime(slotEnd),
              staffId,
              staffName: '',
              chairId: '',
              chairName: '',
              roomId: '',
              roomName: '',
            };
          }
        }
      }
      cursor = new Date(Math.max(cursor.getTime(), booking.end.getTime()));
    }
    if (cursor < dayEnd && this.getMinutesBetween(cursor, dayEnd) >= duration) {
      const slotEnd = new Date(cursor.getTime() + duration * 60000);
      if (slotEnd <= dayEnd) {
        return {
          startTime: this.formatIsoTime(cursor),
          endTime: this.formatIsoTime(slotEnd),
          staffId,
          staffName: '',
          chairId: '',
          chairName: '',
          roomId: '',
          roomName: '',
        };
      }
    }
    return null;
  }

  applyGlobalDiscount(services: BookingDrawerService[], discount: number, type: 'percent' | 'fixed'): BookingDrawerService[] {
    return services.map(s => ({ ...s, discount, discountType: type }));
  }

  applyGlobalTax(services: BookingDrawerService[], taxRate: number): BookingDrawerService[] {
    return services.map(s => ({ ...s, taxRate, tax: Math.round(s.price * taxRate / 100) }));
  }

  applyGlobalCommission(services: BookingDrawerService[], commission: number, type: 'percent' | 'fixed'): BookingDrawerService[] {
    return services.map(s => ({ ...s, commission, commissionType: type }));
  }

  applyGlobalBuffer(services: BookingDrawerService[], bufferMin: number): BookingDrawerService[] {
    return services.map(s => ({ ...s, bufferBefore: bufferMin, bufferAfter: bufferMin }));
  }

  computeTotalDurationWithBuffers(services: BookingDrawerService[]): number {
    return services.reduce((sum, s) => sum + s.durationMin + s.bufferBefore + s.bufferAfter, 0);
  }

  computeEndTime(startTime: string, durationMin: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + durationMin;
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  }

  detectExtendedConflicts(
    draft: BookingDrawerDraft,
    existingBookings: ExistingBooking[],
  ): BookingConflictInfo[] {
    const conflicts = this.detectConflicts(draft, existingBookings);
    if (!draft.schedule.date || !draft.schedule.startTime || !draft.schedule.endTime) return conflicts;
    const newStart = new Date(`${draft.schedule.date}T${draft.schedule.startTime}`);
    const newEnd = new Date(`${draft.schedule.date}T${draft.schedule.endTime}`);
    for (const booking of existingBookings) {
      const bStart = new Date(booking.startTime);
      const bEnd = new Date(booking.endTime);
      const overlaps = newStart < bEnd && newEnd > bStart;
      if (!overlaps) continue;
      if (draft.schedule.staffId && booking.staffId === draft.schedule.staffId && booking.clientId) {
        if (!conflicts.some(c => c.type === 'staff')) {
          conflicts.push({
            type: 'double',
            severity: 'error',
            message: `Double booking detected for this staff member`,
            startTime: booking.startTime,
            endTime: booking.endTime,
          });
        }
      }
      if (draft.schedule.chairId && (booking as any).equipmentId === draft.schedule.chairId) {
        conflicts.push({
          type: 'chair',
          severity: 'error',
          message: `Chair is already booked during this time`,
          startTime: booking.startTime,
          endTime: booking.endTime,
        });
      }
    }
    return conflicts;
  }

  findAlternativeChair(
    date: string,
    startTime: string,
    endTime: string,
    allChairs: Array<{ id: string; name: string }>,
    existingBookings: ExistingBooking[],
  ): Array<{ id: string; name: string; available: boolean }> {
    if (!date || !startTime || !endTime) return [];
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);
    return allChairs.map(chair => {
      const hasConflict = existingBookings.some(b => {
        if (b.chairId !== chair.id) return false;
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return newStart < bEnd && newEnd > bStart;
      });
      return { id: chair.id, name: chair.name, available: !hasConflict };
    });
  }

  findAlternativeRoom(
    date: string,
    startTime: string,
    endTime: string,
    allRooms: Array<{ id: string; name: string }>,
    existingBookings: ExistingBooking[],
  ): Array<{ id: string; name: string; available: boolean }> {
    if (!date || !startTime || !endTime) return [];
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);
    return allRooms.map(room => {
      const hasConflict = existingBookings.some(b => {
        if (b.roomId !== room.id) return false;
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return newStart < bEnd && newEnd > bStart;
      });
      return { id: room.id, name: room.name, available: !hasConflict };
    });
  }

  isResourceAvailable(
    resourceId: string,
    resourceType: 'chair' | 'room' | 'equipment' | 'cabin',
    date: string,
    startTime: string,
    endTime: string,
    existingBookings: ExistingBooking[],
  ): boolean {
    if (!resourceId || !date || !startTime || !endTime) return true;
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);
    const field = resourceType === 'chair' ? 'chairId' :
      resourceType === 'room' ? 'roomId' :
      resourceType === 'equipment' ? 'equipmentId' : 'cabinId';
    return !existingBookings.some(b => {
      if ((b as any)[field] !== resourceId) return false;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return newStart < bEnd && newEnd > bStart;
    });
  }

  generateTimeline(services: BookingDrawerService[], startTime: string): import('./booking-drawer.models').TimelineEntry[] {
    const entries: import('./booking-drawer.models').TimelineEntry[] = [];
    let current = this.parseTime(startTime);
    for (const s of services) {
      if (s.bufferBefore > 0) {
        entries.push({
          time: this.formatMin(current),
          label: `Buffer (${s.bufferBefore}min)`,
          type: 'buffer',
          durationMin: s.bufferBefore,
          serviceName: s.name,
        });
        current += s.bufferBefore;
      }
      entries.push({
        time: this.formatMin(current),
        label: s.name,
        type: 'service',
        durationMin: s.durationMin,
        serviceColor: s.color || undefined,
        serviceName: s.name,
      });
      current += s.durationMin;
      if (s.bufferAfter > 0) {
        entries.push({
          time: this.formatMin(current - s.bufferAfter),
          label: `Buffer (${s.bufferAfter}min)`,
          type: 'buffer',
          durationMin: s.bufferAfter,
          serviceName: s.name,
        });
        current += s.bufferAfter;
      }
    }
    return entries;
  }

  isStaffAvailable(
    staffId: string,
    date: string,
    startTime: string,
    endTime: string,
    existingBookings: ExistingBooking[],
  ): boolean {
    if (!staffId || !date || !startTime || !endTime) return true;
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);
    return !existingBookings.some(b => {
      if (b.staffId !== staffId) return false;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return newStart < bEnd && newEnd > bStart;
    });
  }

  validateResourceAvailability(
    draft: BookingDrawerDraft,
    existingBookings: ExistingBooking[],
    staffSchedules: StaffSchedule[],
    resourceSchedules: ResourceSchedule[],
  ): BookingConflictInfo[] {
    const conflicts: BookingConflictInfo[] = [];
    if (!draft.schedule.date || !draft.schedule.startTime || !draft.schedule.endTime) return conflicts;

    const staffSchedule = staffSchedules.find(s =>
      s.staffId === draft.schedule.staffId && s.date === draft.schedule.date
    );
    if (staffSchedule) {
      if (staffSchedule.isOnLeave) {
        conflicts.push({ type: 'staff', severity: 'error', message: 'Staff is on leave this day' });
      }
      if (staffSchedule.workingStart && draft.schedule.startTime < staffSchedule.workingStart) {
        conflicts.push({ type: 'staff', severity: 'error', message: 'Start time is before staff working hours' });
      }
      if (staffSchedule.workingEnd && draft.schedule.endTime > staffSchedule.workingEnd) {
        conflicts.push({ type: 'staff', severity: 'error', message: 'End time is after staff working hours' });
      }
      for (const br of staffSchedule.breaks) {
        if (this.timeOverlaps(draft.schedule.startTime, draft.schedule.endTime, br.start, br.end)) {
          conflicts.push({
            type: 'time',
            severity: 'warning',
            message: `Booking overlaps with staff break (${br.start}-${br.end})`,
          });
        }
      }
    }

    if (draft.schedule.chairId) {
      const chairSchedule = resourceSchedules.find(r =>
        r.resourceId === draft.schedule.chairId && r.date === draft.schedule.date
      );
      if (chairSchedule?.isClosed) {
        conflicts.push({ type: 'chair', severity: 'error', message: 'Chair is closed on this day' });
      }
    }

    if (draft.schedule.roomId) {
      const roomSchedule = resourceSchedules.find(r =>
        r.resourceId === draft.schedule.roomId && r.date === draft.schedule.date
      );
      if (roomSchedule?.isClosed) {
        conflicts.push({ type: 'room', severity: 'error', message: 'Room is closed on this day' });
      }
    }

    return conflicts;
  }

  draftHasUnsavedChanges(draft: BookingDrawerDraft, saved: BookingDrawerDraft | null): boolean {
    if (!saved) return true;
    return JSON.stringify(draft) !== JSON.stringify(saved);
  }

  private timeOverlaps(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = this.parseTime(start1);
    const e1 = this.parseTime(end1);
    const s2 = this.parseTime(start2);
    const e2 = this.parseTime(end2);
    return s1 < e2 && e1 > s2;
  }

  private parseTime(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private getMinutesBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / 60000);
  }

  private formatMin(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private formatIsoTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  saveDraft(draft: BookingDrawerDraft): void {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch { }
  }

  loadDraft(): BookingDrawerDraft | null {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  clearDraft(): void {
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { }
  }

resetDraft(): BookingDrawerDraft {
  return { ...EMPTY_DRAFT, step: 1 as BookingStep };
}

/* ===== PASTE BELOW ===== */

isBookingReady(
  draft: BookingDrawerDraft,
  existingBookings: ExistingBooking[]
): boolean {

  const conflicts = this.detectExtendedConflicts(
    draft,
    existingBookings
  );

  return conflicts.every(c => c.severity !== 'error');
}

/* ===== NOTHING BELOW CHANGE ===== */

}
