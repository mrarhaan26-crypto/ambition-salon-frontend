import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { BookingQueryDto, SlotQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

type PrismaTx = Prisma.TransactionClient;

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.COMPLETED,
];

const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
  [BookingStatus.CONFIRMED]: [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
  [BookingStatus.CHECKED_IN]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.NO_SHOW]: [],
};

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: BookingQueryDto) {
    const timeFilter = this.buildTimeFilter(query?.startDate, query?.endDate);

    return this.prisma.booking.findMany({
      where: {
        ...(query?.branchId ? { branchId: query.branchId } : {}),
        ...(query?.clientId ? { clientId: query.clientId } : {}),
        ...(query?.staffId ? { staffId: query.staffId } : {}),
        ...(query?.status ? { status: query.status } : {}),
        ...timeFilter,
      },
      include: { client: true, branch: true, staff: true, services: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { client: true, branch: true, staff: true, services: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async create(dto: CreateBookingDto) {
    const startTime = this.parseDate(dto.startTime, 'Invalid start time');
    const endTime = this.parseDate(dto.endTime, 'Invalid end time');
    this.validateTimeRange(startTime, endTime);
    this.validateServices(dto.services);

    const status = dto.status ?? BookingStatus.PENDING;
    if (status !== BookingStatus.PENDING && status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('New booking status must be PENDING or CONFIRMED');
    }

    return this.prisma.$transaction(
      async (tx) => {
        await this.validateClientBranchStaff(tx, dto.clientId, dto.branchId, dto.staffId);
        await this.validateStaffBusinessHours(tx, dto.branchId, dto.staffId, startTime, endTime);
        await this.ensureNoStaffConflict(tx, dto.staffId, startTime, endTime);

        return tx.booking.create({
          data: {
            branchId: dto.branchId,
            clientId: dto.clientId,
            staffId: dto.staffId,
            title: dto.title.trim(),
            notes: dto.notes?.trim() || null,
            status,
            startTime,
            endTime,
            totalAmount: Number(dto.totalAmount ?? this.calculateServiceTotal(dto.services)),
            services: {
              create: dto.services.map((service) => ({
                name: service.name.trim(),
                durationMin: Number(service.durationMin),
                price: Number(service.price),
              })),
            },
          },
          include: { client: true, branch: true, staff: true, services: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async update(id: string, dto: UpdateBookingDto) {
    const existing = await this.findOne(id);

    const startTime = dto.startTime ? this.parseDate(dto.startTime, 'Invalid start time') : existing.startTime;
    const endTime = dto.endTime ? this.parseDate(dto.endTime, 'Invalid end time') : existing.endTime;
    this.validateTimeRange(startTime, endTime);

    if (dto.services) this.validateServices(dto.services);

    const branchId = dto.branchId ?? existing.branchId;
    const clientId = dto.clientId ?? existing.clientId;
    const staffId = dto.staffId ?? existing.staffId;

    if (!staffId) throw new BadRequestException('Staff is required for production bookings');

    if (dto.status && dto.status !== existing.status) {
      this.validateStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(
      async (tx) => {
        await this.validateClientBranchStaff(tx, clientId, branchId, staffId);
        await this.validateStaffBusinessHours(tx, branchId, staffId, startTime, endTime);
        await this.ensureNoStaffConflict(tx, staffId, startTime, endTime, id);

        if (dto.services) {
          await tx.bookingService.deleteMany({ where: { bookingId: id } });
        }

        return tx.booking.update({
          where: { id },
          data: {
            ...(dto.branchId !== undefined ? { branchId } : {}),
            ...(dto.clientId !== undefined ? { clientId } : {}),
            ...(dto.staffId !== undefined ? { staffId } : {}),
            ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
            ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.startTime !== undefined ? { startTime } : {}),
            ...(dto.endTime !== undefined ? { endTime } : {}),
            ...(dto.totalAmount !== undefined ? { totalAmount: Number(dto.totalAmount) } : {}),
            ...(dto.services
              ? {
                  services: {
                    create: dto.services.map((service) => ({
                      name: service.name.trim(),
                      durationMin: Number(service.durationMin),
                      price: Number(service.price),
                    })),
                  },
                }
              : {}),
          },
          include: { client: true, branch: true, staff: true, services: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.findOne(id);
    this.validateStatusTransition(booking.status, dto.status);

    return this.prisma.booking.update({
      where: { id },
      data: { status: dto.status },
      include: { client: true, branch: true, staff: true, services: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }

  async calendar(query: BookingQueryDto) {
    const bookings = await this.findAll(query);

    return bookings.map((booking) => ({
      id: booking.id,
      branchId: booking.branchId,
      clientId: booking.clientId,
      staffId: booking.staffId,
      title: booking.title,
      notes: booking.notes,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalAmount: booking.totalAmount,
      client: booking.client
        ? {
            id: booking.client.id,
            fullName: booking.client.fullName,
            phone: booking.client.phone,
            email: booking.client.email,
          }
        : null,
      staff: booking.staff
        ? {
            id: booking.staff.id,
            fullName: booking.staff.fullName,
            email: booking.staff.email,
            role: booking.staff.role,
          }
        : null,
      services: booking.services.map((service) => ({
        id: service.id,
        name: service.name,
        durationMin: service.durationMin,
        price: service.price,
      })),
    }));
  }

  async slots(query: SlotQueryDto) {
    const durationMin = Number(query.durationMin);
    const slotIntervalMin = Number(query.slotIntervalMin || 15);

    if (!durationMin || durationMin < 1) throw new BadRequestException('durationMin must be greater than 0');
    if (!slotIntervalMin || slotIntervalMin < 1) throw new BadRequestException('slotIntervalMin must be greater than 0');

    const date = this.parseDate(query.date, 'Invalid date');
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    await this.validateClientBranchStaff(this.prisma, undefined, query.branchId, query.staffId);

    const windows = await this.getStaffAvailabilityWindows(this.prisma, query.branchId, query.staffId, dayStart);
    if (windows.length === 0) {
      return { date: dayStart, branchId: query.branchId, staffId: query.staffId, durationMin, slots: [] };
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        branchId: query.branchId,
        staffId: query.staffId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    });

    const slots = [];
    for (const window of windows) {
      let cursor = new Date(window.start);
      while (cursor.getTime() + durationMin * 60_000 <= window.end.getTime()) {
        const slotEnd = new Date(cursor.getTime() + durationMin * 60_000);
        const blocked = bookings.some(
          (booking) => booking.startTime < slotEnd && booking.endTime > cursor,
        );

        if (!blocked) {
          slots.push({ startTime: new Date(cursor), endTime: slotEnd, available: true });
        }

        cursor = new Date(cursor.getTime() + slotIntervalMin * 60_000);
      }
    }

    return { date: dayStart, branchId: query.branchId, staffId: query.staffId, durationMin, slots };
  }

  private buildTimeFilter(startDate?: string, endDate?: string): Prisma.BookingWhereInput {
    if (!startDate && !endDate) return {};

    const start = startDate ? this.parseDate(startDate, 'Invalid startDate') : undefined;
    const end = endDate ? this.parseDate(endDate, 'Invalid endDate') : undefined;

    if (start && end && end <= start) throw new BadRequestException('endDate must be after startDate');

    return {
      ...(start ? { endTime: { gt: start } } : {}),
      ...(end ? { startTime: { lt: end } } : {}),
    };
  }

  private async validateClientBranchStaff(
    tx: PrismaTx | PrismaService,
    clientId: string | undefined,
    branchId: string,
    staffId: string,
  ) {
    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    if (clientId) {
      const client = await tx.client.findUnique({ where: { id: clientId } });
      if (!client) throw new NotFoundException('Client not found');
    }

    const staff = await tx.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff not found');
  }

  private async validateStaffBusinessHours(
    tx: PrismaTx,
    branchId: string,
    staffId: string,
    startTime: Date,
    endTime: Date,
  ) {
    const windows = await this.getStaffAvailabilityWindows(tx, branchId, staffId, startTime);
    const isInsideWindow = windows.some(
      (window) => startTime >= window.start && endTime <= window.end,
    );

    if (!isInsideWindow) {
      throw new BadRequestException('Booking time is outside staff business hours');
    }
  }

  private async getStaffAvailabilityWindows(
    tx: PrismaTx | PrismaService,
    branchId: string,
    staffId: string,
    date: Date,
  ) {
    const dayOfWeek = date.getDay();
    const availability = await tx.staffAvailability.findMany({
      where: { branchId, staffId, dayOfWeek, isActive: true },
      orderBy: { startTime: 'asc' },
    });

    return availability.map((item) => ({
      start: this.mergeDateAndTime(date, item.startTime),
      end: this.mergeDateAndTime(date, item.endTime),
    }));
  }

  private async ensureNoStaffConflict(
    tx: PrismaTx,
    staffId: string,
    startTime: Date,
    endTime: Date,
    ignoreBookingId?: string,
  ) {
    const conflict = await tx.booking.findFirst({
      where: {
        staffId,
        ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}),
        status: { in: ACTIVE_BOOKING_STATUSES },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true, startTime: true, endTime: true },
    });

    if (conflict) {
      throw new ConflictException('Staff already has a booking in this time slot');
    }
  }

  private validateStatusTransition(currentStatus: BookingStatus, nextStatus: BookingStatus) {
    if (currentStatus === nextStatus) return;

    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(`Invalid booking status transition from ${currentStatus} to ${nextStatus}`);
    }
  }

  private validateServices(services: { name: string; durationMin: number; price: number }[]) {
    if (!Array.isArray(services) || services.length === 0) {
      throw new BadRequestException('At least one booking service is required');
    }

    for (const service of services) {
      if (!service.name?.trim()) throw new BadRequestException('Service name is required');
      if (Number(service.durationMin) < 1) throw new BadRequestException('Service duration must be greater than 0');
      if (Number(service.price) < 0) throw new BadRequestException('Service price cannot be negative');
    }
  }

  private calculateServiceTotal(services: { price: number }[]) {
    return services.reduce((sum, service) => sum + Number(service.price || 0), 0);
  }

  private parseDate(value: string, message: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(message);
    return date;
  }

  private validateTimeRange(startTime: Date, endTime: Date) {
    if (endTime <= startTime) throw new BadRequestException('End time must be after start time');

    const durationMin = (endTime.getTime() - startTime.getTime()) / 60_000;
    if (durationMin < 5) throw new BadRequestException('Booking duration must be at least 5 minutes');
    if (durationMin > 12 * 60) throw new BadRequestException('Booking duration cannot exceed 12 hours');
  }

  private mergeDateAndTime(date: Date, time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      throw new BadRequestException('Invalid staff availability time format');
    }

    const merged = new Date(date);
    merged.setHours(hours, minutes, 0, 0);
    return merged;
  }
}
