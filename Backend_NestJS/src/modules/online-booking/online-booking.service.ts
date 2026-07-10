import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { OnlineBookingCreateDto } from './dto/create-online-booking.dto';
import { PortalSettingsDto } from './dto/portal-settings.dto';
import { SlotQueryDto } from './dto/query-slots.dto';

@Injectable()
export class OnlineBookingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPortalSettings(branchId: string) {
    const settings = await this.prisma.bookingPortalSettings.findUnique({
      where: { branchId },
    });

    if (!settings) {
      throw new NotFoundException('Portal settings not found for this branch');
    }

    return settings;
  }

  async upsertPortalSettings(branchId: string, data: PortalSettingsDto) {
    const existing = await this.prisma.bookingPortalSettings.findUnique({
      where: { branchId },
    });

    if (existing) {
      return this.prisma.bookingPortalSettings.update({
        where: { branchId },
        data: {
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.heroTitle !== undefined ? { heroTitle: data.heroTitle } : {}),
          ...(data.heroSubtitle !== undefined ? { heroSubtitle: data.heroSubtitle } : {}),
          ...(data.heroImage !== undefined ? { heroImage: data.heroImage } : {}),
          ...(data.logo !== undefined ? { logo: data.logo } : {}),
          ...(data.primaryColor !== undefined ? { primaryColor: data.primaryColor } : {}),
          ...(data.accentColor !== undefined ? { accentColor: data.accentColor } : {}),
          ...(data.welcomeMessage !== undefined ? { welcomeMessage: data.welcomeMessage } : {}),
          ...(data.bookingRules !== undefined ? { bookingRules: data.bookingRules } : {}),
          ...(data.requireDeposit !== undefined ? { requireDeposit: data.requireDeposit } : {}),
          ...(data.depositPercent !== undefined ? { depositPercent: data.depositPercent } : {}),
          ...(data.cancellationPolicy !== undefined ? { cancellationPolicy: data.cancellationPolicy } : {}),
          ...(data.allowGuestBooking !== undefined ? { allowGuestBooking: data.allowGuestBooking } : {}),
          ...(data.requirePhone !== undefined ? { requirePhone: data.requirePhone } : {}),
          ...(data.requireEmail !== undefined ? { requireEmail: data.requireEmail } : {}),
          ...(data.maxAdvanceDays !== undefined ? { maxAdvanceDays: data.maxAdvanceDays } : {}),
          ...(data.minAdvanceHours !== undefined ? { minAdvanceHours: data.minAdvanceHours } : {}),
          ...(data.slotDurationMin !== undefined ? { slotDurationMin: data.slotDurationMin } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });
    }

    if (!data.slug) {
      throw new BadRequestException('slug is required when creating new portal settings');
    }

    return this.prisma.bookingPortalSettings.create({
      data: {
        branchId,
        slug: data.slug,
        heroTitle: data.heroTitle ?? 'Book Your Appointment',
        heroSubtitle: data.heroSubtitle ?? 'Choose your service, staff, and time',
        heroImage: data.heroImage ?? null,
        logo: data.logo ?? null,
        primaryColor: data.primaryColor ?? '#6366f1',
        accentColor: data.accentColor ?? '#ec4899',
        welcomeMessage: data.welcomeMessage ?? null,
        bookingRules: data.bookingRules ?? null,
        requireDeposit: data.requireDeposit ?? false,
        depositPercent: data.depositPercent ?? 0,
        cancellationPolicy: data.cancellationPolicy ?? null,
        allowGuestBooking: data.allowGuestBooking ?? true,
        requirePhone: data.requirePhone ?? true,
        requireEmail: data.requireEmail ?? false,
        maxAdvanceDays: data.maxAdvanceDays ?? 30,
        minAdvanceHours: data.minAdvanceHours ?? 2,
        slotDurationMin: data.slotDurationMin ?? 30,
        isActive: data.isActive ?? true,
      },
    });
  }

  async getAvailableSlots(query: SlotQueryDto) {
    const { branchId, date, staffId, serviceId } = query;

    const portal = await this.prisma.bookingPortalSettings.findUnique({
      where: { branchId },
    });

    const slotDuration = portal?.slotDurationMin ?? 30;
    const dayOfWeek = new Date(date).getDay();

    const availabilityWhere: any = {
      branchId,
      dayOfWeek,
      isActive: true,
      ...(staffId ? { staffId } : {}),
    };

    const availabilities = await this.prisma.staffAvailability.findMany({
      where: availabilityWhere,
    });

    if (!availabilities.length) {
      return { date, branchId, staffId: staffId ?? null, slotDuration, slots: [] };
    }

    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);

    const bookingWhere: any = {
      branchId,
      date: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      ...(staffId ? { staffId } : {}),
    };

    const existingBookings = await this.prisma.onlineBooking.findMany({
      where: bookingWhere,
      select: { startTime: true, endTime: true, staffId: true },
    });

    const slots: any[] = [];

    for (const av of availabilities) {
      const [startH, startM] = av.startTime.split(':').map(Number);
      const [endH, endM] = av.endTime.split(':').map(Number);
      let current = startH * 60 + startM;
      const dayEndMinutes = endH * 60 + endM;

      while (current + slotDuration <= dayEndMinutes) {
        const slotStartH = String(Math.floor(current / 60)).padStart(2, '0');
        const slotStartM = String(current % 60).padStart(2, '0');
        const slotStart = `${slotStartH}:${slotStartM}`;

        const slotEndMinutes = current + slotDuration;
        const slotEndH = String(Math.floor(slotEndMinutes / 60)).padStart(2, '0');
        const slotEndM = String(slotEndMinutes % 60).padStart(2, '0');
        const slotEnd = `${slotEndH}:${slotEndM}`;

        const isBooked = existingBookings.some((b) => {
          return slotStart < b.endTime && slotEnd > b.startTime;
        });

        if (!isBooked) {
          slots.push({
            staffId: av.staffId,
            date,
            startTime: slotStart,
            endTime: slotEnd,
          });
        }

        current += slotDuration;
      }
    }

    return { date, branchId, staffId: staffId ?? null, slotDuration, slots };
  }

  async createBooking(data: OnlineBookingCreateDto) {
    const portal = await this.prisma.bookingPortalSettings.findUnique({
      where: { branchId: data.branchId },
    });

    if (!portal) {
      throw new NotFoundException('Portal settings not found for this branch');
    }

    if (!portal.isActive) {
      throw new BadRequestException('Online booking is not active for this branch');
    }

    if (!portal.allowGuestBooking && !data.clientEmail) {
      throw new BadRequestException('Guest booking is not allowed. Client email is required.');
    }

    if (portal.requirePhone && !data.clientPhone) {
      throw new BadRequestException('Phone number is required');
    }

    if (portal.requireEmail && !data.clientEmail) {
      throw new BadRequestException('Email is required');
    }

    const now = new Date();
    const bookingDate = new Date(data.date);
    const advanceDays = Math.ceil((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (advanceDays > portal.maxAdvanceDays) {
      throw new BadRequestException(`Cannot book more than ${portal.maxAdvanceDays} days in advance`);
    }

    if (advanceDays < 0) {
      throw new BadRequestException('Cannot book in the past');
    }

    if (advanceDays === 0) {
      const hoursUntil = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil < portal.minAdvanceHours) {
        throw new BadRequestException(`Must book at least ${portal.minAdvanceHours} hours in advance`);
      }
    }

    const serviceIdList = data.serviceIds.map((id) => id.trim()).filter(Boolean);
    if (!serviceIdList.length) {
      throw new BadRequestException('At least one service is required');
    }

    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIdList } },
    });

    if (services.length !== serviceIdList.length) {
      throw new NotFoundException('One or more services were not found');
    }

    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);

    let clientId = data.clientId ?? null;

    if (!clientId) {
      const existingClient = await this.prisma.client.findFirst({
        where: {
          phone: data.clientPhone,
          ...(data.clientEmail ? { email: data.clientEmail } : {}),
        },
      });

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = await this.prisma.client.create({
          data: {
            fullName: data.clientName,
            phone: data.clientPhone,
            email: data.clientEmail ?? null,
          },
        });
        clientId = newClient.id;
      }
    }

    const booking = await this.prisma.onlineBooking.create({
      data: {
        branchId: data.branchId,
        portalSettingsId: portal.id,
        clientId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail ?? null,
        staffId: data.staffId ?? null,
        serviceIds: serviceIdList.join(','),
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        totalAmount,
        status: 'PENDING',
        notes: data.notes ?? null,
        source: 'WEB',
      },
      include: {
        portal: true,
      },
    });

    return booking;
  }

  async cancelBooking(id: string, reason: string) {
    const booking = await this.prisma.onlineBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Online booking not found');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === 'COMPLETED') {
      throw new BadRequestException('Completed booking cannot be cancelled');
    }

    return this.prisma.onlineBooking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason || null,
      },
    });
  }

  async confirmBooking(id: string) {
    const booking = await this.prisma.onlineBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Online booking not found');
    }

    if (booking.status === 'CONFIRMED') {
      throw new BadRequestException('Booking is already confirmed');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled booking cannot be confirmed');
    }

    if (booking.status === 'COMPLETED') {
      throw new BadRequestException('Completed booking cannot be confirmed');
    }

    return this.prisma.onlineBooking.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
  }

  async getBooking(id: string) {
    const booking = await this.prisma.onlineBooking.findUnique({
      where: { id },
      include: { portal: true },
    });

    if (!booking) {
      throw new NotFoundException('Online booking not found');
    }

    return booking;
  }

  async getPublicPortal(slug: string) {
    const portal = await this.prisma.bookingPortalSettings.findUnique({
      where: { slug },
      include: {
        bookings: {
          where: { status: { notIn: ['CANCELLED'] } },
          select: { id: true, date: true, startTime: true, endTime: true, staffId: true },
        },
      },
    });

    if (!portal) {
      throw new NotFoundException('Portal not found');
    }

    if (!portal.isActive) {
      throw new BadRequestException('This booking portal is currently inactive');
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: portal.branchId },
      select: { id: true, name: true, city: true },
    });

    const services = await this.prisma.service.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
        price: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const staff = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: ['STYLIST', 'THERAPIST'] } },
      select: { id: true, fullName: true, specialization: true, bio: true },
      orderBy: { fullName: 'asc' },
    });

    return {
      portal: {
        heroTitle: portal.heroTitle,
        heroSubtitle: portal.heroSubtitle,
        heroImage: portal.heroImage,
        logo: portal.logo,
        primaryColor: portal.primaryColor,
        accentColor: portal.accentColor,
        welcomeMessage: portal.welcomeMessage,
        bookingRules: portal.bookingRules,
        requireDeposit: portal.requireDeposit,
        depositPercent: portal.depositPercent,
        cancellationPolicy: portal.cancellationPolicy,
        allowGuestBooking: portal.allowGuestBooking,
        requirePhone: portal.requirePhone,
        requireEmail: portal.requireEmail,
        maxAdvanceDays: portal.maxAdvanceDays,
        minAdvanceHours: portal.minAdvanceHours,
        slotDurationMin: portal.slotDurationMin,
      },
      branch,
      services,
      staff,
    };
  }
}
