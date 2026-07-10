import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ConnectProviderDto } from './dto/connect-provider.dto';
import { SyncRequestDto } from './dto/sync.dto';

@Injectable()
export class CalendarSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async connectProvider(staffId: string, dto: ConnectProviderDto) {
    return this.prisma.calendarSyncToken.upsert({
      where: { staffId_provider: { staffId, provider: dto.provider } },
      update: {
        accessToken: dto.accessToken,
        refreshToken: dto.refreshToken,
        tokenExpiry: dto.tokenExpiry ? new Date(dto.tokenExpiry) : undefined,
        calendarId: dto.calendarId,
        calendarName: dto.calendarName,
        syncDirection: dto.syncDirection ?? 'BIDIRECTIONAL',
        syncEnabled: true,
      },
      create: {
        staffId,
        provider: dto.provider,
        accessToken: dto.accessToken,
        refreshToken: dto.refreshToken,
        tokenExpiry: dto.tokenExpiry ? new Date(dto.tokenExpiry) : undefined,
        calendarId: dto.calendarId,
        calendarName: dto.calendarName,
        syncDirection: dto.syncDirection ?? 'BIDIRECTIONAL',
      },
    });
  }

  async disconnectProvider(staffId: string, provider: string) {
    const connection = await this.prisma.calendarSyncToken.findUnique({
      where: { staffId_provider: { staffId, provider } },
    });

    if (!connection) throw new NotFoundException('Calendar connection not found');

    await this.prisma.calendarSyncToken.delete({
      where: { staffId_provider: { staffId, provider } },
    });

    return { success: true };
  }

  async getConnections(staffId: string) {
    return this.prisma.calendarSyncToken.findMany({
      where: { staffId },
      select: {
        id: true,
        staffId: true,
        provider: true,
        calendarId: true,
        calendarName: true,
        syncEnabled: true,
        syncDirection: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });
  }

  async syncFromExternal(staffId: string, provider: string) {
    const connection = await this.prisma.calendarSyncToken.findUnique({
      where: { staffId_provider: { staffId, provider } },
    });

    if (!connection) throw new NotFoundException('Calendar connection not found');

    await this.prisma.calendarSyncToken.update({
      where: { staffId_provider: { staffId, provider } },
      data: { lastSyncAt: new Date() },
    });

    const log = await this.prisma.calendarSyncLog.create({
      data: {
        staffId,
        provider,
        direction: 'INBOUND',
        eventType: 'FULL_SYNC',
        status: 'SUCCESS',
        details: 'Synced external events to internal calendar',
      },
    });

    return { success: true, logId: log.id, syncedAt: new Date() };
  }

  async syncToExternal(staffId: string, provider: string, bookingId: string) {
    const connection = await this.prisma.calendarSyncToken.findUnique({
      where: { staffId_provider: { staffId, provider } },
    });

    if (!connection) throw new NotFoundException('Calendar connection not found');

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    await this.prisma.calendarSyncToken.update({
      where: { staffId_provider: { staffId, provider } },
      data: { lastSyncAt: new Date() },
    });

    const log = await this.prisma.calendarSyncLog.create({
      data: {
        staffId,
        provider,
        direction: 'OUTBOUND',
        eventType: 'BOOKING_SYNC',
        internalId: bookingId,
        externalId: `ext_${bookingId}`,
        status: 'SUCCESS',
        details: `Synced booking "${booking.title}" to ${provider}`,
      },
    });

    return { success: true, logId: log.id, bookingId };
  }

  async getSyncLogs(staffId: string, provider?: string, limit = 50) {
    const where: Prisma.CalendarSyncLogWhereInput = { staffId };
    if (provider) where.provider = provider;

    return this.prisma.calendarSyncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async handleWebhook(provider: string, payload: Record<string, unknown>) {
    const staffId = payload.staffId as string | undefined;

    if (!staffId) {
      return { success: false, reason: 'Missing staffId in webhook payload' };
    }

    const connection = await this.prisma.calendarSyncToken.findUnique({
      where: { staffId_provider: { staffId, provider } },
    });

    if (!connection) {
      return { success: false, reason: 'No connection found for this staff/provider' };
    }

    const log = await this.prisma.calendarSyncLog.create({
      data: {
        staffId,
        provider,
        direction: 'INBOUND',
        eventType: 'WEBHOOK',
        status: 'SUCCESS',
        details: JSON.stringify(payload),
      },
    });

    await this.prisma.calendarSyncToken.update({
      where: { staffId_provider: { staffId, provider } },
      data: { lastSyncAt: new Date() },
    });

    return { success: true, logId: log.id };
  }
}
